import { Alert } from 'react-native';

type ConfirmOptions = { title: string; message: string; confirmLabel: string };

/** Asks the user to confirm a destructive action. Resolves true only if they confirm. */
export function confirmDestructive({
  title,
  message,
  confirmLabel,
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
