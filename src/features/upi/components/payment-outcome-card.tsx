import { Button, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { providerDisplayName } from '@/features/upi/providers';
import type { UpiAppResponse } from '@/features/upi/utils/upi-link';
import { formatDisplayDate } from '@/utils/date';
import { formatPaise } from '@/utils/money';
import type { ExpenseItem } from '@/types/expense';
import type { Payment, PaymentStatus } from '@/types/payment';

const APP_STATUS_LABELS: Record<UpiAppResponse['status'], string> = {
  success: 'Success',
  failure: 'Failed',
  submitted: 'Submitted (pending)',
  unknown: 'No clear status',
};

type PaymentOutcomeCardProps = {
  payment: Payment;
  items: ExpenseItem[];
  /** What the UPI app reported on return, if anything (Android only). */
  appResponse?: UpiAppResponse | null;
  onResolve: (status: Extract<PaymentStatus, 'confirmed' | 'failed' | 'unknown'>) => void;
  disabled?: boolean;
};

/** Asks the user what happened to a launched payment. The app's report is only a hint. */
export function PaymentOutcomeCard({
  payment,
  items,
  appResponse,
  onResolve,
  disabled,
}: PaymentOutcomeCardProps) {
  const payee = payment.merchantName ?? payment.merchantVpa ?? 'payee';
  const provider = providerDisplayName(payment.provider);
  const description = items.map((item) => item.description).join(', ');

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        Did {formatPaise(payment.amount)} to {payee} go through?
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {[description, provider, formatDisplayDate(payment.date)].filter(Boolean).join(' · ')}
        {payment.status === 'unknown' ? ' · marked “not sure”' : ''}
      </ThemedText>
      {appResponse !== undefined ? (
        <ThemedText type="small">
          {appResponse
            ? `${provider ?? 'The app'} reported: ${APP_STATUS_LABELS[appResponse.status]}` +
              (appResponse.transactionId ? ` (ref ${appResponse.transactionId})` : '') +
              '. Check your UPI app or bank before confirming.'
            : 'The UPI app didn’t report a result. Check your UPI app or bank.'}
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        <Button title="Yes, paid" onPress={() => onResolve('confirmed')} disabled={disabled} />
        <Button title="No, failed" onPress={() => onResolve('failed')} disabled={disabled} />
        {payment.status !== 'unknown' ? (
          <Button title="Not sure" onPress={() => onResolve('unknown')} disabled={disabled} />
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
