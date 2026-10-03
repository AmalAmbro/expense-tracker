import { SEED_CATEGORIES } from '@/database/migrations/seed-data';
import type { Category } from '@/types/category';

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * The seeded category tree as domain Categories, with readable ids:
 * parents are slugs ("food-groceries"), children "parent/child" ("food-groceries/eggs").
 */
export function buildSeedCategories(): Category[] {
  const categories: Category[] = [];
  SEED_CATEGORIES.forEach((seed, sortOrder) => {
    const parentId = slug(seed.name);
    const base = { type: 'expense', icon: null, isActive: true };
    categories.push({
      ...base,
      id: parentId,
      name: seed.name,
      parentId: null,
      isEssentialDefault: seed.isEssentialDefault,
      sortOrder,
    });
    seed.children.forEach((child, childSortOrder) => {
      categories.push({
        ...base,
        id: `${parentId}/${slug(child)}`,
        name: child,
        parentId,
        isEssentialDefault: seed.isEssentialDefault,
        sortOrder: childSortOrder,
      });
    });
  });
  return categories;
}
