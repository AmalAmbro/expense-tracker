// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

// UI conventions (see AGENTS.md → "UI conventions"): every button goes through the
// shared components, and every colour comes from the theme.
const BUTTON_MESSAGE =
  "Use Button or TextButton from '@/components/ui' so every button looks the same (see AGENTS.md).";
const INPUT_MESSAGE =
  "Use ThemedTextInput from '@/components/ui/themed-text-input' so every text box looks the same (see AGENTS.md).";
const COLOR_MESSAGE =
  "Don't hard-code colours: add a token to Colors in src/constants/theme.ts and read it with useTheme() (see AGENTS.md).";

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["Button", "TouchableOpacity", "TouchableHighlight"],
              message: BUTTON_MESSAGE,
            },
            { name: "react-native", importNames: ["TextInput"], message: INPUT_MESSAGE },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]", message: COLOR_MESSAGE },
        { selector: "Literal[value=/^rgba?\\(/]", message: COLOR_MESSAGE },
      ],
    },
  },
  {
    // The shared text box is the one place allowed to wrap React Native's TextInput.
    files: ["src/components/ui/themed-text-input.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // The theme is where colours are defined.
    files: ["src/constants/theme.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
]);
