import type { SQLiteDatabase } from 'expo-sqlite';

import { calculateCategoryTotals, calculateMonthlyTotal } from '@/database/aggregations';
import { buildExpenseListQuery, EXPENSE_SELECT } from '@/database/queries/expense-list-query';
import {
  assertValidItem,
  insertExpenseItem,
  insertPayment,
  toExpense,
} from '@/database/repositories/records';
import type { ExpenseRow } from '@/database/schema/tables';
import { getMonthDateRange } from '@/utils/date';
import type { Expense, ExpenseFilter, ExpenseUpdate, NewExpense } from '@/types/expense';

/** Records a simple expense: one confirmed payment covering one item. No transaction. */
async function insertSimpleExpense(
  db: SQLiteDatabase,
  expense: NewExpense,
  timestamp: string,
): Promise<string> {
  const paymentId = await insertPayment(
    db,
    {
      amount: expense.amount,
      date: expense.date,
      paymentMethodId: expense.paymentMethodId,
      provider: null,
      merchantName: null,
      merchantVpa: null,
      status: 'confirmed',
      reference: null,
      notes: null,
    },
    timestamp,
  );
  return insertExpenseItem(db, paymentId, expense, timestamp);
}

/**
 * Expenses as the app's screens see them: expense items joined with their payment's
 * method. Ids are expense item ids. Each `create` records one payment with one item;
 * payments covering several items are created through the payment repository.
 */
export function createExpenseRepository(db: SQLiteDatabase) {
  return {
    async create(expense: NewExpense): Promise<Expense> {
      assertValidItem(expense);
      let id = '';
      await db.withTransactionAsync(async () => {
        id = await insertSimpleExpense(db, expense, new Date().toISOString());
      });

      const created = await this.getById(id);
      if (!created) {
        throw new Error('Failed to read back the created expense');
      }
      return created;
    },

    /**
     * Saves several expenses atomically: either all are saved or none are.
     * Each becomes its own payment. Returns how many were saved.
     */
    async createMany(expenses: NewExpense[]): Promise<number> {
      expenses.forEach(assertValidItem);
      const start = Date.now();
      await db.withTransactionAsync(async () => {
        for (const [index, expense] of expenses.entries()) {
          // Distinct, increasing timestamps keep the batch in a stable order.
          await insertSimpleExpense(db, expense, new Date(start + index).toISOString());
        }
      });
      return expenses.length;
    },

    async getById(id: string): Promise<Expense | null> {
      const row = await db.getFirstAsync<ExpenseRow>(`${EXPENSE_SELECT} WHERE e.id = ?`, id);
      return row ? toExpense(row) : null;
    },

    /**
     * Updates an expense item. When its payment covers only this item, the payment's
     * amount, date, and method follow the item. When the payment covers several items,
     * only the method is shared; amount changes are left for reconciliation to surface
     * rather than silently rewriting the payment.
     */
    async update(id: string, changes: ExpenseUpdate): Promise<Expense> {
      assertValidItem(changes);
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Expense not found: ${id}`);
      }

      const merged: Expense = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE expense_items
           SET amount = ?, date = ?, category_id = ?, subcategory_id = ?, description = ?,
               is_essential = ?, notes = ?, updated_at = ?
           WHERE id = ?`,
          merged.amount,
          merged.date,
          merged.categoryId,
          merged.subcategoryId,
          merged.description,
          merged.isEssential ? 1 : 0,
          merged.notes,
          merged.updatedAt,
          id,
        );

        const siblings = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) AS count FROM expense_items WHERE payment_id = ?',
          existing.paymentId,
        );
        if (siblings?.count === 1) {
          await db.runAsync(
            `UPDATE payments SET amount = ?, date = ?, payment_method_id = ?, updated_at = ?
             WHERE id = ?`,
            merged.amount,
            merged.date,
            merged.paymentMethodId,
            merged.updatedAt,
            existing.paymentId,
          );
        } else if (merged.paymentMethodId !== existing.paymentMethodId) {
          await db.runAsync(
            'UPDATE payments SET payment_method_id = ?, updated_at = ? WHERE id = ?',
            merged.paymentMethodId,
            merged.updatedAt,
            existing.paymentId,
          );
        }
      });

      return merged;
    },

    /** Deletes an expense item, and its payment too once no items remain on it. */
    async delete(id: string): Promise<void> {
      const existing = await this.getById(id);
      if (!existing) return;

      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM expense_items WHERE id = ?', id);
        await db.runAsync(
          `DELETE FROM payments
           WHERE id = ? AND NOT EXISTS (SELECT 1 FROM expense_items WHERE payment_id = ?)`,
          existing.paymentId,
          existing.paymentId,
        );
      });
    },

    async list(filter?: ExpenseFilter): Promise<Expense[]> {
      const { sql, params } = buildExpenseListQuery(filter);
      const rows = await db.getAllAsync<ExpenseRow>(sql, params);
      return rows.map(toExpense);
    },

    /** @param month "YYYY-MM" */
    async getMonthlyTotal(month: string): Promise<number> {
      const { start, end } = getMonthDateRange(month);
      const expenses = await this.list({ startDate: start, endDate: end });
      return calculateMonthlyTotal(expenses);
    },

    /** @param month "YYYY-MM" */
    async getCategoryTotals(month: string): Promise<Record<string, number>> {
      const { start, end } = getMonthDateRange(month);
      const expenses = await this.list({ startDate: start, endDate: end });
      return calculateCategoryTotals(expenses);
    },
  };
}

export type ExpenseRepository = ReturnType<typeof createExpenseRepository>;
