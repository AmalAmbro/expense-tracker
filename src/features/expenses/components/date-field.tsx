import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDisplayDate, fromISODate, toISODate } from '@/utils/date';

type DateFieldProps = {
  value: string;
  onChange: (isoDate: string) => void;
};

export function DateField({ value, onChange }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fromISODate(value),
        mode: 'date',
        onValueChange: (_event, selectedDate) => {
          onChange(toISODate(selectedDate));
        },
      });
      return;
    }
    setShowPicker(true);
  }

  return (
    <View>
      <Pressable onPress={open}>
        <ThemedView type="backgroundElement" style={styles.field}>
          <ThemedText>{formatDisplayDate(value)}</ThemedText>
        </ThemedView>
      </Pressable>
      {showPicker && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={fromISODate(value)}
          mode="date"
          display="spinner"
          onValueChange={(_event, selectedDate) => {
            onChange(toISODate(selectedDate));
            setShowPicker(false);
          }}
          onDismiss={() => setShowPicker(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
});
