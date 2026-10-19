import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { createKeyedSerialQueue } from '../src/lib/keyedSerialQueue';
import * as policy from '../src/lib/messageOutboxPolicy';
import * as scope from '../src/lib/outboxScope';

type Entry = { id: string; connectionId: string; body: string; createdAt: string };
type Outbox = {
  enqueueMessage(member: string, connection: string, body: string): Promise<Entry>;
  getPendingMessages(member: string): Promise<Entry[]>;
  removePendingMessage(member: string, id: string): Promise<void>;
};

function harness() {
  const storage = new Map<string, string>();
  const secure = new Map<string, string>();
  let failManifest = false;
  const exports = {};
  const modules: Record<string, unknown> = {
    '@react-native-async-storage/async-storage': {
      getItem: async (key: string) => storage.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        if (failManifest) throw new Error('disk unavailable');
        storage.set(key, value);
      },
      removeItem: async (key: string) => { storage.delete(key); },
    },
    'expo-secure-store': {
      getItemAsync: async (key: string) => secure.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => { secure.set(key, value); },
      deleteItemAsync: async (key: string) => { secure.delete(key); },
    },
    'react-native': { Platform: { OS: 'android' } },
    './keyedSerialQueue': { createKeyedSerialQueue },
    '@/lib/messageOutboxPolicy': policy,
    '@/lib/outboxScope': scope,
  };
  const code = ts.transpileModule(readFileSync('src/lib/messageOutbox.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
    return modules[name];
  } });
  return { api: exports as Outbox, storage, secure, failWrites: (value: boolean) => { failManifest = value; } };
}

test('real outbox preserves concurrent enqueue, cleanup and hydration', async () => {
  const { api } = harness();
  const first = await api.enqueueMessage('a', 'connection', 'first');
  await Promise.all([
    api.removePendingMessage('a', first.id),
    api.enqueueMessage('a', 'connection', 'second'),
    api.enqueueMessage('a', 'connection', 'third'),
    api.getPendingMessages('a'),
  ]);
  assert.deepEqual(Array.from(await api.getPendingMessages('a'), item => item.body), ['second', 'third']);
  assert.equal((await api.getPendingMessages('b')).length, 0);
});

test('legacy migration retains request IDs and retries safely after failed commit', async () => {
  const h = harness();
  const entry = { id: 'mobile_legacy_123', connectionId: 'connection', body: 'private text', createdAt: '2026-10-15T10:00:00Z' };
  const key = scope.legacyOutboxStorageKeyForMember('a');
  h.storage.set(key, JSON.stringify([entry]));
  h.failWrites(true);
  await assert.rejects(h.api.getPendingMessages('a'), /disk unavailable/);
  assert.ok(h.storage.has(key));
  h.failWrites(false);
  const result = await h.api.getPendingMessages('a');
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, entry.id);
  assert.equal(result[0]?.body, entry.body);
  assert.equal(h.storage.has(key), false);
  assert.equal(h.storage.get(scope.outboxStorageKeyForMember('a'))?.includes(entry.body), false);
  assert.equal((await h.api.getPendingMessages('a')).length, 1);
});

test('ownerless queue is neither adopted nor silently destroyed', async () => {
  const h = harness();
  const key = 'halal-mode.message-outbox.v1';
  h.storage.set(key, 'unattributed legacy data');
  assert.equal((await h.api.getPendingMessages('a')).length, 0);
  assert.equal(h.storage.get(key), 'unattributed legacy data');
});

test('failed enqueue removes protected body and leaves the queue usable', async () => {
  const h = harness();
  h.failWrites(true);
  await assert.rejects(h.api.enqueueMessage('a', 'connection', 'unsaved'), /disk unavailable/);
  assert.equal(h.secure.size, 0);
  h.failWrites(false);
  await h.api.enqueueMessage('a', 'connection', 'saved');
  assert.equal((await h.api.getPendingMessages('a'))[0]?.body, 'saved');
});

test('damaged manifest is preserved rather than overwritten by a new send', async () => {
  const h = harness();
  const key = scope.outboxStorageKeyForMember('a');
  h.storage.set(key, '{broken');
  await assert.rejects(h.api.enqueueMessage('a', 'connection', 'new'));
  assert.equal(h.storage.get(key), '{broken');
});
