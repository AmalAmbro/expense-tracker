import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import type { EssentialSplit as EssentialSplitData } from '@/features/analytics/utils/analytics';
import { useTheme } from '@/hooks/use-theme';
import { addPaise, formatPaise } from '@/utils/money';
import { formatShare } from '@/utils/percentage';

export function EssentialSplit({ split }: { split: EssentialSplitData }) {
  const theme = useTheme();
  const total = addPaise(split.essential, split.discretionary);
  const essentialShare = total > 0 ? split.essential / total : 0;

  const rows = [
    { label: 'Essential', amount: split.essential, color: theme.text },
    { label: 'Discretionary', amount: split.discretionary, color: theme.textSecondary },
  ];

  return (
    <View style={styles.container}>
      <ThemedView type="backgroundElement" style={styles.track}>
        <View style={[styles.segment, { flex: essentialShare, backgroundColor: theme.text }]} />
        <View
          style={[
            styles.segment,
            { flex: 1 - essentialShare, backgroundColor: theme.textSecondary },
          ]}
        />
      </ThemedView>
      {rows.map((row) => (
        <View
          key={row.label}
          style={styles.row}
          accessible
          accessibilityLabel={`${row.label}, ${formatPaise(row.amount)}, ${formatShare(row.amount, total)}`}
        >
          <View style={[styles.swatch, { backgroundColor: row.color }]} />
          <ThemedText style={styles.label}>{row.label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatShare(row.amount, total)}
          </ThemedText>
          <ThemedText style={styles.amount}>{formatPaise(row.amount)}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  track: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: Spacing.one,
  },
  segment: {
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    flex: 1,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
});
