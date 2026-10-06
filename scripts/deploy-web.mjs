/**
 * Publishes halalmo.de: the landing page from site/ at the root and the app
 * under /app, as one Cloudflare Pages deployment.
 *
 *   npm run deploy:web            -> live site (halalmo.de)
 *   npm run deploy:web -- preview -> https://app-preview.halalmode.pages.dev
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const branch = process.argv[2] === 'preview' ? 'app-preview' : 'main';
const run = (command) => execSync(command, { stdio: 'inherit' });

rmSync('dist/web', { recursive: true, force: true });
rmSync('dist/pages', { recursive: true, force: true });
// --clear: environment values are baked into cached build output, so a
// changed .env would otherwise ship the old values.
run('npx expo export --platform web --output-dir dist/web --clear');

mkdirSync('dist/pages', { recursive: true });
const skip = new Set(['node_modules', '.wrangler', 'package.json', 'package-lock.json', 'logo-effect-src.js']);
cpSync('site', 'dist/pages', { recursive: true, filter: (path) => !skip.has(path.split(/[\\/]/).pop()) });
cpSync('dist/web', 'dist/pages/app', { recursive: true });

// Pages with an id in the address share one page each; send every id to it.
const ids = [
  'connection/:id/chat', 'connection/:id/answers', 'connection/:id/questions',
  'connection/:id/recap', 'connection/:id/waiting', 'connection/:id',
  'introduction/:id', 'gallery/:id', 'match/:id',
];
writeFileSync('dist/pages/_redirects', ids
  .map((path) => `/app/${path} /app/${path.replace(':id', '[id]')} 200`)
  .join('\n') + '\n');

run(`npx wrangler pages deploy dist/pages --project-name halalmode --branch ${branch} --commit-dirty=true`);
