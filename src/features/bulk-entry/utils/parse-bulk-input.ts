import { parseAmountToPaise } from '@/utils/money';

export type ParsedEntry = {
  kind: 'entry';
  /** 1-based line number in the original text. */
  lineNumber: number;
  raw: string;
  description: string;
  /** One amount (paise) per `+`-separated term, in order. */
  amounts: number[];
};

export type ParsedError = {
  kind: 'error';
  lineNumber: number;
  raw: string;
  message: string;
};

export type ParsedLine = ParsedEntry | ParsedError;

/**
 * Description, then a ":" or whitespace separator, then an amount expression made of
 * digits, ".", "+", "₹" and spaces — e.g. "Chicken: 200+90+90" or "Bus 25 + 30".
 * The lazy description means the *first* separator before a valid-looking
 * expression wins, so "Eggs 12 34" is rejected rather than read as "Eggs 12" / 34.
 */
const LINE_PATTERN = /^(.*?)(?:\s*:\s*|\s+)([₹\d][₹\d.+\s]*)$/;
const AMOUNT_ONLY_PATTERN = /^[₹\d.+\s]+$/;

function parseLine(raw: string, lineNumber: number): ParsedLine {
  const line = raw.trim();
  const error = (message: string): ParsedError => ({ kind: 'error', lineNumber, raw, message });

  if (AMOUNT_ONLY_PATTERN.test(line)) {
    return error('Missing description');
  }

  const match = LINE_PATTERN.exec(line);
  if (!match || !/\d/.test(match[2])) {
    return error('No amount found');
  }

  const description = match[1]
    .replace(/[\s:–-]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!description) {
    return error('Missing description');
  }

  const expression = match[2].trim();
  const amounts: number[] = [];
  for (const term of expression.split('+')) {
    const amountText = term.trim().replace(/^₹\s*/, '');
    if (!amountText) {
      return error(`Incomplete amount "${expression}"`);
    }
    try {
      amounts.push(parseAmountToPaise(amountText));
    } catch {
      return error(`Invalid amount "${term.trim()}"`);
    }
  }

  return { kind: 'entry', lineNumber, raw, description, amounts };
}

/**
 * Parses notes-style bulk input, one line per item: "Chicken 200+90+90".
 * Blank lines are skipped. Malformed lines become errors — they are never dropped
 * or silently reinterpreted. Pure function — no I/O.
 */
export function parseBulkInput(text: string): ParsedLine[] {
  const results: ParsedLine[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    if (raw.trim()) {
      results.push(parseLine(raw, index + 1));
    }
  });
  return results;
}
