import assert from 'node:assert/strict';
import test from 'node:test';

import { TILT_STILL, baselineStep, turnRate } from '../src/lib/tiltBaseline';

test('nothing settles while the phone is moving or has only just stopped', () => {
  assert.equal(baselineStep(16, 0), 0);
  assert.equal(baselineStep(16, TILT_STILL.after - 1), 0);
  assert.ok(baselineStep(16, TILT_STILL.after) > 0);
});

test('a stalled sensor cannot snap the baseline to the phone', () => {
  assert.equal(baselineStep(60_000, 5000), baselineStep(100, 5000));
  assert.equal(baselineStep(-5, 5000), 0);
});

test('held still, the card is back to flat in about a second', () => {
  let gap = 1;
  for (let t = 0; t < TILT_STILL.settle; t += 16) gap *= 1 - baselineStep(16, 5000);
  assert.ok(gap < 0.05, `gap left ${gap.toFixed(3)} after ${TILT_STILL.settle} ms`);
  // and it is not instant: a quarter of the way in, most of the tilt is still there
  let early = 1;
  for (let t = 0; t < TILT_STILL.settle / 4; t += 16) early *= 1 - baselineStep(16, 5000);
  assert.ok(early > 0.3, `early gap ${early.toFixed(3)}`);
});

test('turn rate tells a tremor from a real turn', () => {
  const degrees = (d: number) => (d * Math.PI) / 180;
  // 0.05 degrees in 16 ms is about 3 deg/s: a hand holding still.
  assert.ok(turnRate(degrees(0.05), 0, 16) < TILT_STILL.rate);
  // 1 degree in 16 ms is about 62 deg/s: a deliberate turn.
  assert.ok(turnRate(degrees(1), 0, 16) > TILT_STILL.rate);
  assert.equal(turnRate(1, 1, 0), 0);
});
