import assert from 'node:assert/strict';
import test from 'node:test';

import { answerUnsaved, guardNavigation, hasUnsavedChanges } from '../src/state/unsavedChanges';

// The hook that registers a tab needs React; these tests drive the store's own
// rules directly through its exported functions.
test('with nothing registered, navigation goes straight ahead', () => {
  let went = false;
  guardNavigation(() => {
    went = true;
  });
  assert.equal(went, true);
  assert.equal(hasUnsavedChanges(), false);
});

test('answering with nothing waiting does nothing', async () => {
  let discarded = false;
  await answerUnsaved(false, () => {
    discarded = true;
  });
  assert.equal(discarded, false);
});
