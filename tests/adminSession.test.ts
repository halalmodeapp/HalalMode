import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

type Session = { access_token: string; refresh_token: string; expires_at: number };
type Reply = { ok: boolean; text: () => Promise<string> };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function reply(value: unknown): Reply {
  return { ok: true, text: async () => JSON.stringify(value) };
}

function admin() {
  const source = readFileSync('site/admin.js', 'utf8');
  const auth = source.split('// ---------------------------------------------------------------- auth & network')[1]!
    .split('// ---------------------------------------------------------------- sign-in screens')[0];
  const calls: { url: string; body: string; result: ReturnType<typeof deferred<Reply>> }[] = [];
  const state: { session: Session | null; me: unknown; timer: null } = { session: null, me: null, timer: null };
  const stored = new Map<string, string>();
  const api = runInNewContext(`${auth}\n({ save, fresh, rpc, signOut, verifyCode });`, {
    state, KEY: 'public-test-key', URL_BASE: 'https://example.invalid', STORE: 'session', DEMO: false,
    sessionStorage: { setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) },
    clearInterval: () => {}, showSignIn: () => {},
    fetch: (url: string, options: { body: string }) => {
      const result = deferred<Reply>();
      calls.push({ url, body: options.body, result });
      return result.promise;
    },
  }) as {
    save: (session: Session | null) => void;
    fresh: () => Promise<void>;
    rpc: (name: string) => Promise<unknown>;
    signOut: () => void;
    verifyCode: (code: string) => Promise<void>;
  };
  api.save({ access_token: 'old', refresh_token: 'refresh-old', expires_at: 0 });
  return { api, calls, state, stored };
}

const tokens = { access_token: 'new', refresh_token: 'refresh-new', expires_in: 3600 };

test('parallel admin reads share refresh and continue with the replacement session', async () => {
  const { api, calls, state } = admin();
  const first = api.rpc('admin_overview');
  const second = api.rpc('admin_settings');
  assert.equal(calls.length, 1);
  assert.match(calls[0]!.url, /grant_type=refresh_token/);
  calls[0]!.result.resolve(reply(tokens));
  // Let the shared refresh and its waiting RPC continuations complete.
  await api.fresh();
  assert.equal(state.session?.refresh_token, 'refresh-new');
  assert.equal(calls.length, 3);
  calls[1]!.result.resolve(reply({ loaded: true }));
  calls[2]!.result.resolve(reply({ loaded: true }));
  await Promise.all([first, second]);
});

test('a failed admin refresh releases the shared attempt for retry', async () => {
  const { api, calls } = admin();
  const first = api.fresh();
  const second = api.fresh();
  const settled = Promise.allSettled([first, second]);
  calls[0]!.result.reject(new Error('offline'));
  assert.deepEqual((await settled).map((result) => result.status), ['rejected', 'rejected']);
  const retry = api.fresh();
  assert.equal(calls.length, 2);
  calls[1]!.result.resolve(reply(tokens));
  await retry;
});

test('sign-out clears local authority immediately and a late refresh cannot restore it', async () => {
  const { api, calls, state, stored } = admin();
  const pending = api.fresh();
  const rejected = assert.rejects(pending, /Signed out/);
  api.signOut();
  assert.equal(state.session, null);
  assert.equal(stored.has('session'), false);
  calls[0]!.result.resolve(reply(tokens));
  await rejected;
  assert.equal(state.session, null);
  calls[1]!.result.resolve(reply({}));
});

test('an in-flight admin response cannot repopulate authority after sign-out', async () => {
  const { api, calls } = admin();
  api.save({ access_token: 'valid', refresh_token: 'refresh-valid', expires_at: Date.now() / 1000 + 3600 });
  const pending = api.rpc('admin_session');
  await Promise.resolve();
  const rejected = assert.rejects(pending, /Signed out/);
  api.signOut();
  calls[0]!.result.resolve(reply({ role: 'owner' }));
  await rejected;
  calls[1]!.result.resolve(reply({}));
});

test('MFA waits for refresh and cannot save its result after sign-out', async () => {
  const { api, calls, state } = admin();
  const pending = api.verifyCode('123456');
  const rejected = assert.rejects(pending, /Signed out/);
  assert.equal(calls.length, 1);
  calls[0]!.result.resolve(reply(tokens));
  await api.fresh();
  assert.match(calls[1]!.url, /auth\/v1\/user/);
  calls[1]!.result.resolve(reply({ factors: [{ id: 'factor', factor_type: 'totp', status: 'verified' }] }));
  // Drain promise callbacks until the next mocked HTTP request starts.
  for (let i = 0; i < 10 && calls.length < 3; i += 1) await Promise.resolve();
  calls[2]!.result.resolve(reply({ id: 'challenge' }));
  for (let i = 0; i < 10 && calls.length < 4; i += 1) await Promise.resolve();
  api.signOut();
  calls[3]!.result.resolve(reply({ ...tokens, access_token: 'mfa' }));
  await rejected;
  assert.equal(state.session, null);
  calls[4]!.result.resolve(reply({}));
});
