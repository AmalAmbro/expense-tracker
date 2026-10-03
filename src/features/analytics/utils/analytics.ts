import { calculateCategoryTotals } from '@/database/aggregations';
import { addDaysISODate, getMonthDateRange } from '@/utils/date';
import { addPaise, formatPaise, subtractPaise } from '@/utils/money';
import type { Expense } from '@/types/expense';

// Everything here is derived from transactions on demand — nothing is stored.

export type EssentialSplit = { essential: number; discretionary: number };

/** Splits spending (paise) into essential and discretionary. */
export function calculateEssentialSplit(expenses: Expense[]): EssentialSplit {
  let essential = 0;
  let discretionary = 0;
  for (const expense of expenses) {
    if (expense.isEssential) {
      essential = addPaise(essential, expense.amount);
    } else {
      discretionary = addPaise(discretionary, expense.amount);
    }
  }
  return { essential, discretionary };
}

export type DailyTotal = { date: string; total: number };

/**
 * Returns one entry per day of `month` ("YYYY-MM"), including days with no spending,
 * stopping at `throughDate` (inclusive) when given — e.g. today, for the current month.
 */
export function calculateDailyTotals(
  expenses: Expense[],
  month: string,
  throughDate?: string,
): DailyTotal[] {
  const { start, end } = getMonthDateRange(month);
  const last = throughDate && throughDate < end ? throughDate : end;

  const totalsByDate = new Map<string, number>();
  for (const expense of expenses) {
    totalsByDate.set(expense.date, addPaise(totalsByDate.get(expense.date) ?? 0, expense.amount));
  }

  const days: DailyTotal[] = [];
  for (let date = start; date <= last; date = addDaysISODate(date, 1)) {
    days.push({ date, total: totalsByDate.get(date) ?? 0 });
  }
  return days;
}

export type CategoryComparison = {
  categoryId: string;
  previous: number;
  current: number;
  /** current − previous, in paise. */
  change: number;
};

/**
 * Compares per-category totals between two periods. Includes every category with
 * spending in either period, ordered by current spending, then previous spending.
 */
export function compareCategoryTotals(
  currentExpenses: Expense[],
  previousExpenses: Expense[],
): CategoryComparison[] {
  const current = calculateCategoryTotals(currentExpenses);
  const previous = calculateCategoryTotals(previousExpenses);
  const categoryIds = new Set([...Object.keys(current), ...Object.keys(previous)]);

  return [...categoryIds]
    .map((categoryId) => {
      const currentTotal = current[categoryId] ?? 0;
      const previousTotal = previous[categoryId] ?? 0;
      return {
        categoryId,
        previous: previousTotal,
        current: currentTotal,
        change: subtractPaise(currentTotal, previousTotal),
      };
    })
    .sort((a, b) => b.current - a.current || b.previous - a.previous);
}

/** Describes a change factually, e.g. "Increased by ₹1,200.00" — never judgmentally. */
export function describeChange(change: number): string {
  if (change > 0) return `Increased by ${formatPaise(change)}`;
  if (change < 0) return `Decreased by ${formatPaise(-change)}`;
  return 'No change';
}
