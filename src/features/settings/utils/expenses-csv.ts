import { providerDisplayName } from '@/features/upi/providers';
import type { BackupData } from '@/features/settings/utils/backup';
import type { ExpenseItem } from '@/types/expense';

const HEADER = [
  'Date',
  'Description',
  'Category',
  'Subcategory',
  'Amount (₹)',
  'Payment method',
  'Type',
  'Notes',
  'Payment app',
  'Merchant',
  'Merchant UPI ID',
  'Reference',
];

/** Byte order mark: without it, Excel opens UTF-8 CSVs as ANSI and garbles ₹ and non-English text. */
const UTF8_BOM = '﻿';
/** RFC 4180 line ending; Excel and Google Sheets both expect it. */
const EOL = '\r\n';

/** Paise as a plain decimal rupee string, e.g. 3250 -> "32.50". Integer maths only, no floats. */
export function formatPaiseForCsv(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new Error(`Amount must be integer paise: ${paise}`);
  }
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Quotes a text field when it holds a comma, quote, or line break (RFC 4180), and
 * defuses text that a spreadsheet would run as a formula ("=…", "+…", "-…", "@…") by
 * prefixing an apostrophe.
 */
export function escapeCsvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]|^\s|\s$/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Items of confirmed payments — what the app counts as spending — oldest first. */
export function selectSpendingItems(data: BackupData): ExpenseItem[] {
  const confirmed = new Set(data.payments.filter((p) => p.status === 'confirmed').map((p) => p.id));
  return data.expenseItems
    .filter((item) => confirmed.has(item.paymentId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

/**
 * Builds a CSV of everything the user has spent: one row per expense item of a
 * confirmed payment, oldest first. Pure function — no I/O.
 */
export function buildExpensesCsv(data: BackupData): string {
  const categoryNames = new Map(data.categories.map((c) => [c.id, c.name]));
  const methodNames = new Map(data.paymentMethods.map((m) => [m.id, m.name]));
  const payments = new Map(data.payments.map((p) => [p.id, p]));

  const rows = selectSpendingItems(data).map((item) => {
    const payment = payments.get(item.paymentId)!;
    const text = [
      item.date,
      item.description,
      categoryNames.get(item.categoryId) ?? '',
      item.subcategoryId ? (categoryNames.get(item.subcategoryId) ?? '') : '',
    ];
    const rest = [
      methodNames.get(payment.paymentMethodId) ?? '',
      item.isEssential ? 'Essential' : 'Discretionary',
      item.notes ?? payment.notes ?? '',
      providerDisplayName(payment.provider) ?? '',
      payment.merchantName ?? '',
      payment.merchantVpa ?? '',
      payment.reference ?? '',
    ];
    // The amount stays an unquoted number so spreadsheets can sum it.
    return [
      ...text.map(escapeCsvField),
      formatPaiseForCsv(item.amount),
      ...rest.map(escapeCsvField),
    ];
  });

  const lines = [HEADER.map(escapeCsvField), ...rows].map((fields) => fields.join(','));
  return `${UTF8_BOM}${lines.join(EOL)}${EOL}`;
}
