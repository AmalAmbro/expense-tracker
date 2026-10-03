import {
  addPaise,
  formatPaise,
  formatPaiseForInput,
  isPositiveAmount,
  parseAmountToPaise,
  subtractPaise,
  toPaise,
} from '@/utils/money';

describe('toPaise', () => {
  it('converts rupees to integer paise', () => {
    expect(toPaise(896)).toBe(89600);
    expect(toPaise(32.5)).toBe(3250);
  });
});

describe('parseAmountToPaise', () => {
  it('parses whole and decimal amounts', () => {
    expect(parseAmountToPaise('896')).toBe(89600);
    expect(parseAmountToPaise('32.50')).toBe(3250);
    expect(parseAmountToPaise('13')).toBe(1300);
  });

  it('trims surrounding whitespace', () => {
    expect(parseAmountToPaise('  50  ')).toBe(5000);
  });

  it('rejects non-numeric input', () => {
    expect(() => parseAmountToPaise('abc')).toThrow();
    expect(() => parseAmountToPaise('??')).toThrow();
  });

  it('rejects negative amounts', () => {
    expect(() => parseAmountToPaise('-5')).toThrow();
  });

  it('rejects zero', () => {
    expect(() => parseAmountToPaise('0')).toThrow();
  });

  it('rejects more than two decimal places', () => {
    expect(() => parseAmountToPaise('10.555')).toThrow();
  });
});

describe('addPaise', () => {
  it('sums amounts without floating-point drift', () => {
    expect(addPaise(10, 20)).toBe(30);
    expect(addPaise(parseAmountToPaise('0.1'), parseAmountToPaise('0.2'))).toBe(30);
  });

  it('sums an expense-tracker-style list', () => {
    expect(addPaise(20000, 9000, 9000)).toBe(38000);
  });
});

describe('subtractPaise', () => {
  it('subtracts amounts', () => {
    expect(subtractPaise(10000, 2500)).toBe(7500);
  });
});

describe('isPositiveAmount', () => {
  it('accepts positive integers', () => {
    expect(isPositiveAmount(100)).toBe(true);
  });

  it('rejects zero, negatives, and non-integers', () => {
    expect(isPositiveAmount(0)).toBe(false);
    expect(isPositiveAmount(-100)).toBe(false);
    expect(isPositiveAmount(10.5)).toBe(false);
  });
});

describe('formatPaise', () => {
  it('formats paise as a rupee string', () => {
    expect(formatPaise(89600)).toBe('₹896.00');
  });

  it('groups thousands using Indian digit grouping', () => {
    expect(formatPaise(842000)).toBe('₹8,420.00');
  });
});

describe('formatPaiseForInput', () => {
  it('drops the decimal part for whole rupees', () => {
    expect(formatPaiseForInput(20000)).toBe('200');
  });

  it('keeps two decimal places otherwise', () => {
    expect(formatPaiseForInput(3250)).toBe('32.50');
    expect(formatPaiseForInput(1625)).toBe('16.25');
    expect(formatPaiseForInput(5)).toBe('0.05');
  });

  it('round-trips through parseAmountToPaise', () => {
    for (const paise of [1, 99, 100, 3250, 89600, 121200]) {
      expect(parseAmountToPaise(formatPaiseForInput(paise))).toBe(paise);
    }
  });
});
