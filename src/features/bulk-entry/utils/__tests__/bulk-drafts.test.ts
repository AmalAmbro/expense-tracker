import {
  buildBulkPreview,
  draftsToExpenses,
  getBulkSaveBlocker,
  totalOfDrafts,
} from '@/features/bulk-entry/utils/bulk-drafts';
import { createCategoryMatcher } from '@/features/bulk-entry/utils/match-category';
import { parseBulkInput } from '@/features/bulk-entry/utils/parse-bulk-input';
import { buildSeedCategories } from '@/test-utils/seed-categories';

const categories = buildSeedCategories();
const match = createCategoryMatcher(categories);

function preview(text: string) {
  return buildBulkPreview(parseBulkInput(text), match);
}

describe('buildBulkPreview', () => {
  it('produces one categorised draft per amount, totalling exactly', () => {
    const { drafts, errors } = preview('Chicken 200+90+90\nEggs 140\nBus 25+30\nPetrol 500');
    expect(errors).toEqual([]);
    expect(drafts.map((d) => [d.description, d.amount, d.subcategoryId])).toEqual([
      ['Chicken', 20000, 'food-groceries/chicken'],
      ['Chicken', 9000, 'food-groceries/chicken'],
      ['Chicken', 9000, 'food-groceries/chicken'],
      ['Eggs', 14000, 'food-groceries/eggs'],
      ['Bus', 2500, 'transportation/bus'],
      ['Bus', 3000, 'transportation/bus'],
      ['Petrol', 50000, 'transportation/petrol'],
    ]);
    expect(totalOfDrafts(drafts)).toBe(107500); // ₹1,075 — the plan.md example total
    expect(new Set(drafts.map((d) => d.key)).size).toBe(drafts.length);
  });

  it('leaves unknown descriptions uncategorised and keeps error lines', () => {
    const { drafts, errors } = preview('Misc 50\nEggs ??');
    expect(drafts).toEqual([
      expect.objectContaining({ description: 'Misc', categoryId: null, subcategoryId: null }),
    ]);
    expect(errors).toEqual([expect.objectContaining({ lineNumber: 2, raw: 'Eggs ??' })]);
  });
});

describe('getBulkSaveBlocker', () => {
  it('blocks while any line could not be read', () => {
    expect(getBulkSaveBlocker(preview('Chicken 200\nEggs ??'), 'upi')).toBe(
      "Fix or remove 1 line that couldn't be read.",
    );
  });

  it('blocks while any draft needs a category', () => {
    expect(getBulkSaveBlocker(preview('Misc 50+20'), 'upi')).toBe('Choose a category for 2 items.');
  });

  it('blocks without a payment method or with nothing to save', () => {
    expect(getBulkSaveBlocker(preview('Chicken 200'), null)).toBe('Choose a payment method.');
    expect(getBulkSaveBlocker(preview(''), 'upi')).toBe('Nothing to save.');
  });

  it('allows saving a complete preview', () => {
    expect(getBulkSaveBlocker(preview('Chicken 200'), 'upi')).toBeNull();
  });
});

describe('draftsToExpenses', () => {
  it('builds expenses with the batch date/payment and category essential default', () => {
    const { drafts } = preview('Chicken 200\nCinema 160');
    expect(
      draftsToExpenses(drafts, { date: '2026-09-30', paymentMethodId: 'upi', categories }),
    ).toEqual([
      {
        amount: 20000,
        date: '2026-09-30',
        categoryId: 'food-groceries',
        subcategoryId: 'food-groceries/chicken',
        description: 'Chicken',
        paymentMethodId: 'upi',
        isEssential: true,
        notes: null,
      },
      {
        amount: 16000,
        date: '2026-09-30',
        categoryId: 'entertainment',
        subcategoryId: 'entertainment/cinema',
        description: 'Cinema',
        paymentMethodId: 'upi',
        isEssential: false,
        notes: null,
      },
    ]);
  });

  it('refuses to convert an uncategorised draft', () => {
    const { drafts } = preview('Misc 50');
    expect(() =>
      draftsToExpenses(drafts, { date: '2026-09-30', paymentMethodId: 'upi', categories }),
    ).toThrow('"Misc" (line 1) needs a category');
  });
});
