import { parseBulkInput, type ParsedLine } from '@/features/bulk-entry/utils/parse-bulk-input';
import { SEPTEMBER_2026_LINES } from '@/test-utils/september-2026';

/** Flattens parsed entries to one { description, amount } per transaction. */
function transactions(lines: ParsedLine[]) {
  return lines.flatMap((line) =>
    line.kind === 'entry'
      ? line.amounts.map((amount) => ({ description: line.description, amount }))
      : [],
  );
}

describe('parseBulkInput', () => {
  it('expands the plan.md example into individual transactions in paise', () => {
    const lines = parseBulkInput('Chicken 200+90+90\nEggs 140\nBus 25+30');
    expect(transactions(lines)).toEqual([
      { description: 'Chicken', amount: 20000 },
      { description: 'Chicken', amount: 9000 },
      { description: 'Chicken', amount: 9000 },
      { description: 'Eggs', amount: 14000 },
      { description: 'Bus', amount: 2500 },
      { description: 'Bus', amount: 3000 },
    ]);
  });

  it('meets the Milestone 6 acceptance example (five transactions)', () => {
    const lines = parseBulkInput('Chicken 200+90\nEggs 140\nBus 25+30');
    expect(transactions(lines)).toHaveLength(5);
    expect(lines.every((line) => line.kind === 'entry')).toBe(true);
  });

  it('accepts colon separators, multi-word descriptions, decimals, spaces, and ₹', () => {
    expect(transactions(parseBulkInput('Tea snacks: 40+30+10'))).toEqual([
      { description: 'Tea snacks', amount: 4000 },
      { description: 'Tea snacks', amount: 3000 },
      { description: 'Tea snacks', amount: 1000 },
    ]);
    expect(transactions(parseBulkInput('Eggs 32.5 + 16.25'))).toEqual([
      { description: 'Eggs', amount: 3250 },
      { description: 'Eggs', amount: 1625 },
    ]);
    expect(transactions(parseBulkInput('  Bus   fare   ₹25+₹30  '))).toEqual([
      { description: 'Bus fare', amount: 2500 },
      { description: 'Bus fare', amount: 3000 },
    ]);
  });

  it('allows digits inside the description', () => {
    expect(transactions(parseBulkInput('7up 20'))).toEqual([{ description: '7up', amount: 2000 }]);
  });

  it('records 1-based line numbers and skips blank lines', () => {
    const lines = parseBulkInput('\nChicken 200\n\n  \nEggs 140\n');
    expect(lines.map((line) => line.lineNumber)).toEqual([2, 5]);
  });

  it('flags the malformed examples from plan.md instead of producing transactions', () => {
    const lines = parseBulkInput('Chicken abc\nBus -\nEggs ??');
    expect(lines).toEqual([
      { kind: 'error', lineNumber: 1, raw: 'Chicken abc', message: 'No amount found' },
      { kind: 'error', lineNumber: 2, raw: 'Bus -', message: 'No amount found' },
      { kind: 'error', lineNumber: 3, raw: 'Eggs ??', message: 'No amount found' },
    ]);
  });

  it.each([
    ['200', 'Missing description'],
    ['200+90', 'Missing description'],
    ['Chicken 200+', 'Incomplete amount "200+"'],
    ['Chicken 200++90', 'Incomplete amount "200++90"'],
    ['Eggs 10.555', 'Invalid amount "10.555"'],
    ['Eggs 0', 'Invalid amount "0"'],
    ['Eggs 12 34', 'Invalid amount "12 34"'],
    ['Eggs 1.2.3', 'Invalid amount "1.2.3"'],
  ])('rejects %p (%s)', (input, message) => {
    expect(parseBulkInput(input)).toEqual([{ kind: 'error', lineNumber: 1, raw: input, message }]);
  });

  it('never silently alters an amount written with a thousands separator', () => {
    // "1,212" must not be read as 212 (or as 1 and 212).
    expect(parseBulkInput('Bus 1,212')[0].kind).toBe('error');
  });

  it('keeps errors alongside valid lines so nothing is dropped', () => {
    const lines = parseBulkInput('Chicken 200\nEggs ??\nBus 30');
    expect(lines.map((line) => line.kind)).toEqual(['entry', 'error', 'entry']);
  });

  it('parses the full September 2026 dataset exactly', () => {
    const text = SEPTEMBER_2026_LINES.map((l) => `${l.description}: ${l.amounts}`).join('\n');
    const lines = parseBulkInput(text);
    expect(lines.every((line) => line.kind === 'entry')).toBe(true);

    const all = transactions(lines);
    expect(all).toHaveLength(63);
    expect(all.reduce((sum, t) => sum + t.amount, 0)).toBe(1275950);
    expect(all.filter((t) => t.description === 'Bus fare').map((t) => t.amount)).toContain(121200);
  });
});
