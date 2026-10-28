import assert from 'node:assert/strict';
import test from 'node:test';

import { HALFTONE, halftoneCell, halftonePaths, sceneColor } from '../src/components/auth/halftoneDots';
import { coupleCamera } from '../src/components/auth/coupleSceneLayout';

test('the scene colours decode to real colours from the generated map', () => {
  const [r, g, b] = sceneColor(768, 512);
  for (const channel of [r, g, b]) assert.ok(channel >= 0 && channel <= 255);
  // Off the edges still gives a colour, never a crash.
  assert.equal(sceneColor(-500, -500).length, 3);
  assert.equal(sceneColor(99999, 99999).length, 3);
  // The map is not a flat fill: the sky and the stairs differ.
  const sky = sceneColor(200, 40);
  const stairs = sceneColor(800, 900);
  assert.notDeepEqual(sky, stairs);
});

test('dot spacing keeps a phone fine and a big screen light', () => {
  assert.ok(halftoneCell(390, 844) >= HALFTONE.minCell);
  assert.ok(halftoneCell(1600, 1000) > halftoneCell(390, 844));
});

test('each drawing has dots in both inks, and the drawings differ', () => {
  const camera = coupleCamera(390, 844);
  const first = halftonePaths(390, 844, camera, 0);
  const second = halftonePaths(390, 844, camera, 1);
  assert.ok(first.cyan.length > 1000, 'cyan dots are drawn');
  assert.ok(first.magenta.length > 1000, 'magenta dots are drawn');
  assert.notEqual(first.cyan, second.cyan);
  assert.equal(halftonePaths(390, 844, camera, 0).cyan, first.cyan, 'a drawing is repeatable');
});

test('the dot count stays within what a phone can draw', () => {
  const camera = coupleCamera(390, 844);
  const { cyan, magenta } = halftonePaths(390, 844, camera, 0);
  const dots = (cyan.match(/M/g) ?? []).length + (magenta.match(/M/g) ?? []).length;
  assert.ok(dots < HALFTONE.dotBudget * 2.4, `${dots} dots`);
});
