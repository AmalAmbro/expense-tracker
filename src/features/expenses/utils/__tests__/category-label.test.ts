import { formatCategoryLabel } from '@/features/expenses/utils/category-label';

const names = new Map([
  ['food', 'Food & Groceries'],
  ['eggs', 'Eggs'],
]);

describe('formatCategoryLabel', () => {
  it('joins category and subcategory', () => {
    expect(formatCategoryLabel({ categoryId: 'food', subcategoryId: 'eggs' }, names)).toBe(
      'Food & Groceries → Eggs',
    );
  });

  it('shows only the category when there is no subcategory', () => {
    expect(formatCategoryLabel({ categoryId: 'food', subcategoryId: null }, names)).toBe(
      'Food & Groceries',
    );
  });

  it('never hides an expense whose category is missing', () => {
    expect(formatCategoryLabel({ categoryId: 'gone', subcategoryId: null }, names)).toBe(
      'Unknown category',
    );
  });
});
