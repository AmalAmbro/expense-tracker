import { router } from 'expo-router';

import { useExpenseRepository } from '@/database/hooks';
import { ExpenseForm } from '@/features/expenses/components/expense-form';
import type { ExpenseFormValues } from '@/features/expenses/utils/expense-form-schema';
import { todayISODate } from '@/utils/date';

export default function AddExpenseScreen() {
  const expenseRepository = useExpenseRepository();

  const defaultValues: ExpenseFormValues = {
    amountText: '',
    description: '',
    categoryId: '',
    subcategoryId: null,
    date: todayISODate(),
    paymentMethodId: '',
    isEssential: false,
    notes: null,
  };

  return (
    <ExpenseForm
      defaultValues={defaultValues}
      submitLabel="Save Expense"
      autoFocusAmount
      onSubmit={async (expense) => {
        await expenseRepository.create(expense);
        router.back();
      }}
    />
  );
}
