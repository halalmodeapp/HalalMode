import assert from 'node:assert/strict';
import test from 'node:test';
import { dawnSearchStart, nextFajrWindow } from '../src/lib/prayerTimes.ts';

// Anchorage dawn sits right on the 14:30 UTC cycle boundary in late October.
const ANCHORAGE = { latitude: 61.22, longitude: -149.9 };
const cycleStart = (day: string) => new Date(`${day}T14:30:00Z`);

test('two cycles near the boundary no longer give one dawn two sets', () => {
  const first = nextFajrWindow(ANCHORAGE.latitude, ANCHORAGE.longitude, cycleStart('2026-10-22'), 'one_seventh');
  assert.ok(first);
  const naive = nextFajrWindow(ANCHORAGE.latitude, ANCHORAGE.longitude, cycleStart('2026-10-23'), 'one_seventh');
  assert.ok(naive);
  const after = dawnSearchStart(cycleStart('2026-10-23'), first.opensAt.toISOString());
  const second = nextFajrWindow(ANCHORAGE.latitude, ANCHORAGE.longitude, after, 'one_seventh');
  assert.ok(second);
  assert.ok(second.opensAt.getTime() - first.opensAt.getTime() > 12 * 3600_000, 'the second set is for the following dawn');
  assert.equal(second.opensAt.getTime(), first.expiresAt.getTime(), 'and opens exactly as the first one closes');
});

test('an older last dawn leaves the cycle start in charge', () => {
  const start = cycleStart('2026-11-07');
  assert.equal(dawnSearchStart(start, '2026-11-05T05:00:00Z').getTime(), start.getTime());
  assert.equal(dawnSearchStart(start, null).getTime(), start.getTime());
});
