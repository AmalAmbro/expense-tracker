import { useEffect, useState } from 'react';

import { useCategoryRepository, usePaymentMethodRepository } from '@/database/hooks';
import type { Category } from '@/types/category';
import type { PaymentMethod } from '@/types/payment-method';

/** Loads the categories and payment methods an expense can reference. */
export function useExpenseOptions() {
  const categoryRepository = useCategoryRepository();
  const paymentMethodRepository = usePaymentMethodRepository();

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([categoryRepository.list(), paymentMethodRepository.list()])
      .then(([cats, methods]) => {
        if (!isCurrent) return;
        setCategories(cats);
        setPaymentMethods(methods);
      })
      .catch((err: unknown) => {
        if (!isCurrent) return;
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [categoryRepository, paymentMethodRepository]);

  return { categories, paymentMethods, isLoading, error };
}
