import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import {
  useCategoryRepository,
  useExpenseRepository,
  usePaymentMethodRepository,
} from '@/database/hooks';
import { CategoryField } from '@/features/expenses/components/category-field';
import { DateField } from '@/features/expenses/components/date-field';
import { PaymentMethodField } from '@/features/expenses/components/payment-method-field';
import {
  expenseFormSchema,
  type ExpenseFormValues,
} from '@/features/expenses/utils/expense-form-schema';
import type { Category } from '@/types/category';
import type { PaymentMethod } from '@/types/payment-method';
import { todayISODate } from '@/utils/date';
import { parseAmountToPaise } from '@/utils/money';

export default function AddExpenseScreen() {
  const expenseRepository = useExpenseRepository();
  const categoryRepository = useCategoryRepository();
  const paymentMethodRepository = usePaymentMethodRepository();

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([categoryRepository.list(), paymentMethodRepository.list()]).then(
      ([cats, methods]) => {
        setCategories(cats);
        setPaymentMethods(methods);
        setIsLoadingOptions(false);
      },
    );
  }, [categoryRepository, paymentMethodRepository]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amountText: '',
      description: '',
      categoryId: '',
      subcategoryId: null,
      date: todayISODate(),
      paymentMethodId: '',
      isEssential: false,
      notes: null,
    },
  });

  const categoryId = useWatch({ control, name: 'categoryId' });
  const subcategoryId = useWatch({ control, name: 'subcategoryId' });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await expenseRepository.create({
        amount: parseAmountToPaise(values.amountText),
        date: values.date,
        categoryId: values.categoryId,
        subcategoryId: values.subcategoryId,
        description: values.description.trim(),
        paymentMethodId: values.paymentMethodId,
        isEssential: values.isEssential,
        notes: values.notes?.trim() || null,
      });
      router.back();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save expense');
    }
  });

  if (isLoadingOptions) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="small">Amount</ThemedText>
      <Controller
        control={control}
        name="amountText"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoFocus
            keyboardType="decimal-pad"
            placeholder="0"
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
            <Switch value={value} onValueChange={onChange} />
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
            style={styles.textInput}
          />
        )}
      />

      {submitError ? <ErrorText message={submitError} /> : null}

      <Button title="Save Expense" onPress={onSubmit} disabled={isSubmitting} />
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
