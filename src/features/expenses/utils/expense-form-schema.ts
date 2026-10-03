import { z } from 'zod';

import { parseAmountToPaise } from '@/utils/money';

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
