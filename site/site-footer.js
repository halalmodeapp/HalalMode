/* The one footer for every halalmo.de page: the year, the public pages and the
 * contact address. Each page only places <footer data-site-footer> and styles
 * it; the words are translated by i18n.js, which runs after this script.
 * The app's sign-up screen draws the same footer (src/components/brand/SiteFooter.tsx)
 * from the same links in src/lib/publicLinks.ts. */
(function () {
  'use strict';
  const LINKS = [
    ['/how-it-works', 'navHow', 'How it works'],
    ['/refer', 'navRefer', 'Refer your friends'],
    // The form collects an email, a city and an age: what happens to them is
    // one tap away on every page.
    ['/legal/privacy', 'navPrivacy', 'Privacy Notice'],
    ['/legal/terms', 'navTerms', 'Terms of Service'],
  ];
  const EMAIL = 'hello@halalmo.de';
  const here = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';

  function el(tag, attrs, text) {
    const node = document.createElement(tag);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (text) node.textContent = text;
    return node;
  }

  document.querySelectorAll('[data-site-footer]').forEach(function (footer) {
    footer.textContent = '';
    const copy = el('span', { class: 'footer-copy' });
    copy.append('© ' + new Date().getFullYear() + ' ', el('span', { 'data-brand-name': '' }, 'Halal Mode'));
    const links = el('span', { class: 'footer-links' });
    LINKS.forEach(function (link) {
      if (link[0] === here) return;
      links.append(el('a', { href: link[0], 'data-i18n': link[1] }, link[2]), ' · ');
    });
    links.append(el('span', { 'data-i18n': 'questions' }, 'Questions?'), ' ', el('a', { href: 'mailto:' + EMAIL }, EMAIL));
    footer.append(copy, links);
  });
})();
