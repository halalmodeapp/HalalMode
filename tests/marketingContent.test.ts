import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

import { ALL_ACTIVITIES, HALAL_CARDS_ACTIVITY_COUNT } from '../src/halalCards/content';
import { en, ar } from '../src/i18n/catalog';
import { am } from '../src/i18n/catalogs/am';
import { bn } from '../src/i18n/catalogs/bn';
import { es } from '../src/i18n/catalogs/es';
import { fa } from '../src/i18n/catalogs/fa';
import { fr } from '../src/i18n/catalogs/fr';
import { ha } from '../src/i18n/catalogs/ha';
import { hi } from '../src/i18n/catalogs/hi';
import { id } from '../src/i18n/catalogs/id';
import { ms } from '../src/i18n/catalogs/ms';
import { ru } from '../src/i18n/catalogs/ru';
import { so } from '../src/i18n/catalogs/so';
import { tr } from '../src/i18n/catalogs/tr';
import { ur } from '../src/i18n/catalogs/ur';
import { zhHans } from '../src/i18n/catalogs/zh-Hans';
import { brandNameFor, premiumWordFor, type BrandNameLocale } from '../src/i18n/brandName';

const root = process.cwd();
const languages = ['en', 'ar', 'ur', 'fa', 'hi', 'id', 'ms', 'bn', 'fr', 'tr', 'ha', 'am', 'so', 'es', 'ru', 'zh-Hans'];

function websiteCopy(language: string, pathname = '/how-it-works') {
  const source = readFileSync(`${root}/site/i18n.js`, 'utf8');
  const body = { textContent: `${HALAL_CARDS_ACTIVITY_COUNT} guided quizzes and activities` };
  const brand = { textContent: 'Halal Mode' };
  const logoImage = {
    label: 'Halal Mode',
    setAttribute(_name: string, value: string) { this.label = value; },
  };
  const logoLink = {
    label: 'Halal Mode',
    setAttribute(_name: string, value: string) { this.label = value; },
    querySelector: (_selector: string) => logoImage,
  };
  const document = {
    title: '',
    documentElement: { dataset: { activityCount: String(HALAL_CARDS_ACTIVITY_COUNT) }, lang: 'en', dir: 'ltr' },
    querySelector: (selector: string) => selector === '[data-i18n="cardsBody"]' ? body : null,
    querySelectorAll: (selector: string) => {
      if (selector === '[data-brand-name]') return [brand];
      if (selector === '[data-brand-name-aria]') return [logoLink];
      return [];
    },
    getElementById: () => null,
  };
  const window = { location: { search: `?lang=${encodeURIComponent(language)}` }, HalalI18n: undefined as undefined | { t: (key: string) => string } };
  runInNewContext(source, {
    window,
    document,
    location: { pathname },
    localStorage: { getItem: () => null, setItem: () => {} },
    URLSearchParams,
  });
  if (!window.HalalI18n) throw new Error('Website translations did not initialize');
  return {
    title: window.HalalI18n.t('cardsTitle'),
    body: window.HalalI18n.t('cardsBody'),
    documentTitle: document.title,
    footerBrand: brand.textContent,
    logoLabel: logoLink.label,
    logoAlt: logoImage.label,
    brandCopy: ['heroIntro', 'privacy', 'thanks', 'howTitle'].map((key) => window.HalalI18n!.t(key)),
    t: (key: string) => window.HalalI18n!.t(key),
  };
}

test('written brand names use native-script phonetic spellings outside the English wordmark', () => {
  const catalogs: [BrandNameLocale, Record<string, string>][] = [
    ['en', en], ['ar', ar], ['ur', ur], ['fa', fa], ['hi', hi], ['id', id],
    ['ms', ms], ['bn', bn], ['fr', fr], ['tr', tr], ['ha', ha], ['am', am],
    ['so', so], ['es', es], ['ru', ru], ['zh-Hans', zhHans],
  ];
  const nativeScriptLocales: BrandNameLocale[] = ['ar', 'ur', 'fa', 'hi', 'bn', 'am', 'ru', 'zh-Hans'];
  for (const locale of nativeScriptLocales) {
    const name = brandNameFor(locale);
    const catalog = catalogs.find(([code]) => code === locale)?.[1];
    if (!catalog) throw new Error(`${locale} app catalog is missing`);
    const premiumName = catalog['settings.premium'];
    if (!premiumName) throw new Error(`${locale} Premium brand string is missing`);
    assert.ok(Object.values(catalog).some((message) => message.includes(name)), `${locale} uses its brand spelling`);
    assert.ok(premiumName.startsWith(name), `${locale} Premium name starts with its brand spelling`);
    assert.ok(premiumName.includes(premiumWordFor(locale)), `${locale} Premium suffix is transliterated`);
    for (const [key, message] of Object.entries(catalog)) {
      assert.doesNotMatch(message, /Halal Mode/i, `${locale}.${key} does not leave the English brand in translated copy`);
    }
  }

  for (const language of languages) {
    const locale = language as BrandNameLocale;
    const waitlist = websiteCopy(language, '/');
    const howItWorks = websiteCopy(language);
    const name = brandNameFor(locale);
    assert.equal(waitlist.footerBrand, name, `${language} waitlist footer`);
    assert.equal(waitlist.logoLabel, name, `${language} waitlist logo pronunciation`);
    assert.equal(waitlist.logoAlt, name, `${language} waitlist logo alt text`);
    assert.ok(waitlist.documentTitle.includes(name), `${language} waitlist title`);
    assert.equal(howItWorks.footerBrand, name, `${language} How it works footer`);
    assert.equal(howItWorks.logoLabel, name, `${language} How it works logo pronunciation`);
    assert.equal(howItWorks.logoAlt, name, `${language} How it works logo alt text`);
    assert.ok(howItWorks.documentTitle.includes(name), `${language} How it works title`);
    if (nativeScriptLocales.includes(locale)) {
      for (const message of [...waitlist.brandCopy, ...howItWorks.brandCopy]) {
        assert.doesNotMatch(message, /Halal Mode/i, `${language} public-site copy uses the local-script brand`);
      }
    }
  }

  for (const file of ['site/index.html', 'site/how-it-works.html']) {
    const html = readFileSync(`${root}/${file}`, 'utf8');
    assert.match(html, /aria-label="Halal Mode"[^>]*><img[^>]+alt="Halal Mode"/, `${file} keeps the one English logo`);
  }
});

test('Halal Cards marketing copy is complete in all sixteen native languages', () => {
  const catalogs = [en, ar, ur, fa, hi, id, ms, bn, fr, tr, ha, am, so, es, ru, zhHans];
  assert.equal(catalogs.length, languages.length);
  for (const [index, catalog] of catalogs.entries()) {
    const title = catalog['marketing.cardsTitle'];
    const body = catalog['marketing.cardsBody'];
    assert.ok(title.trim(), `${languages[index]} has a title`);
    assert.ok(body.includes('{{count}}'), `${languages[index]} includes the generated activity count`);
    assert.ok(body.includes('{{languages}}'), `${languages[index]} includes the supported language count`);
    assert.equal(body.includes('35'), false, `${languages[index]} does not freeze the current count`);
  }
});

test('membership lookup failure stays distinct from a free tier in every app language', () => {
  const catalogs = [en, ar, am, bn, es, fa, fr, ha, hi, id, ms, ru, so, tr, ur, zhHans];
  assert.equal(catalogs.length, languages.length);
  for (const [index, catalog] of catalogs.entries()) {
    const message = catalog['settings.membershipLoadError'];
    assert.ok(message.trim(), `${languages[index]} has a translated membership failure`);
    assert.doesNotMatch(message, /\{\{|undefined|NaN/);
  }
});

test('the bot recap stays a neutral summary and leaves conversation starters to chat', () => {
  const catalogs = [en, ar, ur, fa, hi, id, ms, bn, fr, tr, ha, am, so, es, ru, zhHans];
  for (const [index, catalog] of catalogs.entries()) {
    assert.equal('recap.start' in catalog, false, `${languages[index]} removes the redundant start-here label`);
    assert.ok(catalog['recap.body'].trim(), `${languages[index]} has a private overview description`);
    assert.ok(catalog['recap.summaryDiscuss'].includes('{{topics}}'), `${languages[index]} keeps the topic placeholder`);
  }
  assert.equal(en['recap.body'], 'A private overview of where your answers align and differ.');
  assert.equal(en['recap.summaryDiscuss'], 'Your answers differ on {{topics}}.');

  const prompt = readFileSync(`${root}/supabase/functions/connection-summary/index.ts`, 'utf8');
  assert.match(prompt, /Do not write conversation questions, chat openers, discussion prompts/);
  assert.doesNotMatch(prompt, /gentle prompts rather than problems/);
});

test('How it works ships readable, generated-count fallback copy', () => {
  assert.equal(HALAL_CARDS_ACTIVITY_COUNT, ALL_ACTIVITIES.length);
  for (const file of ['site/how-it-works.html']) {
    const html = readFileSync(`${root}/${file}`, 'utf8');
    assert.match(html, new RegExp(`<html\\b[^>]*data-activity-count="${HALAL_CARDS_ACTIVITY_COUNT}"`), file);
    assert.match(html, new RegExp(`<p[^>]*data-i18n="cardsBody">Halal Cards give you practical tools for a healthy, lasting marriage: ${HALAL_CARDS_ACTIVITY_COUNT} interactive quizzes`), file);
    assert.doesNotMatch(html, /activity-count\.js|\{\{count\}\}|\{\{languages\}\}/, file);
  }
});

test('waitlist and auth home surfaces use a compact How it works action, not the full blurb', () => {
  const waitlist = readFileSync(`${root}/site/index.html`, 'utf8');
  const howItWorks = readFileSync(`${root}/site/how-it-works.html`, 'utf8');
  assert.doesNotMatch(waitlist, /cardsTitle|cardsBody|Halal Cards\. Learn and play together/);
  assert.match(waitlist, /href="\/how-it-works"><span data-i18n="navHow">/);
  // One footer for every public page, written by site/site-footer.js.
  for (const page of ['index', 'how-it-works', 'refer']) {
    const html = readFileSync(`${root}/site/${page}.html`, 'utf8');
    assert.match(html, /<footer[^>]*data-site-footer><\/footer>/, `${page} uses the shared footer`);
    assert.match(html, /src="\/site-footer\.js[^"]*"><\/script>\s*<script src="\/i18n\.js/, `${page} fills the footer before translating`);
  }
  for (const image of ['introductions', 'privacy', 'conversation', 'halal-cards']) {
    assert.match(howItWorks, new RegExp(`src="/img/how-it-works/${image}\\.webp"`));
  }
  assert.match(howItWorks, /@media\(max-width:1120px\).*repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(howItWorks, /@media\(max-width:680px\).*grid-template-columns:minmax\(0,1fr\)/s);
  assert.match(howItWorks, /prefers-reduced-motion:reduce/);
  for (const file of ['app/auth.tsx', 'app/auth-email.tsx']) {
    const source = readFileSync(`${root}/${file}`, 'utf8');
    assert.doesNotMatch(source, /marketing\.cards(?:Title|Body)/);
    // Every public screen uses the one shared link button.
    assert.match(source, /<(?:PublicLinks|LinkPill)/, `${file} uses the shared link button`);
  }
  const pills = readFileSync(`${root}/src/components/brand/LinkPill.tsx`, 'utf8');
  assert.match(pills, /t\('marketing\.howItWorks'\)/);
  assert.match(pills, /howItWorksUrl\(language\)/);
  assert.match(pills, /referUrl\(language\)/);
});

test('public-site crawler metadata points to only the canonical marketing routes', () => {
  const waitlist = readFileSync(`${root}/site/index.html`, 'utf8');
  const howItWorks = readFileSync(`${root}/site/how-it-works.html`, 'utf8');
  const refer = readFileSync(`${root}/site/refer.html`, 'utf8');
  const robots = readFileSync(`${root}/site/robots.txt`, 'utf8');
  const sitemap = readFileSync(`${root}/site/sitemap.xml`, 'utf8');
  assert.match(waitlist, /<link rel="canonical" href="https:\/\/halalmo\.de\/">/);
  assert.match(howItWorks, /<link rel="canonical" href="https:\/\/halalmo\.de\/how-it-works">/);
  assert.match(refer, /<link rel="canonical" href="https:\/\/halalmo\.de\/refer">/);
  assert.match(
    robots,
    /^User-agent: \*\nAllow: \/\n# The app is not open yet; only the waitlist pages should be found\.\nDisallow: \/app\/\n\nSitemap: https:\/\/halalmo\.de\/sitemap\.xml\n$/
  );
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]), [
    'https://halalmo.de/',
    'https://halalmo.de/how-it-works',
    'https://halalmo.de/refer',
  ]);
});

test('website Halal Cards title and body have a non-empty translation for all sixteen locales', () => {
  const english = websiteCopy('en');
  for (const language of languages) {
    const translated = websiteCopy(language);
    assert.ok(translated.title.trim(), `${language} has a title`);
    assert.ok(translated.body.includes(String(HALAL_CARDS_ACTIVITY_COUNT)), `${language} carries the current count`);
    assert.ok(translated.body.includes('16'), `${language} carries the current language count`);
    assert.doesNotMatch(translated.body, /\{\{|NaN|undefined/);
    if (language !== 'en') assert.notEqual(translated.body, english.body, `${language} is not silently falling back to English`);
  }
});

test('auth and native waitlist surfaces use a compact How it works action', () => {
  for (const file of ['app/auth.tsx', 'app/auth-email.tsx']) {
    const source = readFileSync(`${root}/${file}`, 'utf8');
    assert.doesNotMatch(source, /marketing\.cards(?:Title|Body)/);
    // Every public screen uses the one shared link button.
    assert.match(source, /<(?:PublicLinks|LinkPill)/, `${file} uses the shared link button`);
  }
  const pills = readFileSync(`${root}/src/components/brand/LinkPill.tsx`, 'utf8');
  assert.match(pills, /t\('marketing\.howItWorks'\)/);
  assert.match(pills, /howItWorksUrl\(language\)/);
  assert.match(pills, /referUrl\(language\)/);
  const emailAuth = readFileSync(`${root}/app/auth-email.tsx`, 'utf8');
  assert.match(emailAuth, /const \{ language \} = useSession\(\)/);
  assert.match(emailAuth, /style=\{styles\.topRow\}/);
  for (const file of ['app/auth.tsx', 'app/auth-email.tsx']) {
    const source = readFileSync(`${root}/${file}`, 'utf8');
    assert.match(source, /import Head from 'expo-router\/head'/);
    assert.match(source, /<title>/);
  }
});

test('the sign-up screen speaks with the waitlist page words in every language', () => {
  const catalogs: [string, Record<string, string>][] = [
    ['en', en], ['ar', ar], ['ur', ur], ['fa', fa], ['hi', hi], ['id', id],
    ['ms', ms], ['bn', bn], ['fr', fr], ['tr', tr], ['ha', ha], ['am', am],
    ['so', so], ['es', es], ['ru', ru], ['zh-Hans', zhHans],
  ];
  const same: [string, string][] = [
    ['auth.heroTitle', 'heroTitle'],
    ['marketing.howItWorks', 'navHow'],
    ['marketing.refer', 'navRefer'],
    ['marketing.questions', 'questions'],
    ['onboarding.privacyLink', 'navPrivacy'],
    ['onboarding.termsLink', 'navTerms'],
  ];
  for (const [language, catalog] of catalogs) {
    const site = websiteCopy(language, '/');
    for (const [app, web] of same) assert.equal(catalog[app], site.t(web), `${language}: ${app}`);
    assert.equal(catalog['auth.heroIntro'], `${site.t('heroIntro')} ${site.t('heroBold')}`.trim(), `${language}: auth.heroIntro`);
  }
});

test('there is no launch switch: the app is after-launch copy, the waitlist site before-launch', () => {
  assert.equal(Object.keys(en).filter((key) => key.endsWith('Launched')).length, 0);
  const site = readFileSync(`${root}/site/i18n.js`, 'utf8');
  assert.doesNotMatch(site, /Launched:|launch_state/);
});
