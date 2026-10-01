export type SeedCategory = {
  name: string;
  isEssentialDefault: boolean;
  children: string[];
};

/** Default category tree. Children inherit the parent's isEssentialDefault. */
export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Food & Groceries',
    isEssentialDefault: true,
    children: [
      'Chicken',
      'Fish',
      'Eggs',
      'Vegetables',
      'Fruits',
      'Rice & Staples',
      'Cooking Oil',
      'Nuts',
      'Breakfast',
      'Lunch',
      'Dinner',
      'Tea & Snacks',
    ],
  },
  {
    name: 'Transportation',
    isEssentialDefault: true,
    children: [
      'Petrol',
      'Bus',
      'Metro',
      'Train',
      'Auto',
      'Rapido',
      'Taxi',
      'Parking',
      'Vehicle Maintenance',
    ],
  },
  {
    name: 'Shopping',
    isEssentialDefault: false,
    children: ['Clothes', 'Shoes', 'Accessories', 'Personal Items', 'Household'],
  },
  {
    name: 'Personal Care',
    isEssentialDefault: false,
    children: ['Haircut', 'Grooming', 'Toiletries'],
  },
  {
    name: 'Health',
    isEssentialDefault: true,
    children: ['Medicines', 'Doctor', 'Tests', 'Medical Supplies'],
  },
  {
    name: 'Entertainment',
    isEssentialDefault: false,
    children: ['Cinema', 'Games', 'Events', 'Subscriptions'],
  },
  {
    name: 'Recreation',
    isEssentialDefault: false,
    children: ['Turf', 'Gym', 'Hobbies'],
  },
  {
    name: 'Giving',
    isEssentialDefault: false,
    children: ['Donation', 'Gifts'],
  },
  {
    name: 'Education',
    isEssentialDefault: false,
    children: ['Courses', 'Books', 'Certifications'],
  },
  {
    name: 'Technology',
    isEssentialDefault: false,
    children: ['Electronics', 'Software', 'Accessories'],
  },
  {
    name: 'Financial',
    isEssentialDefault: true,
    children: ['Bank Charges', 'Insurance', 'Other'],
  },
];

export const SEED_PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
  'Other',
];
