import assert from 'node:assert/strict';
import test from 'node:test';
import { howItWorksUrl } from '../src/lib/publicLinks';

test('How it works carries all sixteen app languages to the public site', () => {
  for (const language of ['en', 'ar', 'ur', 'fa', 'hi', 'id', 'ms', 'bn', 'fr', 'tr', 'ha', 'am', 'so', 'es', 'ru', 'zh-Hans']) {
    const url = new URL(howItWorksUrl(language));
    assert.equal(url.origin, 'https://halalmo.de');
    assert.equal(url.pathname, '/how-it-works');
    assert.equal(url.searchParams.get('lang'), language);
  }
});

test('language cannot inject a second parameter or replace the public destination', () => {
  const url = new URL(howItWorksUrl('ar&redirect=https://example.com'));
  assert.equal(url.searchParams.has('redirect'), false);
  assert.equal(url.origin, 'https://halalmo.de');
});
