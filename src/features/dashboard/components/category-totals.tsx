import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import type { CategoryTotal } from '@/features/dashboard/utils/dashboard-summary';
import { useTheme } from '@/hooks/use-theme';
import { formatPaise } from '@/utils/money';
import { formatShare } from '@/utils/percentage';

type CategoryTotalsProps = {
  totals: CategoryTotal[];
  /** Month total in paise, used to size each bar. */
  monthTotal: number;
  categoryNameById: ReadonlyMap<string, string>;
  /** Also show each category's share of the month as a percentage. */
  showShare?: boolean;
};

/** One row per category: name, amount, and a bar showing its share of the month. */
export function CategoryTotals({
  totals,
  monthTotal,
  categoryNameById,
  showShare = false,
}: CategoryTotalsProps) {
  const theme = useTheme();

  return (
    <View style={styles.list}>
      {totals.map(({ categoryId, total }) => {
        const name = categoryNameById.get(categoryId) ?? 'Unknown category';
        const share = monthTotal > 0 ? total / monthTotal : 0;
        const shareLabel = formatShare(total, monthTotal);
        return (
          <View
            key={categoryId}
            accessible
            accessibilityLabel={`${name}, ${formatPaise(total)}, ${shareLabel}`}
          >
            <View style={styles.row}>
              <ThemedText style={styles.name} numberOfLines={1}>
                {name}
              </ThemedText>
              {showShare ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.amount}>
                  {shareLabel}
                </ThemedText>
              ) : null}
              <ThemedText style={styles.amount}>{formatPaise(total)}</ThemedText>
            </View>
            <ThemedView type="backgroundElement" style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { width: `${share * 100}%`, backgroundColor: theme.textSecondary },
                ]}
              />
            </ThemedView>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  name: {
    flex: 1,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    marginTop: Spacing.one,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
});
