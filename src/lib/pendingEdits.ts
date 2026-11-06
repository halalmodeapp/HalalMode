import AsyncStorage from '@react-native-async-storage/async-storage';
import { createKeyedSerialQueue } from './keyedSerialQueue';

const serialize = createKeyedSerialQueue();

export function keepPendingEdits(key: string, snapshot: string): Promise<void> {
  return serialize(key, () => AsyncStorage.setItem(key, snapshot));
}

/** A completed save must never remove a newer local draft. */
export function forgetSavedEdits(key: string, snapshot: string): Promise<void> {
  return serialize(key, async () => {
    if (await AsyncStorage.getItem(key) === snapshot) await AsyncStorage.removeItem(key);
  });
}

/**
 * Edits waiting to be sent are kept on the phone (see hooks/useAutosave). They
 * belong to one account: the key carries the member's id, and everything is
 * cleared when that account signs out or another signs in, so one member's
 * unsent answers can never be applied to someone else's profile.
 */
const PREFIXES = ['halalmode-pending-profile', 'halalmode-pending-preferences'] as const;

export type PendingKind = 'profile' | 'preferences';

export function pendingKey(kind: PendingKind, userId: string | undefined): string | null {
  return userId ? `halalmode-pending-${kind}:${userId}` : null;
}

export async function clearPendingEdits(userId: string | null | undefined): Promise<void> {
  const keys = [
    // The old, account-less keys from before this existed.
    ...PREFIXES,
    ...(userId ? [`halalmode-pending-profile:${userId}`, `halalmode-pending-preferences:${userId}`] : []),
  ];
  await Promise.all(keys.map(key => serialize(key, () => AsyncStorage.removeItem(key)))).catch(() => undefined);
}
