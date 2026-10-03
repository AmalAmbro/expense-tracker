import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { CREATE_TABLES_SQL } from '@/database/schema/tables';

import { SEED_CATEGORIES, SEED_PAYMENT_METHODS } from './seed-data';

export const DATABASE_VERSION = 1;

/** Runs on every app start; applies only the migrations newer than the stored version. */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // SQLite enforces foreign keys per-connection, not persistently, so this runs every launch.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(CREATE_TABLES_SQL);
    await seedCategories(db);
    await seedPaymentMethods(db);
    currentVersion = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${currentVersion}`);
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
