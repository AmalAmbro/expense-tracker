import { ThemedTextInput } from '@/components/ui/themed-text-input';

type DateFieldProps = {
  value: string;
  onChange: (isoDate: string) => void;
};

/** `@react-native-community/datetimepicker` has no web implementation, so web gets a plain text field. */
export function DateField({ value, onChange }: DateFieldProps) {
  return (
    <ThemedTextInput
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      accessibilityLabel="Date"
    />
  );
}
