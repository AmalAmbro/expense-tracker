import { calculateCategoryTotals, calculateMonthlyTotal } from '@/database/aggregations';
import type { Expense } from '@/types/expense';

export type CategoryTotal = { categoryId: string; total: number };

export type DashboardSummary = {
  /** Sum of all expenses in the month, in paise. */
  monthTotal: number;
  /** Sum of expenses dated `today`, in paise (0 when `today` isn't in the month). */
  todayTotal: number;
  transactionCount: number;
  /** Top-level category totals, largest first. */
  categoryTotals: CategoryTotal[];
  /** The most recent expenses, in the order given. */
  recent: Expense[];
};

/**
 * Derives every dashboard figure from one month's expenses, so the figures always
 * agree with each other and with the stored transactions. Pure function — no I/O.
 *
 * @param monthExpenses the month's expenses, newest first (as the repository returns them)
 * @param today ISO date used for the "today" total
 */
export function buildDashboardSummary(
  monthExpenses: Expense[],
  today: string,
  recentLimit = 5,
): DashboardSummary {
  const categoryTotals = Object.entries(calculateCategoryTotals(monthExpenses))
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total);

  return {
    monthTotal: calculateMonthlyTotal(monthExpenses),
    todayTotal: calculateMonthlyTotal(monthExpenses.filter((expense) => expense.date === today)),
    transactionCount: monthExpenses.length,
    categoryTotals,
    recent: monthExpenses.slice(0, recentLimit),
  };
}
