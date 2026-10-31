import AsyncStorage from '@react-native-async-storage/async-storage';

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
  await AsyncStorage.multiRemove(keys).catch(() => undefined);
}
