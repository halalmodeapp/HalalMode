/**
 * Keeps the static How it works copy in step with the native Halal Cards
 * catalogue. The app reads ALL_ACTIVITIES.length directly; the static page gets
 * this small generated value immediately before a web deployment.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const tscPath = require.resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tscPath, '-p', 'tests/tsconfig.activity-count.json'], { stdio: 'inherit' });

const { HALAL_CARDS_ACTIVITY_COUNT } = require('../.count-build/src/halalCards/content/index.js');
if (!Number.isInteger(HALAL_CARDS_ACTIVITY_COUNT) || HALAL_CARDS_ACTIVITY_COUNT < 1) {
  throw new Error(`Invalid Halal Cards activity count: ${HALAL_CARDS_ACTIVITY_COUNT}`);
}

for (const file of ['site/how-it-works.html']) {
  const html = readFileSync(file, 'utf8');
  const root = html.match(/<html\b[^>]*>/i)?.[0];
  if (!root) throw new Error(`Missing root HTML element in ${file}`);
  const updatedRoot = /\bdata-activity-count="[^"]*"/.test(root)
    ? root.replace(/\bdata-activity-count="[^"]*"/, `data-activity-count="${HALAL_CARDS_ACTIVITY_COUNT}"`)
    : root.replace(/>$/, ` data-activity-count="${HALAL_CARDS_ACTIVITY_COUNT}">`);
  let updated = html.replace(root, updatedRoot);
  const bodyPattern = /(<p\b[^>]*data-i18n="cardsBody"[^>]*>)([\s\S]*?)(<\/p>)/;
  if (!bodyPattern.test(updated)) throw new Error(`Missing Halal Cards body copy in ${file}`);
  updated = updated.replace(bodyPattern, (_match, open, body, close) => {
    if (!/\{\{count\}\}|\d+/.test(body)) {
      throw new Error(`Missing activity-count marker in ${file}`);
    }
    const current = body.replace(/\{\{count\}\}|\d+/, String(HALAL_CARDS_ACTIVITY_COUNT));
    return `${open}${current}${close}`;
  });
  writeFileSync(file, updated);
}
console.log(`Halal Cards activity count: ${HALAL_CARDS_ACTIVITY_COUNT}`);
