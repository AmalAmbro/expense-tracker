import { addPaise } from '@/utils/money';
import type { Expense } from '@/types/expense';

/** Sums expense amounts (in paise). Pure function — no I/O. */
export function calculateMonthlyTotal(expenses: Expense[]): number {
  return addPaise(...expenses.map((expense) => expense.amount));
}

/** Groups expense amounts (in paise) by categoryId. Pure function — no I/O. */
export function calculateCategoryTotals(expenses: Expense[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const expense of expenses) {
    totals[expense.categoryId] = addPaise(totals[expense.categoryId] ?? 0, expense.amount);
  }
  return totals;
}
