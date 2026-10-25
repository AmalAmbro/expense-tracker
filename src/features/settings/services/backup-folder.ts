import { Directory } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Saving straight into a chosen folder relies on Android's folder picker keeping access
 * to the folder across restarts. Other platforms share the file instead.
 */
export const isFolderBackupSupported = Platform.OS === 'android';

/** Opens the system folder picker. Resolves the folder's URI, or null if cancelled. */
export async function pickBackupFolder(): Promise<string | null> {
  try {
    const directory = await Directory.pickDirectoryAsync();
    return directory.uri;
  } catch {
    // The picker rejects when the user backs out of it.
    return null;
  }
}

/**
 * Writes a new file into the folder, then reads it back so the caller knows it really
 * was saved. Returns what was read back.
 */
export async function saveFileToFolder(
  folderUri: string,
  fileName: string,
  mimeType: string,
  contents: string,
): Promise<string> {
  const folder = new Directory(folderUri);
  if (!folder.exists) {
    throw new Error('The backup folder is no longer available. Choose a folder again.');
  }
  const file = folder.createFile(fileName, mimeType);
  file.write(contents);
  return file.text();
}
