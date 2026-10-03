/**
 * Words people type in their notes, mapped to category names. This is the one place
 * bulk entry refers to category names; edit it to teach the matcher new words.
 * Aliases are lowercase; a missing `subcategory` maps to the top-level category.
 */
export type CategoryAlias = { alias: string; category: string; subcategory?: string };

const FOOD = 'Food & Groceries';
const TRANSPORT = 'Transportation';

export const CATEGORY_ALIASES: CategoryAlias[] = [
  { alias: 'chicken', category: FOOD, subcategory: 'Chicken' },
  { alias: 'fish', category: FOOD, subcategory: 'Fish' },
  { alias: 'meat', category: FOOD, subcategory: 'Meat' },
  { alias: 'mutton', category: FOOD, subcategory: 'Meat' },
  { alias: 'beef', category: FOOD, subcategory: 'Meat' },
  { alias: 'egg', category: FOOD, subcategory: 'Eggs' },
  { alias: 'eggs', category: FOOD, subcategory: 'Eggs' },
  { alias: 'milk', category: FOOD, subcategory: 'Dairy' },
  { alias: 'curd', category: FOOD, subcategory: 'Dairy' },
  { alias: 'veg', category: FOOD, subcategory: 'Vegetables' },
  { alias: 'veggies', category: FOOD, subcategory: 'Vegetables' },
  { alias: 'vegetable', category: FOOD, subcategory: 'Vegetables' },
  { alias: 'vegetables', category: FOOD, subcategory: 'Vegetables' },
  { alias: 'fruit', category: FOOD, subcategory: 'Fruits' },
  { alias: 'fruits', category: FOOD, subcategory: 'Fruits' },
  { alias: 'rice', category: FOOD, subcategory: 'Grains & Flour' },
  { alias: 'atta', category: FOOD, subcategory: 'Grains & Flour' },
  { alias: 'flour', category: FOOD, subcategory: 'Grains & Flour' },
  { alias: 'oil', category: FOOD, subcategory: 'Cooking Oil' },
  { alias: 'cooking oil', category: FOOD, subcategory: 'Cooking Oil' },
  { alias: 'nuts', category: FOOD, subcategory: 'Nuts' },
  { alias: 'dal', category: FOOD, subcategory: 'Pulses' },
  { alias: 'breakfast', category: FOOD, subcategory: 'Breakfast' },
  { alias: 'lunch', category: FOOD, subcategory: 'Lunch' },
  { alias: 'dinner', category: FOOD, subcategory: 'Dinner' },
  { alias: 'tea', category: FOOD, subcategory: 'Tea & Snacks' },
  { alias: 'coffee', category: FOOD, subcategory: 'Tea & Snacks' },
  { alias: 'snack', category: FOOD, subcategory: 'Tea & Snacks' },
  { alias: 'snacks', category: FOOD, subcategory: 'Tea & Snacks' },

  { alias: 'petrol', category: TRANSPORT, subcategory: 'Petrol' },
  { alias: 'diesel', category: TRANSPORT, subcategory: 'Petrol' },
  { alias: 'fuel', category: TRANSPORT, subcategory: 'Petrol' },
  { alias: 'bus', category: TRANSPORT, subcategory: 'Bus' },
  { alias: 'metro', category: TRANSPORT, subcategory: 'Metro' },
  { alias: 'train', category: TRANSPORT, subcategory: 'Train' },
  { alias: 'auto', category: TRANSPORT, subcategory: 'Auto' },
  { alias: 'rapido', category: TRANSPORT, subcategory: 'Rapido' },
  { alias: 'taxi', category: TRANSPORT, subcategory: 'Taxi' },
  { alias: 'cab', category: TRANSPORT, subcategory: 'Taxi' },
  { alias: 'uber', category: TRANSPORT, subcategory: 'Taxi' },
  { alias: 'ola', category: TRANSPORT, subcategory: 'Taxi' },
  { alias: 'parking', category: TRANSPORT, subcategory: 'Parking' },

  { alias: 'shopping', category: 'Shopping' },
  { alias: 'clothes', category: 'Shopping', subcategory: 'Clothes' },
  { alias: 'shoes', category: 'Shopping', subcategory: 'Shoes' },

  { alias: 'haircut', category: 'Personal Care', subcategory: 'Haircut' },
  { alias: 'salon', category: 'Personal Care', subcategory: 'Haircut' },

  { alias: 'meds', category: 'Health', subcategory: 'Medicines' },
  { alias: 'medicine', category: 'Health', subcategory: 'Medicines' },
  { alias: 'medicines', category: 'Health', subcategory: 'Medicines' },
  { alias: 'doctor', category: 'Health', subcategory: 'Doctor' },

  { alias: 'cinema', category: 'Entertainment', subcategory: 'Cinema' },
  { alias: 'movie', category: 'Entertainment', subcategory: 'Cinema' },

  { alias: 'turf', category: 'Recreation', subcategory: 'Turf' },
  { alias: 'gym', category: 'Recreation', subcategory: 'Gym' },

  { alias: 'donation', category: 'Giving', subcategory: 'Donation' },
  { alias: 'gift', category: 'Giving', subcategory: 'Gifts' },
  { alias: 'gifts', category: 'Giving', subcategory: 'Gifts' },

  { alias: 'book', category: 'Education', subcategory: 'Books' },
  { alias: 'books', category: 'Education', subcategory: 'Books' },
  { alias: 'course', category: 'Education', subcategory: 'Courses' },

  { alias: 'insurance', category: 'Financial', subcategory: 'Insurance' },
];
