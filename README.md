# Expense Tracker

A mobile-first personal expense tracking app built with React Native and Expo.
Recording an expense should take seconds; monthly analysis should require zero
manual calculation. See [plan.md](./plan.md) for the full product and
architecture plan.

## Status

Milestones 0–3 are done: project setup, local SQLite database, expense entry,
and transaction history (grouped by date, with search, filters, edit, and
delete). Dashboard, analytics, bulk entry, and export are still to come.

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

## Notes

- `ios/` and `android/` directories are not checked in — they're generated via
  Continuous Native Generation (CNG) from `app.json`. Configure native
  behavior there, not by hand-editing generated native projects.
- After adding a library with native code, you'll need a development build
  (`npx expo run:ios` / `npx expo run:android`) since Expo Go only includes
  its bundled native modules.
