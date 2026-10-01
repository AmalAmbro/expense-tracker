export const CREATE_TABLES_SQL = `
CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES categories(id),
  type TEXT NOT NULL DEFAULT 'expense',
  is_essential_default INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE payment_methods (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  category_id TEXT NOT NULL REFERENCES categories(id),
  subcategory_id TEXT REFERENCES categories(id),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),
  is_essential INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
`;

export type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  type: string;
  is_essential_default: number;
  icon: string | null;
  sort_order: number;
  is_active: number;
};

export type PaymentMethodRow = {
  id: string;
  name: string;
  sort_order: number;
  is_active: number;
};

export type ExpenseRow = {
  id: string;
  amount: number;
  date: string;
  category_id: string;
  subcategory_id: string | null;
  description: string;
  payment_method_id: string;
  is_essential: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
