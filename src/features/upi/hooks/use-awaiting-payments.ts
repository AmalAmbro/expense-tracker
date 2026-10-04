import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { usePaymentRepository } from '@/database/hooks';
import type { ExpenseItem } from '@/types/expense';
import type { Payment } from '@/types/payment';

export type AwaitingPayment = { payment: Payment; items: ExpenseItem[] };

/** Payments whose outcome the user hasn't confirmed yet; reloads on focus. */
export function useAwaitingPayments() {
  const paymentRepository = usePaymentRepository();
  const [awaiting, setAwaiting] = useState<AwaitingPayment[]>([]);

  const reload = useCallback(() => {
    paymentRepository
      .listAwaitingConfirmation()
      .then(setAwaiting)
      .catch(() => setAwaiting([]));
  }, [paymentRepository]);

  useFocusEffect(reload);

  return { awaiting, reload };
}
