import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Button, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useExpenseRepository } from '@/database/hooks';
import { BulkDraftRow } from '@/features/bulk-entry/components/bulk-draft-row';
import {
  buildBulkPreview,
  draftsToExpenses,
  getBulkSaveBlocker,
  totalOfDrafts,
  type BulkDraft,
  type BulkPreview,
} from '@/features/bulk-entry/utils/bulk-drafts';
import { createCategoryMatcher } from '@/features/bulk-entry/utils/match-category';
import { parseBulkInput } from '@/features/bulk-entry/utils/parse-bulk-input';
import { DateField } from '@/features/expenses/components/date-field';
import { PaymentMethodField } from '@/features/expenses/components/payment-method-field';
import { useExpenseOptions } from '@/features/expenses/hooks/use-expense-options';
import { useTheme } from '@/hooks/use-theme';
import { todayISODate } from '@/utils/date';
import { formatPaise } from '@/utils/money';

const PLACEHOLDER = 'Chicken 200+90+90\nEggs 140\nBus 25+30\nPetrol 500';

export default function BulkEntryScreen() {
  const theme = useTheme();
  const expenseRepository = useExpenseRepository();
  const { categories, paymentMethods, isLoading, error: optionsError } = useExpenseOptions();
  const matchCategory = useMemo(() => createCategoryMatcher(categories), [categories]);

  // The text is kept while previewing, so going back never loses what was typed.
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [date, setDate] = useState(todayISODate());
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function showPreview() {
    setSaveError(null);
    setPreview(buildBulkPreview(parseBulkInput(text), matchCategory));
  }

  function updateDraft(key: string, changes: Partial<BulkDraft>) {
    setPreview(
      (current) =>
        current && {
          ...current,
          drafts: current.drafts.map((d) => (d.key === key ? { ...d, ...changes } : d)),
        },
    );
  }

  function removeDraft(key: string) {
    setPreview(
      (current) => current && { ...current, drafts: current.drafts.filter((d) => d.key !== key) },
    );
  }

  async function save() {
    if (!preview) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const expenses = draftsToExpenses(preview.drafts, { date, paymentMethodId, categories });
      await expenseRepository.createMany(expenses);
      setText('');
      setPreview(null);
      router.navigate('/history');
    } catch (err) {
      // Nothing was saved (the batch is atomic); keep the preview so no input is lost.
      setSaveError(err instanceof Error ? err.message : 'Failed to save expenses');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return null;

  if (optionsError) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={[styles.content, styles.errorText]}>{optionsError}</ThemedText>
      </ThemedView>
    );
  }

  if (!preview) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText themeColor="textSecondary">
            One item per line: a description, then an amount. Use + for several amounts.
          </ThemedText>
          <ThemedTextInput
            value={text}
            onChangeText={setText}
            placeholder={PLACEHOLDER}
            multiline
            autoCorrect={false}
            autoCapitalize="sentences"
            textAlignVertical="top"
            accessibilityLabel="Expenses, one per line"
            style={[styles.textArea, { backgroundColor: theme.backgroundElement }]}
          />
          <Button title="Preview" onPress={showPreview} disabled={!text.trim()} />
        </ScrollView>
      </ThemedView>
    );
  }

  const { drafts, errors } = preview;
  const blocker = getBulkSaveBlocker(preview, paymentMethodId || null);
  const total = formatPaise(totalOfDrafts(drafts));

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <ThemedText type="subtitle" style={styles.tabular}>
            {total}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {drafts.length} {drafts.length === 1 ? 'transaction' : 'transactions'}
          </ThemedText>
        </View>

        {errors.length > 0 ? (
          <ThemedView type="backgroundElement" style={styles.errorBox}>
            <ThemedText type="smallBold">
              Needs review — {errors.length} {errors.length === 1 ? 'line' : 'lines'} couldn’t be
              read
            </ThemedText>
            {errors.map((error) => (
              <ThemedText key={error.lineNumber} type="small">
                Line {error.lineNumber}: “{error.raw.trim()}” — {error.message}
              </ThemedText>
            ))}
            <Button title="Edit text" onPress={() => setPreview(null)} />
          </ThemedView>
        ) : null}

        <View style={styles.field}>
          <ThemedText type="small">Date</ThemedText>
          <DateField value={date} onChange={setDate} />
        </View>
        <View style={styles.field}>
          <ThemedText type="small">Payment</ThemedText>
          <PaymentMethodField
            paymentMethods={paymentMethods}
            value={paymentMethodId}
            onChange={setPaymentMethodId}
          />
        </View>

        <View>
          {drafts.map((draft) => (
            <BulkDraftRow
              key={draft.key}
              draft={draft}
              categories={categories}
              onChangeCategory={(value) => updateDraft(draft.key, value)}
              onRemove={() => removeDraft(draft.key)}
            />
          ))}
        </View>

        {blocker ? (
          <ThemedText type="small" themeColor="textSecondary">
            {blocker}
          </ThemedText>
        ) : null}
        {saveError ? <ThemedText style={styles.errorText}>{saveError}</ThemedText> : null}

        <Button
          title={`Save ${drafts.length} ${drafts.length === 1 ? 'expense' : 'expenses'} · ${total}`}
          onPress={save}
          disabled={blocker !== null || isSaving}
        />
        <Button title="Back to edit" onPress={() => setPreview(null)} disabled={isSaving} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  textArea: {
    minHeight: 240,
    fontSize: 16,
    lineHeight: 24,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  errorBox: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  field: {
    gap: Spacing.two,
  },
  errorText: {
    color: '#C0392B',
  },
});
