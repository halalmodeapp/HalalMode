import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createKeyedSerialQueue } from './keyedSerialQueue';

import {
  joinOutboxBody,
  shouldSecureOutboxBodies,
  splitOutboxBody,
} from '@/lib/messageOutboxPolicy';
import {
  legacyOutboxStorageKeyForMember,
  outboxBodyStorageKeyForMember,
  outboxStorageKeyForMember,
} from '@/lib/outboxScope';

const serialize = createKeyedSerialQueue();

function withOutbox<T>(memberId: string, work: () => Promise<T>): Promise<T> {
  const key = outboxStorageKeyForMember(memberId);
  return serialize(key, () => {
    // Web Locks coordinate separate tabs; native operations share this queue.
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(key, work);
    }
    return work();
  });
}

export type PendingMessage = {
  id: string;
  connectionId: string;
  body: string;
  createdAt: string;
};

type StoredPendingMessage = Omit<PendingMessage, 'body'> & { bodyChunks: number };

/**
 * The retry manifest contains only routing metadata. Native message text is
 * split into SecureStore values so a locked device does not expose unsent
 * private chat text through the app's normal async-storage files.
 */
export async function enqueueMessage(memberId: string, connectionId: string, body: string): Promise<PendingMessage> {
  return withOutbox(memberId, async () => {
  const entry: PendingMessage = {
    id: createRequestId(),
    connectionId,
    body,
    createdAt: new Date().toISOString(),
  };
  const entries = await getStoredPendingMessages(memberId);
  const bodyChunks = await writeBody(memberId, entry.id, body);
  try {
    await writeStoredPendingMessages(memberId, [
      ...entries,
      { id: entry.id, connectionId, createdAt: entry.createdAt, bodyChunks },
    ]);
  } catch (error) {
    await removeBody(memberId, entry.id, bodyChunks);
    throw error;
  }
  return entry;
  });
}

export async function getPendingMessages(memberId: string, connectionId?: string): Promise<PendingMessage[]> {
  return withOutbox(memberId, async () => {
  const entries = await getStoredPendingMessages(memberId);
  const hydrated: (PendingMessage | null)[] = await Promise.all(entries.map(async (entry) => {
    const body = await readBody(memberId, entry.id, entry.bodyChunks);
    return body
      ? { id: entry.id, connectionId: entry.connectionId, createdAt: entry.createdAt, body }
      : null;
  }));
  const valid = hydrated.filter((entry): entry is PendingMessage => entry !== null);

  // A crash between secure-body and manifest writes, or a keychain reset,
  // must not leave a retry row that can never be sent.
  if (valid.length !== entries.length) {
    await writeStoredPendingMessages(
      memberId,
      valid.map(({ id, connectionId, createdAt, body }) => ({
        id,
        connectionId,
        createdAt,
        bodyChunks: splitOutboxBody(body).length,
      }))
    );
  }
  return connectionId ? valid.filter((entry) => entry.connectionId === connectionId) : valid;
  });
}

export async function removePendingMessage(memberId: string, id: string): Promise<void> {
  return withOutbox(memberId, async () => {
  const entries = await getStoredPendingMessages(memberId);
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  await removeBody(memberId, id, entry.bodyChunks);
  await writeStoredPendingMessages(memberId, entries.filter((item) => item.id !== id));
  });
}

async function getStoredPendingMessages(memberId: string): Promise<StoredPendingMessage[]> {
  const raw = await AsyncStorage.getItem(outboxStorageKeyForMember(memberId));
  const parsed: unknown = raw ? JSON.parse(raw) : [];
  // Never overwrite a damaged manifest with an empty queue.
  if (!Array.isArray(parsed) || !parsed.every(isStoredPendingMessage)) {
    throw new Error('The pending message queue could not be read.');
  }
  const entries: StoredPendingMessage[] = [...parsed];
  const legacyKey = legacyOutboxStorageKeyForMember(memberId);
  const legacyRaw = await AsyncStorage.getItem(legacyKey);
  if (!legacyRaw) return entries;
  const legacy: unknown = JSON.parse(legacyRaw);
  if (!Array.isArray(legacy) || !legacy.every(isLegacyPendingMessage)) {
    throw new Error('The previous pending message queue could not be recovered.');
  }
  // Commit protected bodies and the manifest before removing the old copy.
  // A restart can repeat this migration safely using the original request IDs.
  for (const entry of legacy) {
    if (entries.some(current => current.id === entry.id)) continue;
    const bodyChunks = await writeBody(memberId, entry.id, entry.body);
    entries.push({ id: entry.id, connectionId: entry.connectionId, createdAt: entry.createdAt, bodyChunks });
  }
  await writeStoredPendingMessages(memberId, entries);
  await AsyncStorage.removeItem(legacyKey);
  // The ownerless v1 queue is deliberately not adopted or deleted here.
  // Recovering it requires proof of account ownership, not the current login.
  return entries;
}

function isLegacyPendingMessage(value: unknown): value is PendingMessage {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === 'string' && /^[a-zA-Z0-9_-]{12,80}$/.test(entry.id)
    && typeof entry.connectionId === 'string' && !!entry.connectionId
    && typeof entry.createdAt === 'string' && Number.isFinite(Date.parse(entry.createdAt))
    && typeof entry.body === 'string' && entry.body.length > 0
    && splitOutboxBody(entry.body).length <= 4;
}

function writeStoredPendingMessages(memberId: string, entries: StoredPendingMessage[]): Promise<void> {
  return AsyncStorage.setItem(outboxStorageKeyForMember(memberId), JSON.stringify(entries));
}

async function writeBody(memberId: string, id: string, body: string): Promise<number> {
  const chunks = splitOutboxBody(body);
  if (!chunks.length || chunks.length > 4) throw new Error('A pending message must contain between 1 and 2048 characters.');
  const writes = await Promise.allSettled(chunks.map((chunk, index) => setBodyChunk(memberId, id, index, chunk)));
  const failed = writes.find(result => result.status === 'rejected');
  if (failed?.status === 'rejected') {
    await removeBody(memberId, id, chunks.length).catch(() => {});
    throw failed.reason;
  }
  return chunks.length;
}

async function readBody(memberId: string, id: string, chunkCount: number): Promise<string | null> {
  const chunks = await Promise.all(
    Array.from({ length: chunkCount }, (_, index) => getBodyChunk(memberId, id, index))
  );
  const validChunks: string[] = [];
  for (const chunk of chunks) {
    if (typeof chunk !== 'string') return null;
    validChunks.push(chunk);
  }
  return joinOutboxBody(validChunks);
}

async function removeBody(memberId: string, id: string, chunkCount: number): Promise<void> {
  await Promise.all(
    Array.from({ length: chunkCount }, (_, index) => deleteBodyChunk(memberId, id, index))
  );
}

function bodyKey(memberId: string, id: string, chunkIndex: number): string {
  return outboxBodyStorageKeyForMember(memberId, id, chunkIndex);
}

function setBodyChunk(memberId: string, id: string, chunkIndex: number, value: string): Promise<void> {
  const key = bodyKey(memberId, id, chunkIndex);
  return shouldSecureOutboxBodies(Platform.OS)
    ? SecureStore.setItemAsync(key, value)
    : AsyncStorage.setItem(key, value);
}

function getBodyChunk(memberId: string, id: string, chunkIndex: number): Promise<string | null> {
  const key = bodyKey(memberId, id, chunkIndex);
  return shouldSecureOutboxBodies(Platform.OS)
    ? SecureStore.getItemAsync(key)
    : AsyncStorage.getItem(key);
}

function deleteBodyChunk(memberId: string, id: string, chunkIndex: number): Promise<void> {
  const key = bodyKey(memberId, id, chunkIndex);
  return shouldSecureOutboxBodies(Platform.OS)
    ? SecureStore.deleteItemAsync(key)
    : AsyncStorage.removeItem(key);
}

function isStoredPendingMessage(value: unknown): value is StoredPendingMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && /^[a-zA-Z0-9_-]{12,80}$/.test(candidate.id)
    && typeof candidate.connectionId === 'string'
    && typeof candidate.createdAt === 'string'
    && Number.isInteger(candidate.bodyChunks)
    && Number(candidate.bodyChunks) > 0
    && Number(candidate.bodyChunks) <= 4;
}

function createRequestId(): string {
  const random = Math.random().toString(36).slice(2, 12);
  return `mobile_${Date.now().toString(36)}_${random}`;
}
