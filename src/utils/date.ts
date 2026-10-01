const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

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
