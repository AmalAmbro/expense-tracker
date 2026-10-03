import { buildExpenseListQuery } from '@/database/queries/expense-list-query';

describe('buildExpenseListQuery', () => {
  it('lists everything newest first when no filter is given', () => {
    const { sql, params } = buildExpenseListQuery();
    expect(sql).not.toContain('WHERE');
    expect(sql).toMatch(/ORDER BY e\.date DESC, e\.created_at DESC$/);
    expect(params).toEqual([]);
  });

  it('searches description, notes, and category names with a literal pattern', () => {
    const { sql, params } = buildExpenseListQuery({ search: '  tea  ' });
    expect(sql).toContain('e.description LIKE ?');
    expect(sql).toContain('e.notes LIKE ?');
    expect(sql).toContain('c.name LIKE ?');
    expect(sql).toContain('sc.name LIKE ?');
    expect(params).toEqual(['%tea%', '%tea%', '%tea%', '%tea%']);
  });

  it('escapes LIKE wildcards in search text', () => {
    const { params } = buildExpenseListQuery({ search: '50%_off\\' });
    expect(params[0]).toBe('%50\\%\\_off\\\\%');
  });

  it('ignores a whitespace-only search', () => {
    const { sql, params } = buildExpenseListQuery({ search: '   ' });
    expect(sql).not.toContain('WHERE');
    expect(params).toEqual([]);
  });

  it('supports open-ended date ranges', () => {
    expect(buildExpenseListQuery({ startDate: '2026-09-01' }).params).toEqual(['2026-09-01']);
    expect(buildExpenseListQuery({ endDate: '2026-09-30' }).sql).toContain('e.date <= ?');
  });

  it('combines all filters with AND in a stable parameter order', () => {
    const { sql, params } = buildExpenseListQuery({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      categoryId: 'food',
      paymentMethodId: 'upi',
      isEssential: false,
    });
    expect(sql).toContain(
      'WHERE e.date >= ? AND e.date <= ? AND (e.category_id = ? OR e.subcategory_id = ?)' +
        ' AND e.payment_method_id = ? AND e.is_essential = ?',
    );
    expect(params).toEqual(['2026-09-01', '2026-09-30', 'food', 'food', 'upi', 0]);
  });
});
