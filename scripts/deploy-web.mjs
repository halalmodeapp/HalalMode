/**
 * Publishes halalmo.de as one Cloudflare Pages deployment.
 *
 *   npm run deploy:web            -> live site, waitlist only (no app)
 *   npm run deploy:web -- app     -> live site with the app under /app (launch)
 *   npm run deploy:web -- preview -> https://app-preview.halalmode.pages.dev, with the app
 *
 * Waitlist-only is the default while the app is closed: the landing page,
 * /refer, How it works, and Terms and Privacy as plain pages, with every /app
 * address sent to the homepage. Nothing of the app is uploaded, so there is
 * nothing to find in the page source. Terms and Privacy are written to
 * /legal/terms and /legal/privacy in every mode.
 */
import { execFileSync, execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { legalPage, waitlistOnlyRedirects } from './legal-pages.mjs';
import { findDynamicWebRoutes, pagesRedirects } from './web-routes.mjs';

const mode = process.argv[2] ?? 'waitlist';
if (!['waitlist', 'app', 'preview'].includes(mode)) {
  throw new Error(`Unknown mode "${mode}". Use no argument (waitlist only), "app" or "preview".`);
}
const withApp = mode !== 'waitlist';
const branch = mode === 'preview' ? 'app-preview' : 'main';
const run = (command) => execSync(command, { stdio: 'inherit' });
const runFile = (file, args) => execFileSync(file, args, { stdio: 'inherit' });
const wranglerCli = resolve('site/node_modules/wrangler/bin/wrangler.js');
if (!existsSync(wranglerCli)) {
  throw new Error('Project-local Wrangler is missing. Run npm ci --prefix site before deploying.');
}
console.log(withApp
  ? `Deploying the site WITH the app under /app to ${branch}.`
  : 'Deploying the waitlist only: no app, /app addresses go to the homepage.');

// Keep the static waitlist and How it works page tied to the native catalogue.
run('npm run cards:count');
const tempRoot = mkdtempSync(join(tmpdir(), 'halalmode-pages-'));
const exportDir = join(tempRoot, 'expo');
const pagesDir = join(tempRoot, 'pages');

try {
  const skip = new Set(['node_modules', '.wrangler', 'package.json', 'package-lock.json', 'logo-effect-src.js', 'halftone-src.js', 'halftone-src.d.ts', 'scene-warp.d.ts']);
  cpSync('site', pagesDir, { recursive: true, filter: (path) => !skip.has(path.split(/[\\/]/).pop()) });

  const { TERMS, PRIVACY } = await import(pathToFileURL(resolve('src/data/legalDocuments.ts')).href);
  mkdirSync(join(pagesDir, 'legal'), { recursive: true });
  writeFileSync(join(pagesDir, 'legal', 'terms.html'), legalPage(TERMS, PRIVACY));
  writeFileSync(join(pagesDir, 'legal', 'privacy.html'), legalPage(PRIVACY, TERMS));

  if (withApp) {
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
    cpSync(exportDir, join(pagesDir, 'app'), { recursive: true });
    writeFileSync(join(pagesDir, '_redirects'), pagesRedirects(routes));
  } else {
    writeFileSync(join(pagesDir, '_redirects'), waitlistOnlyRedirects());
  }

  runFile(process.execPath, [wranglerCli, 'pages', 'deploy', pagesDir, '--project-name', 'halalmode', '--branch', branch, '--commit-dirty=true']);
} finally {
  // Only remove the exact unique temp directory created above, never project output.
  const tempParent = `${resolve(tmpdir())}${sep}`;
  const safeRoot = resolve(tempRoot);
  if (safeRoot.startsWith(tempParent) && dirname(safeRoot) === resolve(tmpdir()) && safeRoot.includes('halalmode-pages-')) {
    rmSync(safeRoot, { recursive: true, force: true });
  }
}
