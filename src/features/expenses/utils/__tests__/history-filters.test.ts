import {
  DEFAULT_HISTORY_FILTERS,
  hasActiveFilters,
  resolveDatePreset,
  toExpenseFilter,
} from '@/features/expenses/utils/history-filters';

describe('resolveDatePreset', () => {
  const today = '2026-10-03';

  it('applies no bounds for all time', () => {
    expect(resolveDatePreset('all', today)).toEqual({});
  });

  it('covers the whole current month', () => {
    expect(resolveDatePreset('this-month', today)).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
  });

  it('covers the whole previous month, including across a year boundary', () => {
    expect(resolveDatePreset('last-month', today)).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    expect(resolveDatePreset('last-month', '2027-01-15')).toEqual({
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    });
  });

  it('covers the last 30 days including today', () => {
    expect(resolveDatePreset('last-30-days', today)).toEqual({
      startDate: '2026-09-04',
      endDate: '2026-10-03',
    });
  });

  it('covers the current calendar year', () => {
    expect(resolveDatePreset('this-year', today)).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
  });
});

describe('toExpenseFilter', () => {
  it('maps default filters to an empty repository filter', () => {
    expect(toExpenseFilter(DEFAULT_HISTORY_FILTERS, '2026-10-03')).toEqual({
      search: undefined,
      categoryId: undefined,
      paymentMethodId: undefined,
      isEssential: undefined,
    });
  });

  it('maps every filter field', () => {
    expect(
      toExpenseFilter(
        {
          search: '  bus ',
          datePreset: 'this-month',
          categoryId: 'transport',
          paymentMethodId: 'upi',
          essential: 'discretionary',
        },
        '2026-10-03',
      ),
    ).toEqual({
      search: 'bus',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      categoryId: 'transport',
      paymentMethodId: 'upi',
      isEssential: false,
    });
  });
});

describe('hasActiveFilters', () => {
  it('ignores the search text', () => {
    expect(hasActiveFilters({ ...DEFAULT_HISTORY_FILTERS, search: 'tea' })).toBe(false);
  });

  it('detects any narrowing filter', () => {
    expect(hasActiveFilters({ ...DEFAULT_HISTORY_FILTERS, essential: 'essential' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_HISTORY_FILTERS, categoryId: 'food' })).toBe(true);
  });
});
