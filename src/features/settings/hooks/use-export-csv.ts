import { useCallback } from 'react';

import { useLoadAllData } from '@/features/settings/hooks/use-load-all-data';
import { shareFile } from '@/features/settings/services/share-file';
import { fileTimestamp } from '@/features/settings/utils/backup';
import { buildExpensesCsv, selectSpendingItems } from '@/features/settings/utils/expenses-csv';
import { addPaise } from '@/utils/money';

/**
 * Returns a function that exports spending (items of confirmed payments) as a CSV and
 * offers to share it. Resolves to the number of rows and their total, in paise.
 */
export function useExportCsv() {
  const loadAllData = useLoadAllData();

  return useCallback(async (): Promise<{ count: number; total: number }> => {
    const data = await loadAllData();
    const fileName = `expense-tracker-expenses-${fileTimestamp(new Date())}.csv`;
    await shareFile(fileName, buildExpensesCsv(data), {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: 'Export expenses',
    });
    const items = selectSpendingItems(data);
    return { count: items.length, total: addPaise(...items.map((item) => item.amount)) };
  }, [loadAllData]);
}
