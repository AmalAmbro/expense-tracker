import { buildDashboardSummary } from '@/features/dashboard/utils/dashboard-summary';
import { buildSeptember2026Expenses } from '@/test-utils/september-2026';
import type { Expense } from '@/types/expense';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'id',
    paymentId: 'payment-1',
    amount: 100,
    date: '2026-10-01',
    categoryId: 'food',
    subcategoryId: null,
    description: 'Test',
    paymentMethodId: 'upi',
    isEssential: true,
    notes: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildDashboardSummary with the September 2026 dataset', () => {
  const summary = buildDashboardSummary(buildSeptember2026Expenses(), '2026-10-03');

  it('totals the month exactly, in paise', () => {
    expect(summary.monthTotal).toBe(1275950); // ₹12,759.50
    expect(summary.transactionCount).toBe(63);
  });

  it('totals each category exactly, largest first', () => {
    expect(summary.categoryTotals).toEqual([
      { categoryId: 'food', total: 514150 },
      { categoryId: 'transport', total: 464900 },
      { categoryId: 'shopping', total: 241000 },
      { categoryId: 'recreation', total: 16400 },
      { categoryId: 'entertainment', total: 16000 },
      { categoryId: 'personal-care', total: 15000 },
      { categoryId: 'giving', total: 5000 },
      { categoryId: 'health', total: 3500 },
    ]);
  });

  it('has category totals that add up to the month total', () => {
    const sum = summary.categoryTotals.reduce((total, c) => total + c.total, 0);
    expect(sum).toBe(summary.monthTotal);
  });

  it('reports nothing spent today when today is outside the month', () => {
    expect(summary.todayTotal).toBe(0);
  });
});

describe('buildDashboardSummary', () => {
  const expenses = [
    makeExpense({ id: 'a', date: '2026-10-03', amount: 1500 }),
    makeExpense({ id: 'b', date: '2026-10-03', amount: 3000, categoryId: 'transport' }),
    makeExpense({ id: 'c', date: '2026-10-02', amount: 20000 }),
    makeExpense({ id: 'd', date: '2026-10-01', amount: 50000, categoryId: 'transport' }),
  ];

  it("sums only today's expenses for the today total", () => {
    expect(buildDashboardSummary(expenses, '2026-10-03').todayTotal).toBe(4500);
  });

  it('keeps the most recent expenses, up to the limit, in the given order', () => {
    const { recent } = buildDashboardSummary(expenses, '2026-10-03', 3);
    expect(recent.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns zeros for a month with no expenses', () => {
    expect(buildDashboardSummary([], '2026-10-03')).toEqual({
      monthTotal: 0,
      todayTotal: 0,
      transactionCount: 0,
      categoryTotals: [],
      recent: [],
    });
  });
});
