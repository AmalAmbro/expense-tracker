import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import type { ScannedUpiQr } from '@/features/upi/utils/upi-qr';
import { formatPaise } from '@/utils/money';

type ScannedPayeeCardProps = {
  qr: ScannedUpiQr;
  /** Discards the scan and goes back to typing a UPI ID. */
  onClear: () => void;
};

/** Shows who a scanned QR pays, so the user can check it before paying. */
export function ScannedPayeeCard({ qr, onClear }: ScannedPayeeCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          {qr.isMerchant ? 'Merchant QR' : 'Personal UPI QR'}
        </ThemedText>
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear scanned QR"
          hitSlop={8}
        >
          <ThemedText type="link">Clear</ThemedText>
        </Pressable>
      </View>
      <ThemedText type="smallBold" style={styles.name}>
        {qr.payeeName ?? qr.payeeVpa}
      </ThemedText>
      <ThemedText type="small" selectable>
        {qr.payeeVpa}
      </ThemedText>
      {qr.amountIsFixed && qr.amount !== null ? (
        <ThemedText type="small">Amount set by the QR code: {formatPaise(qr.amount)}</ThemedText>
      ) : null}
      {qr.note ? (
        <ThemedText type="small" themeColor="textSecondary">
          Note: {qr.note}
        </ThemedText>
      ) : null}
      {!qr.isMerchant ? (
        <ThemedText type="small" themeColor="textSecondary">
          This is a personal UPI ID. Some UPI apps (Google Pay, in testing) refuse personal payments
          started from another app with a misleading “limit exceeded” error.
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    lineHeight: 24,
  },
});
