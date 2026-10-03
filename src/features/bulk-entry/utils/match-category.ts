import { CATEGORY_ALIASES, type CategoryAlias } from '@/features/bulk-entry/utils/category-aliases';
import type { Category } from '@/types/category';

export type CategoryMatch = { categoryId: string; subcategoryId: string | null };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}&]+/gu, ' ')
    .trim();
}

function targetKey(target: CategoryMatch): string {
  return `${target.categoryId}/${target.subcategoryId ?? ''}`;
}

/** Returns the single distinct target, or null when there are none or they disagree. */
function unique(targets: CategoryMatch[]): CategoryMatch | null {
  const distinct = new Map(targets.map((t) => [targetKey(t), t]));
  return distinct.size === 1 ? [...distinct.values()][0] : null;
}

/**
 * Builds a matcher from a description to a category, resolved against the user's
 * current categories. Case-insensitive and whitespace-tolerant:
 *
 * 1. The whole description equal to an alias or a category/subcategory name.
 * 2. Otherwise, alias words/phrases appearing anywhere in it ("Bus fare" → Bus).
 *
 * Returns null — "needs category" — when nothing matches or the matches disagree.
 * It never guesses between candidates. Pure function — no I/O.
 */
export function createCategoryMatcher(
  categories: Category[],
  aliases: CategoryAlias[] = CATEGORY_ALIASES,
): (description: string) => CategoryMatch | null {
  const topLevel = categories.filter((c) => c.parentId === null);

  function resolve(alias: CategoryAlias): CategoryMatch | null {
    const parent = topLevel.find((c) => normalize(c.name) === normalize(alias.category));
    if (!parent) return null;
    if (!alias.subcategory) return { categoryId: parent.id, subcategoryId: null };
    const child = categories.find(
      (c) => c.parentId === parent.id && normalize(c.name) === normalize(alias.subcategory ?? ''),
    );
    return child ? { categoryId: parent.id, subcategoryId: child.id } : null;
  }

  const aliasTargets = new Map<string, CategoryMatch[]>();
  function addTarget(key: string, target: CategoryMatch) {
    aliasTargets.set(key, [...(aliasTargets.get(key) ?? []), target]);
  }
  for (const alias of aliases) {
    const target = resolve(alias);
    if (target) addTarget(normalize(alias.alias), target);
  }

  const nameTargets = new Map<string, CategoryMatch[]>();
  for (const category of categories) {
    const target: CategoryMatch =
      category.parentId === null
        ? { categoryId: category.id, subcategoryId: null }
        : { categoryId: category.parentId, subcategoryId: category.id };
    const key = normalize(category.name);
    nameTargets.set(key, [...(nameTargets.get(key) ?? []), target]);
  }

  return (description) => {
    const phrase = normalize(description);
    if (!phrase) return null;

    const exact = [...(aliasTargets.get(phrase) ?? []), ...(nameTargets.get(phrase) ?? [])];
    if (exact.length > 0) return unique(exact);

    const padded = ` ${phrase} `;
    const partial = [...aliasTargets.entries()]
      .filter(([alias]) => padded.includes(` ${alias} `))
      .flatMap(([, targets]) => targets);
    return unique(partial);
  };
}
