import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

type Source = {
  build: (search: string, referrer: string, ownHost: string, pathname?: string) => string;
  current: (win: unknown) => string;
  CAMPAIGN_PATHS: Record<string, string>;
};

// The same script the landing page loads, run as a browser would run it.
const sandbox: { HalalWaitlistSource?: Source; URLSearchParams: typeof URLSearchParams; URL: typeof URL } = { URLSearchParams, URL };
runInNewContext(readFileSync('site/waitlist-source.js', 'utf8'), sandbox);
const { build, current, CAMPAIGN_PATHS } = sandbox.HalalWaitlistSource!;
const migration = readFileSync('supabase/migrations/20261022120000_waitlist_country_and_source.sql', 'utf8');
const shape = new RegExp(/check \(source is null or source ~ '([^']+)'\)/.exec(migration)![1]!);

test('utm tags become a short label', () => {
  assert.equal(build('?utm_source=Reddit&utm_medium=paid&utm_campaign=Wave 1', '', 'halalmo.de'), 'reddit/paid/wave-1');
  assert.equal(build('?utm_source=reddit', '', 'halalmo.de'), 'reddit');
});

test('the Reddit ad address is labelled as the ad, ahead of the referring site', () => {
  assert.equal(build('', 'https://www.reddit.com/', 'halalmo.de', '/waitlist'), 'reddit/paid/waitlist');
  assert.equal(build('', '', 'halalmo.de', '/Waitlist/'), 'reddit/paid/waitlist');
  assert.equal(build('?utm_source=instagram', '', 'halalmo.de', '/waitlist'), 'instagram', 'utm tags still win');
  assert.equal(build('', 'https://www.reddit.com/', 'halalmo.de', '/'), 'ref:reddit.com');
});

test('every campaign address served by the site is recognised', () => {
  const links = readFileSync('scripts/campaign-links.mjs', 'utf8');
  const served = [.../CAMPAIGN_PATHS = \[([^\]]*)\]/.exec(links)![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
  assert.ok(served.length > 0);
  for (const path of served) assert.ok(CAMPAIGN_PATHS['/' + path], `/${path} has a source label`);
  for (const label of Object.values(CAMPAIGN_PATHS)) assert.match(label, shape);
});

test('without utm tags or a campaign address the referring site is used, but never our own', () => {
  assert.equal(build('', 'https://www.reddit.com/r/MuslimMarriage/', 'halalmo.de'), 'ref:reddit.com');
  assert.equal(build('', 'https://halalmo.de/how-it-works', 'halalmo.de'), '');
  assert.equal(build('', '', 'halalmo.de'), '');
  assert.equal(build('', 'not a url', 'halalmo.de'), '');
});

test('every label fits what the database accepts', () => {
  for (const label of [
    build('?utm_source=a b c&utm_medium=<script>&utm_campaign=' + 'x'.repeat(200), '', 'halalmo.de'),
    build('?utm_source=Reddit&utm_medium=Paid', '', 'halalmo.de'),
    build('', 'https://old.reddit.com/', 'halalmo.de'),
  ]) {
    assert.match(label, shape);
    assert.ok(label.length <= 80);
  }
});

test('nothing is stored in the browser', () => {
  const touched: string[] = [];
  const storage = { getItem: () => { touched.push('get'); return null; }, setItem: () => { touched.push('set'); } };
  const win = {
    localStorage: storage,
    sessionStorage: storage,
    location: { search: '?utm_source=reddit&utm_medium=paid', hostname: 'halalmo.de', pathname: '/' },
    document: { referrer: '' },
  };
  assert.equal(current(win), 'reddit/paid');
  assert.deepEqual(touched, []);
  assert.doesNotMatch(readFileSync('site/waitlist-source.js', 'utf8'), /localStorage\.|sessionStorage\.|document\.cookie/);
});
