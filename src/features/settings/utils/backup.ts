import { z } from 'zod';

import { addPaise, isPositiveAmount } from '@/utils/money';
import type { Category } from '@/types/category';
import type { Expense } from '@/types/expense';
import type { PaymentMethod } from '@/types/payment-method';

export const BACKUP_FORMAT = 'expense-tracker-backup';
export const BACKUP_VERSION = 1;

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

const expenseSchema = z.object({
  id: z.string().min(1),
  amount: z.number().refine(isPositiveAmount, 'Amount must be a positive integer (paise)'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().min(1),
  subcategoryId: z.string().nullable(),
  description: z.string(),
  paymentMethodId: z.string().min(1),
  isEssential: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  /** The database schema version (PRAGMA user_version) the data came from. */
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  /** Amounts are integer paise (₹1 = 100). */
  currency: z.literal('INR'),
  summary: z.object({
    expenseCount: z.number().int(),
    /** Sum of all expense amounts, in paise — a checksum for the expenses array. */
    totalAmount: z.number().int(),
    categoryCount: z.number().int(),
    paymentMethodCount: z.number().int(),
  }),
  categories: z.array(categorySchema),
  paymentMethods: z.array(paymentMethodSchema),
  expenses: z.array(expenseSchema),
});

export type Backup = z.infer<typeof backupSchema>;

export type BackupData = {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  expenses: Expense[];
};

/** Assembles a full backup of the user's data. Pure function — no I/O. */
export function buildBackup(
  data: BackupData,
  options: { schemaVersion: number; exportedAt: Date },
): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schemaVersion: options.schemaVersion,
    exportedAt: options.exportedAt.toISOString(),
    currency: 'INR',
    summary: {
      expenseCount: data.expenses.length,
      totalAmount: addPaise(...data.expenses.map((e) => e.amount)),
      categoryCount: data.categories.length,
      paymentMethodCount: data.paymentMethods.length,
    },
    categories: data.categories,
    paymentMethods: data.paymentMethods,
    expenses: data.expenses,
  };
}

export function serializeBackup(backup: Backup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

/**
 * Parses and checks a backup file: structure, amounts, and that the summary
 * matches the data. Throws a descriptive error if anything is off.
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
  const { summary } = backup;
  if (
    summary.expenseCount !== backup.expenses.length ||
    summary.categoryCount !== backup.categories.length ||
    summary.paymentMethodCount !== backup.paymentMethods.length
  ) {
    throw new Error('Backup summary counts do not match its contents');
  }
  if (summary.totalAmount !== addPaise(...backup.expenses.map((e) => e.amount))) {
    throw new Error('Backup total does not match its expenses');
  }
  return backup;
}

/** e.g. "expense-tracker-backup-2026-10-03-2214.json", in local time. */
export function backupFileName(exportedAt: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${exportedAt.getFullYear()}-${pad(exportedAt.getMonth() + 1)}-${pad(exportedAt.getDate())}`;
  const time = `${pad(exportedAt.getHours())}${pad(exportedAt.getMinutes())}`;
  return `${BACKUP_FORMAT}-${date}-${time}.json`;
}
