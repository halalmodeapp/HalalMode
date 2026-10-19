import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Cloudflare Pages needs one rule per dynamic Expo Router page when static
 * output is enabled. Derive them from the route files so new dynamic pages do
 * not silently ship without a direct-link rule.
 */
export function findDynamicWebRoutes(appDirectory = 'app') {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.(?:tsx?|jsx?)$/.test(entry.name) && !/^_layout\./.test(entry.name)) files.push(path);
    }
  };
  visit(appDirectory);

  const routes = new Map();
  for (const file of files) {
    const route = relative(appDirectory, file)
      .split(sep)
      .join('/')
      .replace(/\.(?:tsx?|jsx?)$/, '');
    const segments = route.split('/').filter((segment) => !/^\(.*\)$/.test(segment));
    if (segments.at(-1) === 'index') segments.pop();
    if (!segments.some((segment) => /^\[[^\]]+\]$/.test(segment))) continue;

    const source = `/app/${segments.map((segment) => segment.replace(/^\[([^\]]+)\]$/, ':$1')).join('/')}`;
    const target = `/app/${segments.join('/')}`;
    const previous = routes.get(source);
    if (previous && previous.target !== target) {
      throw new Error(`Dynamic route collision: ${source} maps to both ${previous.target} and ${target}`);
    }
    routes.set(source, { source, target });
  }

  return [...routes.values()].sort((a, b) => b.source.length - a.source.length || a.source.localeCompare(b.source));
}

export function pagesRedirects(routes) {
  return `${routes.map(({ source, target }) => `${source} ${target} 200`).join('\n')}\n`;
}
