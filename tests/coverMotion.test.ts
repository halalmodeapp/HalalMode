import assert from 'node:assert/strict';
import test from 'node:test';

import { rubberBandOffset } from '../src/components/auth/coverMotion';

test('heart drag follows the finger near its path', () => {
  assert.equal(rubberBandOffset(24, 200), 24);
  assert.equal(rubberBandOffset(-60, 200), -60);
});

test('heart drag eases toward a bounded edge when pulled farther away', () => {
  const limit = 200;
  const resisted = rubberBandOffset(500, limit);
  assert.ok(resisted > limit * 0.56);
  assert.ok(resisted < limit);
  assert.equal(rubberBandOffset(-500, limit), -resisted);
});

test('invalid dimensions and non-finite drag values safely resolve to zero', () => {
  assert.equal(rubberBandOffset(50, 0), 0);
  assert.equal(rubberBandOffset(Number.NaN, 200), 0);
});
