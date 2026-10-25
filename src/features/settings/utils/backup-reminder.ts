/** Remind the user to back up once their last backup is this many days old. */
export const BACKUP_REMINDER_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

const lastBackupFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** Whole days between an ISO timestamp and now (0 if it's in the future or invalid). */
function daysSince(iso: string, now: Date): number {
  const elapsed = now.getTime() - new Date(iso).getTime();
  return Number.isFinite(elapsed) && elapsed > 0 ? Math.floor(elapsed / DAY_MS) : 0;
}

/**
 * The reminder to show on Home, or null when none is due: there's nothing to back up,
 * or the last backup is recent. Pure function.
 */
export function getBackupReminder(options: {
  lastBackupAt: string | null;
  expenseCount: number;
  now: Date;
}): string | null {
  const { lastBackupAt, expenseCount, now } = options;
  if (expenseCount === 0) return null;
  if (lastBackupAt === null) {
    return 'Your expenses are only on this phone. Back them up so you don’t lose them.';
  }
  const days = daysSince(lastBackupAt, now);
  return days >= BACKUP_REMINDER_DAYS
    ? `Your last backup was ${days} days ago. Back up to keep recent expenses safe.`
    : null;
}

/**
 * e.g. "Last backup: 25 Oct 2026, 8:46 pm · saved to Phone storage › Download", or
 * "Not backed up yet". Without a location (shared via the share sheet), only the time.
 */
export function describeLastBackup(
  lastBackupAt: string | null,
  location: string | null = null,
): string {
  if (lastBackupAt === null) return 'Not backed up yet';
  const date = new Date(lastBackupAt);
  if (Number.isNaN(date.getTime())) return 'Not backed up yet';
  const when = `Last backup: ${lastBackupFormatter.format(date)}`;
  return location ? `${when} · saved to ${location}` : when;
}
