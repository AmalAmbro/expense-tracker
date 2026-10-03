import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { DailySpendingChart } from '@/features/analytics/components/daily-spending-chart';
import { EssentialSplit } from '@/features/analytics/components/essential-split';
import { MonthComparison } from '@/features/analytics/components/month-comparison';
import {
  calculateDailyTotals,
  calculateEssentialSplit,
  compareCategoryTotals,
} from '@/features/analytics/utils/analytics';
import { CategoryTotals } from '@/features/dashboard/components/category-totals';
import { MonthSwitcher } from '@/features/dashboard/components/month-switcher';
import { buildDashboardSummary } from '@/features/dashboard/utils/dashboard-summary';
import { useExpenseList } from '@/features/expenses/hooks/use-expense-list';
import { useExpenseOptions } from '@/features/expenses/hooks/use-expense-options';
import {
  currentMonth,
  formatShortMonth,
  getMonthDateRange,
  shiftMonth,
  todayISODate,
} from '@/utils/date';
import { formatPaise } from '@/utils/money';

export default function AnalyticsScreen() {
  const thisMonth = currentMonth();
  const today = todayISODate();
  const [month, setMonth] = useState(thisMonth);
  const isCurrentMonth = month === thisMonth;
  const previousMonth = shiftMonth(month, -1);

  // One query covering both months; every figure below is derived from it.
  const { start } = getMonthDateRange(previousMonth);
  const { end } = getMonthDateRange(month);
  const { expenses, isLoading, error } = useExpenseList({ startDate: start, endDate: end });
  const { categories } = useExpenseOptions();

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const analytics = useMemo(() => {
    const current = expenses.filter((e) => e.date.startsWith(month));
    const previous = expenses.filter((e) => e.date.startsWith(previousMonth));
    const currentSummary = buildDashboardSummary(current, today);
    const previousSummary = buildDashboardSummary(previous, today);
    return {
      current: currentSummary,
      previousTotal: previousSummary.monthTotal,
      hasPrevious: previous.length > 0,
      split: calculateEssentialSplit(current),
      days: calculateDailyTotals(current, month, isCurrentMonth ? today : undefined),
      comparison: compareCategoryTotals(current, previous),
    };
  }, [expenses, month, previousMonth, today, isCurrentMonth]);

  const hasCurrent = analytics.current.transactionCount > 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <MonthSwitcher month={month} onChange={setMonth} maxMonth={thisMonth} />

        <View style={styles.totals}>
          <ThemedText type="subtitle" style={styles.tabular}>
            {formatPaise(analytics.current.monthTotal)}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {isCurrentMonth ? 'Spent so far this month' : 'Total spent'} ·{' '}
            {analytics.current.transactionCount}{' '}
            {analytics.current.transactionCount === 1 ? 'transaction' : 'transactions'}
          </ThemedText>
        </View>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        {!isLoading && !hasCurrent ? (
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            No expenses recorded for this month.
          </ThemedText>
        ) : null}

        {hasCurrent ? (
          <>
            <Section title="Essential vs discretionary">
              <EssentialSplit split={analytics.split} />
            </Section>

            <Section title="Daily spending">
              <DailySpendingChart days={analytics.days} />
            </Section>

            <Section title="By category">
              <CategoryTotals
                totals={analytics.current.categoryTotals}
                monthTotal={analytics.current.monthTotal}
                categoryNameById={categoryNameById}
                showShare
              />
            </Section>
          </>
        ) : null}

        {hasCurrent || analytics.hasPrevious ? (
          <Section title={`Compared with ${formatShortMonth(previousMonth)}`}>
            {isCurrentMonth ? (
              <ThemedText type="small" themeColor="textSecondary">
                This month is still in progress.
              </ThemedText>
            ) : null}
            <MonthComparison
              rows={analytics.comparison}
              previousTotal={analytics.previousTotal}
              currentTotal={analytics.current.monthTotal}
              previousLabel={formatShortMonth(previousMonth)}
              currentLabel={formatShortMonth(month)}
              categoryNameById={categoryNameById}
            />
          </Section>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  totals: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  centered: {
    textAlign: 'center',
  },
  section: {
    gap: Spacing.three,
  },
  errorText: {
    color: '#C0392B',
    textAlign: 'center',
  },
});
