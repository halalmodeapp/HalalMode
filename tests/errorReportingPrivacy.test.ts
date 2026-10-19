import assert from 'node:assert/strict';
import test from 'node:test';

import { sanitizeClientError } from '../src/lib/sanitizeClientError';

test('client error reports retain safe diagnostics without sending raw error text', () => {
  const privateDetails = [
    'mohammed@example.com',
    '+1 555 010 8833',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXIifQ.signature',
    '7c649e7d-82ca-4f51-9251-cbde9f92eb15',
    '24.7136,46.6753',
  ];
  const sanitized = sanitizeClientError(Object.assign(
    new Error(`Permission denied while loading profile for ${privateDetails.join(' ')}`),
    { code: '42501', status: 403, details: privateDetails.join(' ') },
  ));

  assert.equal(sanitized, 'Error: access_denied: code=42501: status=403');
  for (const detail of privateDetails) assert.equal(sanitized.includes(detail), false);
});

test('client error reports preserve a useful network category, error class and rate-limit signal', () => {
  assert.equal(sanitizeClientError(new TypeError('Network request failed')), 'TypeError: network_failure');
  assert.equal(sanitizeClientError({ message: 'Too many requests', status: 429 }), 'Error: rate_limited: status=429');
  assert.equal(sanitizeClientError('untrusted arbitrary text'), 'Error: request_failed');
});
