import { addDaysISODate, getMonthDateRange, shiftMonth } from '@/utils/date';
import type { ExpenseFilter } from '@/types/expense';

export type DatePreset = 'all' | 'this-month' | 'last-month' | 'last-30-days' | 'this-year';
export type EssentialFilter = 'all' | 'essential' | 'discretionary';

/** UI-level filter state for the history screen. */
export type HistoryFilters = {
  search: string;
  datePreset: DatePreset;
  categoryId: string | null;
  paymentMethodId: string | null;
  essential: EssentialFilter;
};

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  search: '',
  datePreset: 'all',
  categoryId: null,
  paymentMethodId: null,
  essential: 'all',
};

export const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-30-days', label: 'Last 30 days' },
  { value: 'this-year', label: 'This year' },
];

export const ESSENTIAL_FILTER_OPTIONS: { value: EssentialFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'essential', label: 'Essential' },
  { value: 'discretionary', label: 'Discretionary' },
];

/** Resolves a date preset to an inclusive ISO date range, relative to `today` ("YYYY-MM-DD"). */
export function resolveDatePreset(
  preset: DatePreset,
  today: string,
): { startDate?: string; endDate?: string } {
  const year = Number(today.slice(0, 4));

  switch (preset) {
    case 'all':
      return {};
    case 'this-month': {
      const { start, end } = getMonthDateRange(today.slice(0, 7));
      return { startDate: start, endDate: end };
    }
    case 'last-month': {
      const { start, end } = getMonthDateRange(shiftMonth(today.slice(0, 7), -1));
      return { startDate: start, endDate: end };
    }
    case 'last-30-days':
      return { startDate: addDaysISODate(today, -29), endDate: today };
    case 'this-year':
      return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }
}

/** Converts the history screen's filter state into a repository filter. */
export function toExpenseFilter(filters: HistoryFilters, today: string): ExpenseFilter {
  return {
    search: filters.search.trim() || undefined,
    ...resolveDatePreset(filters.datePreset, today),
    categoryId: filters.categoryId ?? undefined,
    paymentMethodId: filters.paymentMethodId ?? undefined,
    isEssential: filters.essential === 'all' ? undefined : filters.essential === 'essential',
  };
}

/** True when any filter other than the search text is narrowing the list. */
export function hasActiveFilters(filters: HistoryFilters): boolean {
  return (
    filters.datePreset !== DEFAULT_HISTORY_FILTERS.datePreset ||
    filters.categoryId !== DEFAULT_HISTORY_FILTERS.categoryId ||
    filters.paymentMethodId !== DEFAULT_HISTORY_FILTERS.paymentMethodId ||
    filters.essential !== DEFAULT_HISTORY_FILTERS.essential
  );
}
