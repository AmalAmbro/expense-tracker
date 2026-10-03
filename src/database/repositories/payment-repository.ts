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
import type { NewPayment, Payment } from '@/types/payment';

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
