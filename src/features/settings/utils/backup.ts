import { z } from 'zod';

import { reconcilePayment } from '@/database/reconciliation';
import { addPaise, isPositiveAmount } from '@/utils/money';
import type { Category } from '@/types/category';
import type { ExpenseItem } from '@/types/expense';
import { PAYMENT_STATUSES, type Payment } from '@/types/payment';
import type { PaymentMethod } from '@/types/payment-method';

export const BACKUP_FORMAT = 'expense-tracker-backup';
/** The version `buildBackup` writes. `parseBackup` also reads every earlier version. */
export const BACKUP_VERSION = 2;

const amount = z.number().refine(isPositiveAmount, 'Amount must be a positive integer (paise)');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  parentId: z.string().nullable(),
  type: z.string(),
  isEssentialDefault: z.boolean(),
  icon: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

const paymentMethodSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

const header = {
  format: z.literal(BACKUP_FORMAT),
  /** The database schema version (PRAGMA user_version) the data came from. */
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  /** Amounts are integer paise (₹1 = 100). */
  currency: z.literal('INR'),
  categories: z.array(categorySchema),
  paymentMethods: z.array(paymentMethodSchema),
};

/** Version 1 (database schema 1): one flat list of expenses. */
const backupV1Schema = z.object({
  ...header,
  version: z.literal(1),
  summary: z.object({
    expenseCount: z.number().int(),
    totalAmount: z.number().int(),
    categoryCount: z.number().int(),
    paymentMethodCount: z.number().int(),
  }),
  expenses: z.array(
    z.object({
      id: z.string().min(1),
      amount,
      date: isoDate,
      categoryId: z.string().min(1),
      subcategoryId: z.string().nullable(),
      description: z.string(),
      paymentMethodId: z.string().min(1),
      isEssential: z.boolean(),
      notes: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
});

/** Version 2 (database schema 2): payments and the expense items they cover. */
const backupV2Schema = z.object({
  ...header,
  version: z.literal(2),
  summary: z.object({
    paymentCount: z.number().int(),
    /** Sum of payment amounts, in paise — a checksum for `payments`. */
    paymentTotal: z.number().int(),
    expenseItemCount: z.number().int(),
    /** Sum of expense item amounts, in paise — a checksum for `expenseItems`. */
    expenseItemTotal: z.number().int(),
    categoryCount: z.number().int(),
    paymentMethodCount: z.number().int(),
  }),
  payments: z.array(
    z.object({
      id: z.string().min(1),
      amount,
      date: isoDate,
      paymentMethodId: z.string().min(1),
      provider: z.string().nullable(),
      merchantName: z.string().nullable(),
      merchantVpa: z.string().nullable(),
      status: z.enum(PAYMENT_STATUSES),
      reference: z.string().nullable(),
      notes: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  expenseItems: z.array(
    z.object({
      id: z.string().min(1),
      paymentId: z.string().min(1),
      amount,
      date: isoDate,
      categoryId: z.string().min(1),
      subcategoryId: z.string().nullable(),
      description: z.string(),
      isEssential: z.boolean(),
      notes: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
});

const backupSchema = z.discriminatedUnion('version', [backupV1Schema, backupV2Schema]);

export type BackupV1 = z.infer<typeof backupV1Schema>;
export type BackupV2 = z.infer<typeof backupV2Schema>;
export type Backup = z.infer<typeof backupSchema>;

export type BackupData = {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  payments: Payment[];
  expenseItems: ExpenseItem[];
};

function sumAmounts(records: { amount: number }[]): number {
  return addPaise(...records.map((record) => record.amount));
}

/** Assembles a full backup of the user's data. Pure function — no I/O. */
export function buildBackup(
  data: BackupData,
  options: { schemaVersion: number; exportedAt: Date },
): BackupV2 {
  return {
    format: BACKUP_FORMAT,
    version: 2,
    schemaVersion: options.schemaVersion,
    exportedAt: options.exportedAt.toISOString(),
    currency: 'INR',
    summary: {
      paymentCount: data.payments.length,
      paymentTotal: sumAmounts(data.payments),
      expenseItemCount: data.expenseItems.length,
      expenseItemTotal: sumAmounts(data.expenseItems),
      categoryCount: data.categories.length,
      paymentMethodCount: data.paymentMethods.length,
    },
    categories: data.categories,
    paymentMethods: data.paymentMethods,
    payments: data.payments,
    expenseItems: data.expenseItems,
  };
}

export function serializeBackup(backup: Backup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

/** Every link between records must point at a record in the same file. */
function checkReferences(
  backup: Backup,
  records: {
    id: string;
    paymentMethodId?: string;
    categoryId?: string;
    subcategoryId?: string | null;
  }[],
): void {
  const categoryIds = new Set(backup.categories.map((c) => c.id));
  const methodIds = new Set(backup.paymentMethods.map((m) => m.id));
  for (const category of backup.categories) {
    if (category.parentId !== null && !categoryIds.has(category.parentId)) {
      throw new Error(`Category ${category.id} refers to a missing parent category`);
    }
  }
  for (const record of records) {
    if (record.paymentMethodId !== undefined && !methodIds.has(record.paymentMethodId)) {
      throw new Error(`Record ${record.id} refers to a missing payment method`);
    }
    if (record.categoryId !== undefined && !categoryIds.has(record.categoryId)) {
      throw new Error(`Record ${record.id} refers to a missing category`);
    }
    if (record.subcategoryId && !categoryIds.has(record.subcategoryId)) {
      throw new Error(`Record ${record.id} refers to a missing subcategory`);
    }
  }
}

function checkV1(backup: BackupV1): void {
  const { summary } = backup;
  if (
    summary.expenseCount !== backup.expenses.length ||
    summary.categoryCount !== backup.categories.length ||
    summary.paymentMethodCount !== backup.paymentMethods.length
  ) {
    throw new Error('Backup summary counts do not match its contents');
  }
  if (summary.totalAmount !== sumAmounts(backup.expenses)) {
    throw new Error('Backup total does not match its expenses');
  }
  checkReferences(backup, backup.expenses);
}

function checkV2(backup: BackupV2): void {
  const { summary } = backup;
  if (
    summary.paymentCount !== backup.payments.length ||
    summary.expenseItemCount !== backup.expenseItems.length ||
    summary.categoryCount !== backup.categories.length ||
    summary.paymentMethodCount !== backup.paymentMethods.length
  ) {
    throw new Error('Backup summary counts do not match its contents');
  }
  if (summary.paymentTotal !== sumAmounts(backup.payments)) {
    throw new Error('Backup payment total does not match its payments');
  }
  if (summary.expenseItemTotal !== sumAmounts(backup.expenseItems)) {
    throw new Error('Backup expense item total does not match its items');
  }

  checkReferences(backup, [...backup.payments, ...backup.expenseItems]);

  const itemAmountsByPayment = new Map(backup.payments.map((p) => [p.id, [] as number[]]));
  for (const item of backup.expenseItems) {
    const amounts = itemAmountsByPayment.get(item.paymentId);
    if (!amounts) {
      throw new Error(`Expense item ${item.id} refers to a missing payment`);
    }
    amounts.push(item.amount);
  }
  for (const payment of backup.payments) {
    const amounts = itemAmountsByPayment.get(payment.id) ?? [];
    if (reconcilePayment(payment.amount, amounts).status === 'over-allocated') {
      throw new Error(`Payment ${payment.id} has items totalling more than the payment`);
    }
  }
}

/**
 * Parses and checks a backup file of any supported version: structure, amounts, links
 * between records, and that the summary matches the data. Throws a descriptive error
 * if anything is off.
 */
export function parseBackup(json: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Backup file is not valid JSON');
  }

  const result = backupSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Invalid backup at "${issue.path.join('.')}": ${issue.message}`);
  }

  const backup = result.data;
  if (backup.version === 1) {
    checkV1(backup);
  } else {
    checkV2(backup);
  }
  return backup;
}

export type BackupSummary = {
  version: Backup['version'];
  exportedAt: string;
  paymentCount: number;
  expenseItemCount: number;
  /** Items of confirmed payments only — what the app counts as spending, in paise. */
  spendingCount: number;
  spendingTotal: number;
  categoryCount: number;
  paymentMethodCount: number;
  /** Earliest and latest expense item dates, or null when there are none. */
  firstDate: string | null;
  lastDate: string | null;
};

/** What a backup holds, for showing before a restore. Pure function. */
export function summarizeBackup(backup: Backup): BackupSummary {
  let paymentCount: number;
  let items: { amount: number; date: string }[];
  let spending: { amount: number }[];
  if (backup.version === 1) {
    // Each v1 expense becomes one confirmed payment with one item (as in the v1 → v2 migration).
    paymentCount = backup.expenses.length;
    items = backup.expenses;
    spending = backup.expenses;
  } else {
    const confirmed = new Set(
      backup.payments.filter((p) => p.status === 'confirmed').map((p) => p.id),
    );
    paymentCount = backup.payments.length;
    items = backup.expenseItems;
    spending = backup.expenseItems.filter((item) => confirmed.has(item.paymentId));
  }
  const dates = items.map((item) => item.date).sort();

  return {
    version: backup.version,
    exportedAt: backup.exportedAt,
    paymentCount,
    expenseItemCount: items.length,
    spendingCount: spending.length,
    spendingTotal: sumAmounts(spending),
    categoryCount: backup.categories.length,
    paymentMethodCount: backup.paymentMethods.length,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
  };
}

/** e.g. "2026-10-03-2214", in local time — for export file names. */
export function fileTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/** e.g. "expense-tracker-backup-2026-10-03-2214.json", in local time. */
export function backupFileName(exportedAt: Date): string {
  return `${BACKUP_FORMAT}-${fileTimestamp(exportedAt)}.json`;
}
