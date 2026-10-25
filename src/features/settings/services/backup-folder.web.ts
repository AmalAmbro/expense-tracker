export const isFolderBackupSupported = false;

export async function pickBackupFolder(): Promise<string | null> {
  return null;
}

export async function saveFileToFolder(): Promise<string> {
  throw new Error('Saving to a folder is not supported on web');
}
