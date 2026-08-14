import assert from 'node:assert/strict';
import test from 'node:test';

import { PHOTO_MAX_EDGE, photoResizeTarget } from '../src/lib/photoPolicy';

test('an oversized photo is shrunk by its longest edge, whichever that is', () => {
  assert.deepEqual(photoResizeTarget(4032, 3024), { width: PHOTO_MAX_EDGE });
  assert.deepEqual(photoResizeTarget(3024, 4032), { height: PHOTO_MAX_EDGE });
});

test('a photo already small enough is left alone', () => {
  assert.equal(photoResizeTarget(1200, 1600), null);
  assert.equal(photoResizeTarget(PHOTO_MAX_EDGE, PHOTO_MAX_EDGE), null);
});

test('an unreadable size uploads unchanged rather than being guessed at', () => {
  // Stretching somebody's face is worse than paying for a large file.
  assert.equal(photoResizeTarget(0, 0), null);
  assert.equal(photoResizeTarget(Number.NaN, 800), null);
});
