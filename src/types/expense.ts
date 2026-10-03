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

/** Criteria for listing expenses. Every field is optional; omitted fields don't filter. */
export type ExpenseFilter = {
  /** Case-insensitive substring match on description, notes, and category/subcategory names. */
  search?: string;
  /** Inclusive ISO date lower bound. */
  startDate?: string;
  /** Inclusive ISO date upper bound. */
  endDate?: string;
  /** Matches either the expense's category or its subcategory. */
  categoryId?: string;
  paymentMethodId?: string;
  isEssential?: boolean;
};
