/**
 * Writes site/img/get-app-qr.svg: a QR code for https://halalmo.de/get, the
 * page that sends each phone to its own app store. The invite page shows it
 * on computers. Run again only if the address changes:
 *   node scripts/make-get-app-qr.mjs
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { toQR } = require('toqr');

const URL_TO_ENCODE = 'https://halalmo.de/get';
const modules = toQR(URL_TO_ENCODE);
const size = Math.round(Math.sqrt(modules.length));
if (size * size !== modules.length) throw new Error('Unexpected QR matrix size');

const quiet = 4;
const full = size + quiet * 2;
let path = '';
for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    if (modules[y * size + x]) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges" role="img" aria-label="QR code for ${URL_TO_ENCODE}"><rect width="${full}" height="${full}" fill="#fff"/><path d="${path}" fill="#0A0A0A"/></svg>\n`;
writeFileSync('site/img/get-app-qr.svg', svg);
console.log(`Wrote site/img/get-app-qr.svg (${size}x${size} modules) for ${URL_TO_ENCODE}`);
