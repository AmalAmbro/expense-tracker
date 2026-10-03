const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

const displayDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Converts a Date to an ISO "YYYY-MM-DD" string using local time. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses an ISO "YYYY-MM-DD" string into a local Date at midnight. */
export function fromISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayISODate(): string {
  return toISODate(new Date());
}

/** Formats an ISO "YYYY-MM-DD" string for display, e.g. "1 Oct 2026". */
export function formatDisplayDate(isoDate: string): string {
  return displayDateFormatter.format(fromISODate(isoDate));
}

/** Returns the inclusive [start, end] ISO date range for a "YYYY-MM" month string. */
export function getMonthDateRange(month: string): { start: string; end: string } {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    throw new Error(`Invalid month: "${month}"`);
  }

  const [, yearText, monthText] = match;
  const monthIndex = Number(monthText) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error(`Invalid month: "${month}"`);
  }

  const lastDay = new Date(Number(yearText), monthIndex + 1, 0).getDate();
  return {
    start: `${yearText}-${monthText}-01`,
    end: `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`,
  };
}

const weekdayFormatter = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });

/** Returns the ISO date `days` days after (or before, if negative) the given ISO date. */
export function addDaysISODate(isoDate: string, days: number): string {
  const date = fromISODate(isoDate);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Formats an ISO date as a list heading: "Today", "Yesterday", or e.g. "Thu, 1 Oct 2026". */
export function formatDayHeading(isoDate: string, today: string = todayISODate()): string {
  if (isoDate === today) return 'Today';
  if (isoDate === addDaysISODate(today, -1)) return 'Yesterday';
  return `${weekdayFormatter.format(fromISODate(isoDate))}, ${formatDisplayDate(isoDate)}`;
}

const monthNameFormatter = new Intl.DateTimeFormat('en-IN', { month: 'long' });

/** Returns the current month as "YYYY-MM", in local time. */
export function currentMonth(): string {
  return todayISODate().slice(0, 7);
}

/** Returns the "YYYY-MM" month `delta` months after (or before, if negative) `month`. */
export function shiftMonth(month: string, delta: number): string {
  const { start } = getMonthDateRange(month); // validates the input
  const date = fromISODate(start);
  date.setMonth(date.getMonth() + delta);
  return toISODate(date).slice(0, 7);
}

/** Formats a "YYYY-MM" month for display, e.g. "October 2026". */
export function formatMonthLabel(month: string): string {
  const { start } = getMonthDateRange(month);
  return `${monthNameFormatter.format(fromISODate(start))} ${start.slice(0, 4)}`;
}
