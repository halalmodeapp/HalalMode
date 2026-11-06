import assert from 'node:assert/strict';
import { test } from 'node:test';
import { restrictionDuration } from '../supabase/functions/_shared/restrictionDuration.ts';

test('restriction retries do not restart the suspension', () => {
  const start = Date.parse('2026-11-06T00:00:00Z');
  const until = new Date(start + 7 * 86400000).toISOString();
  assert.equal(restrictionDuration(until, start), '604800s');
  assert.equal(restrictionDuration(until, start + 600000), '604200s');
  assert.equal(restrictionDuration(until, start + 7 * 86400000), 'none');
  assert.equal(restrictionDuration(null, start), 'none');
});

test('restriction deadlines round up to the next second and reject invalid input', () => {
  assert.equal(restrictionDuration('2026-11-06T00:00:00.001Z', Date.parse('2026-11-06T00:00:00Z')), '1s');
  assert.throws(() => restrictionDuration('bad', Date.now()));
  assert.throws(() => restrictionDuration('2026-11-06T00:00:00Z', NaN));
});
