import { z } from 'zod';

import { formatPaiseForInput, parseAmountToPaise } from '@/utils/money';
import type { Expense, NewExpense } from '@/types/expense';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const expenseFormSchema = z.object({
  amountText: z.string().refine(
    (value) => {
      try {
        parseAmountToPaise(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Enter an amount greater than 0' },
  ),
  description: z.string().trim().min(1, 'Description is required'),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().nullable(),
  date: z.string().regex(DATE_PATTERN, 'Invalid date'),
  paymentMethodId: z.string().min(1, 'Payment method is required'),
  isEssential: z.boolean(),
  notes: z.string().nullable(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

/** Converts validated form values into a domain expense (amount in paise). */
export function formValuesToExpense(values: ExpenseFormValues): NewExpense {
  return {
    amount: parseAmountToPaise(values.amountText),
    date: values.date,
    categoryId: values.categoryId,
    subcategoryId: values.subcategoryId,
    description: values.description.trim(),
    paymentMethodId: values.paymentMethodId,
    isEssential: values.isEssential,
    notes: values.notes?.trim() || null,
  };
}

/** Converts a saved expense into form values for editing. */
export function expenseToFormValues(expense: Expense): ExpenseFormValues {
  return {
    amountText: formatPaiseForInput(expense.amount),
    description: expense.description,
    categoryId: expense.categoryId,
    subcategoryId: expense.subcategoryId,
    date: expense.date,
    paymentMethodId: expense.paymentMethodId,
    isEssential: expense.isEssential,
    notes: expense.notes,
  };
}
