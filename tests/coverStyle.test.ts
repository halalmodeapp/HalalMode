import assert from 'node:assert/strict';
import test from 'node:test';

import { COVER_STYLES, isCoverStyle } from '../src/components/auth/coverStyle';

test('cover selector exposes only Couple and Chrome hearts', () => {
  assert.deepEqual(COVER_STYLES, ['couple', 'hearts']);
  assert.equal(isCoverStyle('couple'), true);
  assert.equal(isCoverStyle('hearts'), true);
  assert.equal(isCoverStyle('dots'), false);
});
