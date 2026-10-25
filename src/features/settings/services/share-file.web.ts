import type { ShareFileType } from './share-file';

/** expo-sharing can't share local files on web, so the browser downloads the file instead. */
export async function shareFile(
  fileName: string,
  contents: string,
  type: ShareFileType,
): Promise<void> {
  const url = URL.createObjectURL(new Blob([contents], { type: type.mimeType }));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
