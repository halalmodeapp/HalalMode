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

const { CATALOGUE_COUNTS } = require('../.count-build/src/halalCards/content/index.js');
if (!Number.isInteger(CATALOGUE_COUNTS.total) || CATALOGUE_COUNTS.total < 1) {
  throw new Error(`Invalid Halal Cards activity count: ${CATALOGUE_COUNTS.total}`);
}

const attributes = {
  'data-activity-count': CATALOGUE_COUNTS.total,
  'data-lab-count': CATALOGUE_COUNTS.lab,
  'data-scenario-count': CATALOGUE_COUNTS.scenarios,
  'data-quiz-count': CATALOGUE_COUNTS.quizzes,
  'data-story-count': CATALOGUE_COUNTS.stories,
  'data-free-count': CATALOGUE_COUNTS.free,
};

for (const file of ['site/how-it-works.html']) {
  const html = readFileSync(file, 'utf8');
  const root = html.match(/<html\b[^>]*>/i)?.[0];
  if (!root) throw new Error(`Missing root HTML element in ${file}`);
  const updatedRoot = Object.entries(attributes).reduce((current, [name, value]) => {
    const pattern = new RegExp(`\\b${name}="[^"]*"`);
    return pattern.test(current)
      ? current.replace(pattern, `${name}="${value}"`)
      : current.replace(/>$/, ` ${name}="${value}">`);
  }, root);
  let updated = html.replace(root, updatedRoot);
  const bodyPattern = /(<p\b[^>]*data-i18n="cardsBody"[^>]*>)([\s\S]*?)(<\/p>)/;
  if (!bodyPattern.test(updated)) throw new Error(`Missing Halal Cards body copy in ${file}`);
  updated = updated.replace(bodyPattern, (_match, open, body, close) => {
    if (!/\{\{count\}\}|\d+/.test(body)) {
      throw new Error(`Missing activity-count marker in ${file}`);
    }
    const current = body.replace(/\{\{count\}\}|\d+/, String(CATALOGUE_COUNTS.total));
    return `${open}${current}${close}`;
  });
  const premiumPattern = /(<p\b[^>]*data-i18n="cardsPremium"[^>]*>)([\s\S]*?)(<\/p>)/;
  if (!premiumPattern.test(updated)) throw new Error(`Missing Halal Cards Premium copy in ${file}`);
  updated = updated.replace(premiumPattern, (_match, open, body, close) => {
    const values = [
      CATALOGUE_COUNTS.free,
      CATALOGUE_COUNTS.total,
      CATALOGUE_COUNTS.lab,
      CATALOGUE_COUNTS.scenarios,
      CATALOGUE_COUNTS.quizzes,
      CATALOGUE_COUNTS.stories,
    ];
    let index = 0;
    const current = body.replace(/\d+/g, () => String(values[index++]));
    if (index !== values.length) throw new Error(`Expected ${values.length} Premium counts in ${file}, found ${index}`);
    return `${open}${current}${close}`;
  });
  writeFileSync(file, updated);
}
console.log(`Halal Cards catalogue counts: ${JSON.stringify(CATALOGUE_COUNTS)}`);
