import type { ExpenseFilter } from '@/types/expense';

type SQLParam = string | number;

/** Escapes LIKE wildcards so user search text is matched literally. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Builds the SQL for listing expenses, newest first. Pure function — no I/O. */
export function buildExpenseListQuery(filter: ExpenseFilter = {}): {
  sql: string;
  params: SQLParam[];
} {
  const conditions: string[] = [];
  const params: SQLParam[] = [];

  const search = filter.search?.trim();
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    conditions.push(
      `(e.description LIKE ? ESCAPE '\\' OR e.notes LIKE ? ESCAPE '\\'` +
        ` OR c.name LIKE ? ESCAPE '\\' OR sc.name LIKE ? ESCAPE '\\')`,
    );
    params.push(pattern, pattern, pattern, pattern);
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
    conditions.push('e.payment_method_id = ?');
    params.push(filter.paymentMethodId);
  }
  if (filter.isEssential !== undefined) {
    conditions.push('e.is_essential = ?');
    params.push(filter.isEssential ? 1 : 0);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  const sql =
    'SELECT e.* FROM expenses e' +
    ' JOIN categories c ON c.id = e.category_id' +
    ' LEFT JOIN categories sc ON sc.id = e.subcategory_id' +
    where +
    ' ORDER BY e.date DESC, e.created_at DESC';

  return { sql, params };
}
