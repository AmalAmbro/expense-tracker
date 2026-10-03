import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useExpenseRepository } from '@/database/hooks';
import type { Expense, ExpenseFilter } from '@/types/expense';

/**
 * Lists expenses matching `filter`, reloading whenever the filter changes or the
 * screen regains focus (e.g. after returning from the add/edit modal).
 */
export function useExpenseList(filter: ExpenseFilter) {
  const expenseRepository = useExpenseRepository();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  // Callers build a fresh filter object every render; key on its contents instead.
  const filterKey = JSON.stringify(filter);

  const reload = useCallback(() => {
    const requestId = ++latestRequest.current;
    expenseRepository
      .list(JSON.parse(filterKey) as ExpenseFilter)
      .then((rows) => {
        if (requestId !== latestRequest.current) return;
        setExpenses(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        if (requestId !== latestRequest.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load expenses');
      })
      .finally(() => {
        if (requestId === latestRequest.current) setIsLoading(false);
      });
  }, [expenseRepository, filterKey]);

  // Runs on focus, and again whenever `reload` changes (i.e. the filter) while focused.
  useFocusEffect(reload);

  return { expenses, isLoading, error, reload };
}
