import assert from 'node:assert/strict';
import test from 'node:test';

import { exchangeAuthCodeOnce } from '../src/lib/authCodeExchange.ts';

test('simultaneous delivery of one auth code performs one exchange', async () => {
  let calls = 0;
  let finishExchange!: (result: { error: null }) => void;
  const exchangeResult = new Promise<{ error: null }>((resolve) => {
    finishExchange = resolve;
  });
  const exchange = async () => {
    calls += 1;
    return exchangeResult;
  };

  const first = exchangeAuthCodeOnce('oauth-concurrent-test-code', exchange);
  const second = exchangeAuthCodeOnce('oauth-concurrent-test-code', exchange);
  await Promise.resolve();
  assert.equal(calls, 1);

  finishExchange({ error: null });
  assert.deepEqual(await Promise.all([first, second]), [{ error: null }, { error: null }]);
  assert.deepEqual(
    await exchangeAuthCodeOnce('oauth-concurrent-test-code', exchange),
    { error: null }
  );
  assert.equal(calls, 1);
});

test('a failed exchange can be retried by the same code after the first attempt settles', async () => {
  let calls = 0;
  const exchange = async () => {
    calls += 1;
    if (calls === 1) throw new Error('temporary transport failure');
    return { error: null };
  };

  await assert.rejects(
    exchangeAuthCodeOnce('oauth-retry-test-code', exchange),
    /temporary transport failure/u
  );
  assert.deepEqual(
    await exchangeAuthCodeOnce('oauth-retry-test-code', exchange),
    { error: null }
  );
  assert.equal(calls, 2);
});
