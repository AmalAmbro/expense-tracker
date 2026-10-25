import { useCallback } from 'react';

import { DATABASE_VERSION } from '@/database/migrations';
import { useLoadAllData } from '@/features/settings/hooks/use-load-all-data';
import { shareFile } from '@/features/settings/services/share-file';
import {
  backupFileName,
  buildBackup,
  parseBackup,
  serializeBackup,
  type BackupV2,
} from '@/features/settings/utils/backup';

/** Returns a function that backs up all data to a JSON file and offers to share it. */
export function useCreateBackup() {
  const loadAllData = useLoadAllData();

  return useCallback(async (): Promise<BackupV2> => {
    const data = await loadAllData();
    const exportedAt = new Date();
    const backup = buildBackup(data, { schemaVersion: DATABASE_VERSION, exportedAt });
    const contents = serializeBackup(backup);

    // Re-read what we're about to hand over, so a broken file is caught here, not at restore.
    parseBackup(contents);

    await shareFile(backupFileName(exportedAt), contents, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Save backup',
    });
    return backup;
  }, [loadAllData]);
}
