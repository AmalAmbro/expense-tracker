import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION, migrateDbIfNeeded } from '@/database/migrations';
import { SCHEMA_V1_SQL } from '@/database/schema/tables';
import { createTestDatabase } from '@/test-utils/node-sqlite-database';
import { buildSeptember2026Expenses } from '@/test-utils/september-2026';

jest.mock('expo-crypto', () => {
  let counter = 0;
  return { randomUUID: () => `uuid-${++counter}` };
});

async function tableNames(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  return rows.map((row) => row.name);
}

async function userVersion(db: SQLiteDatabase): Promise<number> {
  return (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))!.user_version;
}

/** A version-1 database holding the September 2026 dataset, as on a device before v2. */
async function createV1Database(): Promise<SQLiteDatabase> {
  const db = createTestDatabase();
  await db.execAsync(SCHEMA_V1_SQL);
  const categoryIds = new Set(buildSeptember2026Expenses().map((e) => e.categoryId));
  for (const id of categoryIds) {
    await db.runAsync('INSERT INTO categories (id, name) VALUES (?, ?)', id, id);
  }
  await db.runAsync("INSERT INTO payment_methods (id, name) VALUES ('upi', 'UPI')");
  for (const e of buildSeptember2026Expenses()) {
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
  return db;
}

describe('migrateDbIfNeeded', () => {
  it('creates and seeds a fresh database at the latest version', async () => {
    const db = createTestDatabase();
    await migrateDbIfNeeded(db);

    expect(await userVersion(db)).toBe(DATABASE_VERSION);
    expect(await tableNames(db)).toEqual([
      'categories',
      'expense_items',
      'payment_methods',
      'payments',
    ]);
    const categories = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM categories',
    );
    expect(categories!.n).toBeGreaterThan(0);
  });

  it('is a no-op when already up to date', async () => {
    const db = createTestDatabase();
    await migrateDbIfNeeded(db);
    await migrateDbIfNeeded(db);
    expect(await userVersion(db)).toBe(DATABASE_VERSION);
  });
});

describe('migration v1 → v2', () => {
  it('turns each expense into one confirmed payment with one linked item', async () => {
    const db = await createV1Database();
    await migrateDbIfNeeded(db);

    expect(await userVersion(db)).toBe(2);
    expect(await tableNames(db)).not.toContain('expenses');

    const payments = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM payments ORDER BY id',
    );
    const items = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM expense_items ORDER BY id',
    );
    const expected = buildSeptember2026Expenses().sort((a, b) => a.id.localeCompare(b.id));

    expect(payments).toHaveLength(63);
    expect(items).toHaveLength(63);
    expected.forEach((e, i) => {
      expect(payments[i]).toEqual({
        id: e.id,
        amount: e.amount,
        date: e.date,
        payment_method_id: e.paymentMethodId,
        provider: null,
        merchant_name: null,
        merchant_vpa: null,
        status: 'confirmed',
        reference: null,
        notes: null,
        created_at: e.createdAt,
        updated_at: e.updatedAt,
      });
      expect(items[i]).toEqual({
        id: e.id,
        payment_id: e.id,
        amount: e.amount,
        date: e.date,
        category_id: e.categoryId,
        subcategory_id: e.subcategoryId,
        description: e.description,
        is_essential: e.isEssential ? 1 : 0,
        notes: e.notes,
        created_at: e.createdAt,
        updated_at: e.updatedAt,
      });
    });
  });

  it('preserves the paise totals exactly', async () => {
    const db = await createV1Database();
    await migrateDbIfNeeded(db);
    for (const table of ['payments', 'expense_items']) {
      const row = await db.getFirstAsync<{ total: number }>(
        `SELECT SUM(amount) AS total FROM ${table}`,
      );
      expect(row!.total).toBe(1275950);
    }
  });

  it('rolls back completely if any row fails to migrate, leaving v1 data untouched', async () => {
    const db = await createV1Database();
    // A row pointing at a missing payment method can only exist if foreign keys were off;
    // copying it into `payments` violates the foreign key and aborts the migration.
    await db.execAsync('PRAGMA foreign_keys = OFF');
    await db.runAsync(
      `INSERT INTO expenses VALUES ('bad', 100, '2026-09-30', 'food', NULL, 'Bad', 'missing', 1, NULL, 't', 't')`,
    );

    await expect(migrateDbIfNeeded(db)).rejects.toThrow();

    expect(await userVersion(db)).toBe(1);
    expect(await tableNames(db)).toEqual(['categories', 'expenses', 'payment_methods']);
    const row = await db.getFirstAsync<{ n: number; total: number }>(
      'SELECT COUNT(*) AS n, SUM(amount) AS total FROM expenses',
    );
    expect(row).toEqual({ n: 64, total: 1276050 });
  });
});
