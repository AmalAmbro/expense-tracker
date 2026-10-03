import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { CategoryField } from '@/features/expenses/components/category-field';
import { DateField } from '@/features/expenses/components/date-field';
import { PaymentMethodField } from '@/features/expenses/components/payment-method-field';
import { useExpenseOptions } from '@/features/expenses/hooks/use-expense-options';
import {
  expenseFormSchema,
  formValuesToExpense,
  type ExpenseFormValues,
} from '@/features/expenses/utils/expense-form-schema';
import type { NewExpense } from '@/types/expense';

type ExpenseFormProps = {
  defaultValues: ExpenseFormValues;
  submitLabel: string;
  /** Persists the expense. Throwing keeps the form open and shows the error message. */
  onSubmit: (expense: NewExpense) => Promise<void>;
  autoFocusAmount?: boolean;
  /** Extra actions rendered below the submit button (e.g. Delete). */
  footer?: ReactNode;
};

export function ExpenseForm({
  defaultValues,
  submitLabel,
  onSubmit,
  autoFocusAmount = false,
  footer,
}: ExpenseFormProps) {
  const { categories, paymentMethods, isLoading, error: optionsError } = useExpenseOptions();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues,
  });

  const categoryId = useWatch({ control, name: 'categoryId' });
  const subcategoryId = useWatch({ control, name: 'subcategoryId' });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(formValuesToExpense(values));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save expense');
    }
  });

  if (isLoading) {
    return null;
  }

  if (optionsError) {
    return (
      <View style={styles.container}>
        <ErrorText message={optionsError} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ThemedText type="small">Amount</ThemedText>
      <Controller
        control={control}
        name="amountText"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoFocus={autoFocusAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            accessibilityLabel="Amount in rupees"
            style={styles.amountInput}
          />
        )}
      />
      {errors.amountText ? <ErrorText message={errors.amountText.message} /> : null}

      <ThemedText type="small">Description</ThemedText>
      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Tea"
            accessibilityLabel="Description"
            style={styles.textInput}
          />
        )}
      />
      {errors.description ? <ErrorText message={errors.description.message} /> : null}

      <ThemedText type="small">Category</ThemedText>
      <CategoryField
        categories={categories}
        value={{ categoryId, subcategoryId }}
        onChange={(next) => {
          setValue('categoryId', next.categoryId, { shouldValidate: true });
          setValue('subcategoryId', next.subcategoryId);
          const category = categories.find((c) => c.id === next.categoryId);
          if (category) {
            setValue('isEssential', category.isEssentialDefault);
          }
        }}
        error={errors.categoryId?.message}
      />

      <ThemedText type="small">Payment</ThemedText>
      <Controller
        control={control}
        name="paymentMethodId"
        render={({ field: { value, onChange } }) => (
          <PaymentMethodField
            paymentMethods={paymentMethods}
            value={value}
            onChange={onChange}
            error={errors.paymentMethodId?.message}
          />
        )}
      />

      <ThemedText type="small">Date</ThemedText>
      <Controller
        control={control}
        name="date"
        render={({ field: { value, onChange } }) => <DateField value={value} onChange={onChange} />}
      />

      <View style={styles.essentialRow}>
        <ThemedText>Essential</ThemedText>
        <Controller
          control={control}
          name="isEssential"
          render={({ field: { value, onChange } }) => (
            <Switch value={value} onValueChange={onChange} accessibilityLabel="Essential" />
          )}
        />
      </View>

      <ThemedText type="small">Notes (optional)</ThemedText>
      <Controller
        control={control}
        name="notes"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            accessibilityLabel="Notes"
            style={styles.textInput}
          />
        )}
      />

      {submitError ? <ErrorText message={submitError} /> : null}

      <Button title={submitLabel} onPress={submit} disabled={isSubmitting} />
      {footer}
    </ScrollView>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <ThemedText type="small" style={styles.errorText}>
      {message}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  amountInput: {
    fontSize: 32,
    paddingVertical: Spacing.two,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  errorText: {
    color: '#C0392B',
  },
  essentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
