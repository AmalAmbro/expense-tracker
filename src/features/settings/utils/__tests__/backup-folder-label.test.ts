import { describeBackupFolder } from '@/features/settings/utils/backup-folder-label';

describe('describeBackupFolder', () => {
  it('shows a phone folder as a readable path', () => {
    expect(
      describeBackupFolder(
        'content://com.android.externalstorage.documents/tree/primary%3ADownload%2FExpense%20backups',
      ),
    ).toBe('Phone storage › Download › Expense backups');
    expect(
      describeBackupFolder('content://com.android.externalstorage.documents/tree/primary%3A'),
    ).toBe('Phone storage');
  });

  it('shows a memory card folder', () => {
    expect(
      describeBackupFolder(
        'content://com.android.externalstorage.documents/tree/1A2B-3C4D%3ABackups%2F2026',
      ),
    ).toBe('SD card › Backups › 2026');
  });

  it('names Downloads and Google Drive, whose ids are not paths', () => {
    expect(
      describeBackupFolder('content://com.android.providers.downloads.documents/tree/downloads'),
    ).toBe('Downloads');
    expect(
      describeBackupFolder(
        'content://com.google.android.apps.docs.storage/tree/acc%3D1%3Bdoc%3Dencoded%3DabcXYZ',
      ),
    ).toBe('Google Drive');
  });

  it('falls back to a generic label', () => {
    expect(describeBackupFolder('content://com.example.cloud/tree/x')).toBe('Chosen folder');
    expect(describeBackupFolder('file:///data/user/0/backups')).toBe('Chosen folder');
    expect(
      describeBackupFolder('content://com.android.externalstorage.documents/tree/%E0%A4%A'),
    ).toBe('Chosen folder');
  });
});
