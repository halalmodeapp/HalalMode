import assert from 'node:assert/strict';
import test from 'node:test';

import { isHttpRateLimitError } from '../src/lib/authErrors';

test('only an HTTP 429 is treated as an email-provider rate limit', () => {
  assert.equal(isHttpRateLimitError({ status: 429 }), true);
  assert.equal(isHttpRateLimitError({ status: 500 }), false);
  assert.equal(isHttpRateLimitError({ status: '429' }), false);
  assert.equal(isHttpRateLimitError(new Error('Too many requests')), false);
  assert.equal(isHttpRateLimitError(null), false);
});
