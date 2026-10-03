import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { formatMonthLabel, shiftMonth } from '@/utils/date';

type MonthSwitcherProps = {
  /** "YYYY-MM" */
  month: string;
  onChange: (month: string) => void;
  /** Latest selectable month ("YYYY-MM"); the next arrow is disabled at this month. */
  maxMonth: string;
};

export function MonthSwitcher({ month, onChange, maxMonth }: MonthSwitcherProps) {
  const canGoNext = month < maxMonth;
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(previous)}
        accessibilityRole="button"
        accessibilityLabel={`Previous month, ${formatMonthLabel(previous)}`}
        hitSlop={8}
        style={styles.arrow}
      >
        <ThemedText type="subtitle">‹</ThemedText>
      </Pressable>
      <ThemedText type="smallBold" accessibilityRole="header" style={styles.label}>
        {formatMonthLabel(month)}
      </ThemedText>
      <Pressable
        onPress={() => onChange(next)}
        disabled={!canGoNext}
        accessibilityRole="button"
        accessibilityLabel={`Next month, ${formatMonthLabel(next)}`}
        accessibilityState={{ disabled: !canGoNext }}
        hitSlop={8}
        style={[styles.arrow, !canGoNext && styles.disabled]}
      >
        <ThemedText type="subtitle">›</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.25,
  },
  label: {
    fontSize: 18,
  },
});
