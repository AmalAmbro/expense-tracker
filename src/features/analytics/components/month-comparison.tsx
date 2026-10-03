import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { describeChange, type CategoryComparison } from '@/features/analytics/utils/analytics';
import { formatPaise, subtractPaise } from '@/utils/money';

type MonthComparisonProps = {
  rows: CategoryComparison[];
  previousTotal: number;
  currentTotal: number;
  /** Column headings, e.g. "Sep" and "Oct". */
  previousLabel: string;
  currentLabel: string;
  categoryNameById: ReadonlyMap<string, string>;
};

/** Category totals side by side for two months, with factual change descriptions. */
export function MonthComparison({
  rows,
  previousTotal,
  currentTotal,
  previousLabel,
  currentLabel,
  categoryNameById,
}: MonthComparisonProps) {
  const totalRow: CategoryComparison = {
    categoryId: 'total',
    previous: previousTotal,
    current: currentTotal,
    change: subtractPaise(currentTotal, previousTotal),
  };

  return (
    <View>
      <View style={[styles.row, styles.headerRow]}>
        <ThemedText type="smallBold" style={styles.nameColumn}>
          Category
        </ThemedText>
        <ThemedText type="smallBold" style={styles.amountColumn}>
          {previousLabel}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.amountColumn}>
          {currentLabel}
        </ThemedText>
      </View>
      {[...rows, totalRow].map((row) => {
        const name =
          row === totalRow ? 'Total' : (categoryNameById.get(row.categoryId) ?? 'Unknown category');
        const change = describeChange(row.change);
        return (
          <View
            key={row.categoryId}
            style={[styles.row, row === totalRow && styles.totalRow]}
            accessible
            accessibilityLabel={`${name}: ${previousLabel} ${formatPaise(row.previous)}, ${currentLabel} ${formatPaise(row.current)}. ${change}.`}
          >
            <View style={styles.nameColumn}>
              <ThemedText type={row === totalRow ? 'smallBold' : 'small'} numberOfLines={1}>
                {name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.change}>
                {change}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.amountColumn}>
              {formatPaise(row.previous)}
            </ThemedText>
            <ThemedText type={row === totalRow ? 'smallBold' : 'small'} style={styles.amountColumn}>
              {formatPaise(row.current)}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  headerRow: {
    paddingTop: 0,
  },
  totalRow: {
    borderBottomWidth: 0,
  },
  nameColumn: {
    flex: 1,
  },
  change: {
    fontSize: 12,
    lineHeight: 16,
  },
  amountColumn: {
    width: 96,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
