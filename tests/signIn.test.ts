import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

/**
 * Signing in with Google or Apple.
 *
 * The whole design rests on one thing: the provider hands back the same `code`
 * on the same deep link the email link has always used, so `state/auth` adopts
 * the session in exactly one place. These tests guard that, because a second
 * place that adopted a session is how you end up signed in as nobody.
 */
test('both providers come back to the address the deep-link listener watches', () => {
  const api = read('src/api/auth.ts');
  const redirect = api.match(/REDIRECT_TO = '([^']+)'/u)?.[1];
  assert.equal(redirect, 'halalmode://auth');

  // One return address for both, chosen in one place: the app's link scheme
  // on phones, the app's own page (under /app) on the web.
  assert.match(api, /redirectTo: authReturnAddress\(\)/u);
  // Email sign-in has its own screen; its link must land on the same route.
  const screen = read('app/auth-email.tsx');
  assert.match(
    screen,
    /emailRedirectTo: authReturnAddress\(\)/u,
    'the email link and the provider flow must land on the same route'
  );
});

test('auth-session and deep-link redirects share the same PKCE exchange guard', () => {
  const api = read('src/api/auth.ts');
  const state = read('src/state/auth.tsx');
  const helper = read('src/lib/authCodeExchange.ts');

  // iOS may return the redirect URL through the auth-session result, while
  // Android can also deliver it to Linking. Both routes must share one guard.
  assert.match(api, /exchangeAuthCodeOnce/u);
  assert.match(state, /exchangeAuthCodeOnce/u);
  assert.match(helper, /inFlightExchanges/u);
  assert.match(helper, /completedExchanges/u);
  assert.doesNotMatch(api, /setSession|signInWithIdToken/u);
});

test('both providers are offered, and named in both languages', () => {
  const screen = read('app/auth.tsx');
  assert.match(screen, /testIds\.auth\.google/u);
  assert.match(screen, /testIds\.auth\.apple/u);
  // Phones lead with their own platform's sign-in (Apple on iPhone, Google
  // elsewhere); the other provider is offered on the web only, so Android
  // never shows an Apple button it cannot use.
  assert.match(screen, /signInProviders\(Platform\.OS\)/u);
  assert.match(screen, /Platform\.OS === 'web' \?/u);

  const catalog = read('src/i18n/catalog.ts');
  for (const key of ['auth.continueGoogle', 'auth.continueApple', 'auth.orEmail']) {
    const hits = catalog.split(`'${key}':`).length - 1;
    assert.equal(hits, 2, `${key} must be translated in both catalogs, found ${hits}`);
  }
});

test('an email sign-in 429 offers Google and the message is translated everywhere', () => {
  const screen = read('app/auth-email.tsx');
  assert.match(screen, /isHttpRateLimitError\(error\)/u);
  assert.match(screen, /limited\s*\?\s*t\('auth\.emailRateLimited'\)/u);
  assert.match(screen, /onPress=\{\(\) => void continueWithGoogle\(\)\}/u);
  assert.match(screen, /signInWithProvider\('google'\)/u);

  const base = read('src/i18n/catalog.ts');
  assert.equal(base.split("'auth.emailRateLimited':").length - 1, 2);
  for (const locale of ['am', 'bn', 'es', 'fa', 'fr', 'ha', 'hi', 'id', 'ms', 'ru', 'so', 'tr', 'ur', 'zh-Hans']) {
    assert.match(read(`src/i18n/catalogs/${locale}.ts`), /'auth\.emailRateLimited':/u, `${locale} needs a translated rate-limit message`);
  }
});
