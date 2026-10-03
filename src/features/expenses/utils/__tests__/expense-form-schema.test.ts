import {
  expenseFormSchema,
  expenseToFormValues,
  formValuesToExpense,
  type ExpenseFormValues,
} from '@/features/expenses/utils/expense-form-schema';
import type { Expense } from '@/types/expense';

const savedExpense: Expense = {
  id: 'exp-1',
  amount: 3250,
  date: '2026-09-14',
  categoryId: 'food',
  subcategoryId: 'eggs',
  description: 'Eggs',
  paymentMethodId: 'upi',
  isEssential: true,
  notes: 'Half tray',
  createdAt: '2026-09-14T10:00:00.000Z',
  updatedAt: '2026-09-14T10:00:00.000Z',
};

describe('expenseToFormValues / formValuesToExpense', () => {
  it('round-trips a saved expense without altering the amount', () => {
    const values = expenseToFormValues(savedExpense);
    expect(values.amountText).toBe('32.50');

    const { id, createdAt, updatedAt, ...expected } = savedExpense;
    expect(formValuesToExpense(values)).toEqual(expected);
  });

  it('trims text fields and stores blank notes as null', () => {
    const values: ExpenseFormValues = {
      ...expenseToFormValues(savedExpense),
      description: '  Eggs  ',
      notes: '   ',
    };
    const expense = formValuesToExpense(values);
    expect(expense.description).toBe('Eggs');
    expect(expense.notes).toBeNull();
  });
});

describe('expenseFormSchema', () => {
  it('accepts values produced from a saved expense', () => {
    expect(expenseFormSchema.safeParse(expenseToFormValues(savedExpense)).success).toBe(true);
  });

  it('rejects an invalid amount', () => {
    const values = { ...expenseToFormValues(savedExpense), amountText: 'abc' };
    expect(expenseFormSchema.safeParse(values).success).toBe(false);
  });
});
