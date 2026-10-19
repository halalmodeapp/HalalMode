/**
 * Publishes halalmo.de: the landing page from site/ at the root and the app
 * under /app, as one Cloudflare Pages deployment.
 *
 *   npm run deploy:web            -> live site (halalmo.de)
 *   npm run deploy:web -- preview -> https://app-preview.halalmode.pages.dev
 */
import { execFileSync, execSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { findDynamicWebRoutes, pagesRedirects } from './web-routes.mjs';

const branch = process.argv[2] === 'preview' ? 'app-preview' : 'main';
const run = (command) => execSync(command, { stdio: 'inherit' });
const runFile = (file, args) => execFileSync(file, args, { stdio: 'inherit' });
const wranglerCli = resolve('site/node_modules/wrangler/bin/wrangler.js');
if (!existsSync(wranglerCli)) {
  throw new Error('Project-local Wrangler is missing. Run npm ci --prefix site before deploying.');
}

// Keep the static waitlist and How it works page tied to the native catalogue.
run('npm run cards:count');
const tempRoot = mkdtempSync(join(tmpdir(), 'halalmode-pages-'));
const exportDir = join(tempRoot, 'expo');
const pagesDir = join(tempRoot, 'pages');

try {
  // Keep deploy builds isolated from dist/ and preserve any existing output.
  run(`npx expo export --platform web --output-dir "${exportDir}" --clear`);

  const routes = findDynamicWebRoutes('app');
  const missing = routes.filter(({ target }) => {
    const routeFile = target.replace(/^\/app\//, '');
    return ![
      join(exportDir, `${routeFile}.html`),
      join(exportDir, routeFile, 'index.html'),
    ].some(existsSync);
  });
  if (missing.length) {
    throw new Error(`Expo static export is missing dynamic pages: ${missing.map((route) => route.target).join(', ')}`);
  }

  const skip = new Set(['node_modules', '.wrangler', 'package.json', 'package-lock.json', 'logo-effect-src.js', 'halftone-src.js', 'halftone-src.d.ts', 'scene-warp.d.ts']);
  cpSync('site', pagesDir, { recursive: true, filter: (path) => !skip.has(path.split(/[\\/]/).pop()) });
  cpSync(exportDir, join(pagesDir, 'app'), { recursive: true });
  writeFileSync(join(pagesDir, '_redirects'), pagesRedirects(routes));

  runFile(process.execPath, [wranglerCli, 'pages', 'deploy', pagesDir, '--project-name', 'halalmode', '--branch', branch, '--commit-dirty=true']);
} finally {
  // Only remove the exact unique temp directory created above, never project output.
  const tempParent = `${resolve(tmpdir())}${sep}`;
  const safeRoot = resolve(tempRoot);
  if (safeRoot.startsWith(tempParent) && dirname(safeRoot) === resolve(tmpdir()) && safeRoot.includes('halalmode-pages-')) {
    rmSync(safeRoot, { recursive: true, force: true });
  }
}
