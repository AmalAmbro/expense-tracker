import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { usePaymentRepository } from '@/database/hooks';
import { createCategoryMatcher } from '@/features/bulk-entry/utils/match-category';
import { CategoryField } from '@/features/expenses/components/category-field';
import { useExpenseOptions } from '@/features/expenses/hooks/use-expense-options';
import { PaymentOutcomeCard } from '@/features/upi/components/payment-outcome-card';
import { ScannedPayeeCard } from '@/features/upi/components/scanned-payee-card';
import { UpiAppPicker } from '@/features/upi/components/upi-app-picker';
import { useAwaitingPayments } from '@/features/upi/hooks/use-awaiting-payments';
import type { UpiProvider } from '@/features/upi/providers';
import { paymentLauncher } from '@/features/upi/services/payment-launcher';
import { createTransactionReference, type UpiAppResponse } from '@/features/upi/utils/upi-link';
import {
  EMPTY_UPI_PAYMENT_FORM,
  findUpiPaymentMethod,
  toUpiPaymentRecords,
  validateUpiPaymentForm,
  type UpiPaymentFormErrors,
  type UpiPaymentFormValues,
} from '@/features/upi/utils/upi-payment-form';
import { parseUpiQr, type ScannedUpiQr } from '@/features/upi/utils/upi-qr';
import { todayISODate } from '@/utils/date';
import { formatPaise, formatPaiseForInput, parseAmountToPaise } from '@/utils/money';
import type { ExpenseItem } from '@/types/expense';
import type { Payment, PaymentStatus } from '@/types/payment';

type Launched = { payment: Payment; items: ExpenseItem[]; appResponse: UpiAppResponse | null };

export default function PayScreen() {
  const paymentRepository = usePaymentRepository();
  const { categories, paymentMethods, isLoading } = useExpenseOptions();
  const { awaiting, reload } = useAwaitingPayments();
  const matchCategory = useMemo(() => createCategoryMatcher(categories), [categories]);
  const upiMethod = findUpiPaymentMethod(paymentMethods);
  /** Raw QR contents handed over by the scanner (see app/scan.tsx). */
  const { qr: scannedData } = useLocalSearchParams<{ qr?: string }>();

  const [values, setValues] = useState<UpiPaymentFormValues>(EMPTY_UPI_PAYMENT_FORM);
  const [errors, setErrors] = useState<UpiPaymentFormErrors>({});
  const [categoryChosenByUser, setCategoryChosenByUser] = useState(false);
  const [launched, setLaunched] = useState<Launched | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** The scanned QR being paid, if the payee came from a QR code. */
  const [scanned, setScanned] = useState<ScannedUpiQr | null>(null);
  /** null while loading. On Android, the UPI apps installed on this phone. */
  const [providers, setProviders] = useState<UpiProvider[] | null>(null);

  useEffect(() => {
    let isCurrent = true;
    paymentLauncher
      .getAvailableProviders()
      .catch(() => [])
      .then((available) => {
        if (isCurrent) setProviders(available);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  // Take over a QR handed in by the scanner. State is adjusted during render (React's
  // pattern for responding to a changed prop); the effect only clears the route param
  // so a later visit — or re-scanning the same QR — is handled afresh.
  const [appliedScan, setAppliedScan] = useState<string | null>(null);
  if (scannedData && scannedData !== appliedScan) {
    setAppliedScan(scannedData);
    const result = parseUpiQr(scannedData);
    if (result.ok) {
      const { qr } = result;
      setScanned(qr);
      setErrors({});
      setMessage(null);
      setValues((current) => ({
        ...current,
        payeeVpa: qr.payeeVpa,
        payeeName: qr.payeeName ?? '',
        amountText: qr.amount !== null ? formatPaiseForInput(qr.amount) : '',
      }));
    } else {
      setMessage(result.error);
    }
  } else if (!scannedData && appliedScan !== null) {
    setAppliedScan(null);
  }

  useEffect(() => {
    if (scannedData) router.setParams({ qr: undefined });
  }, [scannedData]);

  function clearScan() {
    setScanned(null);
    setValues((current) => ({ ...current, payeeVpa: '', payeeName: '', amountText: '' }));
  }

  function update(changes: Partial<UpiPaymentFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  /** Suggests a category from the description, unless the user already picked one. */
  function suggestCategory() {
    if (categoryChosenByUser) return;
    const match = matchCategory(values.description);
    if (match) update(match);
  }

  async function pay() {
    setMessage(null);
    const validation = validateUpiPaymentForm(values);
    setErrors(validation);
    const provider = providers?.find((p) => p.id === values.providerId);
    if (Object.keys(validation).length > 0 || !provider || !upiMethod) return;

    setIsBusy(true);
    let saved: { payment: Payment; items: ExpenseItem[] } | null = null;
    try {
      // A merchant QR's own reference identifies the payment to the merchant; otherwise
      // we generate one for our records.
      const transactionReference =
        scanned?.transactionReference ??
        createTransactionReference(new Date(), Crypto.randomUUID());
      const records = toUpiPaymentRecords(values, {
        paymentMethodId: upiMethod.id,
        categories,
        date: todayISODate(),
        transactionReference,
      });
      // Save first: if Android closes this app while the UPI app is open, the
      // payment is still here to confirm afterwards.
      saved = await paymentRepository.createWithItems(records.payment, [records.item]);

      const result = await paymentLauncher.launchUPIPayment(
        {
          payeeVpa: values.payeeVpa,
          payeeName: values.payeeName || null,
          amount: records.payment.amount,
          note: records.item.description,
          // A typed-in UPI ID has no merchant details, so no `tr` (see UpiPaymentRequest).
          // The reference stays on our payment record for our own bookkeeping.
          transactionReference: null,
          // A scanned QR is launched with its own parameters (mc, tr, sign, …) intact.
          qr: scanned,
        },
        provider,
      );

      if (result.outcome !== 'returned') {
        await paymentRepository.deleteUnsent(saved.payment.id);
        setMessage(
          result.outcome === 'not-installed'
            ? `${provider.name} isn’t installed (or can’t take UPI links). Nothing was sent.`
            : 'UPI apps can’t be opened on this device. Nothing was sent.',
        );
        return;
      }
      setLaunched({ ...saved, appResponse: result.response });
    } catch (err) {
      if (saved) {
        // We can't tell whether the app opened, so keep it for the user to resolve.
        await paymentRepository.updateStatus(saved.payment.id, 'unknown').catch(() => {});
        reload();
      }
      setMessage(err instanceof Error ? err.message : 'Something went wrong launching the payment');
    } finally {
      setIsBusy(false);
    }
  }

  async function resolve(
    payment: Payment,
    status: Extract<PaymentStatus, 'confirmed' | 'failed' | 'unknown'>,
    appResponse?: UpiAppResponse | null,
  ) {
    setIsBusy(true);
    try {
      const bankReference = appResponse?.approvalReference ?? appResponse?.transactionId;
      await paymentRepository.updateStatus(
        payment.id,
        status,
        status === 'confirmed' && bankReference ? { reference: bankReference } : {},
      );
      if (launched?.payment.id === payment.id) {
        setLaunched(null);
        setValues(EMPTY_UPI_PAYMENT_FORM);
        setScanned(null);
        setCategoryChosenByUser(false);
      }
      setMessage(
        status === 'confirmed'
          ? `Recorded ${formatPaise(payment.amount)} as paid.`
          : status === 'failed'
            ? 'Marked as failed. It won’t count as spending.'
            : 'Kept under “Awaiting confirmation” until you know.',
      );
      reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update the payment');
    } finally {
      setIsBusy(false);
    }
  }

  if (isLoading) return null;

  if (launched) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <PaymentOutcomeCard
            payment={launched.payment}
            items={launched.items}
            appResponse={launched.appResponse}
            onResolve={(status) => resolve(launched.payment, status, launched.appResponse)}
            disabled={isBusy}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  let amountLabel = '';
  try {
    amountLabel = ` ${formatPaise(parseAmountToPaise(values.amountText))}`;
  } catch {
    // Not a valid amount yet; the button just says "Pay".
  }
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {message ? (
          <ThemedText type="small" accessibilityLiveRegion="polite">
            {message}
          </ThemedText>
        ) : null}

        {awaiting.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="smallBold" accessibilityRole="header">
              Awaiting confirmation
            </ThemedText>
            {awaiting.map(({ payment, items }) => (
              <PaymentOutcomeCard
                key={payment.id}
                payment={payment}
                items={items}
                onResolve={(status) => resolve(payment, status)}
                disabled={isBusy}
              />
            ))}
          </View>
        ) : null}

        {providers === null ? null : providers.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            {Platform.OS === 'web'
              ? 'UPI apps can only be opened from the Android or iOS app.'
              : 'No UPI apps found. If one is installed, this build of the app may be out of date — rebuild it with “npx expo run:android”.'}
          </ThemedText>
        ) : !upiMethod ? (
          <ThemedText themeColor="textSecondary">
            Add a payment method named “UPI” to record UPI payments.
          </ThemedText>
        ) : (
          <View style={styles.section}>
            {scanned ? (
              <ScannedPayeeCard qr={scanned} onClear={clearScan} />
            ) : (
              <>
                <Button
                  title="Scan QR code"
                  variant="secondary"
                  onPress={() => router.push('/scan')}
                />
                <Field label="Pay to (UPI ID)" error={errors.payeeVpa}>
                  <ThemedTextInput
                    value={values.payeeVpa}
                    onChangeText={(payeeVpa) => update({ payeeVpa })}
                    placeholder="name@bank"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    accessibilityLabel="Payee UPI ID"
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    Works with shop and business UPI IDs. UPI apps may refuse payments to personal
                    UPI IDs started from another app, often with a misleading “limit exceeded” error
                    — your bank limit isn’t the problem.
                  </ThemedText>
                </Field>
                <Field label="Payee name (optional)">
                  <ThemedTextInput
                    value={values.payeeName}
                    onChangeText={(payeeName) => update({ payeeName })}
                    placeholder="Corner Bakery"
                    accessibilityLabel="Payee name"
                  />
                </Field>
              </>
            )}
            <Field label="Amount" error={errors.amountText}>
              <ThemedTextInput
                value={values.amountText}
                onChangeText={(amountText) => update({ amountText })}
                editable={!scanned?.amountIsFixed}
                placeholder="0"
                keyboardType="decimal-pad"
                accessibilityLabel="Amount in rupees"
                size="large"
              />
            </Field>
            <Field label="What for" error={errors.description}>
              <ThemedTextInput
                value={values.description}
                onChangeText={(description) => update({ description })}
                onBlur={suggestCategory}
                placeholder="Bread"
                accessibilityLabel="What the payment is for"
              />
            </Field>
            <Field label="Category" error={errors.categoryId}>
              <CategoryField
                categories={categories}
                value={{ categoryId: values.categoryId ?? '', subcategoryId: values.subcategoryId }}
                onChange={(next) => {
                  setCategoryChosenByUser(true);
                  update(next);
                }}
              />
            </Field>
            <Field label="Pay with" error={errors.providerId}>
              <UpiAppPicker
                providers={providers}
                value={values.providerId}
                onChange={(providerId) => update({ providerId })}
              />
            </Field>

            <Button title={`Pay${amountLabel}`} onPress={pay} loading={isBusy} />
            <ThemedText type="small" themeColor="textSecondary">
              Opens your UPI app to make the payment. Nothing is charged by this app; it only
              records the payment once you confirm it went through.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="small">{label}</ThemedText>
      {children}
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
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
  section: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
});
