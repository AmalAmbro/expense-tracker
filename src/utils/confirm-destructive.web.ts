type ConfirmOptions = { title: string; message: string; confirmLabel: string };

/** react-native-web's Alert is a no-op, so web falls back to the browser's confirm dialog. */
export function confirmDestructive({ title, message }: ConfirmOptions): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
