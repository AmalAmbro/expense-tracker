import Storage from 'expo-sqlite/kv-store';

// Kept in expo-sqlite's key-value store, a separate database file, so restoring a backup
// (which replaces the expenses database) doesn't change it.
const LAST_BACKUP_KEY = 'settings.lastBackupAt';
const LAST_BACKUP_LOCATION_KEY = 'settings.lastBackupLocation';
const BACKUP_FOLDER_KEY = 'settings.backupFolderUri';

export type BackupStatus = {
  /** When the user last created a backup (ISO timestamp), or null if never. */
  lastBackupAt: string | null;
  /** Where that backup was saved (a folder label), or null if it was shared instead. */
  lastBackupLocation: string | null;
  /** The folder backups are saved to (a content:// URI), or null if none is chosen. */
  backupFolderUri: string | null;
};

export async function getBackupStatus(): Promise<BackupStatus> {
  const [lastBackupAt, lastBackupLocation, backupFolderUri] = await Promise.all([
    Storage.getItem(LAST_BACKUP_KEY),
    Storage.getItem(LAST_BACKUP_LOCATION_KEY),
    Storage.getItem(BACKUP_FOLDER_KEY),
  ]);
  return { lastBackupAt, lastBackupLocation, backupFolderUri };
}

/** @param location the folder it was saved to, or null when it was handed to the share sheet. */
export async function recordBackup(at: Date, location: string | null): Promise<void> {
  await Storage.setItem(LAST_BACKUP_KEY, at.toISOString());
  if (location) {
    await Storage.setItem(LAST_BACKUP_LOCATION_KEY, location);
  } else {
    await Storage.removeItem(LAST_BACKUP_LOCATION_KEY);
  }
}

export async function setBackupFolderUri(uri: string): Promise<void> {
  await Storage.setItem(BACKUP_FOLDER_KEY, uri);
}
