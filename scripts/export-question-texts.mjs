/**
 * Copies the question wording into the connection-summary function, which runs
 * on the server and cannot import the app's TypeScript. Re-run after editing
 * src/data/questions.ts:  node scripts/export-question-texts.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync('src/data/questions.ts', 'utf8');
const pattern = /id: '(q\d+)',[\s\S]*?text: '((?:[^'\\]|\\.)*)',\s*textAr: '((?:[^'\\]|\\.)*)'/g;
const unescape = (value) => value.replace(/\\'/g, "'");
const out = {};
for (const match of source.matchAll(pattern)) {
  out[match[1]] = { en: unescape(match[2]), ar: unescape(match[3]) };
}
writeFileSync('supabase/functions/connection-summary/questions.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`${Object.keys(out).length} questions exported`);
