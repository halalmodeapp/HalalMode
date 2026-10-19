import assert from 'node:assert/strict';
import test from 'node:test';

import { fajrForMadinahDate } from '../src/lib/madinahPrayerTimes.ts';

test('Madinah summer Fajr is calculated locally at the expected UTC instant', () => {
  const fajr = fajrForMadinahDate('2026-08-13');
  assert.equal(fajr.at.toISOString(), '2026-08-13T01:32:00.000Z');
  assert.equal(fajr.hour, 4);
  assert.equal(fajr.minute, 32);
});

test('Madinah winter Fajr is calculated locally at the expected UTC instant', () => {
  const fajr = fajrForMadinahDate('2026-11-21');
  assert.equal(fajr.at.toISOString(), '2026-11-21T02:20:00.000Z');
  assert.equal(fajr.hour, 5);
  assert.equal(fajr.minute, 20);
});

test('Madinah Fajr rejects malformed or impossible dates', () => {
  assert.throws(() => fajrForMadinahDate('2026-2-13'), /YYYY-MM-DD/u);
  assert.throws(() => fajrForMadinahDate('2026-02-30'), /date is invalid/u);
});
