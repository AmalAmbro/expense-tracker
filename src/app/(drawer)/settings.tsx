import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { TextButton } from '@/components/ui/text-button';
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
import { isFolderBackupSupported } from '@/features/settings/services/backup-folder';
import { describeBackupFolder } from '@/features/settings/utils/backup-folder-label';
import { describeLastBackup } from '@/features/settings/utils/backup-reminder';
import { formatPaise } from '@/utils/money';
import { showToast } from '@/utils/show-toast';

type ActionStatus =
  | { state: 'idle' }
  | { state: 'working' }
  | { state: 'done'; title: string; message: string }
  | { state: 'error'; title: string; message: string };

const IDLE: ActionStatus = { state: 'idle' };

function errorStatus(title: string, err: unknown): ActionStatus {
  return {
    state: 'error',
    title,
    message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
  };
}

/** e.g. "312 expenses, ₹45,000.00". */
function describeExpenses(count: number, total: number): string {
  return `${count} ${count === 1 ? 'expense' : 'expenses'}, ${formatPaise(total)}`;
}

function StatusNotice({ status }: { status: ActionStatus }) {
  if (status.state !== 'done' && status.state !== 'error') return null;
  return (
    <Notice
      variant={status.state === 'done' ? 'success' : 'error'}
      title={status.title}
      message={status.message}
    />
  );
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

  /** folder: save to the backup folder (choosing one if needed); choose: pick a new folder first. */
  async function handleBackup(how: 'folder' | 'choose' | 'share') {
    setBackupActionStatus({ state: 'working' });
    try {
      const result =
        how === 'share'
          ? await createBackup.share()
          : await createBackup.saveToFolder({ chooseFolder: how === 'choose' });
      if (!result) {
        setBackupActionStatus(IDLE);
        return;
      }
      const { summary } = result.backup;
      const contents = describeExpenses(summary.expenseItemCount, summary.expenseItemTotal);
      if (result.savedTo) {
        showToast(`Backup saved to ${result.savedTo}`);
        setBackupActionStatus({
          state: 'done',
          title: 'Backup saved',
          message: `${contents}, saved to ${result.savedTo}.`,
        });
      } else {
        setBackupActionStatus({
          state: 'done',
          title: 'Backup created',
          message: `${contents}. It went wherever you chose in the share sheet.`,
        });
      }
    } catch (err) {
      setBackupActionStatus(errorStatus('Backup not saved', err));
    } finally {
      backupStatus.reload();
    }
  }

  async function handleExportCsv() {
    setCsvStatus({ state: 'working' });
    try {
      const { count, total } = await exportCsv();
      showToast('Expenses exported');
      setCsvStatus({
        state: 'done',
        title: 'Expenses exported',
        message: `${describeExpenses(count, total)}, as a CSV file.`,
      });
    } catch (err) {
      setCsvStatus(errorStatus('Export failed', err));
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
      setRestoreStatus(errorStatus('Couldn’t use that file', err));
    }
  }

  async function handleRestore() {
    if (!preview) return;
    setIsRestoring(true);
    try {
      await restore(preview.backup);
      const { spendingCount, spendingTotal } = preview.incoming;
      setPreview(null);
      showToast('Backup restored');
      setRestoreStatus({
        state: 'done',
        title: 'Backup restored',
        message: `${describeExpenses(spendingCount, spendingTotal)} are now in the app.`,
      });
    } catch (err) {
      setRestoreStatus({
        state: 'error',
        title: 'Restore failed — nothing was changed',
        message: err instanceof Error ? err.message : 'Your existing data is untouched.',
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
            {isFolderBackupSupported
              ? 'Save all expenses, categories, and payment methods to a JSON file in a folder you choose — on this phone or in Google Drive. The app doesn’t upload it anywhere.'
              : 'Save all expenses, categories, and payment methods to a JSON file. You choose where it goes — Files, Google Drive, email — the app doesn’t upload it anywhere.'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {describeLastBackup(backupStatus.lastBackupAt, backupStatus.lastBackupLocation)}
          </ThemedText>
          {isFolderBackupSupported && backupStatus.backupFolderUri ? (
            <View style={styles.folderRow}>
              <ThemedText type="small" style={styles.folderLabel}>
                Backup folder: {describeBackupFolder(backupStatus.backupFolderUri)}
              </ThemedText>
              <TextButton
                title="Change"
                accessibilityLabel="Change backup folder"
                onPress={() => handleBackup('choose')}
                disabled={backupActionStatus.state === 'working'}
              />
            </View>
          ) : null}
          <Button
            title={
              !isFolderBackupSupported
                ? 'Back up data (JSON)'
                : backupStatus.backupFolderUri
                  ? 'Back up now'
                  : 'Choose folder and back up'
            }
            onPress={() => handleBackup(isFolderBackupSupported ? 'folder' : 'share')}
            loading={backupActionStatus.state === 'working'}
          />
          {isFolderBackupSupported ? (
            <TextButton
              title="Share a copy instead"
              onPress={() => handleBackup('share')}
              disabled={backupActionStatus.state === 'working'}
              style={styles.alignStart}
            />
          ) : null}
          <StatusNotice status={backupActionStatus} />
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
          <StatusNotice status={csvStatus} />
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
          <StatusNotice status={restoreStatus} />
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
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  folderLabel: {
    flex: 1,
  },
  alignStart: {
    alignSelf: 'flex-start',
  },
});
