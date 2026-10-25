import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from '@/database/migrations';
import { createCategoryRepository } from '@/database/repositories/category-repository';
import { createExpenseRepository } from '@/database/repositories/expense-repository';
import { createPaymentMethodRepository } from '@/database/repositories/payment-method-repository';
import { createPaymentRepository } from '@/database/repositories/payment-repository';
import { SCHEMA_V1_SQL } from '@/database/schema/tables';
import { restoreBackup } from '@/features/settings/services/restore-backup';
import {
  buildBackup,
  parseBackup,
  serializeBackup,
  type Backup,
} from '@/features/settings/utils/backup';
import { createTestDatabase } from '@/test-utils/node-sqlite-database';
import { buildSeptember2026Expenses } from '@/test-utils/september-2026';
import type { NewExpense } from '@/types/expense';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return { randomUUID: () => `uuid-${++counter}` };
});

async function idOf(db: SQLiteDatabase, table: string, name: string): Promise<string> {
  return (await db.getFirstAsync<{ id: string }>(`SELECT id FROM ${table} WHERE name = ?`, name))!
    .id;
}

/** A migrated database with a few expenses, a split payment, and an awaiting UPI payment. */
async function createPopulatedDatabase(description: string): Promise<SQLiteDatabase> {
  const db = createTestDatabase();
  await migrateDbIfNeeded(db);
  const food = await idOf(db, 'categories', 'Food & Groceries');
  const transport = await idOf(db, 'categories', 'Transportation');
  const upi = await idOf(db, 'payment_methods', 'UPI');
  const cash = await idOf(db, 'payment_methods', 'Cash');

  const expense = (overrides: Partial<NewExpense>): NewExpense => ({
    amount: 20000,
    date: '2026-10-01',
    categoryId: food,
    subcategoryId: null,
    description,
    paymentMethodId: upi,
    isEssential: true,
    notes: null,
    ...overrides,
  });
  await createExpenseRepository(db).createMany([
    expense({}),
    expense({ amount: 3250, date: '2026-10-02', notes: 'Half dozen' }),
    expense({ amount: 6000, categoryId: transport, paymentMethodId: cash }),
  ]);

  const payment = {
    amount: 50000,
    date: '2026-10-03',
    paymentMethodId: upi,
    provider: 'gpay',
    merchantName: 'Fresh Mart',
    merchantVpa: 'freshmart@okaxis',
    reference: 'TR1',
    notes: null,
  };
  const item = {
    date: '2026-10-03',
    categoryId: food,
    subcategoryId: null,
    isEssential: true,
    notes: null,
  };
  await createPaymentRepository(db).createWithItems({ ...payment, status: 'confirmed' }, [
    { ...item, amount: 30000, description: 'Rice' },
    { ...item, amount: 15000, description: 'Dal' },
  ]);
  await createPaymentRepository(db).createWithItems(
    { ...payment, amount: 9900, status: 'initiated', reference: 'TR2' },
    [{ ...item, amount: 9900, description: 'Pending' }],
  );
  return db;
}

/** Everything a user could lose, read back through the app's repositories. */
async function snapshot(db: SQLiteDatabase) {
  return {
    ...(await createPaymentRepository(db).listAllWithItems()),
    // listAll orders by sort_order only, and restore inserts parents first, so ties may
    // come back in a different order; compare the rows themselves.
    categories: (await createCategoryRepository(db).listAll()).sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
    paymentMethods: await createPaymentMethodRepository(db).listAll(),
  };
}

async function backupOf(db: SQLiteDatabase): Promise<Backup> {
  const data = await snapshot(db);
  const backup = buildBackup(
    { ...data, expenseItems: data.items },
    { schemaVersion: 2, exportedAt: new Date('2026-10-25T09:00:00Z') },
  );
  // Through JSON, as a real file would be.
  return parseBackup(serializeBackup(backup));
}

async function foreignKeyProblems(db: SQLiteDatabase): Promise<unknown[]> {
  return db.getAllAsync('PRAGMA foreign_key_check');
}

// `any`: tests corrupt backups in ways that pass parseBackup but that SQLite rejects.
function tampered(backup: Backup, mutate: (raw: any) => void): Backup {
  const raw = JSON.parse(serializeBackup(backup));
  mutate(raw);
  return raw as Backup;
}

describe('restoreBackup (version 2)', () => {
  it('replaces all data with an exact copy of the backup', async () => {
    const source = await createPopulatedDatabase('From the backup');
    const target = await createPopulatedDatabase('On this phone');
    const backup = await backupOf(source);

    await restoreBackup(target, backup);

    expect(await snapshot(target)).toEqual(await snapshot(source));
    expect(await foreignKeyProblems(target)).toEqual([]);
  });

  it('keeps payment statuses, so awaiting payments still await confirmation', async () => {
    const source = await createPopulatedDatabase('From the backup');
    const target = createTestDatabase();
    await migrateDbIfNeeded(target);

    await restoreBackup(target, await backupOf(source));

    const awaiting = await createPaymentRepository(target).listAwaitingConfirmation();
    expect(awaiting.map(({ payment }) => payment.reference)).toEqual(['TR2']);
  });

  it('inserts categories in any order in the file (children before parents)', async () => {
    const source = await createPopulatedDatabase('From the backup');
    const target = await createPopulatedDatabase('On this phone');
    const backup = await backupOf(source);
    const reordered = { ...backup, categories: [...backup.categories].reverse() };
    expect(reordered.categories[0].parentId).not.toBeNull();

    await restoreBackup(target, reordered);

    expect(await snapshot(target)).toEqual(await snapshot(source));
  });

  it('leaves the app usable: new expenses can use the restored categories', async () => {
    const source = await createPopulatedDatabase('From the backup');
    const target = createTestDatabase();
    await migrateDbIfNeeded(target);
    await restoreBackup(target, await backupOf(source));

    const created = await createExpenseRepository(target).create({
      amount: 1000,
      date: '2026-10-25',
      categoryId: await idOf(target, 'categories', 'Food & Groceries'),
      subcategoryId: null,
      description: 'Tea',
      paymentMethodId: await idOf(target, 'payment_methods', 'Cash'),
      isEssential: false,
      notes: null,
    });
    expect(created.amount).toBe(1000);
  });
});

describe('restoreBackup failures', () => {
  it.each<[string, (raw: any) => void]>([
    [
      'a blank description in the last item',
      (raw) => {
        raw.expenseItems.at(-1).description = '   ';
      },
    ],
    [
      'a duplicate payment id',
      (raw) => {
        raw.payments.push({ ...raw.payments[0], amount: 1 });
        raw.summary.paymentCount += 1;
        raw.summary.paymentTotal += 1;
      },
    ],
    [
      'a category parent loop',
      (raw) => {
        raw.categories[0].parentId = raw.categories[1].id;
        raw.categories[1].parentId = raw.categories[0].id;
      },
    ],
    [
      'a summary that does not match the records',
      (raw) => {
        // Bypasses parseBackup's own check, to prove restore re-verifies before committing.
        raw.summary.expenseItemTotal += 100;
      },
    ],
  ])('leaves existing data untouched on %s', async (_, mutate) => {
    const source = await createPopulatedDatabase('From the backup');
    const target = await createPopulatedDatabase('On this phone');
    const before = await snapshot(target);

    await expect(restoreBackup(target, tampered(await backupOf(source), mutate))).rejects.toThrow();

    expect(await snapshot(target)).toEqual(before);
    expect(await foreignKeyProblems(target)).toEqual([]);
  });
});

describe('restoreBackup (version 1)', () => {
  const expenses = buildSeptember2026Expenses();
  const categoryIds = [...new Set(expenses.map((e) => e.categoryId))];

  /** A version-1 backup file of the September dataset, as written before payments existed. */
  function buildV1Backup(): Backup {
    return parseBackup(
      JSON.stringify({
        format: 'expense-tracker-backup',
        version: 1,
        schemaVersion: 1,
        exportedAt: '2026-10-01T09:00:00.000Z',
        currency: 'INR',
        summary: {
          expenseCount: expenses.length,
          totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
          categoryCount: categoryIds.length,
          paymentMethodCount: 1,
        },
        categories: categoryIds.map((id, sortOrder) => ({
          id,
          name: id,
          parentId: null,
          type: 'expense',
          isEssentialDefault: false,
          icon: null,
          sortOrder,
          isActive: true,
        })),
        paymentMethods: [{ id: 'upi', name: 'UPI', sortOrder: 0, isActive: true }],
        expenses: expenses.map(({ paymentId, ...expense }) => expense),
      }),
    );
  }

  /** The same data as a version-1 database, migrated to v2 the way a phone was. */
  async function createMigratedV1Database(): Promise<SQLiteDatabase> {
    const db = createTestDatabase();
    await db.execAsync(SCHEMA_V1_SQL);
    for (const [sortOrder, id] of categoryIds.entries()) {
      await db.runAsync(
        'INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)',
        id,
        id,
        sortOrder,
      );
    }
    await db.runAsync("INSERT INTO payment_methods (id, name) VALUES ('upi', 'UPI')");
    for (const e of expenses) {
      await db.runAsync(
        `INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        e.id,
        e.amount,
        e.date,
        e.categoryId,
        e.subcategoryId,
        e.description,
        e.paymentMethodId,
        e.isEssential ? 1 : 0,
        e.notes,
        e.createdAt,
        e.updatedAt,
      );
    }
    await db.execAsync('PRAGMA user_version = 1');
    await migrateDbIfNeeded(db);
    return db;
  }

  it('maps expenses exactly as the v1 → v2 migration does', async () => {
    const target = await createPopulatedDatabase('On this phone');

    await restoreBackup(target, buildV1Backup());

    const migrated = await createMigratedV1Database();
    expect(await snapshot(target)).toEqual(await snapshot(migrated));
    expect(await foreignKeyProblems(target)).toEqual([]);
  });

  it('leaves existing data untouched on failure, and can be retried', async () => {
    const target = await createPopulatedDatabase('On this phone');
    const before = await snapshot(target);
    const broken = tampered(buildV1Backup(), (raw) => {
      raw.expenses.at(-1).description = ' ';
    });

    await expect(restoreBackup(target, broken)).rejects.toThrow();
    expect(await snapshot(target)).toEqual(before);

    // The temporary v1 table was rolled back with everything else, so a retry works.
    await restoreBackup(target, buildV1Backup());
    expect((await snapshot(target)).items).toHaveLength(expenses.length);
  });
});
