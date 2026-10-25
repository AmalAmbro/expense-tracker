import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ControlSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ThemedTextInputProps = TextInputProps & {
  /** large: prominent amount fields. */
  size?: 'regular' | 'large';
};

/**
 * The app's one text box: a filled box with the shared control radius, height, and
 * padding, whose colours follow the light/dark theme. Multiline boxes grow taller and
 * start text at the top. Pass `style` for layout only (e.g. a taller minHeight).
 */
export function ThemedTextInput({
  style,
  placeholderTextColor,
  size = 'regular',
  multiline,
  ...rest
}: ThemedTextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? theme.textSecondary}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[
        styles.input,
        size === 'large' && styles.large,
        multiline && styles.multiline,
        { color: theme.text, backgroundColor: theme.backgroundElement },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: ControlSize.height,
    paddingHorizontal: ControlSize.paddingHorizontal,
    borderRadius: Radius.control,
    fontSize: 16,
  },
  large: {
    minHeight: 64,
    fontSize: 28,
    fontWeight: 600,
  },
  multiline: {
    minHeight: 96,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
