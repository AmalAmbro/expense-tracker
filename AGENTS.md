This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## UI conventions

These are enforced by `npx expo lint` where possible; follow the rest by hand.

**Buttons** — always use the shared components in `src/components/ui/`:

- `Button` for actions, with a `variant`:
  - `primary` (black/white fill): the screen's main action. **At most one per screen.**
  - `secondary` (grey fill): alternative actions ("Scan QR code", "Back to edit").
  - `destructive` (red text): deletes or fails something. Keep it visually apart from the main action.
  - Pass `loading` while an action runs (shows a spinner and blocks presses) instead of changing the title. Use sentence-case titles.
- `TextButton` for small inline actions and escape routes ("See all", "Clear", "Cancel", "← Back", "… instead"). `variant="destructive"` for removals ("Remove").
- Never use `Button`, `TouchableOpacity`, or `TouchableHighlight` from `react-native` (lint error). Don't hand-build a button from `Pressable` + text; extend `Button`/`TextButton` instead.
- Selection controls are not buttons and may use `Pressable` (chips, UPI app tiles, list rows, picker fields, month arrows) — but they must use the shared tokens below.

**Text boxes** — always `ThemedTextInput` (`src/components/ui/themed-text-input.tsx`): a filled box with the shared radius, height, and padding. Use `size="large"` for prominent amount fields; `multiline` boxes grow and start at the top. Pass `style` for layout only (e.g. a taller `minHeight`). Importing `TextInput` from `react-native` elsewhere is a lint error.

**Tokens** — from `src/constants/theme.ts`, never literal values:

- Colours: `useTheme()` → `primary`, `onPrimary`, `link`, `danger`, `border`, `text`, `textSecondary`, `background*`, `accent`. Every colour needs light and dark values. Hex/`rgba()` literals outside `theme.ts` are a lint error; add a token instead. (`CameraOverlay` is the fixed set for UI drawn over the camera.)
- Palette: taken from the app icon — deep forest green (`#041E1C`/`#0B3E37`) and the wallet's mint-to-teal (`#4AE599`/`#159A76`). Light mode: mint-white background, dark-green primary button. Dark mode: forest-green background, mint primary button with dark text. Use `accent` for charts and progress bars, never for text. New colours must stay in this family and meet WCAG AA (4.5:1 for text, 3:1 for graphics) in both modes.
- Navigation (headers, drawer) uses `NavigationThemes` from `theme.ts`. The splash background in `app.json` must equal `background` (light and dark), and `splash-light.png`/`splash-dark.png` (logo plus app name) use the `text` colour.
- Shape: `Radius.control` for every button, input, picker field, chip, tile, and card.
- Size: `ControlSize.height` (48) for buttons/inputs/fields, `ControlSize.compactHeight` (44) for text buttons/chips, `ControlSize.paddingHorizontal` for their side padding.
- Error text: `<ThemedText themeColor="danger">`.

Check new or changed screens on a device in **both light and dark mode** before calling UI work done.
