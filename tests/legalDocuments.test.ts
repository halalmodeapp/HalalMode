import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { LEGAL_DOCUMENTS, LEGAL_VERSION } from '../src/data/legalDocuments';
import { LEGAL_DOCUMENT_FALLBACKS } from '../src/lib/legalDocuments';
import { PRIVACY_URL, TERMS_URL } from '../src/lib/publicLinks';

const root = process.cwd();
const migrations = readdirSync(`${root}/supabase/migrations`).filter((name) => name.endsWith('.sql')).sort();
const read = (path: string) => readFileSync(`${root}/${path}`, 'utf8');

test('legal consent documents have explicit versions and HTTPS locations', () => {
  for (const document of Object.values(LEGAL_DOCUMENT_FALLBACKS)) {
    assert.match(document.version, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(document.url, /^https:\/\//);
  }
});

test('the app\'s links and fallbacks come from the documents themselves', () => {
  for (const slug of ['terms', 'privacy'] as const) {
    const doc = LEGAL_DOCUMENTS[slug];
    assert.equal(doc.url, `https://halalmo.de/legal/${slug}`);
    assert.equal(doc.updated, LEGAL_VERSION);
    assert.equal(LEGAL_DOCUMENT_FALLBACKS[slug].version, LEGAL_VERSION);
    assert.equal(LEGAL_DOCUMENT_FALLBACKS[slug].url, doc.url);
    assert.equal(LEGAL_DOCUMENT_FALLBACKS[slug].title, doc.title);
  }
  assert.equal(TERMS_URL, LEGAL_DOCUMENTS.terms.url);
  assert.equal(PRIVACY_URL, LEGAL_DOCUMENTS.privacy.url);
});

test('the version members accept in the database is the version of these words', () => {
  // The last migration to make documents current records what is accepted.
  const inserts = migrations
    .map((name) => read(`supabase/migrations/${name}`))
    .filter((sql) => /insert into halal_mode_private\.legal_document_registry/.test(sql));
  const latest = inserts.at(-1) ?? '';
  for (const slug of ['terms', 'privacy'] as const) {
    const row = new RegExp(`\\('${slug}', '(\\d{4}-\\d{2}-\\d{2})', '([^']+)'`).exec(latest);
    assert.ok(row, `the registry has a current ${slug} row`);
    assert.equal(row[1], LEGAL_VERSION, `${slug}: the database version is the text's version`);
    assert.equal(row[2], LEGAL_DOCUMENTS[slug].title, `${slug}: and its title`);
  }
});

test('the database sends members to the same address', () => {
  // The latest migration that sets the current documents' address.
  const setters = migrations
    .map((name) => read(`supabase/migrations/${name}`))
    .filter((sql) => /update halal_mode_private\.legal_document_registry\s+set url/.test(sql));
  assert.match(setters.at(-1) ?? '', /set url = 'https:\/\/halalmo\.de\/legal\/' \|\| document_type/);
});

test('every website page links the documents where they live', () => {
  const paths = Object.values(LEGAL_DOCUMENTS).map((doc) => new URL(doc.url).pathname);
  const footer = read('site/site-footer.js');
  for (const path of paths) assert.ok(footer.includes(`'${path}'`), `the footer links ${path}`);
  for (const page of ['site/legal-notice.html', 'site/delete-account.html']) {
    const html = read(page);
    const linked = [...html.matchAll(/href="(\/(?:app\/)?(?:legal\/)?(?:terms|privacy))"/g)].map((m) => m[1] ?? '');
    assert.ok(linked.length > 0, `${page} links the documents`);
    for (const href of linked) assert.ok(paths.includes(href), `${page}: ${href} is where the documents live`);
  }
});

test('the privacy notice says what a referral link shows, as the database does', () => {
  const text = LEGAL_DOCUMENTS.privacy.sections.flatMap((section) => section.body).join(' ');
  // public.referral_inviter answers anyone holding a code with the inviter's
  // first name, or their email address while they have no name.
  const latest = [...migrations].reverse().map((name) => read(`supabase/migrations/${name}`))
    .find((sql) => /create or replace function public\.referral_inviter\(/i.test(sql)) ?? '';
  assert.match(latest, /'email', case when v_name is null then v_email end/);
  assert.match(text, /referral link/i);
  assert.match(text, /email address/i);
  assert.match(text, /first name/i);
});
