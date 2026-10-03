import { buildExpenseListQuery } from '@/database/queries/expense-list-query';

describe('buildExpenseListQuery', () => {
  it('lists everything newest first when no filter is given', () => {
    const { sql, params } = buildExpenseListQuery();
    expect(sql).not.toContain('WHERE');
    expect(sql).toMatch(/ORDER BY e\.date DESC, e\.created_at DESC$/);
    expect(params).toEqual([]);
  });

  it('reads expense items joined with their payments', () => {
    expect(buildExpenseListQuery().sql).toMatch(
      /^SELECT e\.\*, p\.payment_method_id FROM expense_items e JOIN payments p ON p\.id = e\.payment_id/,
    );
  });

  it('searches description, notes, merchant, and category names with a literal pattern', () => {
    const { sql, params } = buildExpenseListQuery({ search: '  tea  ' });
    for (const column of ['e.description', 'e.notes', 'p.merchant_name', 'c.name', 'sc.name']) {
      expect(sql).toContain(`${column} LIKE ?`);
    }
    expect(params).toEqual(Array(5).fill('%tea%'));
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
        ' AND p.payment_method_id = ? AND e.is_essential = ?',
    );
    expect(params).toEqual(['2026-09-01', '2026-09-30', 'food', 'food', 'upi', 0]);
  });
});
