import type { SQLiteDatabase } from 'expo-sqlite';

import { SCHEMA_V2_COPY_SQL } from '@/database/schema/tables';
import { summarizeBackup, type Backup, type BackupV1 } from '@/features/settings/utils/backup';
import type { Category } from '@/types/category';

type Totals = { count: number; total: number };

/** Parents before children, so each category's parent row exists when it is inserted. */
function parentsFirst(categories: Category[]): Category[] {
  const ordered: Category[] = [];
  const placed = new Set<string>();
  let remaining = categories;
  while (remaining.length > 0) {
    const ready = remaining.filter((c) => c.parentId === null || placed.has(c.parentId));
    if (ready.length === 0) {
      throw new Error('Backup categories have a parent loop');
    }
    ready.forEach((c) => placed.add(c.id));
    ordered.push(...ready);
    remaining = remaining.filter((c) => !placed.has(c.id));
  }
  return ordered;
}

async function insertAll<T>(
  db: SQLiteDatabase,
  sql: string,
  records: T[],
  toParams: (record: T) => Record<string, string | number | null>,
): Promise<void> {
  const statement = await db.prepareAsync(sql);
  try {
    for (const record of records) {
      await statement.executeAsync(toParams(record));
    }
  } finally {
    await statement.finalizeAsync();
  }
}

async function getTotals(db: SQLiteDatabase, table: string): Promise<Totals> {
  const row = await db.getFirstAsync<Totals>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM ${table}`,
  );
  return row ?? { count: 0, total: 0 };
}

async function getCount(db: SQLiteDatabase, table: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return row?.count ?? 0;
}

/**
 * Loads v1 expenses into a temporary `expenses` table and runs the v1 → v2 migration's
 * own copy step on it, so a restored v1 file gets exactly the mapping a migrated
 * database did.
 */
async function restoreV1Expenses(db: SQLiteDatabase, backup: BackupV1): Promise<void> {
  await db.execAsync(`
    CREATE TEMP TABLE expenses (
      id TEXT PRIMARY KEY NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      category_id TEXT NOT NULL,
      subcategory_id TEXT,
      description TEXT NOT NULL,
      payment_method_id TEXT NOT NULL,
      is_essential INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await insertAll(
    db,
    `INSERT INTO temp.expenses
       (id, amount, date, category_id, subcategory_id, description, payment_method_id,
        is_essential, notes, created_at, updated_at)
     VALUES ($id, $amount, $date, $categoryId, $subcategoryId, $description, $paymentMethodId,
        $isEssential, $notes, $createdAt, $updatedAt)`,
    backup.expenses,
    (e) => ({
      $id: e.id,
      $amount: e.amount,
      $date: e.date,
      $categoryId: e.categoryId,
      $subcategoryId: e.subcategoryId,
      $description: e.description,
      $paymentMethodId: e.paymentMethodId,
      $isEssential: e.isEssential ? 1 : 0,
      $notes: e.notes,
      $createdAt: e.createdAt,
      $updatedAt: e.updatedAt,
    }),
  );
  await db.execAsync(SCHEMA_V2_COPY_SQL);
  await db.execAsync('DROP TABLE temp.expenses;');
}

/**
 * Replaces all data with the contents of a parsed backup (see `parseBackup`). Runs in a
 * single transaction and checks counts and paise totals before committing, so on any
 * failure the existing data is left exactly as it was.
 */
export async function restoreBackup(db: SQLiteDatabase, backup: Backup): Promise<void> {
  const categories = parentsFirst(backup.categories);

  await db.withTransactionAsync(async () => {
    // Children first, so foreign keys hold after every statement.
    await db.execAsync(`
      DELETE FROM expense_items;
      DELETE FROM payments;
      DELETE FROM categories;
      DELETE FROM payment_methods;
    `);

    await insertAll(
      db,
      `INSERT INTO categories (id, name, parent_id, type, is_essential_default, icon, sort_order, is_active)
       VALUES ($id, $name, $parentId, $type, $isEssentialDefault, $icon, $sortOrder, $isActive)`,
      categories,
      (c) => ({
        $id: c.id,
        $name: c.name,
        $parentId: c.parentId,
        $type: c.type,
        $isEssentialDefault: c.isEssentialDefault ? 1 : 0,
        $icon: c.icon,
        $sortOrder: c.sortOrder,
        $isActive: c.isActive ? 1 : 0,
      }),
    );
    await insertAll(
      db,
      `INSERT INTO payment_methods (id, name, sort_order, is_active)
       VALUES ($id, $name, $sortOrder, $isActive)`,
      backup.paymentMethods,
      (m) => ({ $id: m.id, $name: m.name, $sortOrder: m.sortOrder, $isActive: m.isActive ? 1 : 0 }),
    );

    if (backup.version === 1) {
      await restoreV1Expenses(db, backup);
    } else {
      await insertAll(
        db,
        `INSERT INTO payments
           (id, amount, date, payment_method_id, provider, merchant_name, merchant_vpa, status,
            reference, notes, created_at, updated_at)
         VALUES ($id, $amount, $date, $paymentMethodId, $provider, $merchantName, $merchantVpa,
            $status, $reference, $notes, $createdAt, $updatedAt)`,
        backup.payments,
        (p) => ({
          $id: p.id,
          $amount: p.amount,
          $date: p.date,
          $paymentMethodId: p.paymentMethodId,
          $provider: p.provider,
          $merchantName: p.merchantName,
          $merchantVpa: p.merchantVpa,
          $status: p.status,
          $reference: p.reference,
          $notes: p.notes,
          $createdAt: p.createdAt,
          $updatedAt: p.updatedAt,
        }),
      );
      await insertAll(
        db,
        `INSERT INTO expense_items
           (id, payment_id, amount, date, category_id, subcategory_id, description, is_essential,
            notes, created_at, updated_at)
         VALUES ($id, $paymentId, $amount, $date, $categoryId, $subcategoryId, $description,
            $isEssential, $notes, $createdAt, $updatedAt)`,
        backup.expenseItems,
        (item) => ({
          $id: item.id,
          $paymentId: item.paymentId,
          $amount: item.amount,
          $date: item.date,
          $categoryId: item.categoryId,
          $subcategoryId: item.subcategoryId,
          $description: item.description,
          $isEssential: item.isEssential ? 1 : 0,
          $notes: item.notes,
          $createdAt: item.createdAt,
          $updatedAt: item.updatedAt,
        }),
      );
    }

    const expected = summarizeBackup(backup);
    // parseBackup has already checked these summary totals against the records.
    const [paymentTotal, itemTotal] =
      backup.version === 1
        ? [backup.summary.totalAmount, backup.summary.totalAmount]
        : [backup.summary.paymentTotal, backup.summary.expenseItemTotal];
    const payments = await getTotals(db, 'payments');
    const items = await getTotals(db, 'expense_items');
    if (
      payments.count !== expected.paymentCount ||
      payments.total !== paymentTotal ||
      items.count !== expected.expenseItemCount ||
      items.total !== itemTotal ||
      (await getCount(db, 'categories')) !== expected.categoryCount ||
      (await getCount(db, 'payment_methods')) !== expected.paymentMethodCount
    ) {
      throw new Error(
        `Restore check failed: expected ${expected.paymentCount} payments (${paymentTotal} paise) ` +
          `and ${expected.expenseItemCount} items (${itemTotal}), got ${payments.count} ` +
          `(${payments.total}) and ${items.count} (${items.total})`,
      );
    }
  });
}
