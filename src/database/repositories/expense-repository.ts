import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { calculateCategoryTotals, calculateMonthlyTotal } from '@/database/aggregations';
import { buildExpenseListQuery } from '@/database/queries/expense-list-query';
import type { ExpenseRow } from '@/database/schema/tables';
import { getMonthDateRange } from '@/utils/date';
import { isPositiveAmount } from '@/utils/money';
import type { Expense, ExpenseFilter, ExpenseUpdate, NewExpense } from '@/types/expense';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    date: row.date,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    description: row.description,
    paymentMethodId: row.payment_method_id,
    isEssential: row.is_essential === 1,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertValid(expense: NewExpense | ExpenseUpdate): void {
  if (expense.amount !== undefined && !isPositiveAmount(expense.amount)) {
    throw new Error('Amount must be a positive integer (paise)');
  }
  if (expense.description !== undefined && expense.description.trim().length === 0) {
    throw new Error('Description must not be empty');
  }
  if (expense.date !== undefined && !DATE_PATTERN.test(expense.date)) {
    throw new Error(`Invalid date: "${expense.date}"`);
  }
}

export function createExpenseRepository(db: SQLiteDatabase) {
  return {
    async create(expense: NewExpense): Promise<Expense> {
      assertValid(expense);
      const now = new Date().toISOString();
      const id = Crypto.randomUUID();

      await db.runAsync(
        `INSERT INTO expenses
           (id, amount, date, category_id, subcategory_id, description, payment_method_id, is_essential, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        expense.amount,
        expense.date,
        expense.categoryId,
        expense.subcategoryId,
        expense.description,
        expense.paymentMethodId,
        expense.isEssential ? 1 : 0,
        expense.notes,
        now,
        now,
      );

      const created = await this.getById(id);
      if (!created) {
        throw new Error('Failed to read back the created expense');
      }
      return created;
    },

    async getById(id: string): Promise<Expense | null> {
      const row = await db.getFirstAsync<ExpenseRow>('SELECT * FROM expenses WHERE id = ?', id);
      return row ? toExpense(row) : null;
    },

    async update(id: string, changes: ExpenseUpdate): Promise<Expense> {
      assertValid(changes);
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Expense not found: ${id}`);
      }

      const merged: Expense = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      await db.runAsync(
        `UPDATE expenses
         SET amount = ?, date = ?, category_id = ?, subcategory_id = ?, description = ?,
             payment_method_id = ?, is_essential = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        merged.amount,
        merged.date,
        merged.categoryId,
        merged.subcategoryId,
        merged.description,
        merged.paymentMethodId,
        merged.isEssential ? 1 : 0,
        merged.notes,
        merged.updatedAt,
        id,
      );

      return merged;
    },

    async delete(id: string): Promise<void> {
      await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
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
