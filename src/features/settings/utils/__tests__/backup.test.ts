import {
  backupFileName,
  buildBackup,
  parseBackup,
  serializeBackup,
} from '@/features/settings/utils/backup';
import { buildSeedCategories } from '@/test-utils/seed-categories';
import { buildSeptember2026Expenses } from '@/test-utils/september-2026';
import type { PaymentMethod } from '@/types/payment-method';

const paymentMethods: PaymentMethod[] = [
  { id: 'upi', name: 'UPI', sortOrder: 0, isActive: true },
  { id: 'old-card', name: 'Old card', sortOrder: 1, isActive: false },
];
const data = {
  categories: buildSeedCategories(),
  paymentMethods,
  expenses: buildSeptember2026Expenses(),
};
const exportedAt = new Date(2026, 9, 3, 22, 14);
const backup = buildBackup(data, { schemaVersion: 1, exportedAt });

describe('buildBackup', () => {
  it('includes every record and a checksum summary', () => {
    expect(backup.format).toBe('expense-tracker-backup');
    expect(backup.version).toBe(1);
    expect(backup.currency).toBe('INR');
    expect(backup.summary).toEqual({
      expenseCount: 63,
      totalAmount: 1275950,
      categoryCount: data.categories.length,
      paymentMethodCount: 2,
    });
    expect(backup.expenses).toBe(data.expenses);
  });

  it('keeps inactive records', () => {
    expect(backup.paymentMethods.map((m) => m.id)).toContain('old-card');
  });
});

describe('serializeBackup / parseBackup', () => {
  it('round-trips without altering any amount', () => {
    const restored = parseBackup(serializeBackup(backup));
    expect(restored).toEqual(backup);
    expect(restored.expenses.map((e) => e.amount)).toEqual(data.expenses.map((e) => e.amount));
  });

  it('rejects non-JSON and foreign files', () => {
    expect(() => parseBackup('not json')).toThrow('not valid JSON');
    expect(() => parseBackup('{"format":"something-else"}')).toThrow('Invalid backup at "format"');
  });

  it('rejects fractional or non-positive amounts', () => {
    const tampered = JSON.parse(serializeBackup(backup));
    tampered.expenses[0].amount = 200.5;
    expect(() => parseBackup(JSON.stringify(tampered))).toThrow('expenses.0.amount');
  });

  it('detects a missing expense via the summary', () => {
    const tampered = JSON.parse(serializeBackup(backup));
    tampered.expenses.pop();
    expect(() => parseBackup(JSON.stringify(tampered))).toThrow('counts do not match');
  });

  it('detects a changed amount via the total', () => {
    const tampered = JSON.parse(serializeBackup(backup));
    tampered.expenses[0].amount += 100;
    expect(() => parseBackup(JSON.stringify(tampered))).toThrow('total does not match');
  });
});

describe('backupFileName', () => {
  it('stamps the local date and time', () => {
    expect(backupFileName(exportedAt)).toBe('expense-tracker-backup-2026-10-03-2214.json');
  });
});
