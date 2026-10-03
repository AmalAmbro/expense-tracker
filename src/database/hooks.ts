import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { createCategoryRepository } from '@/database/repositories/category-repository';
import { createExpenseRepository } from '@/database/repositories/expense-repository';
import { createPaymentMethodRepository } from '@/database/repositories/payment-method-repository';
import { createPaymentRepository } from '@/database/repositories/payment-repository';

export function useExpenseRepository() {
  const db = useSQLiteContext();
  return useMemo(() => createExpenseRepository(db), [db]);
}

export function useCategoryRepository() {
  const db = useSQLiteContext();
  return useMemo(() => createCategoryRepository(db), [db]);
}

export function usePaymentMethodRepository() {
  const db = useSQLiteContext();
  return useMemo(() => createPaymentMethodRepository(db), [db]);
}

export function usePaymentRepository() {
  const db = useSQLiteContext();
  return useMemo(() => createPaymentRepository(db), [db]);
}
