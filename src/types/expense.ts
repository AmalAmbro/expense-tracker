/** All monetary amounts are integer paise (₹1 = 100). Never floating-point rupees. */

/** What money was spent on. Every item belongs to exactly one Payment. */
export type ExpenseItem = {
  id: string;
  paymentId: string;
  /** Integer paise. */
  amount: number;
  /** ISO date, e.g. "2026-10-01". */
  date: string;
  categoryId: string;
  subcategoryId: string | null;
  description: string;
  isEssential: boolean;
  notes: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
};

export type NewExpenseItem = Omit<ExpenseItem, 'id' | 'paymentId' | 'createdAt' | 'updatedAt'>;

/**
 * The read model used by lists, the dashboard, and analytics: an expense item together
 * with its payment's method. Category analytics aggregate these items.
 */
export type Expense = ExpenseItem & { paymentMethodId: string };

/** Input for recording a simple expense: one payment with one item. */
export type NewExpense = NewExpenseItem & { paymentMethodId: string };

export type ExpenseUpdate = Partial<NewExpense>;

/** Criteria for listing expenses. Every field is optional; omitted fields don't filter. */
export type ExpenseFilter = {
  /** Case-insensitive substring match on description, notes, merchant, and category names. */
  search?: string;
  /** Inclusive ISO date lower bound. */
  startDate?: string;
  /** Inclusive ISO date upper bound. */
  endDate?: string;
  /** Matches either the item's category or its subcategory. */
  categoryId?: string;
  /** Matches the payment's method. */
  paymentMethodId?: string;
  isEssential?: boolean;
};
