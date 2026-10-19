/* The one footer for every halalmo.de page: the year, the public pages and the
 * contact address. Each page only places <footer data-site-footer> and styles
 * it; the words are translated by i18n.js, which runs after this script.
 * The app's sign-up screen draws the same footer (src/components/brand/SiteFooter.tsx)
 * from the same links in src/lib/publicLinks.ts. */
(function () {
  'use strict';
  var LINKS = [
    ['/how-it-works', 'navHow', 'How it works'],
    ['/refer', 'navRefer', 'Refer your friends'],
  ];
  var EMAIL = 'hello@halalmo.de';
  var here = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    if (text) node.textContent = text;
    return node;
  }

  document.querySelectorAll('[data-site-footer]').forEach(function (footer) {
    footer.textContent = '';
    var copy = el('span', { class: 'footer-copy' });
    copy.append('© ' + new Date().getFullYear() + ' ', el('span', { 'data-brand-name': '' }, 'Halal Mode'));
    var links = el('span', { class: 'footer-links' });
    LINKS.forEach(function (link) {
      if (link[0] === here) return;
      links.append(el('a', { href: link[0], 'data-i18n': link[1] }, link[2]), ' · ');
    });
    links.append(el('span', { 'data-i18n': 'questions' }, 'Questions?'), ' ', el('a', { href: 'mailto:' + EMAIL }, EMAIL));
    footer.append(copy, links);
  });
})();
