import {
  calculateDailyTotals,
  calculateEssentialSplit,
  compareCategoryTotals,
  describeChange,
} from '@/features/analytics/utils/analytics';
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

const september = buildSeptember2026Expenses();

describe('calculateEssentialSplit', () => {
  it('splits the September 2026 dataset exactly', () => {
    expect(calculateEssentialSplit(september)).toEqual({
      essential: 982550, // food + transport + health
      discretionary: 293400,
    });
  });

  it('returns zeros for no expenses', () => {
    expect(calculateEssentialSplit([])).toEqual({ essential: 0, discretionary: 0 });
  });
});

describe('calculateDailyTotals', () => {
  it('returns every day of the month, including days with no spending', () => {
    const days = calculateDailyTotals(september, '2026-09');
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ date: '2026-09-01', total: 81000 }); // chicken 200+90+90+150+100+180
    expect(days[5]).toEqual({ date: '2026-09-06', total: 154300 }); // bus fares, incl. 1212
    expect(days[29]).toEqual({ date: '2026-09-30', total: 0 });
  });

  it('adds up to the month total', () => {
    const sum = calculateDailyTotals(september, '2026-09').reduce((t, d) => t + d.total, 0);
    expect(sum).toBe(1275950);
  });

  it('stops at the given date for a month in progress', () => {
    const days = calculateDailyTotals([], '2026-10', '2026-10-03');
    expect(days.map((d) => d.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('ignores a through-date after the month ends', () => {
    expect(calculateDailyTotals([], '2026-09', '2026-10-03')).toHaveLength(30);
  });
});

describe('compareCategoryTotals', () => {
  const previous = [
    makeExpense({ categoryId: 'food', amount: 50000 }),
    makeExpense({ categoryId: 'transport', amount: 40000 }),
    makeExpense({ categoryId: 'giving', amount: 5000 }),
  ];
  const current = [
    makeExpense({ categoryId: 'food', amount: 30000 }),
    makeExpense({ categoryId: 'transport', amount: 45000 }),
    makeExpense({ categoryId: 'health', amount: 3500 }),
  ];

  it('includes categories from either period with exact changes', () => {
    expect(compareCategoryTotals(current, previous)).toEqual([
      { categoryId: 'transport', previous: 40000, current: 45000, change: 5000 },
      { categoryId: 'food', previous: 50000, current: 30000, change: -20000 },
      { categoryId: 'health', previous: 0, current: 3500, change: 3500 },
      { categoryId: 'giving', previous: 5000, current: 0, change: -5000 },
    ]);
  });

  it('returns nothing when both periods are empty', () => {
    expect(compareCategoryTotals([], [])).toEqual([]);
  });
});

describe('describeChange', () => {
  it('states increases, decreases, and no change factually', () => {
    expect(describeChange(120000)).toBe('Increased by ₹1,200.00');
    expect(describeChange(-30000)).toBe('Decreased by ₹300.00');
    expect(describeChange(0)).toBe('No change');
  });
});
