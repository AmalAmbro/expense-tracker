import { useCallback } from 'react';

import { DATABASE_VERSION } from '@/database/migrations';
import { useLoadAllData } from '@/features/settings/hooks/use-load-all-data';
import { pickBackupFolder, saveFileToFolder } from '@/features/settings/services/backup-folder';
import {
  getBackupStatus,
  recordBackup,
  setBackupFolderUri,
} from '@/features/settings/services/backup-status';
import { shareFile } from '@/features/settings/services/share-file';
import { describeBackupFolder } from '@/features/settings/utils/backup-folder-label';
import {
  backupFileName,
  buildBackup,
  parseBackup,
  serializeBackup,
  type BackupV2,
} from '@/features/settings/utils/backup';

export type BackupResult = { backup: BackupV2; savedTo: string | null };

/**
 * Backs up all data to a JSON file. `saveToFolder` writes it into the chosen backup
 * folder (asking for one first if needed, or when `chooseFolder` is set) and confirms it
 * was saved; `share` hands it to the system share sheet. Both resolve null if the user
 * cancels choosing a folder.
 */
export function useCreateBackup() {
  const loadAllData = useLoadAllData();

  const build = useCallback(async () => {
    const exportedAt = new Date();
    const backup = buildBackup(await loadAllData(), {
      schemaVersion: DATABASE_VERSION,
      exportedAt,
    });
    const contents = serializeBackup(backup);
    // Re-read what we're about to hand over, so a broken file is caught here, not at restore.
    parseBackup(contents);
    return { backup, contents, exportedAt };
  }, [loadAllData]);

  const saveToFolder = useCallback(
    async (options: { chooseFolder?: boolean } = {}): Promise<BackupResult | null> => {
      let folderUri = options.chooseFolder ? null : (await getBackupStatus()).backupFolderUri;
      if (!folderUri) {
        folderUri = await pickBackupFolder();
        if (!folderUri) return null;
        await setBackupFolderUri(folderUri);
      }

      const { backup, contents, exportedAt } = await build();
      const savedContents = await saveFileToFolder(
        folderUri,
        backupFileName(exportedAt),
        'application/json',
        contents,
      );
      if (savedContents !== contents) {
        throw new Error('The saved backup file doesn’t match. Try again or choose another folder.');
      }

      const savedTo = describeBackupFolder(folderUri);
      await recordBackup(exportedAt, savedTo);
      return { backup, savedTo };
    },
    [build],
  );

  const share = useCallback(async (): Promise<BackupResult> => {
    const { backup, contents, exportedAt } = await build();
    await shareFile(backupFileName(exportedAt), contents, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Save backup',
    });
    // Android doesn't report whether the file was actually saved from the share sheet,
    // so this records that a backup was made and handed over.
    await recordBackup(exportedAt, null);
    return { backup, savedTo: null };
  }, [build]);

  return { saveToFolder, share };
}
