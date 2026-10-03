import {
  addDaysISODate,
  formatMonthLabel,
  formatShortMonth,
  shiftMonth,
  formatDayHeading,
  formatDisplayDate,
  fromISODate,
  getMonthDateRange,
  toISODate,
} from '@/utils/date';

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

describe('addDaysISODate', () => {
  it('moves across month and year boundaries', () => {
    expect(addDaysISODate('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDaysISODate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISODate('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('formatDayHeading', () => {
  it('labels today and yesterday relative to the given day', () => {
    expect(formatDayHeading('2026-10-03', '2026-10-03')).toBe('Today');
    expect(formatDayHeading('2026-10-02', '2026-10-03')).toBe('Yesterday');
  });

  it('formats older dates with the weekday', () => {
    expect(formatDayHeading('2026-10-01', '2026-10-03')).toBe('Thu, 1 Oct 2026');
  });
});

describe('shiftMonth', () => {
  it('moves forward and backward within a year', () => {
    expect(shiftMonth('2026-10', -1)).toBe('2026-09');
    expect(shiftMonth('2026-09', 1)).toBe('2026-10');
  });

  it('crosses year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-10', -12)).toBe('2025-10');
  });

  it('rejects malformed months', () => {
    expect(() => shiftMonth('2026-13', 1)).toThrow();
  });
});

describe('formatMonthLabel', () => {
  it('formats a month with its full name and year', () => {
    expect(formatMonthLabel('2026-10')).toBe('October 2026');
    expect(formatMonthLabel('2026-09')).toBe('September 2026');
  });
});

describe('formatShortMonth', () => {
  it('formats the short month name', () => {
    expect(formatShortMonth('2026-09')).toBe('Sep');
    expect(formatShortMonth('2026-10')).toBe('Oct');
  });
});
