// Relationship Challenge Claude: writes the flat SVG placeholders and the
// static require() map Metro needs, both from the scene manifest, so canvas
// sizes and anchors can never drift from what the runtime and the Codex
// handoff say.
//
//   node scripts/relationship-challenge-claude/build-placeholders.mjs
//
// Placeholders are deliberately plain: flat shapes in the Halal Mode palette,
// no text (the dev-only label is drawn by the app, never baked in).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RC_ASSETS, canvasOf } from '../../src/halalCards/relationshipChallengeClaude/scene.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const P = {
  cream: '#F3E6CF',
  plaster: '#EFDCBF',
  plasterShade: '#E4CDA8',
  oak: '#C99A62',
  oakDark: '#A97B47',
  walnut: '#6E4A30',
  walnutDark: '#573823',
  cobalt: '#2E4E9E',
  cobaltDark: '#22397A',
  navy: '#1B2852',
  tealNight: '#1E3A4C',
  tealNightDark: '#162C3B',
  terracotta: '#C5643C',
  terracottaDark: '#9E4C2C',
  olive: '#7C8A3E',
  oliveDark: '#5E6B2C',
  mustard: '#D7A43A',
  rose: '#D89A98',
  roseDeep: '#B26A72',
  pink: '#FC3C6C',
  sky: '#CFE3EE',
  skyNight: '#24386E',
  brass: '#C9A45A',
  ink: '#2A2622',
  white: '#FBF7EF',
};

const rect = (x, y, w, h, fill, rx = 0, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;

const leafPath = (cx, cy, s, fill) =>
  path(`M${cx} ${cy - s} C ${cx + s * 0.75} ${cy - s * 0.4}, ${cx + s * 0.6} ${cy + s * 0.6}, ${cx} ${cy + s} C ${cx - s * 0.6} ${cy + s * 0.6}, ${cx - s * 0.75} ${cy - s * 0.4}, ${cx} ${cy - s} Z`, fill);
const archPath = (x, y, w, h, fill) => path(`M${x} ${y + h} V${y + w / 2} A ${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`, fill);
const cupShape = (cx, cy, s, fill) =>
  path(`M${cx - s * 0.55} ${cy - s * 0.6} H${cx + s * 0.55} L${cx + s * 0.4} ${cy + s * 0.6} H${cx - s * 0.4} Z`, fill) +
  ellipse(cx, cy + s * 0.68, s * 0.62, s * 0.14, P.brass);

function plate(night) {
  const wall = night ? P.tealNight : P.plaster;
  const wallShade = night ? P.tealNightDark : P.plasterShade;
  const floor = night ? P.walnut : P.oak;
  const plank = night ? P.walnutDark : P.oakDark;
  let planks = '';
  for (let y = 470; y < 1500; y += 90) planks += rect(0, y, 1000, 3, plank, 0, 'opacity="0.35"');
  return (
    rect(0, 0, 1000, 430, wall) +
    rect(0, 395, 1000, 35, wallShade) +
    rect(0, 425, 1000, 12, P.terracotta) +
    rect(0, 437, 1000, 1063, floor) +
    planks +
    // The entry door, part of the architecture.
    rect(925, 150, 70, 280, night ? P.walnutDark : P.oakDark, 4) +
    circle(938, 300, 4, P.brass)
  );
}

function windowArt(night) {
  const sky = night ? P.skyNight : P.sky;
  const curtain = night ? P.roseDeep : P.rose;
  return (
    archPath(20, 10, 260, 280, P.cream) +
    archPath(38, 28, 224, 252, sky) +
    (night
      ? circle(200, 90, 22, P.cream) + circle(210, 84, 20, sky) +
        [60, 95, 140, 175, 230].map((x, i) => rect(x, 225 - (i % 2) * 14, 6, 6, P.mustard)).join('')
      : rect(38, 220, 224, 60, '#E6D2AE') + rect(170, 150, 8, 80, P.oliveDark) + ellipse(174, 150, 34, 14, P.olive)) +
    rect(146, 28, 8, 252, P.cream) +
    path('M20 140 Q 10 220 40 290 L 0 290 L 0 140 Z', curtain) +
    path('M280 140 Q 290 220 260 290 L 300 290 L 300 140 Z', curtain) +
    rect(10, 285, 280, 15, P.cream, 3)
  );
}

function rug() {
  return (
    rect(20, 20, 680, 480, P.terracotta, 10) +
    rect(50, 50, 620, 420, P.cream, 6) +
    rect(90, 90, 540, 340, P.cobalt, 4) +
    rect(130, 130, 460, 260, P.rose, 4) +
    [0, 1, 2, 3, 4, 5, 6, 7].map((i) => rect(4, 50 + i * 55, 16, 6, P.cream)).join('') +
    [0, 1, 2, 3, 4, 5, 6, 7].map((i) => rect(700, 50 + i * 55, 16, 6, P.cream)).join('')
  );
}

function shelf() {
  return (
    rect(0, 40, 340, 40, P.oakDark, 6) +
    rect(10, 70, 320, 170, P.oak, 6) +
    archPath(40, 100, 110, 120, P.oakDark) +
    archPath(190, 100, 110, 120, P.oakDark) +
    rect(20, 238, 20, 12, P.walnut) +
    rect(300, 238, 20, 12, P.walnut)
  );
}

function plant() {
  return (
    path('M60 240 H140 L128 316 H72 Z', P.terracotta) +
    rect(54, 232, 92, 14, P.terracottaDark, 4) +
    leafPath(100, 70, 60, P.olive) +
    leafPath(55, 130, 48, P.oliveDark) +
    leafPath(148, 125, 50, P.olive) +
    leafPath(80, 190, 40, P.oliveDark) +
    leafPath(128, 190, 42, P.olive)
  );
}

function coffeeTable() {
  return rect(10, 20, 420, 200, P.oakDark, 28) + rect(20, 10, 400, 196, P.oak, 26);
}

function sofa(night) {
  return (
    rect(0, 60, 660, 240, P.cobaltDark, 40) +
    rect(30, 20, 600, 120, P.cobalt, 34) +
    rect(0, 80, 70, 200, P.cobalt, 30) +
    rect(590, 80, 70, 200, P.cobalt, 30) +
    rect(110, 40, 120, 80, P.mustard, 18) +
    rect(430, 40, 120, 80, P.rose, 18) +
    (night ? rect(560, 70, 100, 170, P.cream, 16) + rect(560, 120, 100, 18, P.terracotta) + rect(560, 170, 100, 18, P.terracotta) : '')
  );
}

function lamp(on) {
  return (
    ellipse(75, 270, 70, 26, P.walnut) +
    rect(65, 180, 20, 90, P.walnutDark) +
    ellipse(75, 180, 44, 16, P.walnut) +
    path('M55 175 Q 75 110 95 175 Z', P.terracotta) +
    rect(70, 70, 10, 60, P.brass) +
    path('M30 80 H120 L106 10 H44 Z', on ? '#F6CB6E' : P.cream) +
    (on ? circle(75, 46, 13, P.terracottaDark) + circle(81, 42, 12, '#F6CB6E') : '')
  );
}

function leafVase() {
  return (
    path('M30 60 C 0 100, 10 165, 55 168 C 100 165, 110 100, 80 60 Z', P.cream) +
    rect(40, 40, 30, 24, P.cream, 6) +
    path('M50 40 C 40 10, 30 0, 22 0', 'none', `stroke="${P.oakDark}" stroke-width="3"`) +
    path('M60 40 C 70 12, 82 2, 92 0', 'none', `stroke="${P.oakDark}" stroke-width="3"`) +
    [22, 44, 66, 88].map((x) => leafPath(x, 115, 10, P.olive)).join('')
  );
}

function bookStack() {
  return rect(5, 52, 110, 24, P.terracotta, 3) + rect(14, 30, 96, 22, P.cobalt, 3) + rect(8, 8, 104, 22, P.mustard, 3);
}

function framedPrint() {
  return (
    rect(0, 0, 220, 240, P.oakDark, 4) +
    rect(14, 14, 192, 212, P.cream) +
    archPath(30, 60, 46, 140, P.cobalt) +
    archPath(87, 60, 46, 140, P.terracotta) +
    archPath(144, 60, 46, 140, P.mustard)
  );
}

function tray(evening) {
  return (
    ellipse(95, 65, 92, 62, P.brass) +
    ellipse(95, 65, 80, 52, '#DDBB72') +
    (evening
      ? ellipse(70, 60, 26, 22, P.cobalt) + rect(64, 34, 12, 10, P.cobalt) + cupShape(120, 48, 14, P.rose) + cupShape(140, 80, 14, P.rose)
      : cupShape(62, 48, 16, P.white) + cupShape(128, 48, 16, P.white) + ellipse(95, 92, 26, 12, P.terracotta) + circle(86, 90, 5, P.walnut) + circle(102, 92, 5, P.walnut))
  );
}

function box(open) {
  return open
    ? rect(15, 50, 110, 55, P.walnut, 6) + rect(15, 6, 110, 40, P.oakDark, 6) + rect(28, 56, 84, 30, P.cream, 3) + rect(56, 92, 28, 10, P.brass, 2)
    : rect(15, 25, 110, 80, P.walnut, 8) + rect(22, 30, 96, 40, P.oakDark, 6) + rect(40, 42, 60, 16, P.mustard, 4) + rect(46, 80, 48, 16, P.brass, 3);
}

function envelope() {
  return (
    rect(30, 6, 60, 70, P.white, 4, 'transform="rotate(-12 60 40)"') +
    rect(60, 6, 60, 70, P.white, 4, 'transform="rotate(10 90 40)"') +
    rect(10, 34, 130, 72, P.cream, 6) +
    path('M10 34 L75 78 L140 34 Z', P.plasterShade) +
    circle(75, 74, 10, P.terracotta)
  );
}

function fgPlant() {
  return (
    leafPath(200, 140, 110, P.oliveDark) +
    leafPath(110, 240, 90, P.olive) +
    leafPath(220, 280, 90, P.olive) +
    leafPath(60, 330, 60, P.oliveDark) +
    path('M180 330 H260 V360 H170 Z', P.terracotta)
  );
}

function character(kind, pose) {
  const husband = kind === 'husband';
  const body = husband ? P.cobaltDark : P.terracotta;
  const head = husband ? '#B98058' : P.rose;
  const lean = pose === 'noticing' ? 'transform="rotate(-6 75 330)"' : '';
  let arms = '';
  if (pose === 'idle') arms = rect(14, 120, 18, 110, body, 9) + rect(118, 120, 18, 110, body, 9);
  if (pose === 'noticing') arms = rect(14, 120, 18, 110, body, 9) + rect(104, 70, 18, 90, body, 9, 'transform="rotate(-25 113 120)"');
  if (pose === 'interacting') arms = rect(14, 120, 18, 110, body, 9) + rect(110, 140, 18, 90, body, 9, 'transform="rotate(-70 119 150)"');
  if (pose === 'celebrating') arms = rect(30, 110, 18, 80, body, 9, 'transform="rotate(35 39 110)"') + rect(100, 110, 18, 80, body, 9, 'transform="rotate(-35 109 110)"');
  const legs = husband ? rect(42, 240, 28, 86, P.navy, 8) + rect(80, 240, 28, 86, P.navy, 8) : '';
  const torso = husband ? rect(30, 100, 90, 150, body, 26) + rect(60, 100, 30, 34, P.cream, 8) : path('M38 100 H112 L136 326 H14 Z', body);
  const face = husband ? ellipse(75, 58, 30, 36, head) + path('M48 62 Q 75 104 102 62 Q 96 92 75 96 Q 54 92 48 62 Z', P.ink) : ellipse(75, 60, 40, 44, head) + ellipse(75, 64, 24, 28, '#C99068');
  return `<g ${lean}>${legs}${torso}${arms}${face}${ellipse(75, 326, 46, 6, 'rgba(0,0,0,0.12)')}</g>`;
}

function clueCard(note) {
  return note
    ? rect(10, 10, 580, 360, P.white, 8) + rect(10, 185, 580, 3, P.plasterShade)
    : rect(10, 10, 580, 360, P.cream, 10) + rect(24, 24, 552, 332, 'none', 8, `stroke="${P.terracotta}" stroke-width="4"`);
}

function token(motif) {
  if (motif === 'leaf') return leafPath(60, 60, 44, P.olive);
  if (motif === 'arch') return archPath(32, 14, 56, 92, P.cobalt);
  return cupShape(60, 60, 36, P.terracotta);
}

function destinationCard() {
  return rect(6, 6, 288, 408, P.cream, 18) + rect(6, 6, 288, 408, 'none', 18, `stroke="${P.cobalt}" stroke-width="5"`) + rect(30, 30, 240, 160, P.plasterShade, 8);
}

function vignette(id) {
  const ground = { park_loop: P.olive, cafe_terrace: P.terracotta, tea_at_home: P.plaster, bookshop: P.oak }[id];
  const sky = id === 'tea_at_home' || id === 'bookshop' ? P.plasterShade : P.skyNight;
  let art = rect(0, 0, 240, 160, sky) + rect(0, 110, 240, 50, ground);
  if (id === 'park_loop') art += path('M0 150 Q 120 100 240 140 L240 160 L0 160 Z', P.cream) + leafPath(50, 80, 26, P.oliveDark) + leafPath(190, 78, 28, P.oliveDark);
  if (id === 'cafe_terrace') art += circle(70, 112, 18, P.cream) + circle(170, 112, 18, P.cream) + [30, 70, 110, 150, 190].map((x) => circle(x, 30, 5, P.mustard)).join('');
  if (id === 'tea_at_home') art += rect(150, 20, 70, 70, P.sky, 4) + ellipse(90, 100, 30, 24, P.cobalt) + cupShape(140, 104, 12, P.rose);
  if (id === 'bookshop') art += [10, 60, 110, 160].map((x, i) => rect(x, 20, 40, 90, [P.cobalt, P.terracotta, P.mustard, P.olive][i], 3)).join('') + rect(200, 70, 30, 40, P.rose, 6);
  return art;
}

function fx(id) {
  if (id === 'rc_claude_fx_dust') return [[60, 80], [300, 60], [180, 210], [90, 330], [330, 300], [240, 130]].map(([x, y]) => circle(x, y, 4, P.white, 'opacity="0.5"')).join('');
  if (id === 'rc_claude_fx_morning_light') return path('M360 360 H640 L830 1100 H470 Z', '#FFF2D0', 'opacity="0.25"');
  return path('M380 360 H620 L760 1050 H480 Z', '#BFD3FF', 'opacity="0.12"') + circle(95, 1060, 140, '#F6CB6E', 'opacity="0.18"');
}

const DRAW = {
  rc_claude_morning_room_plate: () => plate(false),
  rc_claude_night_room_plate: () => plate(true),
  rc_claude_morning_window: () => windowArt(false),
  rc_claude_night_window: () => windowArt(true),
  rc_claude_rug: rug,
  rc_claude_shelf: shelf,
  rc_claude_plant: plant,
  rc_claude_coffee_table: coffeeTable,
  rc_claude_morning_sofa: () => sofa(false),
  rc_claude_night_sofa: () => sofa(true),
  rc_claude_table_lamp_off: () => lamp(false),
  rc_claude_table_lamp_on: () => lamp(true),
  rc_claude_leaf_vase: leafVase,
  rc_claude_book_stack: bookStack,
  rc_claude_framed_print: framedPrint,
  rc_claude_morning_breakfast_tray: () => tray(false),
  rc_claude_evening_tray: () => tray(true),
  rc_claude_keepsake_box_closed: () => box(false),
  rc_claude_keepsake_box_open: () => box(true),
  rc_claude_card_envelope: envelope,
  rc_claude_fg_plant: fgPlant,
  rc_claude_clue_card: () => clueCard(false),
  rc_claude_note_paper: () => clueCard(true),
  rc_claude_destination_card: destinationCard,
};

function drawAsset(asset) {
  if (DRAW[asset.id]) return DRAW[asset.id]();
  const character = asset.id.match(/^rc_claude_(husband|wife)_(\w+)$/);
  if (character) return characterArt(character[1], character[2]);
  const motif = asset.id.match(/^rc_claude_token_(\w+)$/);
  if (motif) return token(motif[1]);
  const dest = asset.id.match(/^rc_claude_dest_(\w+)$/);
  if (dest) return vignette(dest[1]);
  if (asset.family === 'effect') return fx(asset.id);
  throw new Error(`No placeholder drawing for ${asset.id}`);
}

function characterArt(kind, pose) {
  return character(kind, pose);
}

const sources = [];
for (const asset of RC_ASSETS) {
  const canvas = canvasOf(asset);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${asset.size.width} ${asset.size.height}">` +
    `<!-- ${asset.id} · placeholder · anchor ${asset.anchor.x},${asset.anchor.y} · layer ${asset.layer} -->` +
    drawAsset(asset) +
    `</svg>\n`;
  const file = join(root, 'assets', asset.placeholder);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, svg);
  if (!asset.optional) sources.push(asset);
}

const mapFile = join(root, 'src', 'components', 'relationshipChallengeClaude', 'placeholderSources.ts');
mkdirSync(dirname(mapFile), { recursive: true });
const rel = (asset) => relative(dirname(mapFile), join(root, 'assets', asset.placeholder)).replace(/\\/g, '/');
writeFileSync(
  mapFile,
  `// Generated by scripts/relationship-challenge-claude/build-placeholders.mjs. Do not edit.\n` +
    `// Metro needs static require() calls, so the placeholder map is written out in full.\n` +
    `// To install final art, point an id at the new file in assetSource.ts instead.\n\n` +
    `import type { ImageSourcePropType } from 'react-native';\n\n` +
    `export const RC_CLAUDE_PLACEHOLDERS: Record<string, ImageSourcePropType> = {\n` +
    sources.map((asset) => `  ${asset.id}: require('${rel(asset)}'),`).join('\n') +
    `\n};\n`
);

console.log(`Wrote ${RC_ASSETS.length} placeholders and ${sources.length} runtime sources.`);
