import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextButton } from '@/components/ui/text-button';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import type { RestorePreview } from '@/features/settings/hooks/use-restore-backup';
import type { BackupSummary } from '@/features/settings/utils/backup';
import { formatDisplayDate } from '@/utils/date';
import { formatPaise } from '@/utils/money';

const exportedAtFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatExportedAt(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : exportedAtFormatter.format(date);
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** e.g. "312 expenses, ₹45,000.00". */
function describeSpending(summary: BackupSummary): string {
  return `${plural(summary.spendingCount, 'expense', 'expenses')}, ${formatPaise(summary.spendingTotal)}`;
}

type RestorePreviewCardProps = {
  preview: RestorePreview;
  isRestoring: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** What a backup file holds and what restoring it will replace, before the user confirms. */
export function RestorePreviewCard({
  preview: { incoming, current },
  isRestoring,
  onConfirm,
  onCancel,
}: RestorePreviewCardProps) {
  const notCounted = incoming.expenseItemCount - incoming.spendingCount;

  return (
    <View style={styles.container}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Backup from {formatExportedAt(incoming.exportedAt)}
        </ThemedText>
        <ThemedText type="smallBold">{describeSpending(incoming)}</ThemedText>
        {incoming.firstDate && incoming.lastDate ? (
          <ThemedText type="small">
            {formatDisplayDate(incoming.firstDate)} – {formatDisplayDate(incoming.lastDate)}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {plural(incoming.paymentCount, 'payment', 'payments')},{' '}
          {plural(incoming.categoryCount, 'category', 'categories')},{' '}
          {plural(incoming.paymentMethodCount, 'payment method', 'payment methods')}
          {notCounted > 0
            ? `; ${notCounted} awaiting confirmation or failed (not counted as spending)`
            : ''}
        </ThemedText>
      </ThemedView>

      <ThemedText type="small" themeColor="danger">
        Restoring deletes everything in the app now — {describeSpending(current)}, your categories
        and payment methods — and replaces it with this backup. This can’t be undone. Back up first
        if you might need the current data.
      </ThemedText>

      <View style={styles.actions}>
        <Button
          title="Replace current data"
          variant="destructive"
          onPress={onConfirm}
          loading={isRestoring}
        />
        <TextButton title="Cancel" onPress={onCancel} disabled={isRestoring} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.control,
  },
  actions: {
    gap: Spacing.two,
  },
});
