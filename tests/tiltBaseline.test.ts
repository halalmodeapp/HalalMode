import assert from 'node:assert/strict';
import test from 'node:test';

import { TILT_BASELINE_TAU_MS, baselineStep } from '../src/lib/tiltBaseline';

test('the baseline closes none of the gap with no time passed, and more as time does', () => {
  assert.equal(baselineStep(0), 0);
  assert.ok(baselineStep(16) > 0);
  assert.ok(baselineStep(50) > baselineStep(16));
  assert.ok(baselineStep(100) < 1);
});

test('a stalled sensor cannot snap the baseline to the phone', () => {
  assert.equal(baselineStep(60_000), baselineStep(100));
  assert.equal(baselineStep(-5), 0);
});

test('about 63% of the way back after one time constant, spread over many samples', () => {
  let gap = 1;
  const step = 16;
  for (let t = 0; t < TILT_BASELINE_TAU_MS; t += step) gap *= 1 - baselineStep(step);
  assert.ok(Math.abs(gap - Math.exp(-1)) < 0.03, `gap left ${gap.toFixed(3)}`);
});

test('a phone held at an angle settles to flat within a few seconds', () => {
  let gap = 1;
  for (let t = 0; t < 8000; t += 16) gap *= 1 - baselineStep(16);
  assert.ok(gap < 0.05, `gap left ${gap.toFixed(3)}`);
});
