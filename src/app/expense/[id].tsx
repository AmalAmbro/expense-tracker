import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenseRepository } from '@/database/hooks';
import { ExpenseForm } from '@/features/expenses/components/expense-form';
import { expenseToFormValues } from '@/features/expenses/utils/expense-form-schema';
import type { Expense } from '@/types/expense';
import { confirmDestructive } from '@/utils/confirm-destructive';

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; expense: Expense }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const expenseRepository = useExpenseRepository();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    expenseRepository
      .getById(id)
      .then((expense) => {
        if (!isCurrent) return;
        setState(expense ? { status: 'loaded', expense } : { status: 'not-found' });
      })
      .catch((err: unknown) => {
        if (!isCurrent) return;
        const message = err instanceof Error ? err.message : 'Failed to load expense';
        setState({ status: 'error', message });
      });
    return () => {
      isCurrent = false;
    };
  }, [expenseRepository, id]);

  async function handleDelete() {
    const confirmed = await confirmDestructive({
      title: 'Delete expense?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await expenseRepository.delete(id);
      router.back();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete expense');
      setIsDeleting(false);
    }
  }

  if (state.status === 'loading') {
    return null;
  }

  if (state.status !== 'loaded') {
    return (
      <View style={styles.message}>
        <ThemedText>
          {state.status === 'not-found' ? 'This expense no longer exists.' : state.message}
        </ThemedText>
        <Button title="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ExpenseForm
      defaultValues={expenseToFormValues(state.expense)}
      submitLabel="Save Changes"
      onSubmit={async (expense) => {
        await expenseRepository.update(id, expense);
        router.back();
      }}
      footer={
        <View style={styles.deleteSection}>
          {deleteError ? (
            <ThemedText type="small" style={styles.errorText}>
              {deleteError}
            </ThemedText>
          ) : null}
          <Button
            title="Delete Expense"
            color="#C0392B"
            onPress={handleDelete}
            disabled={isDeleting}
          />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  message: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  errorText: {
    color: '#C0392B',
  },
});
