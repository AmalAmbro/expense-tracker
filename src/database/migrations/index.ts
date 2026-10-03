import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  SCHEMA_V1_SQL,
  SCHEMA_V2_COPY_SQL,
  SCHEMA_V2_CREATE_SQL,
  SCHEMA_V2_FINALIZE_SQL,
} from '@/database/schema/tables';

import { SEED_CATEGORIES, SEED_PAYMENT_METHODS } from './seed-data';

export const DATABASE_VERSION = 2;

/** Runs on every app start; applies only the migrations newer than the stored version. */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // SQLite enforces foreign keys per-connection, not persistently, so this runs every launch.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  let currentVersion = await getUserVersion(db);
  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(SCHEMA_V1_SQL);
    await seedCategories(db);
    await seedPaymentMethods(db);
    await db.execAsync('PRAGMA user_version = 1');
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    await migrateV1ToV2(db);
    currentVersion = 2;
  }
}

async function getUserVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

type Totals = { count: number; total: number };

async function getTotals(db: SQLiteDatabase, table: string): Promise<Totals> {
  const row = await db.getFirstAsync<Totals>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM ${table}`,
  );
  return row ?? { count: 0, total: 0 };
}

/**
 * Splits each v1 expense into a payment and one linked expense item. Runs in a single
 * transaction and verifies counts and paise totals before dropping the old table, so
 * any failure rolls back to the untouched v1 data.
 */
export async function migrateV1ToV2(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(SCHEMA_V2_CREATE_SQL);
    await db.execAsync(SCHEMA_V2_COPY_SQL);

    const expenses = await getTotals(db, 'expenses');
    const payments = await getTotals(db, 'payments');
    const items = await getTotals(db, 'expense_items');
    const matches = (t: Totals) => t.count === expenses.count && t.total === expenses.total;
    if (!matches(payments) || !matches(items)) {
      throw new Error(
        `Migration check failed: ${expenses.count} expenses (${expenses.total} paise) became ` +
          `${payments.count} payments (${payments.total}) and ${items.count} items (${items.total})`,
      );
    }

    await db.execAsync(SCHEMA_V2_FINALIZE_SQL);
    await db.execAsync('PRAGMA user_version = 2');
  });
}

async function seedCategories(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const insert = await db.prepareAsync(
      `INSERT INTO categories (id, name, parent_id, type, is_essential_default, icon, sort_order, is_active)
       VALUES ($id, $name, $parentId, 'expense', $isEssentialDefault, NULL, $sortOrder, 1)`,
    );
    try {
      let sortOrder = 0;
      for (const category of SEED_CATEGORIES) {
        const parentId = Crypto.randomUUID();
        await insert.executeAsync({
          $id: parentId,
          $name: category.name,
          $parentId: null,
          $isEssentialDefault: category.isEssentialDefault ? 1 : 0,
          $sortOrder: sortOrder++,
        });

        let childSortOrder = 0;
        for (const childName of category.children) {
          await insert.executeAsync({
            $id: Crypto.randomUUID(),
            $name: childName,
            $parentId: parentId,
            $isEssentialDefault: category.isEssentialDefault ? 1 : 0,
            $sortOrder: childSortOrder++,
          });
        }
      }
    } finally {
      await insert.finalizeAsync();
    }
  });
}

async function seedPaymentMethods(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const insert = await db.prepareAsync(
      `INSERT INTO payment_methods (id, name, sort_order, is_active) VALUES ($id, $name, $sortOrder, 1)`,
    );
    try {
      let sortOrder = 0;
      for (const name of SEED_PAYMENT_METHODS) {
        await insert.executeAsync({
          $id: Crypto.randomUUID(),
          $name: name,
          $sortOrder: sortOrder++,
        });
      }
    } finally {
      await insert.finalizeAsync();
    }
  });
}
