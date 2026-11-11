import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deckDirectionForAccessibilityAction,
  resolveActiveId,
  roundPickRules,
} from '../src/lib/roundInvariants';

test('a mid-set membership change leaves the set’s pick controls alone', () => {
  assert.deepEqual(roundPickRules('free', 'premium'), { keepLimit: 3, allowsSelectAll: false });
  assert.deepEqual(roundPickRules('premium', 'free'), { keepLimit: 10, allowsSelectAll: true });
  assert.deepEqual(roundPickRules(undefined, 'premium'), { keepLimit: 10, allowsSelectAll: true });
});

test('screen-reader deck actions follow the same circular navigation directions', () => {
  assert.equal(deckDirectionForAccessibilityAction('increment'), 'next');
  assert.equal(deckDirectionForAccessibilityAction('decrement'), 'previous');
});

test('active selection survives unrelated changes and falls back after release', () => {
  const live = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(resolveActiveId(live, 'b'), 'b');
  assert.equal(resolveActiveId(live.filter((item) => item.id !== 'b'), 'b'), 'a');
  assert.equal(resolveActiveId([], 'b'), null);
});
