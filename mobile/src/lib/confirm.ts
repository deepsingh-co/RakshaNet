import { Alert, Platform } from 'react-native';

/**
 * React Native Web does not implement Alert.alert, so destructive actions
 * need a browser fallback instead of silently doing nothing.
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel = 'Confirm',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = `${title}\n\n${message}`;
    const confirmed =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(text)
        : false;
    return Promise.resolve(confirmed && Boolean(confirmLabel));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    // Alert is noisy on web; keep a console trace for development instead.
    // Screens surface success states inline.
    // eslint-disable-next-line no-console
    console.log(`[${title}] ${message ?? ''}`);
    return;
  }
  Alert.alert(title, message);
}
