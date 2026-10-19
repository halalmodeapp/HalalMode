import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

import { COUPLE_HEART_BOX, COUPLE_SCENE_LAYERS, COUPLE_WORLD } from '../src/components/auth/coupleSceneLayers';
import { COUPLE_SCENE_MARKUP } from '../src/components/auth/coupleSceneMarkup';
import {
  COUPLE_FOCUS,
  COUPLE_OVERSCAN,
  COUPLE_PARALLAX,
  COUPLE_SUBJECTS,
  coupleCamera,
  coupleParallax,
} from '../src/components/auth/coupleSceneLayout';

// Hero frames the cover is actually drawn into: the landing page's mobile and
// split layouts, and the app's phone, tablet and landscape sign-in heroes.
const FRAMES: [string, number, number][] = [
  ['site 390x844 hero', 390, 420],
  ['site 430x932 hero', 430, 420],
  ['site 768x1024 hero', 768, 420],
  ['site 1440x900 stage', 1051, 900],
  ['site 2560x1080 stage', 2120, 1080],
  ['app phone hero', 390, 552],
  ['app large phone hero', 430, 640],
  ['app tablet landscape split', 614, 768],
  ['app landscape phone', 480, 390],
];
// Tablet portrait puts the sign-in panel beside a hero far taller than the
// illustration is wide; there the crop keeps the reaching hands and the heart.
const TALL_FRAMES: [string, number, number][] = [
  ['app tablet portrait split', 388, 1024],
  ['app large tablet portrait split', 614, 1366],
];
const HANDS = { left: 700, top: 380, right: 870, bottom: 560 };
const MAX_TRAVEL = Math.max(...COUPLE_SCENE_LAYERS.map((layer) => Math.abs(layer.depth))) * COUPLE_PARALLAX.x;

test('the world always covers the frame, with room left for parallax', () => {
  for (const [name, width, height] of [...FRAMES, ...TALL_FRAMES]) {
    const { unit, left, top } = coupleCamera(width, height);
    // The camera may show up to half the mirrored bleed; the rest is kept for
    // parallax, which must never travel past it.
    const reach = COUPLE_WORLD.bleed / 2;
    assert.ok(reach - MAX_TRAVEL > 0, name);
    assert.ok(left <= reach * unit + 0.01 && top <= reach * unit + 0.01, name);
    assert.ok(left + (COUPLE_WORLD.width + reach) * unit >= width - 0.01, name);
    assert.ok(top + (COUPLE_WORLD.height + reach) * unit >= height - 0.01, name);
  }
});

test('every crop keeps both faces, both hands and the heart in view', () => {
  for (const [name, width, height] of FRAMES) {
    const { unit, left, top } = coupleCamera(width, height);
    assert.ok(left + COUPLE_SUBJECTS.left * unit >= 0, `${name}: left`);
    assert.ok(left + COUPLE_SUBJECTS.right * unit <= width, `${name}: right`);
    assert.ok(top + COUPLE_SUBJECTS.top * unit >= 0, `${name}: top`);
    assert.ok(top + COUPLE_SUBJECTS.bottom * unit <= height, `${name}: bottom`);
  }
});

test('very tall frames still keep both hands and the heart in view', () => {
  for (const [name, width, height] of TALL_FRAMES) {
    const { unit, left, top } = coupleCamera(width, height);
    assert.ok(left + HANDS.left * unit >= 0 && left + HANDS.right * unit <= width, name);
    assert.ok(top + HANDS.top * unit >= 0 && top + HANDS.bottom * unit <= height, name);
  }
});

test('the heart and the couple share the stairs plane, with the heart between the two hands', () => {
  const stairs = COUPLE_SCENE_LAYERS.find((layer) => layer.key === 'stairs')!;
  for (const key of ['woman', 'man', 'heart'] as const) {
    assert.equal(COUPLE_SCENE_LAYERS.find((layer) => layer.key === key)!.depth, stairs.depth, `${key} must move with the stairs`);
  }
  const heartCenter = COUPLE_HEART_BOX.x + COUPLE_HEART_BOX.width / 2;
  // Woman's fingertips reach x≈768, the man's x≈822 in the reference.
  assert.ok(heartCenter > 768 && heartCenter < 822);
  assert.ok(COUPLE_HEART_BOX.x >= stairs.x && COUPLE_HEART_BOX.y >= stairs.y);
  // Same depth as its parent layer means it can never drift from the hands.
  const offset = coupleParallax(stairs.depth, 1, -1, 1);
  assert.deepEqual(offset, { x: stairs.depth * COUPLE_PARALLAX.x, y: -stairs.depth * COUPLE_PARALLAX.y });
});

test('layers are small WebP files that exist and match the landing page', () => {
  const html = readFileSync('site/index.html', 'utf8');
  let total = 0;
  for (const layer of COUPLE_SCENE_LAYERS) {
    const path = `site/img/scene/${layer.file}`;
    assert.ok(existsSync(path), path);
    assert.match(layer.file, /^[a-z-]+\.[0-9a-f]{10}\.webp$/);
    assert.ok(html.includes(`/img/scene/${layer.file}`), `${layer.file} missing from site/index.html`);
    total += statSync(path).size;
  }
  // The figures and the heart ship at 2x so the deep scroll zoom stays crisp.
  assert.ok(total < 560 * 1024, `scene layers grew to ${Math.round(total / 1024)} KB`);
  // One scene: the sign-up screen draws the waitlist page's own markup...
  for (const line of COUPLE_SCENE_MARKUP.split('\n')) assert.ok(html.includes(line), `sign-up scene differs: ${line.slice(0, 60)}`);
  // ...styled by the shared scene.css, whose CSS camera must match the native app's.
  const css = readFileSync('site/scene.css', 'utf8');
  assert.ok(html.includes('/scene.css'));
  assert.ok(css.includes(`--cover:calc(max(100cqw / ${COUPLE_WORLD.width}, 100cqh / ${COUPLE_WORLD.height}) * ${COUPLE_OVERSCAN})`));
  assert.ok(css.includes(`--fit:min(100cqw / ${COUPLE_SUBJECTS.right - COUPLE_SUBJECTS.left + 24}, 100cqh / ${COUPLE_SUBJECTS.bottom - COUPLE_SUBJECTS.top + 24})`));
  assert.ok(css.includes(`calc(50cqw - ${COUPLE_FOCUS.x} * var(--u))`));
  assert.ok(css.includes(`calc(50cqh - ${COUPLE_FOCUS.y} * var(--u))`));
  assert.ok(css.includes(`--ax:calc(${COUPLE_PARALLAX.x} * var(--u))`));
  assert.ok(css.includes(`--ay:calc(${COUPLE_PARALLAX.y} * var(--u))`));
});

test('every painted layer outside the couple group moves at its own depth', () => {
  const grouped = new Set(['woman', 'man', 'heart']);
  const depths = COUPLE_SCENE_LAYERS.filter((layer) => !grouped.has(layer.key)).map((layer) => layer.depth);
  assert.equal(new Set(depths).size, depths.length);
  // Back to front: each layer is nearer than the one before it.
  assert.deepEqual([...depths].sort((a, b) => a - b), depths);
});
