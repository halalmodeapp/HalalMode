import assert from 'node:assert/strict';
import test from 'node:test';
import { createKeyedSerialQueue } from '../src/lib/keyedSerialQueue';
import { mergeLatestMessagePage, mergeMessages } from '../src/lib/mergeMessages';

test('overlapping outbox read/modify/write operations preserve both updates', async () => {
  const run = createKeyedSerialQueue();
  let stored: string[] = [];
  const append = (value: string) => run('member', async () => {
    const snapshot = [...stored];
    await new Promise(resolve => setTimeout(resolve, 5));
    stored = [...snapshot, value];
  });
  await Promise.all([append('first'), append('second')]);
  assert.deepEqual(stored, ['first', 'second']);
});

test('a rejected operation does not block later work or another account', async () => {
  const run = createKeyedSerialQueue();
  let release!: () => void;
  const first = run('a', () => new Promise<void>(resolve => { release = resolve; }));
  assert.equal(await run('b', async () => 7), 7);
  release();
  await first;
  await assert.rejects(run('a', async () => { throw new Error('storage unavailable'); }));
  assert.equal(await run('a', async () => 8), 8);
});

test('send completion after realtime delivery retains one message and its read receipt', () => {
  const sent = { id: 'one', createdAt: '2026-10-15T10:00:00Z', text: 'hello' };
  const read = { ...sent, readAt: '2026-10-15T10:01:00Z' };
  assert.deepEqual(mergeMessages([read], [sent]), [read]);
  assert.deepEqual(mergeMessages([sent], [read]), [read]);
});

test('overlapping history pages deduplicate and order equal timestamps consistently', () => {
  const a = { id: 'a', createdAt: '2026-10-15T10:00:00Z' };
  const b = { ...a, id: 'b' };
  assert.deepEqual(mergeMessages([b, a], [a]), [a, b]);
});

test('polling preserves expanded scrollback, the oldest cursor and read receipts', () => {
  const older = { id: 'a', createdAt: '2026-10-15T09:00:00Z' };
  const recent = { id: 'b', createdAt: '2026-10-15T10:00:00Z', readAt: '2026-10-15T10:01:00Z' };
  const newest = { id: 'c', createdAt: '2026-10-15T11:00:00Z' };
  const current = { messages: [older, recent], hasMore: false };
  const latest = { messages: [{ id: recent.id, createdAt: recent.createdAt }, newest], hasMore: true, nextCursor: { id: 'b' } };
  assert.deepEqual(mergeLatestMessagePage(current, latest), { messages: [older, recent, newest], hasMore: false });
  const cursor = { id: 'a' };
  assert.deepEqual(mergeLatestMessagePage({ ...current, hasMore: true, nextCursor: cursor }, latest).nextCursor, cursor);
});

test('the first message page and an unexpanded refresh use the server cursor', () => {
  const message = { id: 'a', createdAt: '2026-10-15T09:00:00Z' };
  const latest = { messages: [message], hasMore: true, nextCursor: { id: 'a' } };
  assert.deepEqual(mergeLatestMessagePage(undefined, latest), latest);
  assert.deepEqual(mergeLatestMessagePage({ ...latest, hasMore: false, nextCursor: undefined }, latest), latest);
});
