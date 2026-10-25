import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useExpenseRepository } from '@/database/hooks';
import { getLastBackupAt } from '@/features/settings/services/backup-status';
import { getBackupReminder } from '@/features/settings/utils/backup-reminder';

/**
 * When the user last backed up, and the reminder to show (if one is due). Reloads when
 * the screen regains focus, e.g. after backing up in Settings.
 */
export function useBackupStatus() {
  const expenseRepository = useExpenseRepository();
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [reminder, setReminder] = useState<string | null>(null);

  const reload = useCallback(() => {
    let isCurrent = true;
    Promise.all([getLastBackupAt(), expenseRepository.countAll()])
      .then(([last, expenseCount]) => {
        if (!isCurrent) return;
        setLastBackupAt(last);
        setReminder(getBackupReminder({ lastBackupAt: last, expenseCount, now: new Date() }));
      })
      // A reminder is a nicety; if it can't be worked out, show none rather than an error.
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [expenseRepository]);

  useFocusEffect(reload);

  return { lastBackupAt, reminder, reload };
}
