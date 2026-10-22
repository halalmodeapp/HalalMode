import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import test from 'node:test';

import { findDynamicWebRoutes, pagesRedirects } from '../scripts/web-routes.mjs';

test('Cloudflare rules are derived for every dynamic Expo Router page', () => {
  const routes = findDynamicWebRoutes('app');
  const required = [
    ['/app/halal-cards/:id', '/app/halal-cards/[id]'],
    ['/app/halal-cards/:id/journal', '/app/halal-cards/[id]/journal'],
    ['/app/halal-cards/:id/section/:kind', '/app/halal-cards/[id]/section/[kind]'],
    ['/app/halal-cards/:id/activity/:activityId', '/app/halal-cards/[id]/activity/[activityId]'],
    ['/app/halal-cards/:id/solo/:activityId', '/app/halal-cards/[id]/solo/[activityId]'],
    ['/app/halal-cards/:id/play/:sessionId', '/app/halal-cards/[id]/play/[sessionId]'],
    ['/app/connection/:id/chat', '/app/connection/[id]/chat'],
  ];
  for (const [source, target] of required) {
    assert.ok(routes.some((route) => route.source === source && route.target === target), `${source} -> ${target}`);
  }

  const output = pagesRedirects(routes);
  assert.equal(output.trimEnd().split('\n').length, routes.length);
  assert.equal(new Set(routes.map((route) => route.source)).size, routes.length);
});

test('a waitlist-only deploy sends every app address away and keeps the legal pages', async () => {
  const { legalPage, waitlistOnlyRedirects } = await import('../scripts/legal-pages.mjs');
  const rules = waitlistOnlyRedirects().trimEnd().split('\n');
  // Specific rules first: Cloudflare uses the first rule that matches.
  assert.deepEqual(rules, [
    '/app/terms /legal/terms 301',
    '/app/privacy /legal/privacy 301',
    '/app / 302',
    '/app/* / 302',
  ]);

  const doc = { slug: 'terms', title: 'Terms <of> Service', updated: '2026-10-06', url: 'https://halalmo.de/legal/terms', intro: 'Hello & welcome.', sections: [{ heading: 'One', body: ['A line.'] }] };
  const html = legalPage(doc, { slug: 'privacy', url: 'https://halalmo.de/legal/privacy' });
  assert.match(html, /<link rel="canonical" href="https:\/\/halalmo\.de\/legal\/terms">/);
  assert.match(html, /<title>Terms &lt;of&gt; Service · Halal Mode<\/title>/);
  assert.match(html, /Hello &amp; welcome\./);
  assert.match(html, /href="\/legal\/privacy">Read the Privacy Notice/);
  assert.doesNotMatch(html, /<script/);
  const privacy = legalPage(
    { slug: 'privacy', title: 'Privacy', updated: '2026-10-06', url: 'https://halalmo.de/legal/privacy', intro: 'Privacy.', sections: [] },
    { slug: 'terms', url: 'https://halalmo.de/legal/terms' },
  );
  assert.match(privacy, /locally bundled GeoNames dataset/u);
  assert.match(privacy, /href="\/licenses\/geonames\.html"/u);
});

test('the referral page scripts parse and its share message carries the link and code', () => {
  const html = readFileSync('site/refer.html', 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/giu)].map((match) => match[1]);
  assert.ok(scripts.length > 0);
  for (const script of scripts) new Script(script);
  assert.match(html, /t\('shareMessage'\)[\s\S]*t\('shareCode'\)/u);
  assert.match(html, /encodeURIComponent\(t\('shareMessage'\)[^;]*\\n[^;]*t\('shareCode'\)/u);
});

test('campaign paths serve the homepage at their own clean address, never with a referral code', async () => {
  const { campaignRedirects } = await import('../scripts/campaign-links.mjs');
  const rules = campaignRedirects().trimEnd().split(/\r?\n/);
  assert.ok(rules.includes('/waitlist / 200'));
  for (const rule of rules) assert.doesNotMatch(rule, /[?&]ref=/);
});
