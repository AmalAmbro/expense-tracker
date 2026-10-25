import Storage from 'expo-sqlite/kv-store';

// Kept in expo-sqlite's key-value store, a separate database file, so restoring a backup
// (which replaces the expenses database) doesn't change it.
const LAST_BACKUP_KEY = 'settings.lastBackupAt';

/** When the user last created a backup (ISO timestamp), or null if never. */
export async function getLastBackupAt(): Promise<string | null> {
  return Storage.getItem(LAST_BACKUP_KEY);
}

export async function recordBackup(at: Date): Promise<void> {
  await Storage.setItem(LAST_BACKUP_KEY, at.toISOString());
}
