import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { formatPaise } from '@/utils/money';
import type { Expense } from '@/types/expense';

type ExpenseListItemProps = {
  expense: Expense;
  /** e.g. "Food & Groceries → Eggs". */
  categoryLabel: string;
  paymentMethodName: string;
  onPress: (expense: Expense) => void;
};

export function ExpenseListItem({
  expense,
  categoryLabel,
  paymentMethodName,
  onPress,
}: ExpenseListItemProps) {
  const amount = formatPaise(expense.amount);
  const essentialLabel = expense.isEssential ? 'Essential' : 'Discretionary';

  return (
    <Pressable
      onPress={() => onPress(expense)}
      accessibilityRole="button"
      accessibilityLabel={`${expense.description}, ${amount}, ${categoryLabel}, ${paymentMethodName}, ${essentialLabel}`}
      accessibilityHint="Opens the expense for editing"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.details}>
        <ThemedText numberOfLines={1}>{expense.description}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {categoryLabel} · {paymentMethodName}
          {expense.isEssential ? '' : ' · Discretionary'}
        </ThemedText>
      </View>
      <ThemedText style={styles.amount}>{amount}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  details: {
    flex: 1,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
});
