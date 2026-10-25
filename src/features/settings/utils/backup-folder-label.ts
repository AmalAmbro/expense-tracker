/** Storage Access Framework providers whose folder ids are readable paths. */
const EXTERNAL_STORAGE = 'com.android.externalstorage.documents';
const DOWNLOADS = 'com.android.providers.downloads.documents';
const GOOGLE_DRIVE = 'com.google.android.apps.docs.storage';

/**
 * A readable label for a folder picked with Android's folder picker, from its
 * `content://<provider>/tree/<id>` URI, e.g. "Phone storage › Download › Expenses".
 * Pure function.
 */
export function describeBackupFolder(uri: string): string {
  const match = /^content:\/\/([^/]+)\/tree\/([^/]+)/.exec(uri);
  if (!match) return 'Chosen folder';
  const [, provider, encodedId] = match;
  let id: string;
  try {
    id = decodeURIComponent(encodedId);
  } catch {
    return 'Chosen folder';
  }

  if (provider === EXTERNAL_STORAGE) {
    // "primary:Download/Expenses" (phone) or "1A2B-3C4D:Backups" (SD card).
    const [volume, path = ''] = id.split(/:(.*)/s);
    const root = volume === 'primary' ? 'Phone storage' : 'SD card';
    return [root, ...path.split('/').filter(Boolean)].join(' › ');
  }
  if (provider === DOWNLOADS) return 'Downloads';
  if (provider.startsWith(GOOGLE_DRIVE)) return 'Google Drive';
  return 'Chosen folder';
}
