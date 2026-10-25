import type { BackupData } from '@/features/settings/utils/backup';
import {
  buildExpensesCsv,
  escapeCsvField,
  formatPaiseForCsv,
} from '@/features/settings/utils/expenses-csv';
import { buildSeptember2026Expenses } from '@/test-utils/september-2026';
import type { Category } from '@/types/category';
import type { ExpenseItem } from '@/types/expense';
import type { Payment, PaymentStatus } from '@/types/payment';
import { addPaise } from '@/utils/money';

/** A strict RFC 4180 reader, to check the output parses back to the original values. */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r' && csv[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    throw new Error('CSV does not end with CRLF');
  }
  return rows;
}

const categories: Category[] = [
  { id: 'food', name: 'Food & Groceries', parentId: null },
  { id: 'food/eggs', name: 'Eggs', parentId: 'food' },
  { id: 'transport', name: 'Transportation', parentId: null },
].map((c, sortOrder) => ({
  ...c,
  type: 'expense',
  isEssentialDefault: true,
  icon: null,
  sortOrder,
  isActive: true,
}));

function payment(id: string, overrides: Partial<Payment> = {}): Payment {
  return {
    id,
    amount: 20000,
    date: '2026-10-01',
    paymentMethodId: 'upi',
    provider: null,
    merchantName: null,
    merchantVpa: null,
    status: 'confirmed',
    reference: null,
    notes: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

function item(id: string, paymentId: string, overrides: Partial<ExpenseItem> = {}): ExpenseItem {
  return {
    id,
    paymentId,
    amount: 20000,
    date: '2026-10-01',
    categoryId: 'food',
    subcategoryId: null,
    description: 'Chicken',
    isEssential: true,
    notes: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

function data(payments: Payment[], expenseItems: ExpenseItem[]): BackupData {
  return {
    categories,
    paymentMethods: [
      { id: 'upi', name: 'UPI', sortOrder: 0, isActive: true },
      { id: 'cash', name: 'Cash', sortOrder: 1, isActive: true },
    ],
    payments,
    expenseItems,
  };
}

/** Rows after the header, with the BOM removed. */
function bodyRows(csv: string): string[][] {
  return parseCsv(csv.replace(/^﻿/, '')).slice(1);
}

describe('formatPaiseForCsv', () => {
  it.each([
    [1, '0.01'],
    [10, '0.10'],
    [3250, '32.50'],
    [1625, '16.25'],
    [20000, '200.00'],
    [123456789, '1234567.89'],
  ])('formats %i paise as %s', (paise, expected) => {
    expect(formatPaiseForCsv(paise)).toBe(expected);
  });

  it('never goes through floating-point rupees', () => {
    // 0.1 + 0.2 !== 0.3 in floats; integer paise must still print exactly.
    expect(formatPaiseForCsv(addPaise(10, 20))).toBe('0.30');
    expect(formatPaiseForCsv(-3250)).toBe('-32.50');
    expect(() => formatPaiseForCsv(32.5)).toThrow('integer paise');
  });
});

describe('escapeCsvField', () => {
  it('leaves plain text alone', () => {
    expect(escapeCsvField('Chicken')).toBe('Chicken');
    expect(escapeCsvField('2026-10-01')).toBe('2026-10-01');
  });

  it('quotes commas, quotes, line breaks, and edge spaces', () => {
    expect(escapeCsvField('Tea, snacks')).toBe('"Tea, snacks"');
    expect(escapeCsvField('5" pipe')).toBe('"5"" pipe"');
    expect(escapeCsvField('line 1\nline 2')).toBe('"line 1\nline 2"');
    expect(escapeCsvField('a\r\nb')).toBe('"a\r\nb"');
    expect(escapeCsvField(' padded ')).toBe('" padded "');
  });

  it('stops spreadsheets running text as a formula', () => {
    expect(escapeCsvField('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(escapeCsvField('+91 98765')).toBe("'+91 98765");
    expect(escapeCsvField('-')).toBe("'-");
    expect(escapeCsvField('@home')).toBe("'@home");
    expect(escapeCsvField('=HYPERLINK("x","y")')).toBe('"\'=HYPERLINK(""x"",""y"")"');
  });
});

describe('buildExpensesCsv', () => {
  it('starts with a UTF-8 BOM and header, and ends every line with CRLF', () => {
    const csv = buildExpensesCsv(data([], []));
    expect(csv).toBe(
      '﻿Date,Description,Category,Subcategory,Amount (₹),Payment method,Type,Notes,' +
        'Payment app,Merchant,Merchant UPI ID,Reference\r\n',
    );
  });

  it('writes one row per item of a confirmed payment, with names instead of ids', () => {
    const csv = buildExpensesCsv(
      data(
        [
          payment('p1', {
            amount: 3250,
            provider: 'gpay',
            merchantName: 'Fresh Mart',
            merchantVpa: 'freshmart@okaxis',
            reference: 'TR123',
          }),
        ],
        [
          item('i1', 'p1', {
            amount: 3250,
            categoryId: 'food',
            subcategoryId: 'food/eggs',
            description: 'Eggs',
            notes: 'Dozen',
          }),
        ],
      ),
    );
    expect(bodyRows(csv)).toEqual([
      [
        '2026-10-01',
        'Eggs',
        'Food & Groceries',
        'Eggs',
        '32.50',
        'UPI',
        'Essential',
        'Dozen',
        'Google Pay',
        'Fresh Mart',
        'freshmart@okaxis',
        'TR123',
      ],
    ]);
  });

  it.each<PaymentStatus>(['initiated', 'unknown', 'failed'])(
    'leaves out items of %s payments',
    (status) => {
      const csv = buildExpensesCsv(
        data(
          [payment('p1'), payment('p2', { status })],
          [item('i1', 'p1'), item('i2', 'p2', { description: 'Not spent' })],
        ),
      );
      expect(bodyRows(csv).map((row) => row[1])).toEqual(['Chicken']);
    },
  );

  it('splits a multi-item payment into rows that each carry the payment details', () => {
    const csv = buildExpensesCsv(
      data(
        [payment('p1', { amount: 30000, paymentMethodId: 'cash', merchantName: 'Bakery' })],
        [
          item('i1', 'p1', { amount: 20000, description: 'Cake' }),
          item('i2', 'p1', {
            amount: 10000,
            description: 'Juice',
            isEssential: false,
            createdAt: '2026-10-01T10:00:00.001Z',
          }),
        ],
      ),
    );
    expect(bodyRows(csv).map((row) => [row[1], row[4], row[5], row[6], row[9]])).toEqual([
      ['Cake', '200.00', 'Cash', 'Essential', 'Bakery'],
      ['Juice', '100.00', 'Cash', 'Discretionary', 'Bakery'],
    ]);
  });

  it('round-trips awkward text, including ₹ and non-English scripts', () => {
    const descriptions = [
      'Tea, snacks',
      'He said "keep the change"',
      'Line one\nLine two',
      'ചായ', // Malayalam
      'चाय और समोसा', // Hindi
      '₹50 tea',
      '  spaces  ',
    ];
    const csv = buildExpensesCsv(
      data(
        descriptions.map((_, i) => payment(`p${i}`)),
        descriptions.map((description, i) =>
          item(`i${i}`, `p${i}`, { description, createdAt: `2026-10-01T10:00:0${i}.000Z` }),
        ),
      ),
    );
    expect(bodyRows(csv).map((row) => row[1])).toEqual(descriptions);
    expect(bodyRows(csv).every((row) => row.length === 12)).toBe(true);
  });

  it('falls back to payment notes and leaves unknown details empty', () => {
    const csv = buildExpensesCsv(
      data(
        [payment('p1', { notes: 'Paid at counter', provider: 'com.example.pay' })],
        [item('i1', 'p1')],
      ),
    );
    const [row] = bodyRows(csv);
    expect(row[3]).toBe('');
    expect(row[7]).toBe('Paid at counter');
    // Unknown provider ids are shown as stored.
    expect(row[8]).toBe('com.example.pay');
    expect(row.slice(9)).toEqual(['', '', '']);
  });

  it('exports the September dataset oldest first with exact totals', () => {
    const expenses = buildSeptember2026Expenses();
    const sepCategories: Category[] = [...new Set(expenses.map((e) => e.categoryId))].map(
      (id, sortOrder) => ({ ...categories[0], id, name: id, sortOrder }),
    );
    const csv = buildExpensesCsv({
      categories: sepCategories,
      paymentMethods: [{ id: 'upi', name: 'UPI', sortOrder: 0, isActive: true }],
      payments: [...expenses].reverse().map((e) => payment(e.paymentId, { amount: e.amount })),
      expenseItems: [...expenses].reverse().map(({ paymentMethodId, ...e }) => e),
    });
    const rows = bodyRows(csv);
    expect(rows).toHaveLength(63);

    const dates = rows.map((row) => row[0]);
    expect(dates).toEqual([...dates].sort());

    // Summing the exported rupee strings as paise gives back the exact total.
    const totalPaise = addPaise(...rows.map((row) => Number(row[4].replace('.', ''))));
    expect(totalPaise).toBe(1275950);
  });
});
