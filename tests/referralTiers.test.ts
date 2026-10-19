import assert from 'node:assert/strict';
import test from 'node:test';

import { referralTiers } from '../src/lib/referralTiers.ts';

/** The reward cards on the in-app Referrals screen, as on halalmo.de/refer. */
const states = (count: number | null) => referralTiers(count).map((tier) => tier.state);

test('without a link every bar is empty and nothing is highlighted', () => {
  assert.deepEqual(states(null), ['ahead', 'ahead', 'ahead']);
  assert.ok(referralTiers(null).every((tier) => tier.fill === 0 && tier.joined === 0));
});

test('with no friends yet the first goal is the next one', () => {
  assert.deepEqual(states(0), ['current', 'ahead', 'ahead']);
});

test('reached goals tick and the next one is highlighted', () => {
  assert.deepEqual(states(4), ['reached', 'current', 'ahead']);
  const [first, second, third] = referralTiers(4);
  assert.equal(first?.joined, 3);
  assert.equal(first?.fill, 1);
  assert.equal(second?.joined, 4);
  assert.equal(second?.fill, 4 / 5);
  assert.equal(third?.fill, 4 / 10);
});

test('every goal reached past ten', () => {
  assert.deepEqual(states(12), ['reached', 'reached', 'reached']);
  assert.equal(referralTiers(12)[2]?.joined, 10);
});

test('the months match the website', () => {
  assert.deepEqual(referralTiers(0).map((tier) => [tier.goal, tier.months]), [[3, 3], [5, 6], [10, 12]]);
});
