import { CATEGORY_ALIASES } from '@/features/bulk-entry/utils/category-aliases';
import { createCategoryMatcher } from '@/features/bulk-entry/utils/match-category';
import { SEPTEMBER_2026_LINES } from '@/test-utils/september-2026';
import { buildSeedCategories } from '@/test-utils/seed-categories';

const categories = buildSeedCategories();
const match = createCategoryMatcher(categories);

describe('createCategoryMatcher', () => {
  it('maps the plan.md alias examples', () => {
    expect(match('chicken')).toEqual({
      categoryId: 'food-groceries',
      subcategoryId: 'food-groceries/chicken',
    });
    expect(match('egg')).toEqual(match('eggs'));
    expect(match('bus')?.subcategoryId).toBe('transportation/bus');
    expect(match('metro')?.subcategoryId).toBe('transportation/metro');
    expect(match('train')?.subcategoryId).toBe('transportation/train');
    expect(match('petrol')?.subcategoryId).toBe('transportation/petrol');
    expect(match('rapido')?.subcategoryId).toBe('transportation/rapido');
    expect(match('tea')?.subcategoryId).toBe('food-groceries/tea-snacks');
  });

  it('is case-insensitive and whitespace-tolerant', () => {
    expect(match('  CHICKEN ')).toEqual(match('chicken'));
    expect(match('Cooking   Oil')?.subcategoryId).toBe('food-groceries/cooking-oil');
  });

  it('matches alias words inside longer descriptions', () => {
    expect(match('Bus fare')?.subcategoryId).toBe('transportation/bus');
    expect(match('Metro card')?.subcategoryId).toBe('transportation/metro');
    expect(match('Tea snacks')?.subcategoryId).toBe('food-groceries/tea-snacks');
  });

  it('matches category and subcategory names typed in full', () => {
    expect(match('Grooming')?.subcategoryId).toBe('personal-care/grooming');
    expect(match('Shopping')).toEqual({ categoryId: 'shopping', subcategoryId: null });
  });

  it('returns null (needs category) for unknown descriptions', () => {
    expect(match('Misc')).toBeNull();
    expect(match('')).toBeNull();
  });

  it('does not guess when matches disagree', () => {
    // "Accessories" exists under both Shopping and Technology.
    expect(match('Accessories')).toBeNull();
    // Two different aliases in one description.
    expect(match('Chicken and bus')).toBeNull();
  });

  it('does not match alias fragments inside other words', () => {
    // "auto" must not match inside "automatic"; "oil" not inside "toilet".
    expect(match('Automatic pencil')).toBeNull();
    expect(match('Toilet cleaner')).toBeNull();
  });

  it('skips aliases whose categories no longer exist', () => {
    const withoutFood = categories.filter(
      (c) => c.id !== 'food-groceries' && c.parentId !== 'food-groceries',
    );
    expect(createCategoryMatcher(withoutFood)('chicken')).toBeNull();
  });

  it('resolves every alias against the seeded categories', () => {
    for (const alias of CATEGORY_ALIASES) {
      expect({ alias: alias.alias, matched: match(alias.alias) !== null }).toEqual({
        alias: alias.alias,
        matched: true,
      });
    }
  });

  it('categorises every line of the September 2026 dataset', () => {
    const topLevelIds: Record<string, string> = {
      food: 'food-groceries',
      transport: 'transportation',
      shopping: 'shopping',
      'personal-care': 'personal-care',
      health: 'health',
      entertainment: 'entertainment',
      recreation: 'recreation',
      giving: 'giving',
    };
    for (const line of SEPTEMBER_2026_LINES) {
      expect({ line: line.description, categoryId: match(line.description)?.categoryId }).toEqual({
        line: line.description,
        categoryId: topLevelIds[line.categoryId],
      });
    }
  });
});
