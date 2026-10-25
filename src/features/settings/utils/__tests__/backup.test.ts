import {
  backupFileName,
  buildBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
  type BackupData,
} from '@/features/settings/utils/backup';
import { buildSeptember2026Expenses } from '@/test-utils/september-2026';
import type { Category } from '@/types/category';
import type { ExpenseItem } from '@/types/expense';
import type { Payment } from '@/types/payment';
import type { PaymentMethod } from '@/types/payment-method';

const paymentMethods: PaymentMethod[] = [
  { id: 'upi', name: 'UPI', sortOrder: 0, isActive: true },
  { id: 'old-card', name: 'Old card', sortOrder: 1, isActive: false },
];

/** One category per id the September dataset uses ("food", "transport", …). */
function buildCategories(categoryIds: string[]): Category[] {
  return [...new Set(categoryIds)].map((id, sortOrder) => ({
    id,
    name: id,
    parentId: null,
    type: 'expense',
    isEssentialDefault: false,
    icon: null,
    sortOrder,
    isActive: true,
  }));
}

/** The September dataset as v2 records: one payment per expense item. */
function buildData(): BackupData {
  const expenses = buildSeptember2026Expenses();
  const payments: Payment[] = expenses.map((e) => ({
    id: e.paymentId,
    amount: e.amount,
    date: e.date,
    paymentMethodId: e.paymentMethodId,
    provider: null,
    merchantName: null,
    merchantVpa: null,
    status: 'confirmed',
    reference: null,
    notes: null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }));
  const expenseItems: ExpenseItem[] = expenses.map(({ paymentMethodId, ...item }) => item);
  return {
    categories: buildCategories(expenses.map((e) => e.categoryId)),
    paymentMethods,
    payments,
    expenseItems,
  };
}

const data = buildData();
const exportedAt = new Date(2026, 9, 3, 22, 14);
const backup = buildBackup(data, { schemaVersion: 2, exportedAt });

// `any`: tests deliberately corrupt the parsed JSON in ways the Backup type forbids.
function tampered(mutate: (raw: any) => void): string {
  const raw = JSON.parse(serializeBackup(backup));
  mutate(raw);
  return JSON.stringify(raw);
}

describe('buildBackup', () => {
  it('writes version 2 with payments, items, and a checksum summary', () => {
    expect(backup.format).toBe('expense-tracker-backup');
    expect(backup.version).toBe(2);
    expect(backup.schemaVersion).toBe(2);
    expect(backup.summary).toEqual({
      paymentCount: 63,
      paymentTotal: 1275950,
      expenseItemCount: 63,
      expenseItemTotal: 1275950,
      categoryCount: data.categories.length,
      paymentMethodCount: 2,
    });
  });

  it('keeps inactive records', () => {
    expect(backup.paymentMethods.map((m) => m.id)).toContain('old-card');
  });
});

describe('parseBackup (version 2)', () => {
  it('round-trips without altering any amount', () => {
    expect(parseBackup(serializeBackup(backup))).toEqual(backup);
  });

  it('rejects non-JSON and foreign files', () => {
    expect(() => parseBackup('not json')).toThrow('not valid JSON');
    expect(() => parseBackup('{"format":"something-else"}')).toThrow('Invalid backup');
  });

  it('rejects fractional amounts', () => {
    const json = tampered((raw) => {
      raw.expenseItems[0].amount = 200.5;
    });
    expect(() => parseBackup(json)).toThrow('expenseItems.0.amount');
  });

  it('detects a missing record via the summary', () => {
    const json = tampered((raw) => {
      raw.expenseItems.pop();
    });
    expect(() => parseBackup(json)).toThrow('counts do not match');
  });

  it('detects a changed amount via the totals', () => {
    const json = tampered((raw) => {
      raw.payments[0].amount += 100;
    });
    expect(() => parseBackup(json)).toThrow('payment total does not match');
  });

  it('rejects an item whose payment is missing', () => {
    const json = tampered((raw) => {
      raw.expenseItems[0].paymentId = 'nope';
    });
    expect(() => parseBackup(json)).toThrow('refers to a missing payment');
  });

  it('rejects links to categories or payment methods missing from the file', () => {
    const missingCategory = tampered((raw) => {
      raw.expenseItems[0].categoryId = 'gone';
    });
    expect(() => parseBackup(missingCategory)).toThrow('refers to a missing category');

    const missingSubcategory = tampered((raw) => {
      raw.expenseItems[0].subcategoryId = 'gone';
    });
    expect(() => parseBackup(missingSubcategory)).toThrow('refers to a missing subcategory');

    const missingMethod = tampered((raw) => {
      raw.payments[0].paymentMethodId = 'gone';
    });
    expect(() => parseBackup(missingMethod)).toThrow('refers to a missing payment method');

    const missingParent = tampered((raw) => {
      raw.categories[1].parentId = 'gone';
    });
    expect(() => parseBackup(missingParent)).toThrow('missing parent category');
  });

  it('rejects a payment whose items exceed it', () => {
    const json = tampered((raw) => {
      raw.expenseItems[1].paymentId = raw.expenseItems[0].paymentId;
      raw.payments.splice(1, 1);
      raw.summary.paymentCount -= 1;
      raw.summary.paymentTotal -= backup.payments[1].amount;
    });
    expect(() => parseBackup(json)).toThrow('items totalling more than the payment');
  });
});

describe('parseBackup (version 1)', () => {
  it('still reads backups made before payments existed', () => {
    const expenses = buildSeptember2026Expenses().map(({ paymentId, ...expense }) => expense);
    const v1 = {
      format: 'expense-tracker-backup',
      version: 1,
      schemaVersion: 1,
      exportedAt: exportedAt.toISOString(),
      currency: 'INR',
      summary: {
        expenseCount: 63,
        totalAmount: 1275950,
        categoryCount: data.categories.length,
        paymentMethodCount: 2,
      },
      categories: data.categories,
      paymentMethods,
      expenses,
    };
    const parsed = parseBackup(JSON.stringify(v1));
    expect(parsed.version).toBe(1);
    expect(parsed.version === 1 && parsed.expenses).toHaveLength(63);

    v1.summary.totalAmount += 1;
    expect(() => parseBackup(JSON.stringify(v1))).toThrow('total does not match');
  });
});

describe('summarizeBackup', () => {
  it('counts only items of confirmed payments as spending', () => {
    const withAwaiting = parseBackup(
      tampered((raw) => {
        raw.payments[0].status = 'initiated';
        raw.payments[1].status = 'failed';
      }),
    );
    const failedAmount = backup.payments[0].amount + backup.payments[1].amount;

    expect(summarizeBackup(withAwaiting)).toEqual({
      version: 2,
      exportedAt: exportedAt.toISOString(),
      paymentCount: 63,
      expenseItemCount: 63,
      spendingCount: 61,
      spendingTotal: 1275950 - failedAmount,
      categoryCount: data.categories.length,
      paymentMethodCount: 2,
      firstDate: '2026-09-01',
      lastDate: expect.stringMatching(/^2026-09-/),
    });
  });

  it('treats every v1 expense as one confirmed payment', () => {
    const expenses = buildSeptember2026Expenses().map(({ paymentId, ...expense }) => expense);
    const v1 = parseBackup(
      JSON.stringify({
        format: 'expense-tracker-backup',
        version: 1,
        schemaVersion: 1,
        exportedAt: exportedAt.toISOString(),
        currency: 'INR',
        summary: {
          expenseCount: 63,
          totalAmount: 1275950,
          categoryCount: data.categories.length,
          paymentMethodCount: 2,
        },
        categories: data.categories,
        paymentMethods,
        expenses,
      }),
    );
    expect(summarizeBackup(v1)).toMatchObject({
      version: 1,
      paymentCount: 63,
      expenseItemCount: 63,
      spendingCount: 63,
      spendingTotal: 1275950,
    });
  });

  it('has no date range for an empty backup', () => {
    const empty = buildBackup(
      { categories: [], paymentMethods: [], payments: [], expenseItems: [] },
      { schemaVersion: 2, exportedAt },
    );
    expect(summarizeBackup(empty)).toMatchObject({
      spendingCount: 0,
      spendingTotal: 0,
      firstDate: null,
      lastDate: null,
    });
  });
});

describe('backupFileName', () => {
  it('stamps the local date and time', () => {
    expect(backupFileName(exportedAt)).toBe('expense-tracker-backup-2026-10-03-2214.json');
  });
});
