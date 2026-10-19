import assert from 'node:assert/strict';
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
