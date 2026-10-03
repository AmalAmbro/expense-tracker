import { StyleSheet, TextInput } from 'react-native';

import { Spacing } from '@/constants/theme';

type DateFieldProps = {
  value: string;
  onChange: (isoDate: string) => void;
};

/** `@react-native-community/datetimepicker` has no web implementation, so web gets a plain text field. */
export function DateField({ value, onChange }: DateFieldProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      style={styles.field}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#F0F0F3',
  },
});
