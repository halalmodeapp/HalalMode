import assert from 'node:assert/strict';
import test from 'node:test';
import { createKeyedSerialQueue } from '../src/lib/keyedSerialQueue';
import { applyMessageDeletions, mergeLatestMessagePage, mergeMessages, refreshMessageHistory } from '../src/lib/mergeMessages';

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

test('reconnecting fills the gap even when a send acknowledgement overlaps the latest page', async () => {
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, index) => {
      const id = start + index;
      return { id: String(id), createdAt: new Date(id * 1000).toISOString() };
    });
  const cached = { messages: [...range(1, 50), ...range(100, 100)], hasMore: false, newestFetchedId: '50' };
  const refreshed = await refreshMessageHistory(() => cached,
    { messages: range(61, 110), hasMore: true, nextCursor: '61' },
    async (cursor) => {
      assert.equal(cursor, '61');
      return { messages: range(11, 60), hasMore: true, nextCursor: '11' };
    },
  );
  assert.deepEqual(refreshed.messages, range(1, 110));
  assert.equal(refreshed.hasMore, false);
  assert.equal(refreshed.newestFetchedId, '110');
});

test('a gap larger than the refresh budget keeps a cursor to the unfetched messages', async () => {
  const cached = { messages: [{ id: 'old', createdAt: '2026-11-01' }], hasMore: false, newestFetchedId: 'old' };
  const cursors: number[] = [];
  const refreshed = await refreshMessageHistory(() => cached,
    { messages: [{ id: 'new', createdAt: '2026-11-11' }], hasMore: true, nextCursor: 10 },
    async (cursor) => {
      cursors.push(cursor);
      return {
        messages: [{ id: String(cursor), createdAt: `2026-11-${String(cursor).padStart(2, '0')}` }],
        hasMore: true,
        nextCursor: cursor - 1,
      };
    },
  );
  assert.deepEqual(cursors, [10, 9, 8, 7]);
  assert.deepEqual(refreshed.messages.map(message => message.id), ['7', '8', '9', '10', 'new']);
  assert.equal(refreshed.nextCursor, 6);
  assert.equal(refreshed.hasMore, true);
});

test('gap recovery preserves a deletion and scrollback loaded while the fetch was in flight', async () => {
  type Message = { id: string; createdAt: string; deletedAt?: string };
  const message = (id: string): Message => ({ id, createdAt: `2026-11-${id}` });
  let cached = { messages: [message('02'), message('03')], hasMore: true, newestFetchedId: '03' };
  const refreshed = await refreshMessageHistory(() => cached,
    { messages: [message('05')], hasMore: true, nextCursor: '05' },
    async () => {
      cached = {
        messages: [message('01'), message('02'), { ...message('03'), deletedAt: '2026-11-05' }],
        hasMore: false,
        newestFetchedId: '03',
      };
      return { messages: [message('03'), message('04')], hasMore: true, nextCursor: '03' };
    },
  );
  assert.deepEqual(refreshed.messages.map(item => item.id), ['01', '02', '03', '04', '05']);
  assert.equal(refreshed.messages[2]?.deletedAt, '2026-11-05');
  assert.equal(refreshed.hasMore, false);
});


test('a stale send response cannot restore a deleted message', () => {
  const sent = { id: 'one', createdAt: '2026-11-07T10:00:00Z', text: 'private' };
  const deleted = { ...sent, text: 'Message deleted', deletedAt: '2026-11-07T10:01:00Z' };
  assert.deepEqual(mergeMessages([deleted], [sent]), [deleted]);
  assert.deepEqual(mergeMessages([sent], [deleted]), [deleted]);
});


test('deletion polling clears loaded scrollback outside the newest page', () => {
  const old = { id: 'old', createdAt: '2026-11-07T10:00:00Z', text: 'private', voiceUrl: 'private-file' };
  const recent = { id: 'recent', createdAt: '2026-11-07T10:01:00Z', text: 'hello' };
  const messages = applyMessageDeletions<{ id: string; createdAt: string; text?: string; voiceUrl?: string; deletedAt?: string }>([old, recent], [{ id: 'old', deletedAt: '2026-11-07T10:02:00Z' }]);
  assert.equal(messages[0]?.text, undefined);
  assert.equal(messages[0]?.voiceUrl, undefined);
  assert.equal(messages[0]?.deletedAt, '2026-11-07T10:02:00Z');
  assert.deepEqual(messages[1], recent);
});
