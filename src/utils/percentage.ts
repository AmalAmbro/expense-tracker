/** Formats `part / whole` as a percentage with one decimal place, e.g. "40.3%". */
export function formatShare(part: number, whole: number): string {
  if (whole <= 0) return '0%';
  const tenths = Math.round((part * 1000) / whole);
  return `${tenths % 10 === 0 ? tenths / 10 : (tenths / 10).toFixed(1)}%`;
}
