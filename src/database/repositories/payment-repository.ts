import type { SQLiteDatabase } from 'expo-sqlite';

import {
  assertValidItem,
  assertValidPayment,
  insertExpenseItem,
  insertPayment,
  toExpenseItem,
  toPayment,
} from '@/database/repositories/records';
import type { ExpenseItemRow, PaymentRow } from '@/database/schema/tables';
import { reconcilePayment } from '@/database/reconciliation';
import { formatPaise } from '@/utils/money';
import type { ExpenseItem, NewExpenseItem } from '@/types/expense';
import {
  PAYMENT_STATUSES,
  type NewPayment,
  type Payment,
  type PaymentStatus,
} from '@/types/payment';

export function createPaymentRepository(db: SQLiteDatabase) {
  return {
    /**
     * Saves a payment and the expense items it covers, atomically. Items may cover
     * less than the payment (partially allocated) but never more.
     */
    async createWithItems(
      payment: NewPayment,
      items: NewExpenseItem[],
    ): Promise<{ payment: Payment; items: ExpenseItem[] }> {
      assertValidPayment(payment);
      items.forEach(assertValidItem);
      const { status, allocated } = reconcilePayment(
        payment.amount,
        items.map((item) => item.amount),
      );
      if (status === 'over-allocated') {
        throw new Error(
          `Items total ${formatPaise(allocated)}, more than the payment of ${formatPaise(payment.amount)}`,
        );
      }

      const start = Date.now();
      let paymentId = '';
      await db.withTransactionAsync(async () => {
        paymentId = await insertPayment(db, payment, new Date(start).toISOString());
        for (const [index, item] of items.entries()) {
          await insertExpenseItem(db, paymentId, item, new Date(start + index).toISOString());
        }
      });

      const created = await this.getById(paymentId);
      if (!created) {
        throw new Error('Failed to read back the created payment');
      }
      return { payment: created, items: await this.listItems(paymentId) };
    },

    /** Records the outcome of a payment, e.g. once the user confirms it went through. */
    async updateStatus(
      id: string,
      status: PaymentStatus,
      details: { reference?: string | null } = {},
    ): Promise<void> {
      if (!PAYMENT_STATUSES.includes(status)) {
        throw new Error(`Invalid payment status: "${status}"`);
      }
      const now = new Date().toISOString();
      if (details.reference !== undefined) {
        await db.runAsync(
          'UPDATE payments SET status = ?, reference = ?, updated_at = ? WHERE id = ?',
          status,
          details.reference,
          now,
          id,
        );
      } else {
        await db.runAsync(
          'UPDATE payments SET status = ?, updated_at = ? WHERE id = ?',
          status,
          now,
          id,
        );
      }
    },

    /**
     * Deletes a payment and its items. Only for payments that never left the app
     * (e.g. the chosen UPI app wasn't installed); recorded payments are edited instead.
     */
    async deleteUnsent(id: string): Promise<void> {
      await db.runAsync("DELETE FROM payments WHERE id = ? AND status = 'initiated'", id);
    },

    /** Payments still waiting for the user to say what happened, newest first. */
    async listAwaitingConfirmation(): Promise<{ payment: Payment; items: ExpenseItem[] }[]> {
      const rows = await db.getAllAsync<PaymentRow>(
        `SELECT * FROM payments WHERE status IN ('initiated', 'unknown')
         ORDER BY created_at DESC`,
      );
      return Promise.all(
        rows.map(async (row) => ({ payment: toPayment(row), items: await this.listItems(row.id) })),
      );
    },

    async getById(id: string): Promise<Payment | null> {
      const row = await db.getFirstAsync<PaymentRow>('SELECT * FROM payments WHERE id = ?', id);
      return row ? toPayment(row) : null;
    },

    async listItems(paymentId: string): Promise<ExpenseItem[]> {
      const rows = await db.getAllAsync<ExpenseItemRow>(
        'SELECT * FROM expense_items WHERE payment_id = ? ORDER BY created_at ASC',
        paymentId,
      );
      return rows.map(toExpenseItem);
    },

    /** Every payment and expense item, oldest first (e.g. for backups). */
    async listAllWithItems(): Promise<{ payments: Payment[]; items: ExpenseItem[] }> {
      const [paymentRows, itemRows] = await Promise.all([
        db.getAllAsync<PaymentRow>('SELECT * FROM payments ORDER BY date, created_at'),
        db.getAllAsync<ExpenseItemRow>('SELECT * FROM expense_items ORDER BY date, created_at'),
      ]);
      return { payments: paymentRows.map(toPayment), items: itemRows.map(toExpenseItem) };
    },
  };
}

export type PaymentRepository = ReturnType<typeof createPaymentRepository>;
