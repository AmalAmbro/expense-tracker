import type { SQLiteDatabase } from 'expo-sqlite';

import { createExpenseRepository } from '@/database/repositories/expense-repository';
import type { NewExpense } from '@/types/expense';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return { randomUUID: () => `uuid-${++counter}` };
});

const expense: NewExpense = {
  amount: 20000,
  date: '2026-09-01',
  categoryId: 'food',
  subcategoryId: null,
  description: 'Chicken',
  paymentMethodId: 'upi',
  isEssential: true,
  notes: null,
};

/** A fake database that records committed inserts and mimics BEGIN/COMMIT/ROLLBACK. */
function createFakeDb(options: { failOnInsert?: number } = {}) {
  const committed: unknown[][] = [];
  let pending: unknown[][] = [];
  let insertCount = 0;

  const db = {
    runAsync: jest.fn(async (_sql: string, ...params: unknown[]) => {
      insertCount++;
      if (insertCount === options.failOnInsert) throw new Error('disk full');
      pending.push(params);
    }),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => {
      pending = [];
      try {
        await task();
        committed.push(...pending);
      } catch (err) {
        pending = [];
        throw err;
      }
    }),
  };
  return { db: db as unknown as SQLiteDatabase, fake: db, committed };
}

describe('expenseRepository.createMany', () => {
  it('inserts every expense inside one transaction', async () => {
    const { db, fake, committed } = createFakeDb();
    const saved = await createExpenseRepository(db).createMany([
      expense,
      { ...expense, amount: 9000 },
    ]);
    expect(saved).toBe(2);
    expect(fake.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(committed.map((params) => params[1])).toEqual([20000, 9000]);
  });

  it('gives the batch distinct, increasing timestamps', async () => {
    const { db, committed } = createFakeDb();
    await createExpenseRepository(db).createMany([expense, expense, expense]);
    const createdAt = committed.map((params) => params[9] as string);
    expect([...createdAt].sort()).toEqual(createdAt);
    expect(new Set(createdAt).size).toBe(3);
  });

  it('rejects the whole batch before writing if any expense is invalid', async () => {
    const { db, fake } = createFakeDb();
    await expect(
      createExpenseRepository(db).createMany([expense, { ...expense, amount: 0 }]),
    ).rejects.toThrow('Amount must be a positive integer');
    expect(fake.runAsync).not.toHaveBeenCalled();
  });

  it('saves nothing when an insert fails partway through', async () => {
    const { db, committed } = createFakeDb({ failOnInsert: 2 });
    await expect(
      createExpenseRepository(db).createMany([expense, expense, expense]),
    ).rejects.toThrow('disk full');
    expect(committed).toEqual([]);
  });
});
