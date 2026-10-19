import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

/** Navigation focus alone remains true while a phone is locked or backgrounded. */
export function useScreenActive(): boolean {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(() => Platform.OS === 'web'
    ? typeof document !== 'undefined' && document.visibilityState !== 'hidden'
    : AppState.currentState === 'active');
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') return;
      const update = () => setForeground(document.visibilityState !== 'hidden');
      update();
      document.addEventListener('visibilitychange', update);
      return () => document.removeEventListener('visibilitychange', update);
    }
    setForeground(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  return focused && foreground;
}
