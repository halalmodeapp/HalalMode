/* Where a waitlist visitor came from, kept with their sign-up so the admin
 * panel can show which ads and posts bring people in. The label comes from,
 * in order: utm_source/utm_medium/utm_campaign on the link; the campaign
 * address they landed on (halalmo.de/waitlist is the Reddit ad, /x the link
 * in our own X posts, /waitlistx the paused X ad); or the site
 * that sent them. It is read when the page opens and kept in memory only:
 * nothing is stored in the browser, so no consent banner is needed.
 * Mirrors the shape public.join_waitlist_now() accepts in
 * supabase/migrations/20261022120000_waitlist_country_and_source.sql
 * (lower-case letters, digits and . _ ~ : / -, at most 80 characters); keep
 * the two in step. Campaign addresses must match scripts/campaign-links.mjs. */
(function (root) {
  const CAMPAIGN_PATHS = {
    '/waitlist': 'reddit/paid/waitlist',
    '/x': 'x/organic',
    '/waitlistx': 'x/paid/waitlist'
  };

  function clean(value, max) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9._~-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);
  }

  function build(search, referrer, ownHost, pathname) {
    const params = new URLSearchParams(search || '');
    const parts = ['utm_source', 'utm_medium', 'utm_campaign'].map(function (k) { return clean(params.get(k), 24); });
    if (parts[0]) return parts.filter(Boolean).join('/').slice(0, 80);
    const path = String(pathname || '').toLowerCase().replace(/\/+$/, '') || '/';
    if (Object.prototype.hasOwnProperty.call(CAMPAIGN_PATHS, path)) return CAMPAIGN_PATHS[path];
    let host = '';
    try { host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, ''); } catch (_) { /* no referrer */ }
    const own = String(ownHost || '').toLowerCase().replace(/^www\./, '');
    if (host && host !== own && /^[a-z0-9.-]{1,60}$/.test(host)) return 'ref:' + host;
    return '';
  }

  // The label for this visit, read from the page's own address and referrer.
  function current(win) {
    return build(win.location.search, win.document.referrer, win.location.hostname, win.location.pathname);
  }

  root.HalalWaitlistSource = { build: build, current: current, CAMPAIGN_PATHS: CAMPAIGN_PATHS };
})(typeof window !== 'undefined' ? window : this);
