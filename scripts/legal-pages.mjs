/**
 * Terms and Privacy as plain pages for halalmo.de/legal/terms and
 * /legal/privacy, from the same src/data/legalDocuments.ts the app shows, so
 * the website can link to them without shipping the app.
 */
const escape = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function legalPage(doc, other) {
  const otherLabel = other.slug === 'privacy' ? 'Read the Privacy Notice' : 'Read the Terms';
  const sections = doc.sections
    .map((section) => `<h2>${escape(section.heading)}</h2>\n${section.body.map((line) => `<p>${escape(line)}</p>`).join('\n')}`)
    .join('\n');
  const attribution = doc.slug === 'privacy'
    ? '<p>Browser-based city names use a locally bundled GeoNames dataset. Your location is not sent to GeoNames. <a href="/licenses/geonames.html">GeoNames attribution and licence</a>.</p>'
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3">
<link rel="icon" type="image/png" href="/favicon.png?v=3">
<title>${escape(doc.title)} · Halal Mode</title>
<link rel="canonical" href="${escape(doc.url)}">
<style>
  :root { --ink:#0a0a0a; --soft:#3b3934; --faint:#6c6a65; --surface:#fcfcfb; }
  body { margin:0; background:var(--surface); color:var(--ink); font:16px/1.6 system-ui, sans-serif; }
  main { max-width:680px; margin:6vh auto; padding:0 16px 48px; }
  h1 { font-size:30px; margin-bottom:4px; } h2 { font-size:18px; margin-top:32px; }
  p { color:var(--soft); } .updated { color:var(--faint); font-size:14px; } a { color:var(--ink); }
</style>
</head>
<body><main>
<p><a href="/">Halal Mode</a></p>
<h1>${escape(doc.title)}</h1>
<p class="updated">Last updated ${escape(doc.updated)}</p>
<p>${escape(doc.intro)}</p>
${sections}
${attribution}
<p style="margin-top:40px"><a href="${escape(new URL(other.url).pathname)}">${otherLabel}</a> · <a href="/legal-notice">Legal notice</a></p>
</main></body>
</html>
`;
}

/**
 * Waitlist-only deploys publish no app: its old addresses go to the
 * homepage, and the Terms and Privacy addresses the app and database already
 * use go to the static pages.
 */
export function waitlistOnlyRedirects() {
  return [
    '/app/terms /legal/terms 301',
    '/app/privacy /legal/privacy 301',
    '/app / 302',
    '/app/* / 302',
    '',
  ].join('\n');
}
