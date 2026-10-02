import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

/**
 * A pass is inferred from behaviour, which makes it the one decision in the app
 * the member did not explicitly ask for. These pin the properties that keep that
 * acceptable: it is always confirmed, it is never a separate gesture, and the
 * timings behind it never leave the device.
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
  // The pass RPC carries an introduction id and nothing else — no durations, no
  // counts, nothing that would let the server reconstruct how anyone read.
  assert.match(api, /pass_introduction[\s\S]{0,120}p_introduction_id: introductionId/u);
  assert.doesNotMatch(api, /totalMs|dwell|opens/iu);

  const round = read('src/state/round.tsx');
  assert.doesNotMatch(
    round,
    /mutationFn:[^\n]*ledger|ledger\.records\(\)[^\n]*rpc/u,
    'the ledger must never be handed to anything that talks to the server'
  );
});
