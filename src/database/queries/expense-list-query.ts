import type { ExpenseFilter } from '@/types/expense';

type SQLParam = string | number;

/** Escapes LIKE wildcards so user search text is matched literally. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Selects expense items (`e`) with their payment's method (`p`), as `ExpenseRow`s. */
export const EXPENSE_SELECT =
  'SELECT e.*, p.payment_method_id FROM expense_items e JOIN payments p ON p.id = e.payment_id';

/**
 * Builds the SQL for listing expenses, newest first. Only items of confirmed payments
 * count as spending: initiated, failed, and unknown payments are excluded until the
 * user confirms them. Pure function — no I/O.
 */
export function buildExpenseListQuery(filter: ExpenseFilter = {}): {
  sql: string;
  params: SQLParam[];
} {
  const conditions: string[] = ["p.status = 'confirmed'"];
  const params: SQLParam[] = [];

  const search = filter.search?.trim();
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    const searchable = ['e.description', 'e.notes', 'p.merchant_name', 'c.name', 'sc.name'];
    conditions.push(`(${searchable.map((column) => `${column} LIKE ? ESCAPE '\\'`).join(' OR ')})`);
    params.push(...searchable.map(() => pattern));
  }
  if (filter.startDate) {
    conditions.push('e.date >= ?');
    params.push(filter.startDate);
  }
  if (filter.endDate) {
    conditions.push('e.date <= ?');
    params.push(filter.endDate);
  }
  if (filter.categoryId) {
    conditions.push('(e.category_id = ? OR e.subcategory_id = ?)');
    params.push(filter.categoryId, filter.categoryId);
  }
  if (filter.paymentMethodId) {
    conditions.push('p.payment_method_id = ?');
    params.push(filter.paymentMethodId);
  }
  if (filter.isEssential !== undefined) {
    conditions.push('e.is_essential = ?');
    params.push(filter.isEssential ? 1 : 0);
  }

  const where = ` WHERE ${conditions.join(' AND ')}`;
  const sql =
    EXPENSE_SELECT +
    ' JOIN categories c ON c.id = e.category_id' +
    ' LEFT JOIN categories sc ON sc.id = e.subcategory_id' +
    where +
    ' ORDER BY e.date DESC, e.created_at DESC';

  return { sql, params };
}
