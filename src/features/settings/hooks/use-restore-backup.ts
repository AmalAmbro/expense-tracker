import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';

import { DATABASE_VERSION } from '@/database/migrations';
import { useLoadAllData } from '@/features/settings/hooks/use-load-all-data';
import { pickTextFile } from '@/features/settings/services/pick-text-file';
import { restoreBackup } from '@/features/settings/services/restore-backup';
import {
  buildBackup,
  parseBackup,
  summarizeBackup,
  type Backup,
  type BackupSummary,
} from '@/features/settings/utils/backup';

export type RestorePreview = {
  backup: Backup;
  /** What the file holds. */
  incoming: BackupSummary;
  /** What will be replaced. */
  current: BackupSummary;
};

/**
 * `pick` asks for a backup file and validates it (throwing a descriptive error if it's
 * not a usable backup); `restore` then replaces all data with it, all or nothing.
 */
export function useRestoreBackup() {
  const db = useSQLiteContext();
  const loadAllData = useLoadAllData();

  const pick = useCallback(async (): Promise<RestorePreview | null> => {
    const contents = await pickTextFile();
    if (contents === null) {
      return null;
    }
    const backup = parseBackup(contents);
    const current = buildBackup(await loadAllData(), {
      schemaVersion: DATABASE_VERSION,
      exportedAt: new Date(),
    });
    return { backup, incoming: summarizeBackup(backup), current: summarizeBackup(current) };
  }, [loadAllData]);

  const restore = useCallback((backup: Backup) => restoreBackup(db, backup), [db]);

  return { pick, restore };
}
