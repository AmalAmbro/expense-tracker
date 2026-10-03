import { useCallback } from 'react';

import {
  useCategoryRepository,
  useExpenseRepository,
  usePaymentMethodRepository,
} from '@/database/hooks';
import { DATABASE_VERSION } from '@/database/migrations';
import { shareBackupFile } from '@/features/settings/services/share-backup-file';
import {
  backupFileName,
  buildBackup,
  parseBackup,
  serializeBackup,
  type Backup,
} from '@/features/settings/utils/backup';

/** Returns a function that backs up all data to a JSON file and offers to share it. */
export function useCreateBackup() {
  const expenseRepository = useExpenseRepository();
  const categoryRepository = useCategoryRepository();
  const paymentMethodRepository = usePaymentMethodRepository();

  return useCallback(async (): Promise<Backup> => {
    const [expenses, categories, paymentMethods] = await Promise.all([
      expenseRepository.list(),
      categoryRepository.listAll(),
      paymentMethodRepository.listAll(),
    ]);
    const exportedAt = new Date();
    const backup = buildBackup(
      { expenses, categories, paymentMethods },
      { schemaVersion: DATABASE_VERSION, exportedAt },
    );
    const contents = serializeBackup(backup);

    // Re-read what we're about to hand over, so a broken file is caught here, not at restore.
    parseBackup(contents);

    await shareBackupFile(backupFileName(exportedAt), contents);
    return backup;
  }, [expenseRepository, categoryRepository, paymentMethodRepository]);
}
