import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NoticeProps = {
  /** success: an action finished; error: it failed (the message says why). */
  variant: 'success' | 'error';
  title: string;
  message?: string;
  /** Layout only (margins). */
  style?: StyleProp<ViewStyle>;
};

/**
 * The outcome of an action, shown where the action was taken: a ✓ or ! badge, a bold
 * title, and an optional detail line. Announced to screen readers when it appears.
 */
export function Notice({ variant, title, message, style }: NoticeProps) {
  const theme = useTheme();
  const isError = variant === 'error';
  const badgeColor = isError ? theme.danger : theme.accent;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message ? `${title}. ${message}` : title);
  }, [title, message]);

  return (
    <View
      style={[
        styles.notice,
        { backgroundColor: isError ? theme.backgroundElement : theme.backgroundSelected },
        style,
      ]}
      accessibilityRole={isError ? 'alert' : 'summary'}
    >
      <View style={[styles.badge, { backgroundColor: badgeColor }]} importantForAccessibility="no">
        <ThemedText type="smallBold" style={{ color: theme.background }}>
          {isError ? '!' : '✓'}
        </ThemedText>
      </View>
      <View style={styles.text}>
        <ThemedText type="smallBold" themeColor={isError ? 'danger' : 'text'}>
          {title}
        </ThemedText>
        {message ? <ThemedText type="small">{message}</ThemedText> : null}
      </View>
    </View>
  );
}

const BADGE_SIZE = 24;

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.control,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
