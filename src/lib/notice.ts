import { Alert, Platform } from 'react-native';

/**
 * A plain "here is what happened" message.
 *
 * React Native Web's Alert.alert does nothing at all, so on the web app every
 * one of these used to vanish silently. The browser's own alert is plain, but
 * it is seen.
 */
export function showNotice(title: string, body?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(body ? `${title}\n\n${body}` : title);
    return;
  }
  Alert.alert(title, body);
}
