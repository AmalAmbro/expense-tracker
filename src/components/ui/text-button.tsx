import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ControlSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  /** destructive: removes something (e.g. "Remove"). */
  variant?: 'default' | 'destructive';
  /** Layout only (margins, alignment). */
  style?: StyleProp<ViewStyle>;
};

/**
 * A small inline action shown as link-coloured text ("See all", "Clear", "Cancel").
 * Shares the button's radius and touch-target size; highlights when pressed.
 */
export function TextButton({
  title,
  variant = 'default',
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: TextButtonProps) {
  const theme = useTheme();
  const color = variant === 'destructive' ? theme.danger : theme.link;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && { backgroundColor: theme.backgroundSelected },
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <ThemedText style={[styles.label, { color }]} numberOfLines={1}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: ControlSize.compactHeight,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  disabled: {
    opacity: 0.4,
  },
});
