import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { CategoryTotals } from '@/features/dashboard/components/category-totals';
import { MonthSwitcher } from '@/features/dashboard/components/month-switcher';
import { buildDashboardSummary } from '@/features/dashboard/utils/dashboard-summary';
import { ExpenseListItem } from '@/features/expenses/components/expense-list-item';
import { useExpenseList } from '@/features/expenses/hooks/use-expense-list';
import { useExpenseOptions } from '@/features/expenses/hooks/use-expense-options';
import { formatCategoryLabel } from '@/features/expenses/utils/category-label';
import { useTheme } from '@/hooks/use-theme';
import { currentMonth, getMonthDateRange, todayISODate } from '@/utils/date';
import { formatPaise } from '@/utils/money';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const thisMonth = currentMonth();
  const today = todayISODate();
  const [month, setMonth] = useState(thisMonth);
  const isCurrentMonth = month === thisMonth;

  const { start, end } = getMonthDateRange(month);
  const { expenses, isLoading, error } = useExpenseList({ startDate: start, endDate: end });
  const { categories, paymentMethods } = useExpenseOptions();

  const summary = useMemo(() => buildDashboardSummary(expenses, today), [expenses, today]);
  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );
  const paymentMethodNameById = useMemo(
    () => new Map(paymentMethods.map((m) => [m.id, m.name])),
    [paymentMethods],
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <MonthSwitcher month={month} onChange={setMonth} maxMonth={thisMonth} />

        <View style={styles.totals}>
          <ThemedText type="title" style={styles.monthTotal} adjustsFontSizeToFit numberOfLines={1}>
            {formatPaise(summary.monthTotal)}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {isCurrentMonth ? 'Spent this month' : 'Total spent'} · {summary.transactionCount}{' '}
            {summary.transactionCount === 1 ? 'transaction' : 'transactions'}
          </ThemedText>
          {isCurrentMonth ? (
            <ThemedText style={styles.today}>
              Today: <ThemedText type="smallBold">{formatPaise(summary.todayTotal)}</ThemedText>
            </ThemedText>
          ) : null}
        </View>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        {!isLoading && summary.transactionCount === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No expenses recorded for this month.
          </ThemedText>
        ) : null}

        {summary.categoryTotals.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="smallBold" accessibilityRole="header">
              By category
            </ThemedText>
            <CategoryTotals
              totals={summary.categoryTotals}
              monthTotal={summary.monthTotal}
              categoryNameById={categoryNameById}
            />
          </View>
        ) : null}

        {summary.recent.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" accessibilityRole="header">
                Recent
              </ThemedText>
              <Pressable
                onPress={() => router.navigate('/history')}
                accessibilityRole="link"
                hitSlop={8}
              >
                <ThemedText type="linkPrimary">See all</ThemedText>
              </Pressable>
            </View>
            <ThemedView type="backgroundElement" style={styles.recentList}>
              {summary.recent.map((expense) => (
                <ExpenseListItem
                  key={expense.id}
                  expense={expense}
                  categoryLabel={formatCategoryLabel(expense, categoryNameById)}
                  paymentMethodName={
                    paymentMethodNameById.get(expense.paymentMethodId) ?? 'Unknown'
                  }
                  onPress={() =>
                    router.push({ pathname: '/expense/[id]', params: { id: expense.id } })
                  }
                />
              ))}
            </ThemedView>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.addBar, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <Pressable
          onPress={() => router.push('/add-expense')}
          accessibilityRole="button"
          accessibilityLabel="Add expense"
          style={({ pressed }) => [
            styles.addButton,
            styles.primaryButton,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={[styles.addButtonText, { color: theme.background }]}>
            + Add Expense
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.navigate('/bulk-entry')}
          accessibilityRole="button"
          accessibilityLabel="Bulk entry"
          style={({ pressed }) => [
            styles.addButton,
            styles.secondaryButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.addButtonText}>Bulk</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  totals: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  monthTotal: {
    fontVariant: ['tabular-nums'],
  },
  today: {
    marginTop: Spacing.two,
  },
  empty: {
    textAlign: 'center',
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentList: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  addBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.four,
  },
  addButton: {
    minHeight: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.7,
  },
  errorText: {
    color: '#C0392B',
    textAlign: 'center',
  },
});
