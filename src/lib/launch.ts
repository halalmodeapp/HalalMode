import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

/**
 * Whether Halal Mode has launched, from the one launch switch in the database
 * (public.launch_state). Copy with an after-launch version (a `…Launched` key
 * next to its usual key) switches on it in t(), so nothing else needs to ask.
 * The last answer is remembered, so a returning member sees the right words
 * at once rather than a flash of the old ones.
 */
const STORAGE_KEY = 'halalmode-launched';
let launched = false;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (next === launched) return;
  launched = next;
  for (const listener of listeners) listener();
}

export function isLaunched(): boolean {
  return launched;
}

export function useLaunched(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => launched,
    () => false,
  );
}

let loading: Promise<void> | null = null;

/** Reads the remembered answer, then asks the server once per app start. */
export function loadLaunchState(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    // The server-rendered web pages have no storage and no member.
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    try {
      set((await AsyncStorage.getItem(STORAGE_KEY)) === 'true');
    } catch {
      // No storage: start from "not launched" until the server answers.
    }
    if (USE_MOCKS) return;
    try {
      const { data, error } = await requireSupabase().rpc('launch_state');
      if (error) return;
      const next = (data as { launched?: unknown } | null)?.launched === true;
      set(next);
      await AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => undefined);
    } catch {
      // Offline: keep the remembered answer.
    }
  })();
  return loading;
}
