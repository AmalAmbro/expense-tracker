import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ControlSize, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  /**
   * - primary: the screen's main action (at most one per screen)
   * - secondary: alternative actions
   * - destructive: deletes or fails something; keep it apart from the main action
   */
  variant?: ButtonVariant;
  /** Shows a spinner instead of the title and blocks presses. */
  loading?: boolean;
  /** Layout only (margins, flex). Colours and shape come from the variant. */
  style?: StyleProp<ViewStyle>;
};

/** The app's one button. Use TextButton for small inline actions like "Cancel". */
export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor = variant === 'primary' ? theme.primary : theme.backgroundElement;
  const labelColor =
    variant === 'primary' ? theme.onPrimary : variant === 'destructive' ? theme.danger : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        pressed && styles.pressed,
        isDisabled && !loading && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <ThemedText style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: ControlSize.height,
    paddingHorizontal: ControlSize.paddingHorizontal,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
