/** All monetary amounts are integer paise (₹1 = 100). Never floating-point rupees. */
export type Expense = {
  id: string;
  /** Integer paise. */
  amount: number;
  /** ISO date, e.g. "2026-10-01". */
  date: string;
  categoryId: string;
  subcategoryId: string | null;
  description: string;
  paymentMethodId: string;
  isEssential: boolean;
  notes: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
};

export type NewExpense = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;

export type ExpenseUpdate = Partial<NewExpense>;
