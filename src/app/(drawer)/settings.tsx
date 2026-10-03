import { useState } from 'react';
import { Button, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useCreateBackup } from '@/features/settings/hooks/use-create-backup';
import { formatPaise } from '@/utils/money';

type BackupStatus =
  | { state: 'idle' }
  | { state: 'working' }
  | { state: 'done'; message: string }
  | { state: 'error'; message: string };

export default function SettingsScreen() {
  const createBackup = useCreateBackup();
  const [status, setStatus] = useState<BackupStatus>({ state: 'idle' });

  async function handleBackup() {
    setStatus({ state: 'working' });
    try {
      const { summary } = await createBackup();
      setStatus({
        state: 'done',
        message: `Backup created: ${summary.expenseCount} ${
          summary.expenseCount === 1 ? 'expense' : 'expenses'
        }, ${formatPaise(summary.totalAmount)} in total.`,
      });
    } catch (err) {
      setStatus({
        state: 'error',
        message: err instanceof Error ? err.message : 'Failed to create backup',
      });
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <ThemedText type="smallBold" accessibilityRole="header">
            Data
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Save all expenses, categories, and payment methods to a JSON file. You choose where it
            goes — Files, Google Drive, email — the app doesn’t upload it anywhere.
          </ThemedText>
          <Button
            title={status.state === 'working' ? 'Creating backup…' : 'Back up data (JSON)'}
            onPress={handleBackup}
            disabled={status.state === 'working'}
          />
          {status.state === 'done' ? (
            <ThemedText type="small" accessibilityLiveRegion="polite">
              {status.message}
            </ThemedText>
          ) : null}
          {status.state === 'error' ? (
            <ThemedText type="small" style={styles.errorText} accessibilityLiveRegion="polite">
              {status.message}
            </ThemedText>
          ) : null}
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
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.three,
  },
  errorText: {
    color: '#C0392B',
  },
});
