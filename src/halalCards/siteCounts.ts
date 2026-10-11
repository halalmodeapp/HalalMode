import { CATALOGUE_COUNTS } from './content/index.ts';

/** Where the website reads the catalogue's numbers from. */
export const SITE_COUNTS_PATH = 'site/halal-cards-counts.js';

/**
 * The website's copy of CATALOGUE_COUNTS. halalmo.de is static, so this file
 * is generated (`npm run cards:strings`, and again by `npm run deploy:web`)
 * and site/i18n.js fills {{total}}, {{lab}}, {{scenarios}}, {{quizzes}},
 * {{stories}} and {{free}} from it. A test fails if it falls behind.
 */
export function siteCountsScript(counts: Record<string, number> = CATALOGUE_COUNTS): string {
  return [
    '// Generated from src/halalCards/content by `npm run cards:strings`. Do not edit.',
    `window.HalalCardsCounts = ${JSON.stringify(counts)};`,
    '',
  ].join('\n');
}
