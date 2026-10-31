import assert from 'node:assert/strict';
import test from 'node:test';

import { AUTOSAVE, isNetworkError, nextFlushDelay, retryDelay, savedToastDue } from '../src/lib/autosave';
import { guardNavigation, hasUnsavedChanges } from '../src/state/unsavedChanges';

test('with nothing registered, navigation goes straight ahead', () => {
  let went = false;
  guardNavigation(() => {
    went = true;
  });
  assert.equal(went, true);
  assert.equal(hasUnsavedChanges(), false);
});

test('a first send waits only for the edits to go quiet', () => {
  assert.equal(nextFlushDelay({ now: 1000, lastChangeAt: 1000, lastSentAt: 0 }), AUTOSAVE.quietMs);
  assert.equal(nextFlushDelay({ now: 1000 + AUTOSAVE.quietMs, lastChangeAt: 1000, lastSentAt: 0 }), 0);
});

test('every edit pushes the send back by the quiet time', () => {
  const first = nextFlushDelay({ now: 5000, lastChangeAt: 1000, lastSentAt: 0 });
  const later = nextFlushDelay({ now: 5000, lastChangeAt: 4500, lastSentAt: 0 });
  assert.ok(later > first);
});

test('keeping on editing sends at most one batch every twenty seconds', () => {
  const sentAt = 10_000;
  // Quiet again 5 s after the send, but the gap has not passed.
  const delay = nextFlushDelay({ now: sentAt + 5000, lastChangeAt: sentAt + 1000, lastSentAt: sentAt });
  assert.equal(delay, sentAt + AUTOSAVE.minGapMs - (sentAt + 5000));
  // After the gap it is due at once.
  assert.equal(nextFlushDelay({ now: sentAt + AUTOSAVE.minGapMs, lastChangeAt: sentAt + 1000, lastSentAt: sentAt }), 0);
});

test('failed sends are retried with a growing wait that then holds', () => {
  assert.equal(retryDelay(1), AUTOSAVE.retryMs[0]);
  assert.ok(retryDelay(2) > retryDelay(1));
  assert.equal(retryDelay(10), AUTOSAVE.retryMs[AUTOSAVE.retryMs.length - 1]);
  assert.equal(retryDelay(0), AUTOSAVE.retryMs[0]);
});

test('a phone that cannot reach the server is told apart from a server that refuses', () => {
  assert.equal(isNetworkError(new Error('Network request failed')), true);
  assert.equal(isNetworkError({ message: 'TypeError: Failed to fetch' }), true);
  assert.equal(isNetworkError(new Error('The request timed out')), true);
  assert.equal(isNetworkError(new Error('new row violates row-level security policy')), false);
  assert.equal(isNetworkError(undefined), false);
});

test('the optimistic Saved toast comes at once, then at most every few seconds', () => {
  assert.equal(savedToastDue(1000, 0), true);
  assert.equal(savedToastDue(2000, 1000), false);
  assert.equal(savedToastDue(1000 + AUTOSAVE.savedToastGapMs, 1000), true);
});
