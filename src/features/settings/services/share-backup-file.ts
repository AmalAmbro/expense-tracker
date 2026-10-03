import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Writes the backup to the app's cache and opens the system share sheet, so the
 * user chooses where it goes (Files, Drive, email, …). Nothing is uploaded by the app.
 */
export async function shareBackupFile(fileName: string, contents: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(contents);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save backup',
  });
}
