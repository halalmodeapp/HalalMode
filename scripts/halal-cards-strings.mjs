/**
 * Writes the English source for Halal Cards translations, and checks any
 * translations already made.
 *
 *   docs/halal-cards-strings.en.json — every member-facing string, keyed
 *
 * A translation is src/halalCards/translations/<locale>.json with the same
 * shape and keys. This script reports, per translation: missing keys, extra
 * keys, and strings whose {{placeholders}} differ from the English.
 *
 * Run with `npm run cards:strings` (it compiles the content first). Exits
 * non-zero if a translation is broken, so it can gate a commit.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const content = require('../.test-build/src/halalCards/content/index.js');
const i18n = require('../.test-build/src/halalCards/i18n.js');
const copy = require('../.test-build/src/halalCards/copyStrings.js');

const strings = { copy: copy.ENGLISH_COPY, content: {} };
for (const activity of content.ALL_ACTIVITIES) Object.assign(strings.content, i18n.activityStrings(activity));

writeFileSync('docs/halal-cards-strings.en.json', `${JSON.stringify(strings, null, 2)}\n`);
const total = Object.keys(strings.copy).length + Object.keys(strings.content).length;
const words = [...Object.values(strings.copy), ...Object.values(strings.content)].join(' ').split(/\s+/).length;
console.log(`Wrote ${total} strings (about ${words.toLocaleString()} words).`);

const dir = 'src/halalCards/translations';
let broken = 0;
if (existsSync(dir)) {
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    const translation = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
    const problems = [];
    for (const part of ['copy', 'content']) {
      const source = strings[part];
      const target = translation[part] ?? {};
      const missing = Object.keys(source).filter((key) => typeof target[key] !== 'string' || !target[key].trim());
      const extra = Object.keys(target).filter((key) => !(key in source));
      const placeholders = Object.keys(source).filter(
        (key) => typeof target[key] === 'string' && i18n.placeholdersOf(source[key]).join() !== i18n.placeholdersOf(target[key]).join()
      );
      if (missing.length) problems.push(`${missing.length} missing in ${part} (e.g. ${missing[0]})`);
      if (extra.length) problems.push(`${extra.length} unknown in ${part} (e.g. ${extra[0]})`);
      if (placeholders.length) problems.push(`${placeholders.length} with changed {{placeholders}} in ${part} (e.g. ${placeholders[0]})`);
    }
    if (problems.length) {
      broken += 1;
      console.log(`✗ ${file}: ${problems.join('; ')}`);
    } else {
      console.log(`✓ ${file}: complete`);
    }
  }
}
if (broken) process.exit(1);
