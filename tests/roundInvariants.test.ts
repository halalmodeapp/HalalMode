import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deckDirectionForAccessibilityAction,
  getRoundInteractionState,
  resolveActiveId,
  roundPickRules,
} from '../src/lib/roundInvariants';

test('a mid-set membership change leaves the set’s pick controls alone', () => {
  assert.deepEqual(roundPickRules('free', 'premium'), { keepLimit: 3, allowsSelectAll: false });
  assert.deepEqual(roundPickRules('premium', 'free'), { keepLimit: 10, allowsSelectAll: true });
  assert.deepEqual(roundPickRules(undefined, 'premium'), { keepLimit: 10, allowsSelectAll: true });
});

test('Premium Pop mode remains available in the chosen zone until one remains', () => {
  assert.deepEqual(getRoundInteractionState(3, 3), {
    inChosenZone: true,
    remaining: 0,
    canPop: true,
  });
  assert.equal(getRoundInteractionState(1, 3).canPop, false);
});

test('screen-reader deck actions follow the same circular navigation directions', () => {
  assert.equal(deckDirectionForAccessibilityAction('increment'), 'next');
  assert.equal(deckDirectionForAccessibilityAction('decrement'), 'previous');
});

test('remaining releases never becomes negative', () => {
  assert.equal(getRoundInteractionState(8, 3).remaining, 5);
  assert.equal(getRoundInteractionState(0, 3).remaining, 0);
  assert.equal(getRoundInteractionState(-4, 3).remaining, 0);
});

test('active selection survives unrelated changes and falls back after release', () => {
  const live = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(resolveActiveId(live, 'b'), 'b');
  assert.equal(resolveActiveId(live.filter((item) => item.id !== 'b'), 'b'), 'a');
  assert.equal(resolveActiveId([], 'b'), null);
});
