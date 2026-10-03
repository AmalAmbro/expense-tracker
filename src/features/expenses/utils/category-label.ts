import type { Expense } from '@/types/expense';

/** Builds an expense's category label, e.g. "Food & Groceries → Eggs". */
export function formatCategoryLabel(
  expense: Pick<Expense, 'categoryId' | 'subcategoryId'>,
  categoryNameById: ReadonlyMap<string, string>,
): string {
  const category = categoryNameById.get(expense.categoryId) ?? 'Unknown category';
  const subcategory = expense.subcategoryId
    ? categoryNameById.get(expense.subcategoryId)
    : undefined;
  return subcategory ? `${category} → ${subcategory}` : category;
}
