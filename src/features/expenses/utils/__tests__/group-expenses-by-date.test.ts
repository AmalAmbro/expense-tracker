import { groupExpensesByDate } from '@/features/expenses/utils/group-expenses-by-date';
import type { Expense } from '@/types/expense';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'id',
    amount: 100,
    date: '2026-09-01',
    categoryId: 'cat-1',
    subcategoryId: null,
    description: 'Test',
    paymentMethodId: 'pm-1',
    isEssential: true,
    notes: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('groupExpensesByDate', () => {
  it('groups by date, preserving input order, with per-day totals in paise', () => {
    const expenses = [
      makeExpense({ id: 'a', date: '2026-10-02', amount: 50000 }),
      makeExpense({ id: 'b', date: '2026-10-02', amount: 12000 }),
      makeExpense({ id: 'c', date: '2026-10-01', amount: 20000 }),
      makeExpense({ id: 'd', date: '2026-10-01', amount: 3000 }),
      makeExpense({ id: 'e', date: '2026-10-01', amount: 1500 }),
    ];

    const groups = groupExpensesByDate(expenses);

    expect(groups.map((g) => g.date)).toEqual(['2026-10-02', '2026-10-01']);
    expect(groups[0].data.map((e) => e.id)).toEqual(['a', 'b']);
    expect(groups[0].total).toBe(62000);
    expect(groups[1].data.map((e) => e.id)).toEqual(['c', 'd', 'e']);
    expect(groups[1].total).toBe(24500);
  });

  it('sums decimal amounts exactly', () => {
    const groups = groupExpensesByDate([
      makeExpense({ amount: 3250 }),
      makeExpense({ amount: 1300 }),
      makeExpense({ amount: 1625 }),
    ]);
    expect(groups[0].total).toBe(6175);
  });

  it('returns no groups for no expenses', () => {
    expect(groupExpensesByDate([])).toEqual([]);
  });
});
