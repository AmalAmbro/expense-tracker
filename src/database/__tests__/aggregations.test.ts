import { calculateCategoryTotals, calculateMonthlyTotal } from '@/database/aggregations';
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

describe('calculateMonthlyTotal', () => {
  it('sums all expense amounts', () => {
    const expenses = [
      makeExpense({ amount: 20000 }),
      makeExpense({ amount: 9000 }),
      makeExpense({ amount: 9000 }),
    ];
    expect(calculateMonthlyTotal(expenses)).toBe(38000);
  });

  it('returns 0 for an empty list', () => {
    expect(calculateMonthlyTotal([])).toBe(0);
  });
});

describe('calculateCategoryTotals', () => {
  it('groups amounts by categoryId', () => {
    const expenses = [
      makeExpense({ categoryId: 'food', amount: 20000 }),
      makeExpense({ categoryId: 'food', amount: 9000 }),
      makeExpense({ categoryId: 'transport', amount: 3000 }),
    ];
    expect(calculateCategoryTotals(expenses)).toEqual({ food: 29000, transport: 3000 });
  });

  it('returns an empty object for an empty list', () => {
    expect(calculateCategoryTotals([])).toEqual({});
  });
});
