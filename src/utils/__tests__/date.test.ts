import { formatDisplayDate, fromISODate, getMonthDateRange, toISODate } from '@/utils/date';

describe('getMonthDateRange', () => {
  it('returns the first and last day of a 30-day month', () => {
    expect(getMonthDateRange('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });

  it('returns the first and last day of a 31-day month', () => {
    expect(getMonthDateRange('2026-10')).toEqual({ start: '2026-10-01', end: '2026-10-31' });
  });

  it('handles a non-leap-year February', () => {
    expect(getMonthDateRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('handles a leap-year February', () => {
    expect(getMonthDateRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('rejects malformed input', () => {
    expect(() => getMonthDateRange('2026-9')).toThrow();
    expect(() => getMonthDateRange('2026/09')).toThrow();
    expect(() => getMonthDateRange('2026-13')).toThrow();
    expect(() => getMonthDateRange('2026-00')).toThrow();
  });
});

describe('toISODate / fromISODate', () => {
  it('round-trips a date', () => {
    const date = new Date(2026, 9, 1); // October 1, 2026
    expect(toISODate(date)).toBe('2026-10-01');
    expect(toISODate(fromISODate('2026-10-01'))).toBe('2026-10-01');
  });

  it('pads single-digit months and days', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatDisplayDate', () => {
  it('formats an ISO date for display', () => {
    expect(formatDisplayDate('2026-10-01')).toBe('1 Oct 2026');
  });
});
