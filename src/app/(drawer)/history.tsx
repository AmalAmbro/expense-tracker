import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, View } from 'react-native';

import { TextButton } from '@/components/ui/text-button';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { ExpenseListItem } from '@/features/expenses/components/expense-list-item';
import { FilterChip, type FilterOption } from '@/features/expenses/components/filter-chip';
import { useExpenseList } from '@/features/expenses/hooks/use-expense-list';
import { useExpenseOptions } from '@/features/expenses/hooks/use-expense-options';
import { formatCategoryLabel } from '@/features/expenses/utils/category-label';
import { groupExpensesByDate } from '@/features/expenses/utils/group-expenses-by-date';
import {
  DATE_PRESET_OPTIONS,
  DEFAULT_HISTORY_FILTERS,
  ESSENTIAL_FILTER_OPTIONS,
  hasActiveFilters,
  toExpenseFilter,
  type HistoryFilters,
} from '@/features/expenses/utils/history-filters';
import { formatDayHeading, todayISODate } from '@/utils/date';
import { addPaise, formatPaise } from '@/utils/money';

export default function HistoryScreen() {
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);
  const today = todayISODate();

  const { categories, paymentMethods, error: optionsError } = useExpenseOptions();
  const { expenses, isLoading, error: listError } = useExpenseList(toExpenseFilter(filters, today));

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );
  const paymentMethodNameById = useMemo(
    () => new Map(paymentMethods.map((m) => [m.id, m.name])),
    [paymentMethods],
  );

  const categoryOptions = useMemo<FilterOption<string | null>[]>(
    () => [
      { value: null, label: 'All categories' },
      ...categories.filter((c) => c.parentId === null).map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );
  const paymentMethodOptions = useMemo<FilterOption<string | null>[]>(
    () => [
      { value: null, label: 'All payments' },
      ...paymentMethods.map((m) => ({ value: m.id, label: m.name })),
    ],
    [paymentMethods],
  );

  const sections = useMemo(() => groupExpensesByDate(expenses), [expenses]);
  const filteredTotal = useMemo(() => addPaise(...expenses.map((e) => e.amount)), [expenses]);

  const isFiltering = filters.search.trim() !== '' || hasActiveFilters(filters);

  function updateFilters(changes: Partial<HistoryFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
  }

  const error = listError ?? optionsError;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.controls}>
        <ThemedTextInput
          value={filters.search}
          onChangeText={(search) => updateFilters({ search })}
          placeholder="Search description, notes, category"
          accessibilityLabel="Search expenses"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <FilterChip
            name="Date"
            options={DATE_PRESET_OPTIONS}
            value={filters.datePreset}
            onChange={(datePreset) => updateFilters({ datePreset })}
            isActive={filters.datePreset !== DEFAULT_HISTORY_FILTERS.datePreset}
          />
          <FilterChip
            name="Category"
            options={categoryOptions}
            value={filters.categoryId}
            onChange={(categoryId) => updateFilters({ categoryId })}
            isActive={filters.categoryId !== null}
          />
          <FilterChip
            name="Payment method"
            options={paymentMethodOptions}
            value={filters.paymentMethodId}
            onChange={(paymentMethodId) => updateFilters({ paymentMethodId })}
            isActive={filters.paymentMethodId !== null}
          />
          <FilterChip
            name="Type"
            options={ESSENTIAL_FILTER_OPTIONS}
            value={filters.essential}
            onChange={(essential) => updateFilters({ essential })}
            isActive={filters.essential !== DEFAULT_HISTORY_FILTERS.essential}
          />
          {hasActiveFilters(filters) ? (
            <TextButton
              title="Clear"
              accessibilityLabel="Clear filters"
              onPress={() => updateFilters({ ...DEFAULT_HISTORY_FILTERS, search: filters.search })}
            />
          ) : null}
        </ScrollView>
        {expenses.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {expenses.length} {expenses.length === 1 ? 'transaction' : 'transactions'} ·{' '}
            {formatPaise(filteredTotal)}
          </ThemedText>
        ) : null}
      </View>

      {error ? (
        <ThemedText themeColor="danger" style={styles.message}>
          {error}
        </ThemedText>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <ThemedView type="backgroundElement" style={styles.sectionHeader}>
            <ThemedText type="smallBold" accessibilityRole="header">
              {formatDayHeading(section.date, today)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatPaise(section.total)}
            </ThemedText>
          </ThemedView>
        )}
        renderItem={({ item }) => (
          <ExpenseListItem
            expense={item}
            categoryLabel={formatCategoryLabel(item, categoryNameById)}
            paymentMethodName={paymentMethodNameById.get(item.paymentMethodId) ?? 'Unknown'}
            onPress={(expense) =>
              router.push({ pathname: '/expense/[id]', params: { id: expense.id } })
            }
          />
        )}
        ListEmptyComponent={
          isLoading || error ? null : (
            <ThemedText themeColor="textSecondary" style={styles.message}>
              {isFiltering
                ? 'No expenses match your search or filters.'
                : 'No expenses yet. Add one from the Home screen.'}
            </ThemedText>
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  chips: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  message: {
    textAlign: 'center',
    padding: Spacing.four,
  },
});
