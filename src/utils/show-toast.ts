import { Platform, ToastAndroid } from 'react-native';

/**
 * A brief system toast on Android, visible wherever the user has scrolled. Other
 * platforms have no system toast; callers also show the outcome on screen.
 */
export function showToast(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}
