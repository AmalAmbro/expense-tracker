# Expense Tracker

A mobile-first personal expense tracking app built with React Native and Expo.
Recording an expense should take seconds; monthly analysis should require zero
manual calculation. See [plan.md](./plan.md) for the full product and
architecture plan.

## Status

Milestones 0–5 are done: project setup, local SQLite database, expense entry,
transaction history (grouped by date, with search, filters, edit, and delete),
the Home dashboard (monthly and today's totals, category totals, recent
transactions, month navigation), and analytics (category breakdown, essential
vs discretionary, daily spending, month-over-month comparison), and bulk entry
(notes-style text such as `Chicken 200+90+90`, parsed deterministically,
auto-categorised from an alias list, previewed, and saved atomically). Settings
can back up all data to a JSON file via the system share sheet. Milestone 7
split expenses into payments and expense items (see *Data model*). Milestone 8
added **Pay (UPI)**: it opens a UPI app to pay (it never processes payments
itself), records the payment as `initiated`, and counts it as spending only once
the user confirms it went through.

## Stack

- Expo SDK 57 (React Native 0.86, React 19)
- TypeScript (strict mode)
- Expo Router (file-based routing, `src/app/`)
- ESLint (`eslint-config-expo`) + Prettier
- Jest (`jest-expo` preset)

## Get started

```bash
npm install
npx expo start
```

Then open the app in a [development build](https://docs.expo.dev/develop/development-builds/introduction/),
an Android emulator, an iOS simulator, or [Expo Go](https://expo.dev/go).

## Scripts

```bash
npx expo start        # start the dev server
npm run android        # start and open on Android
npm run ios            # start and open on iOS
npm run web            # start and open on web
npm run lint            # ESLint + Prettier checks
npm test                # run the Jest test suite
npm run test:watch      # Jest in watch mode
npx tsc --noEmit        # typecheck
```

## Project structure

```text
src/
├── app/            # Expo Router screens (file-based routing) and root layout
│                   # (drawer navigation is configured in app/_layout.tsx)
├── components/
│   ├── ui/         # Low-level, reusable UI primitives (ThemedText, ThemedView, ...)
│   └── ...         # Shared app-level components
├── constants/      # Theme tokens (colors, spacing, fonts)
└── hooks/          # Shared hooks (color scheme, theming)
```

As features are implemented (per [plan.md](./plan.md)), this will grow to
include:

- `src/features/<feature>/` — screens, components, hooks, services, types per
  feature (expenses, categories, analytics, bulk-entry, settings)
- `src/database/` — schema, migrations, and repositories for local SQLite
  storage
- `src/utils/` — cross-cutting utilities (starting with the money/paise
  handling utility)
- `src/types/` — shared domain types

Expo Router's file-based routing (`src/app/`) replaces the generic
`app/navigation` folder from the original plan; `_layout.tsx` files serve as
the provider composition root instead of a separate `app/providers` folder.

Business logic and data access are kept out of screens — screens call into
feature services/repositories, not SQL or parsing logic directly.

## Data model

Amounts are always integer paise (₹1 = 100).

- **Payment** (`payments`): the money movement: amount, date, payment method,
  provider, merchant, and status (`initiated` / `confirmed` / `failed` /
  `unknown`).
- **Expense item** (`expense_items`): what the money was spent on: category,
  description, essential flag. Every item belongs to one payment; a payment may
  cover several items. Items may total less than the payment (partially
  allocated) but never more.
- Category analytics aggregate expense items; payment-method analytics will
  aggregate payments, so nothing is double-counted.
- Recording an expense from the Add/Bulk screens creates one payment with one
  item. Schema migrations live in `src/database/migrations`; the v1 → v2
  migration runs in one transaction and verifies counts and totals before
  dropping the old table.
- Only items of `confirmed` payments count as spending (History, Home,
  Analytics). UPI payments stay `initiated`/`unknown` under "Awaiting
  confirmation" on the Pay screen until the user resolves them.
- UPI launching is behind `PaymentLauncher`
  (`src/features/upi/services/payment-launcher.{android,ios,}.ts`). Android
  uses the local native module `modules/upi-intent`, which lists installed UPI
  apps and opens the chosen one directly (`Intent.setPackage`) for a result.
  iOS opens app URL schemes via `expo-linking` (no result is returned; scheme
  paths are unverified); web is unsupported.
- Tested behaviour: Google Pay refuses intent payments to personal UPI IDs
  ("limit exceeded", regardless of link format) but accepts business UPI IDs.
  Links for typed-in UPI IDs omit `tr`, which apps expect only alongside
  merchant details (`mc`).
- Because of `modules/upi-intent` (and other native modules), the app runs as a
  development build, not Expo Go. After native changes, rebuild with
  `npx expo prebuild --clean --platform android && npx expo run:android`.
- Repository tests run against real SQLite through Node's built-in
  `node:sqlite` (Node 22.13+), via `src/test-utils/node-sqlite-database.ts`.

## Notes

- `ios/` and `android/` directories are not checked in — they're generated via
  Continuous Native Generation (CNG) from `app.json`. Configure native
  behavior there, not by hand-editing generated native projects.
- After adding a library with native code, you'll need a development build
  (`npx expo run:ios` / `npx expo run:android`) since Expo Go only includes
  its bundled native modules.
