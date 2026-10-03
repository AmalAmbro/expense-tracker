/** expo-sharing can't share local files on web, so the browser downloads the file instead. */
export async function shareBackupFile(fileName: string, contents: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
