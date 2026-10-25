import { File } from 'expo-file-system';

/**
 * Opens the system file picker and reads the chosen file as UTF-8 text.
 * Resolves null if the user cancels.
 */
export async function pickTextFile(): Promise<string | null> {
  // Any type: Drive and file managers often label .json files as octet-stream or text,
  // and filtering them out would hide the backup. The contents are validated instead.
  const picked = await File.pickFileAsync();
  if (picked.canceled) {
    return null;
  }
  return picked.result.text();
}
