import { parseAmountToPaise } from '@/utils/money';
import type { Expense } from '@/types/expense';

/**
 * The user's real September 2026 expenses (plan.md §16), one entry per line of the
 * original notes, mapped to top-level category ids. Kept verbatim — including the
 * unusually large 1212 bus fare — so tests exercise real-world data.
 */
export const SEPTEMBER_2026_LINES: { description: string; amounts: string; categoryId: string }[] =
  [
    { description: 'Chicken', amounts: '200+90+90+150+100+180', categoryId: 'food' },
    { description: 'Cooking oil', amounts: '580', categoryId: 'food' },
    { description: 'Eggs', amounts: '140+32.5+13+130+135+70+140', categoryId: 'food' },
    { description: 'Veggies', amounts: '60+156+16.25+88.75+78+66+325+75', categoryId: 'food' },
    { description: 'Metro card', amounts: '500', categoryId: 'transport' },
    {
      description: 'Bus fare',
      amounts: '35+25+60+30+25+18+45+60+13+20+1212',
      categoryId: 'transport',
    },
    { description: 'Train ticket', amounts: '1269', categoryId: 'transport' },
    { description: 'Tea snacks', amounts: '40+30+10', categoryId: 'food' },
    { description: 'Breakfast', amounts: '70', categoryId: 'food' },
    { description: 'Lunch', amounts: '200+896+90+50+50+100+420+150', categoryId: 'food' },
    { description: 'Dinner', amounts: '120', categoryId: 'food' },
    { description: 'Petrol', amounts: '200+500+500', categoryId: 'transport' },
    { description: 'Cinema', amounts: '160', categoryId: 'entertainment' },
    { description: 'Shopping', amounts: '50+2070+70+220', categoryId: 'shopping' },
    { description: 'Haircut', amounts: '150', categoryId: 'personal-care' },
    { description: 'Meds', amounts: '35', categoryId: 'health' },
    { description: 'Auto charge', amounts: '30', categoryId: 'transport' },
    { description: 'Rapido', amounts: '107', categoryId: 'transport' },
    { description: 'Turf', amounts: '89+75', categoryId: 'recreation' },
    { description: 'Donation', amounts: '50', categoryId: 'giving' },
  ];

/** Expands the September 2026 lines into one expense per amount, dated across the month. */
export function buildSeptember2026Expenses(): Expense[] {
  const expenses: Expense[] = [];
  SEPTEMBER_2026_LINES.forEach((line, lineIndex) => {
    const date = `2026-09-${String(lineIndex + 1).padStart(2, '0')}`;
    line.amounts.split('+').forEach((amountText, amountIndex) => {
      const timestamp = `${date}T10:00:${String(amountIndex).padStart(2, '0')}.000Z`;
      expenses.push({
        id: `sep-${lineIndex}-${amountIndex}`,
        amount: parseAmountToPaise(amountText),
        date,
        categoryId: line.categoryId,
        subcategoryId: null,
        description: line.description,
        paymentMethodId: 'upi',
        isEssential: true,
        notes: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });
  });
  return expenses;
}
