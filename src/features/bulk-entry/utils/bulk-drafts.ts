import type { CategoryMatch } from '@/features/bulk-entry/utils/match-category';
import type { ParsedError, ParsedLine } from '@/features/bulk-entry/utils/parse-bulk-input';
import { addPaise } from '@/utils/money';
import type { Category } from '@/types/category';
import type { NewExpense } from '@/types/expense';

/** One transaction in the bulk-entry preview, editable before saving. */
export type BulkDraft = {
  /** Stable key: "<line>-<term index>". */
  key: string;
  lineNumber: number;
  description: string;
  /** Integer paise. */
  amount: number;
  /** null means "Needs category". */
  categoryId: string | null;
  subcategoryId: string | null;
};

export type BulkPreview = { drafts: BulkDraft[]; errors: ParsedError[] };

/** Expands parsed lines into one draft per amount, pre-filling matched categories. */
export function buildBulkPreview(
  lines: ParsedLine[],
  matchCategory: (description: string) => CategoryMatch | null,
): BulkPreview {
  const drafts: BulkDraft[] = [];
  const errors: ParsedError[] = [];

  for (const line of lines) {
    if (line.kind === 'error') {
      errors.push(line);
      continue;
    }
    const match = matchCategory(line.description);
    line.amounts.forEach((amount, index) => {
      drafts.push({
        key: `${line.lineNumber}-${index}`,
        lineNumber: line.lineNumber,
        description: line.description,
        amount,
        categoryId: match?.categoryId ?? null,
        subcategoryId: match?.subcategoryId ?? null,
      });
    });
  }

  return { drafts, errors };
}

export function totalOfDrafts(drafts: BulkDraft[]): number {
  return addPaise(...drafts.map((draft) => draft.amount));
}

/** Why the preview can't be saved yet, or null when it can. */
export function getBulkSaveBlocker(
  preview: BulkPreview,
  paymentMethodId: string | null,
): string | null {
  if (preview.errors.length > 0) {
    const count = preview.errors.length;
    return `Fix or remove ${count} ${count === 1 ? 'line' : 'lines'} that couldn't be read.`;
  }
  if (preview.drafts.length === 0) return 'Nothing to save.';
  const uncategorised = preview.drafts.filter((draft) => draft.categoryId === null).length;
  if (uncategorised > 0) {
    return `Choose a category for ${uncategorised} ${uncategorised === 1 ? 'item' : 'items'}.`;
  }
  if (!paymentMethodId) return 'Choose a payment method.';
  return null;
}

/**
 * Converts drafts to expenses for saving. Throws if any draft lacks a category,
 * so an uncategorised transaction can never be saved by accident.
 */
export function draftsToExpenses(
  drafts: BulkDraft[],
  options: { date: string; paymentMethodId: string; categories: Category[] },
): NewExpense[] {
  const byId = new Map(options.categories.map((c) => [c.id, c]));
  return drafts.map((draft) => {
    const category = draft.categoryId ? byId.get(draft.categoryId) : undefined;
    if (!category) {
      throw new Error(`"${draft.description}" (line ${draft.lineNumber}) needs a category`);
    }
    return {
      amount: draft.amount,
      date: options.date,
      categoryId: category.id,
      subcategoryId: draft.subcategoryId,
      description: draft.description,
      paymentMethodId: options.paymentMethodId,
      isEssential: category.isEssentialDefault,
      notes: null,
    };
  });
}
