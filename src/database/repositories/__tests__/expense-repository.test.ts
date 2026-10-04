import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from '@/database/migrations';
import { reconcilePayment } from '@/database/reconciliation';
import { createExpenseRepository } from '@/database/repositories/expense-repository';
import { createPaymentRepository } from '@/database/repositories/payment-repository';
import { createTestDatabase } from '@/test-utils/node-sqlite-database';
import type { NewExpense, NewExpenseItem } from '@/types/expense';
import type { NewPayment } from '@/types/payment';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return { randomUUID: () => `uuid-${++counter}` };
});

type Ids = { food: string; transport: string; upi: string; cash: string };

async function setUp(): Promise<{ db: SQLiteDatabase; ids: Ids }> {
  const db = createTestDatabase();
  await migrateDbIfNeeded(db);
  const id = async (table: string, name: string) =>
    (await db.getFirstAsync<{ id: string }>(`SELECT id FROM ${table} WHERE name = ?`, name))!.id;
  return {
    db,
    ids: {
      food: await id('categories', 'Food & Groceries'),
      transport: await id('categories', 'Transportation'),
      upi: await id('payment_methods', 'UPI'),
      cash: await id('payment_methods', 'Cash'),
    },
  };
}

function newExpense(ids: Ids, overrides: Partial<NewExpense> = {}): NewExpense {
  return {
    amount: 20000,
    date: '2026-10-01',
    categoryId: ids.food,
    subcategoryId: null,
    description: 'Chicken',
    paymentMethodId: ids.upi,
    isEssential: true,
    notes: null,
    ...overrides,
  };
}

async function count(db: SQLiteDatabase, table: string): Promise<number> {
  return (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))!.n;
}

describe('expenseRepository on schema v2', () => {
  it('records a simple expense as one confirmed payment with one item', async () => {
    const { db, ids } = await setUp();
    const expense = await createExpenseRepository(db).create(newExpense(ids));

    expect(expense).toMatchObject({
      amount: 20000,
      description: 'Chicken',
      paymentMethodId: ids.upi,
    });
    const payment = await createPaymentRepository(db).getById(expense.paymentId);
    expect(payment).toMatchObject({ amount: 20000, date: '2026-10-01', status: 'confirmed' });
  });

  it('saves a batch atomically: an invalid row saves nothing', async () => {
    const { db, ids } = await setUp();
    const repo = createExpenseRepository(db);

    expect(await repo.createMany([newExpense(ids), newExpense(ids, { amount: 9000 })])).toBe(2);
    await expect(
      repo.createMany([newExpense(ids), newExpense(ids, { categoryId: 'missing-category' })]),
    ).rejects.toThrow();

    expect(await count(db, 'expense_items')).toBe(2);
    expect(await count(db, 'payments')).toBe(2);
  });

  it('keeps a single-item payment in step when the item is edited', async () => {
    const { db, ids } = await setUp();
    const repo = createExpenseRepository(db);
    const created = await repo.create(newExpense(ids));

    await repo.update(created.id, { amount: 25000, date: '2026-10-02', paymentMethodId: ids.cash });

    expect(await repo.getById(created.id)).toMatchObject({
      amount: 25000,
      date: '2026-10-02',
      paymentMethodId: ids.cash,
    });
    expect(await createPaymentRepository(db).getById(created.paymentId)).toMatchObject({
      amount: 25000,
      date: '2026-10-02',
      paymentMethodId: ids.cash,
    });
  });

  it('deletes the payment along with its only item', async () => {
    const { db, ids } = await setUp();
    const repo = createExpenseRepository(db);
    const created = await repo.create(newExpense(ids));

    await repo.delete(created.id);

    expect(await repo.getById(created.id)).toBeNull();
    expect(await count(db, 'payments')).toBe(0);
  });

  it('filters by payment method through the payment', async () => {
    const { db, ids } = await setUp();
    const repo = createExpenseRepository(db);
    await repo.create(newExpense(ids, { description: 'Paid by UPI' }));
    await repo.create(newExpense(ids, { description: 'Paid in cash', paymentMethodId: ids.cash }));

    const cash = await repo.list({ paymentMethodId: ids.cash });
    expect(cash.map((e) => e.description)).toEqual(['Paid in cash']);
  });
});

describe('expenseRepository search on schema v2', () => {
  it('matches description, category name, and merchant, case-insensitively and literally', async () => {
    const { db, ids } = await setUp();
    const repo = createExpenseRepository(db);
    await repo.create(newExpense(ids, { description: 'Tea' }));
    await repo.create(newExpense(ids, { description: 'Bus', categoryId: ids.transport }));
    await repo.create(newExpense(ids, { description: 'Shirt 50% off' }));
    await createPaymentRepository(db).createWithItems(
      {
        amount: 5000,
        date: '2026-10-01',
        paymentMethodId: ids.upi,
        provider: null,
        merchantName: 'Corner Bakery',
        merchantVpa: null,
        status: 'confirmed',
        reference: null,
        notes: null,
      },
      [{ ...newExpense(ids, { amount: 5000, description: 'Bun' }) }],
    );

    const search = async (text: string) =>
      (await repo.list({ search: text })).map((e) => e.description).sort();
    expect(await search('TEA')).toEqual(['Tea']);
    expect(await search('transport')).toEqual(['Bus']);
    expect(await search('bakery')).toEqual(['Bun']);
    expect(await search('50%')).toEqual(['Shirt 50% off']);
    expect(await search('%')).toEqual(['Shirt 50% off']);
  });
});

describe('paymentRepository: one payment, several items', () => {
  function payment(ids: Ids, amount: number): NewPayment {
    return {
      amount,
      date: '2026-10-03',
      paymentMethodId: ids.upi,
      provider: 'gpay',
      merchantName: 'Supermarket',
      merchantVpa: 'supermarket@okbank',
      status: 'confirmed',
      reference: null,
      notes: null,
    };
  }

  function item(ids: Ids, description: string, amount: number): NewExpenseItem {
    const categoryId = description === 'Auto' ? ids.transport : ids.food;
    return {
      amount,
      date: '2026-10-03',
      categoryId,
      subcategoryId: null,
      description,
      isEssential: true,
      notes: null,
    };
  }

  it('links several items to one payment and lists them as separate expenses', async () => {
    const { db, ids } = await setUp();
    const { payment: created, items } = await createPaymentRepository(db).createWithItems(
      payment(ids, 100000),
      [item(ids, 'Lunch', 80000), item(ids, 'Auto', 20000)],
    );

    expect(items.map((i) => i.paymentId)).toEqual([created.id, created.id]);
    expect(
      reconcilePayment(
        created.amount,
        items.map((i) => i.amount),
      ).status,
    ).toBe('allocated');

    // Category analytics see the items; the payment is counted once, not per item.
    const expenses = await createExpenseRepository(db).list();
    expect(expenses.map((e) => [e.description, e.amount, e.paymentMethodId])).toEqual(
      expect.arrayContaining([
        ['Lunch', 80000, ids.upi],
        ['Auto', 20000, ids.upi],
      ]),
    );
    expect(await count(db, 'payments')).toBe(1);
  });

  it('allows partial allocation but refuses items exceeding the payment', async () => {
    const { db, ids } = await setUp();
    const repo = createPaymentRepository(db);

    const partial = await repo.createWithItems(payment(ids, 235000), [item(ids, 'Rice', 227000)]);
    expect(
      reconcilePayment(
        235000,
        partial.items.map((i) => i.amount),
      ),
    ).toMatchObject({
      status: 'partial',
      remaining: 8000,
    });

    await expect(
      repo.createWithItems(payment(ids, 100000), [
        item(ids, 'Lunch', 80000),
        item(ids, 'Auto', 30000),
      ]),
    ).rejects.toThrow('more than the payment');
    expect(await count(db, 'payments')).toBe(1);
  });

  it('keeps the payment when one of several items is deleted, and on the last one removes it', async () => {
    const { db, ids } = await setUp();
    const { payment: created, items } = await createPaymentRepository(db).createWithItems(
      payment(ids, 100000),
      [item(ids, 'Lunch', 80000), item(ids, 'Auto', 20000)],
    );
    const expenses = createExpenseRepository(db);

    await expenses.delete(items[0].id);
    expect(await createPaymentRepository(db).getById(created.id)).not.toBeNull();

    await expenses.delete(items[1].id);
    expect(await createPaymentRepository(db).getById(created.id)).toBeNull();
  });

  it('does not rewrite a multi-item payment when one item amount changes', async () => {
    const { db, ids } = await setUp();
    const payments = createPaymentRepository(db);
    const { payment: created, items } = await payments.createWithItems(payment(ids, 100000), [
      item(ids, 'Lunch', 80000),
      item(ids, 'Auto', 20000),
    ]);

    await createExpenseRepository(db).update(items[0].id, { amount: 70000 });

    const after = await payments.getById(created.id);
    expect(after!.amount).toBe(100000);
    const amounts = (await payments.listItems(created.id)).map((i) => i.amount);
    expect(reconcilePayment(after!.amount, amounts)).toMatchObject({
      status: 'partial',
      remaining: 10000,
    });
  });
});

describe('payment confirmation (UPI flow)', () => {
  async function initiate(db: SQLiteDatabase, ids: Ids, description: string) {
    return createPaymentRepository(db).createWithItems(
      {
        amount: 5000,
        date: '2026-10-03',
        paymentMethodId: ids.upi,
        provider: 'gpay',
        merchantName: 'Corner Bakery',
        merchantVpa: 'bakery@okaxis',
        status: 'initiated',
        reference: 'ET1',
        notes: null,
      },
      [
        {
          amount: 5000,
          date: '2026-10-03',
          categoryId: ids.food,
          subcategoryId: null,
          description,
          isEssential: true,
          notes: null,
        },
      ],
    );
  }

  it('does not count a payment as spending until it is confirmed', async () => {
    const { db, ids } = await setUp();
    const expenses = createExpenseRepository(db);
    const payments = createPaymentRepository(db);
    const { payment } = await initiate(db, ids, 'Bread');

    expect(await expenses.list()).toEqual([]);
    expect(await expenses.getMonthlyTotal('2026-10')).toBe(0);

    await payments.updateStatus(payment.id, 'confirmed', { reference: 'AXI123' });
    expect((await expenses.list()).map((e) => e.description)).toEqual(['Bread']);
    expect(await expenses.getMonthlyTotal('2026-10')).toBe(5000);
    expect(await payments.getById(payment.id)).toMatchObject({
      status: 'confirmed',
      reference: 'AXI123',
    });
  });

  it('never counts a failed payment', async () => {
    const { db, ids } = await setUp();
    const payments = createPaymentRepository(db);
    const { payment } = await initiate(db, ids, 'Bread');

    await payments.updateStatus(payment.id, 'failed');
    expect(await createExpenseRepository(db).list()).toEqual([]);
    expect(await payments.listAwaitingConfirmation()).toEqual([]);
  });

  it('lists initiated and unknown payments, with their items, as awaiting confirmation', async () => {
    const { db, ids } = await setUp();
    const payments = createPaymentRepository(db);
    const first = await initiate(db, ids, 'Bread');
    const second = await initiate(db, ids, 'Buns');
    await payments.updateStatus(second.payment.id, 'unknown');
    await createExpenseRepository(db).create(newExpense(ids)); // confirmed: not listed

    const awaiting = await payments.listAwaitingConfirmation();
    expect(awaiting.map(({ payment }) => payment.id).sort()).toEqual(
      [first.payment.id, second.payment.id].sort(),
    );
    expect(awaiting.flatMap(({ items }) => items.map((i) => i.description)).sort()).toEqual([
      'Bread',
      'Buns',
    ]);
  });

  it('rejects an invalid status', async () => {
    const { db, ids } = await setUp();
    const { payment } = await initiate(db, ids, 'Bread');
    await expect(
      createPaymentRepository(db).updateStatus(payment.id, 'paid' as never),
    ).rejects.toThrow('Invalid payment status');
  });

  it('deletes only payments that were never sent', async () => {
    const { db, ids } = await setUp();
    const payments = createPaymentRepository(db);
    const unsent = await initiate(db, ids, 'Bread');
    const confirmed = await createExpenseRepository(db).create(newExpense(ids));

    await payments.deleteUnsent(unsent.payment.id);
    await payments.deleteUnsent(confirmed.paymentId);

    expect(await payments.getById(unsent.payment.id)).toBeNull();
    expect(await count(db, 'expense_items')).toBe(1); // the unsent item went with it
    expect(await payments.getById(confirmed.paymentId)).not.toBeNull();
  });
});
