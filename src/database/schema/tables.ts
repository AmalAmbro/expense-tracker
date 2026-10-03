/**
 * Schema history. Each constant is applied once, in order, by `migrateDbIfNeeded`;
 * never edit one that has shipped — add a new migration instead.
 */

/** Version 1: categories, payment methods, and a flat expenses table. */
export const SCHEMA_V1_SQL = `
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

/** Version 2, step 1: payments (money movements) and the expense items they cover. */
export const SCHEMA_V2_CREATE_SQL = `
CREATE TABLE payments (
  id TEXT PRIMARY KEY NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),
  provider TEXT,
  merchant_name TEXT,
  merchant_vpa TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('initiated', 'confirmed', 'failed', 'unknown')),
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE expense_items (
  id TEXT PRIMARY KEY NOT NULL,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  category_id TEXT NOT NULL REFERENCES categories(id),
  subcategory_id TEXT REFERENCES categories(id),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  is_essential INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

/**
 * Version 2, step 2: copy each v1 expense into one payment plus one item. Both reuse
 * the expense's id (they live in different tables), so existing links keep working.
 */
export const SCHEMA_V2_COPY_SQL = `
INSERT INTO payments
  (id, amount, date, payment_method_id, provider, merchant_name, merchant_vpa, status,
   reference, notes, created_at, updated_at)
SELECT id, amount, date, payment_method_id, NULL, NULL, NULL, 'confirmed',
       NULL, NULL, created_at, updated_at
FROM expenses;

INSERT INTO expense_items
  (id, payment_id, amount, date, category_id, subcategory_id, description, is_essential,
   notes, created_at, updated_at)
SELECT id, id, amount, date, category_id, subcategory_id, description, is_essential,
       notes, created_at, updated_at
FROM expenses;
`;

/** Version 2, step 3 (after verification): drop the v1 table and add indexes. */
export const SCHEMA_V2_FINALIZE_SQL = `
DROP TABLE expenses;

CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_expense_items_payment_id ON expense_items(payment_id);
CREATE INDEX idx_expense_items_date ON expense_items(date);
CREATE INDEX idx_expense_items_category_id ON expense_items(category_id);
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

export type PaymentRow = {
  id: string;
  amount: number;
  date: string;
  payment_method_id: string;
  provider: string | null;
  merchant_name: string | null;
  merchant_vpa: string | null;
  status: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseItemRow = {
  id: string;
  payment_id: string;
  amount: number;
  date: string;
  category_id: string;
  subcategory_id: string | null;
  description: string;
  is_essential: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** An expense item joined with its payment's method (the `Expense` read model). */
export type ExpenseRow = ExpenseItemRow & { payment_method_id: string };
