import {
  BACKUP_REMINDER_DAYS,
  describeLastBackup,
  getBackupReminder,
} from '@/features/settings/utils/backup-reminder';

const now = new Date('2026-10-25T15:00:00.000Z');
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('getBackupReminder', () => {
  it('stays quiet when there is nothing to back up', () => {
    expect(getBackupReminder({ lastBackupAt: null, expenseCount: 0, now })).toBeNull();
    expect(getBackupReminder({ lastBackupAt: daysAgo(400), expenseCount: 0, now })).toBeNull();
  });

  it('asks for a first backup once there are expenses', () => {
    expect(getBackupReminder({ lastBackupAt: null, expenseCount: 1, now })).toMatch(
      /only on this phone/,
    );
  });

  it(`reminds once the last backup is ${BACKUP_REMINDER_DAYS} days old`, () => {
    expect(
      getBackupReminder({ lastBackupAt: daysAgo(BACKUP_REMINDER_DAYS - 1), expenseCount: 5, now }),
    ).toBeNull();
    expect(
      getBackupReminder({ lastBackupAt: daysAgo(BACKUP_REMINDER_DAYS), expenseCount: 5, now }),
    ).toBe('Your last backup was 30 days ago. Back up to keep recent expenses safe.');
    expect(getBackupReminder({ lastBackupAt: daysAgo(45.5), expenseCount: 5, now })).toMatch(
      /45 days ago/,
    );
  });

  it('does not remind for a timestamp in the future (e.g. a changed phone clock)', () => {
    expect(getBackupReminder({ lastBackupAt: daysAgo(-3), expenseCount: 5, now })).toBeNull();
  });
});

describe('describeLastBackup', () => {
  it('says when there has been no backup', () => {
    expect(describeLastBackup(null)).toBe('Not backed up yet');
    expect(describeLastBackup('garbage')).toBe('Not backed up yet');
  });

  it('shows the date and time of the last backup', () => {
    expect(describeLastBackup('2026-10-25T15:16:00.000Z')).toMatch(/^Last backup: 25 Oct 2026, /);
  });

  it('adds where the backup was saved, when known', () => {
    expect(describeLastBackup('2026-10-25T15:16:00.000Z', 'Phone storage › Download')).toMatch(
      /^Last backup: 25 Oct 2026, .* · saved to Phone storage › Download$/,
    );
  });
});
