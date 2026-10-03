import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { ExpenseItemRow, ExpenseRow, PaymentRow } from '@/database/schema/tables';
import { isPositiveAmount } from '@/utils/money';
import type { Expense, ExpenseItem, NewExpenseItem } from '@/types/expense';
import {
  PAYMENT_STATUSES,
  type NewPayment,
  type Payment,
  type PaymentStatus,
} from '@/types/payment';

// Row mapping, validation, and inserts shared by the expense and payment repositories.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    amount: row.amount,
    date: row.date,
    paymentMethodId: row.payment_method_id,
    provider: row.provider,
    merchantName: row.merchant_name,
    merchantVpa: row.merchant_vpa,
    status: row.status as PaymentStatus,
    reference: row.reference,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toExpenseItem(row: ExpenseItemRow): ExpenseItem {
  return {
    id: row.id,
    paymentId: row.payment_id,
    amount: row.amount,
    date: row.date,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    description: row.description,
    isEssential: row.is_essential === 1,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toExpense(row: ExpenseRow): Expense {
  return { ...toExpenseItem(row), paymentMethodId: row.payment_method_id };
}

export function assertValidAmount(amount: number | undefined): void {
  if (amount !== undefined && !isPositiveAmount(amount)) {
    throw new Error('Amount must be a positive integer (paise)');
  }
}

export function assertValidDate(date: string | undefined): void {
  if (date !== undefined && !DATE_PATTERN.test(date)) {
    throw new Error(`Invalid date: "${date}"`);
  }
}

export function assertValidItem(item: Partial<NewExpenseItem>): void {
  assertValidAmount(item.amount);
  assertValidDate(item.date);
  if (item.description !== undefined && item.description.trim().length === 0) {
    throw new Error('Description must not be empty');
  }
}

export function assertValidPayment(payment: NewPayment): void {
  assertValidAmount(payment.amount);
  assertValidDate(payment.date);
  if (!PAYMENT_STATUSES.includes(payment.status)) {
    throw new Error(`Invalid payment status: "${payment.status}"`);
  }
}

export async function insertPayment(
  db: SQLiteDatabase,
  payment: NewPayment,
  timestamp: string,
): Promise<string> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO payments
       (id, amount, date, payment_method_id, provider, merchant_name, merchant_vpa, status,
        reference, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    payment.amount,
    payment.date,
    payment.paymentMethodId,
    payment.provider,
    payment.merchantName,
    payment.merchantVpa,
    payment.status,
    payment.reference,
    payment.notes,
    timestamp,
    timestamp,
  );
  return id;
}

export async function insertExpenseItem(
  db: SQLiteDatabase,
  paymentId: string,
  item: NewExpenseItem,
  timestamp: string,
): Promise<string> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO expense_items
       (id, payment_id, amount, date, category_id, subcategory_id, description, is_essential,
        notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    paymentId,
    item.amount,
    item.date,
    item.categoryId,
    item.subcategoryId,
    item.description,
    item.isEssential ? 1 : 0,
    item.notes,
    timestamp,
    timestamp,
  );
  return id;
}
