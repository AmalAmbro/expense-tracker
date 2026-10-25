/**
 * Design tokens: colours (light and dark), fonts, spacing, and control shape and size.
 * Use these instead of literal values (see AGENTS.md "UI conventions").
 */

import '@/global.css';

import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';
import { Platform } from 'react-native';

export const Colors = {
  // Brand palette, taken from the app icon: deep forest green (the icon's square) and the
  // mint-to-teal gradient of its wallet. Every text pairing meets WCAG AA (4.5:1);
  // `accent` meets the 3:1 minimum for graphics.
  light: {
    /** Deep forest green, near black. */
    text: '#0B2B27',
    /** Mint-tinted white. */
    background: '#F5F9F7',
    /** Cards, inputs, secondary buttons, unselected chips. */
    backgroundElement: '#E5EFEB',
    /** Selected chips and tiles, pressed text buttons, chart tracks. */
    backgroundSelected: '#D0E4DC',
    textSecondary: '#4A625D',
    /** Primary button fill (the icon's dark green), and the label colour on it. */
    primary: '#0B3E37',
    onPrimary: '#FFFFFF',
    /** Text buttons and links. */
    link: '#0A7059',
    /** Destructive actions and error text. */
    danger: '#B3261E',
    /** Hairline separators and outlines. */
    border: '#C5D8D1',
    /** Charts and progress bars (the wallet's teal). */
    accent: '#159A76',
  },
  dark: {
    text: '#E6F4EE',
    /** The icon's deep forest green. */
    background: '#041E1C',
    backgroundElement: '#0B2E2A',
    backgroundSelected: '#134039',
    textSecondary: '#9CB8B0',
    /** The wallet's mint, with dark text on it. */
    primary: '#4AE599',
    onPrimary: '#04201D',
    link: '#6EE7AC',
    /** Lighter than the light-mode red so it stays readable on dark green. */
    danger: '#FF7B6E',
    border: '#1E413B',
    accent: '#4AE599',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** React Navigation themes (headers, drawer, screen backgrounds) built from the palette. */
export const NavigationThemes: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      primary: Colors.light.link,
      background: Colors.light.background,
      card: Colors.light.background,
      text: Colors.light.text,
      border: Colors.light.border,
      notification: Colors.light.danger,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      primary: Colors.dark.link,
      background: Colors.dark.background,
      card: Colors.dark.background,
      text: Colors.dark.text,
      border: Colors.dark.border,
      notification: Colors.dark.danger,
    },
  },
};

/**
 * Colours for UI drawn over the live camera image. Fixed in both light and dark mode,
 * because what's behind them is the camera feed, not the app background.
 */
export const CameraOverlay = {
  background: '#000000',
  scrim: 'rgba(0, 0, 0, 0.6)',
  text: '#ffffff',
  frame: '#ffffff',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** One corner radius for every control (buttons, links, inputs, chips, tiles) and card. */
export const Radius = {
  control: 12,
} as const;

/** Shared control sizing. Heights meet the 44–48 pt minimum touch target. */
export const ControlSize = {
  /** Buttons, inputs, and picker fields. */
  height: 48,
  /** Text buttons and chips. */
  compactHeight: 44,
  paddingHorizontal: Spacing.three,
} as const;
