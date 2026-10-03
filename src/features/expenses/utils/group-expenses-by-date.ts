import { addPaise } from '@/utils/money';
import type { Expense } from '@/types/expense';

export type ExpenseDateGroup = {
  /** ISO date shared by every expense in the group. */
  date: string;
  /** Sum of the group's amounts, in paise. */
  total: number;
  data: Expense[];
};

/**
 * Groups expenses into one section per date, preserving the input order of both
 * the dates and the expenses within each date. Pure function — no I/O.
 */
export function groupExpensesByDate(expenses: Expense[]): ExpenseDateGroup[] {
  const groups: ExpenseDateGroup[] = [];
  const byDate = new Map<string, ExpenseDateGroup>();

  for (const expense of expenses) {
    let group = byDate.get(expense.date);
    if (!group) {
      group = { date: expense.date, total: 0, data: [] };
      byDate.set(expense.date, group);
      groups.push(group);
    }
    group.data.push(expense);
    group.total = addPaise(group.total, expense.amount);
  }

  return groups;
}
