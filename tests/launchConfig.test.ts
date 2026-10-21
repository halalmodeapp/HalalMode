import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { LIVE_PROJECT, SUPABASE_ANON_KEY, SUPABASE_URL } from '../src/lib/publicConfig';
import { PRIVACY_URL, TERMS_URL } from '../src/lib/publicLinks';
import { signInProviders } from '../src/lib/signInProviders';

const root = process.cwd();

test('a build with no environment still reaches the live project', () => {
  // The test runner sets no EXPO_PUBLIC_* values, like an EAS build with empty environments.
  if (process.env.EXPO_PUBLIC_SUPABASE_URL) return;
  assert.equal(SUPABASE_URL, LIVE_PROJECT.supabaseUrl);
  assert.equal(SUPABASE_ANON_KEY, LIVE_PROJECT.supabaseAnonKey);
});

test('the built-in values are the same public ones the website and preview builds use', () => {
  const site = readFileSync(`${root}/site/index.html`, 'utf8');
  assert.ok(site.includes(LIVE_PROJECT.supabaseUrl), 'the website calls the same project');
  assert.ok(site.includes(LIVE_PROJECT.supabaseAnonKey), 'with the same publishable key');
  assert.match(LIVE_PROJECT.supabaseAnonKey, /^sb_publishable_/, 'only ever a publishable key, never a secret one');
  const eas = JSON.parse(readFileSync(`${root}/eas.json`, 'utf8'));
  assert.equal(eas.build.preview.env.EXPO_PUBLIC_SUPABASE_URL, LIVE_PROJECT.supabaseUrl);
  assert.equal(eas.build.preview.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, LIVE_PROJECT.supabaseAnonKey);
});

test('iPhone always offers Sign in with Apple beside Google; Android and the web offer Google', () => {
  assert.deepEqual(signInProviders('ios'), ['apple', 'google']);
  assert.deepEqual(signInProviders('android'), ['google']);
  assert.deepEqual(signInProviders('web'), ['google']);
  const auth = readFileSync(`${root}/app/auth.tsx`, 'utf8');
  assert.doesNotMatch(auth, /auth\/v1\/settings|fetchEnabledProviders/, 'not hidden by a dashboard setting');
});

test('the website and the app link the same Privacy Notice and Terms', () => {
  const footer = readFileSync(`${root}/site/site-footer.js`, 'utf8');
  assert.ok(footer.includes(`'${new URL(PRIVACY_URL).pathname}'`));
  assert.ok(footer.includes(`'${new URL(TERMS_URL).pathname}'`));
  const appFooter = readFileSync(`${root}/src/components/brand/SiteFooter.tsx`, 'utf8');
  assert.match(appFooter, /PRIVACY_URL/);
  assert.match(appFooter, /TERMS_URL/);
});
