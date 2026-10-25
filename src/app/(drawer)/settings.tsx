import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { RestorePreviewCard } from '@/features/settings/components/restore-preview-card';
import { useBackupStatus } from '@/features/settings/hooks/use-backup-status';
import { useCreateBackup } from '@/features/settings/hooks/use-create-backup';
import { useExportCsv } from '@/features/settings/hooks/use-export-csv';
import {
  useRestoreBackup,
  type RestorePreview,
} from '@/features/settings/hooks/use-restore-backup';
import { describeLastBackup } from '@/features/settings/utils/backup-reminder';
import { formatPaise } from '@/utils/money';

type ActionStatus =
  | { state: 'idle' }
  | { state: 'working' }
  | { state: 'done'; message: string }
  | { state: 'error'; message: string };

const IDLE: ActionStatus = { state: 'idle' };

function errorStatus(err: unknown, fallback: string): ActionStatus {
  return { state: 'error', message: err instanceof Error ? err.message : fallback };
}

/** e.g. "312 expenses, ₹45,000.00". */
function describeExpenses(count: number, total: number): string {
  return `${count} ${count === 1 ? 'expense' : 'expenses'}, ${formatPaise(total)}`;
}

function StatusMessage({ status }: { status: ActionStatus }) {
  if (status.state === 'done') {
    return (
      <ThemedText type="small" accessibilityLiveRegion="polite">
        {status.message}
      </ThemedText>
    );
  }
  if (status.state === 'error') {
    return (
      <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
        {status.message}
      </ThemedText>
    );
  }
  return null;
}

export default function SettingsScreen() {
  const createBackup = useCreateBackup();
  const backupStatus = useBackupStatus();
  const exportCsv = useExportCsv();
  const { pick, restore } = useRestoreBackup();
  const [backupActionStatus, setBackupActionStatus] = useState<ActionStatus>(IDLE);
  const [csvStatus, setCsvStatus] = useState<ActionStatus>(IDLE);
  const [restoreStatus, setRestoreStatus] = useState<ActionStatus>(IDLE);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleBackup() {
    setBackupActionStatus({ state: 'working' });
    try {
      const { summary } = await createBackup();
      setBackupActionStatus({
        state: 'done',
        message: `Backup created: ${describeExpenses(summary.expenseItemCount, summary.expenseItemTotal)} in total.`,
      });
      backupStatus.reload();
    } catch (err) {
      setBackupActionStatus(errorStatus(err, 'Failed to create backup'));
    }
  }

  async function handleExportCsv() {
    setCsvStatus({ state: 'working' });
    try {
      const { count, total } = await exportCsv();
      setCsvStatus({ state: 'done', message: `Exported ${describeExpenses(count, total)}.` });
    } catch (err) {
      setCsvStatus(errorStatus(err, 'Failed to export expenses'));
    }
  }

  async function handlePickBackup() {
    setRestoreStatus({ state: 'working' });
    setPreview(null);
    try {
      const picked = await pick();
      setPreview(picked);
      setRestoreStatus(IDLE);
    } catch (err) {
      setRestoreStatus(errorStatus(err, 'Couldn’t read that backup file'));
    }
  }

  async function handleRestore() {
    if (!preview) return;
    setIsRestoring(true);
    try {
      await restore(preview.backup);
      const { spendingCount, spendingTotal } = preview.incoming;
      setPreview(null);
      setRestoreStatus({
        state: 'done',
        message: `Restored ${describeExpenses(spendingCount, spendingTotal)}.`,
      });
    } catch (err) {
      setRestoreStatus({
        state: 'error',
        message:
          `Restore failed, nothing was changed. ${err instanceof Error ? err.message : ''}`.trim(),
      });
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <ThemedText type="smallBold" accessibilityRole="header">
            Back up
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Save all expenses, categories, and payment methods to a JSON file. You choose where it
            goes — Files, Google Drive, email — the app doesn’t upload it anywhere.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {describeLastBackup(backupStatus.lastBackupAt)}
          </ThemedText>
          <Button
            title="Back up data (JSON)"
            onPress={handleBackup}
            loading={backupActionStatus.state === 'working'}
          />
          <StatusMessage status={backupActionStatus} />
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" accessibilityRole="header">
            Export
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Save your spending as a CSV file that opens in Excel or Google Sheets: one row per
            expense, with date, category, amount, and payment details. Payments awaiting
            confirmation or that failed are left out.
          </ThemedText>
          <Button
            title="Export expenses (CSV)"
            variant="secondary"
            onPress={handleExportCsv}
            loading={csvStatus.state === 'working'}
          />
          <StatusMessage status={csvStatus} />
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" accessibilityRole="header">
            Restore
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Replace everything in the app with a backup file made by “Back up data”. You’ll see what
            the file contains before anything changes.
          </ThemedText>
          {preview ? (
            <RestorePreviewCard
              preview={preview}
              isRestoring={isRestoring}
              onConfirm={handleRestore}
              onCancel={() => setPreview(null)}
            />
          ) : (
            <Button
              title="Restore from backup"
              variant="secondary"
              onPress={handlePickBackup}
              loading={restoreStatus.state === 'working'}
            />
          )}
          <StatusMessage status={restoreStatus} />
        </View>
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
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.three,
  },
});
