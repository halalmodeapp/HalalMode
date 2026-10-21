import assert from 'node:assert/strict';
import test from 'node:test';

import { MatchingEngagementLedger } from '../src/lib/matchingEngagement';

test('bio and each photo accumulate independently, excluding time in the background', () => {
  let now = 0;
  const ledger = new MatchingEngagementLedger(() => now);
  ledger.bioVisibility('intro-1', true);
  ledger.photoVisibility('intro-1', 'private/member/photo-a.webp', true);
  now = 4_200;
  ledger.photoVisibility('intro-1', 'private/member/photo-b.webp', true);
  now = 6_200;

  assert.deepEqual(ledger.snapshot(), [{
    introductionId: 'intro-1',
    bioSeconds: 5,
    photos: [{ storagePath: 'private/member/photo-a.webp', seconds: 5 }],
  }]);

  now = 11_200;
  ledger.pause();
  now = 611_200;
  ledger.resume();
  now = 616_200;

  assert.deepEqual(ledger.snapshot(), [{
    introductionId: 'intro-1',
    bioSeconds: 15,
    photos: [
      { storagePath: 'private/member/photo-a.webp', seconds: 5 },
      { storagePath: 'private/member/photo-b.webp', seconds: 10 },
    ],
  }]);
});

test('timings are rounded to five-second units and capped at two minutes', () => {
  let now = 0;
  const ledger = new MatchingEngagementLedger(() => now);
  ledger.bioVisibility('intro-1', true);
  ledger.photoVisibility('intro-1', 'private/member/photo.webp', true);
  now = 300_000;

  assert.deepEqual(ledger.snapshot(), [{
    introductionId: 'intro-1',
    bioSeconds: 120,
    photos: [{ storagePath: 'private/member/photo.webp', seconds: 120 }],
  }]);
});

test('does not retain remote URLs or report time below one rounded unit', () => {
  let now = 0;
  const ledger = new MatchingEngagementLedger(() => now);
  ledger.bioVisibility('intro-1', true);
  ledger.photoVisibility('intro-1', 'https://example.test/photo.jpg', true);
  now = 2_000;

  assert.deepEqual(ledger.snapshot(), []);
});
