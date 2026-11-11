import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

/**
 * Reading time is the one signal a member gives without deciding to. These pin
 * that it is measured wherever a profile is shown, and that raw timings never
 * leave the device: only a soft-select id and bounded totals are sent.
 */

test('reading a profile is timed on every surface that shows one', () => {
  for (const route of ['app/introduction/[id].tsx', 'app/gallery/[id].tsx']) {
    const source = read(route);
    assert.match(source, /profileOpened\(id\)/u, `${route} must record that the profile was opened`);
    assert.match(source, /profileClosed\(id\)/u, `${route} must record that it was closed`);
  }
});

test('dwell timings stay on the device', () => {
  const api = read('src/api/introductions.ts');
  // Nothing that talks to the server knows about durations or visit counts.
  assert.doesNotMatch(api, /totalMs|dwell|opens/iu);

  // The code that sends a set receives finished values, never the ledgers.
  const round = read('src/state/round.tsx');
  const sending = round.slice(round.indexOf('mutationFn:'), round.indexOf('onSuccess:'));
  assert.ok(sending.length > 0, 'the round provider must still send through one mutation');
  assert.doesNotMatch(
    sending,
    /ledger|matchingEngagement/u,
    'the ledgers must never be handed to anything that talks to the server'
  );
});
