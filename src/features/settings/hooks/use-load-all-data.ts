import { useCallback } from 'react';

import {
  useCategoryRepository,
  usePaymentMethodRepository,
  usePaymentRepository,
} from '@/database/hooks';
import type { BackupData } from '@/features/settings/utils/backup';

/** Returns a function that reads every record (for backups and exports). */
export function useLoadAllData() {
  const paymentRepository = usePaymentRepository();
  const categoryRepository = useCategoryRepository();
  const paymentMethodRepository = usePaymentMethodRepository();

  return useCallback(async (): Promise<BackupData> => {
    const [{ payments, items }, categories, paymentMethods] = await Promise.all([
      paymentRepository.listAllWithItems(),
      categoryRepository.listAll(),
      paymentMethodRepository.listAll(),
    ]);
    return { categories, paymentMethods, payments, expenseItems: items };
  }, [paymentRepository, categoryRepository, paymentMethodRepository]);
}
