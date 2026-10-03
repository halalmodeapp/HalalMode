/**
 * Checks every language against English:
 *   - interface text: no missing or extra keys, every {{placeholder}} kept;
 *   - lists: every profession, education level, question and opener present.
 *
 *   node scripts/check-translations.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const entries = (source) => {
  const map = new Map();
  const line = /^ {2}'([^']+)': (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"),?$/gm;
  for (const match of source.matchAll(line)) map.set(match[1], match[2] ?? match[3]);
  return map;
};
const placeholders = (text) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(',');

const catalog = readFileSync('src/i18n/catalog.ts', 'utf8');
const english = entries(catalog.slice(0, catalog.indexOf('} as const;')));
let problems = 0;
for (const file of readdirSync('src/i18n/catalogs')) {
  const own = entries(readFileSync(`src/i18n/catalogs/${file}`, 'utf8'));
  const missing = [...english.keys()].filter((key) => !own.has(key));
  const extra = [...own.keys()].filter((key) => !english.has(key));
  const broken = [...english]
    .filter(([key, text]) => own.has(key) && placeholders(own.get(key)) !== placeholders(text))
    .map(([key]) => key);
  const report = [
    missing.length && `missing ${missing.join(' ')}`,
    extra.length && `extra ${extra.join(' ')}`,
    broken.length && `placeholders ${broken.join(' ')}`,
  ].filter(Boolean);
  problems += report.length;
  console.log(`text  ${file.padEnd(12)} ${own.size}/${english.size} ${report.join(' | ') || 'ok'}`);
}

// Group ids sit two spaces in, option ids deeper.
const groupsOf = (file) => {
  const source = readFileSync(file, 'utf8');
  const groups = [...source.matchAll(/^ {2}\{\s*\n\s*id: '([^']+)'/gm)].map((m) => m[1]);
  const all = [...source.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
  return { groups, options: all.filter((id) => !groups.includes(id)) };
};
const occupations = groupsOf('src/data/occupations.ts');
const education = groupsOf('src/data/educationLevels.ts');

const keysIn = (source, block) => {
  const start = source.indexOf(`  ${block}: {`);
  if (start < 0) return new Set();
  const body = source.slice(start, source.indexOf('\n  },', start));
  return new Set([...body.matchAll(/([a-z_0-9]+): '/g)].map((m) => m[1]));
};

const dir = 'src/data/translations';
for (const file of existsSync(dir) ? readdirSync(dir) : []) {
  if (file === 'index.ts' || file === 'types.ts') continue;
  const source = readFileSync(`${dir}/${file}`, 'utf8');
  const lacking = (ids, block) => {
    const have = keysIn(source, block);
    const gap = ids.filter((id) => !have.has(id));
    return gap.length ? `${block} missing ${gap.join(' ')}` : '';
  };
  const openers = (source.slice(source.indexOf('openers: [')).match(/^ {4}'/gm) ?? []).length;
  const report = [
    lacking(occupations.options, 'occupations'),
    lacking(occupations.groups, 'occupationGroups'),
    lacking(education.options, 'education'),
    lacking(education.groups, 'educationGroups'),
    lacking(Array.from({ length: 12 }, (_, i) => `q${i + 1}`), 'questions'),
    openers === 20 ? '' : `openers ${openers}/20`,
  ].filter(Boolean);
  problems += report.length;
  console.log(`lists ${file.padEnd(12)} ${report.join(' | ') || 'ok'}`);
}
console.log(`\n(${occupations.options.length} professions in ${occupations.groups.length} groups, ${education.options.length} education levels in ${education.groups.length} groups)`);
process.exit(problems ? 1 : 0);
