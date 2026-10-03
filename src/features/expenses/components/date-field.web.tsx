import { StyleSheet } from 'react-native';

import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DateFieldProps = {
  value: string;
  onChange: (isoDate: string) => void;
};

/** `@react-native-community/datetimepicker` has no web implementation, so web gets a plain text field. */
export function DateField({ value, onChange }: DateFieldProps) {
  const theme = useTheme();

  return (
    <ThemedTextInput
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      accessibilityLabel="Date"
      style={[styles.field, { backgroundColor: theme.backgroundElement }]}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
});
