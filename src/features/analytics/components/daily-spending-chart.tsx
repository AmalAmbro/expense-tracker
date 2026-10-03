import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import type { DailyTotal } from '@/features/analytics/utils/analytics';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate } from '@/utils/date';
import { addPaise, dividePaise, formatPaise } from '@/utils/money';

const CHART_HEIGHT = 120;

/** A simple bar per day. Tap a bar to see that day's total. */
export function DailySpendingChart({ days }: { days: DailyTotal[] }) {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (days.length === 0) return null;

  const total = addPaise(...days.map((day) => day.total));
  const highest = days.reduce((max, day) => (day.total > max.total ? day : max), days[0]);
  const selected = days.find((day) => day.date === selectedDate);

  return (
    <View style={styles.container}>
      <View
        style={styles.bars}
        accessibilityLabel={`Daily spending chart, ${days.length} days. Highest day ${formatDisplayDate(highest.date)}, ${formatPaise(highest.total)}.`}
      >
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          const height =
            highest.total > 0 && day.total > 0
              ? Math.max(2, (day.total / highest.total) * CHART_HEIGHT)
              : 0;
          return (
            <Pressable
              key={day.date}
              onPress={() => setSelectedDate(isSelected ? null : day.date)}
              accessibilityRole="button"
              accessibilityLabel={`${formatDisplayDate(day.date)}, ${formatPaise(day.total)}`}
              accessibilityState={{ selected: isSelected }}
              style={styles.barSlot}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: isSelected ? theme.text : theme.textSecondary,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        <ThemedText type="small" themeColor="textSecondary">
          {Number(days[0].date.slice(8))}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {Number(days[days.length - 1].date.slice(8))}
        </ThemedText>
      </View>
      <ThemedText type="small">
        {selected
          ? `${formatDisplayDate(selected.date)}: ${formatPaise(selected.total)}`
          : 'Tap a bar to see that day’s total.'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Average {formatPaise(dividePaise(total, days.length))} per day
        {highest.total > 0
          ? ` · Highest ${formatPaise(highest.total)} on ${formatDisplayDate(highest.date)}`
          : ''}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: 2,
  },
  barSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
