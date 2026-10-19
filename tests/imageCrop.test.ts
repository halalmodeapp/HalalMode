import assert from 'node:assert/strict';
import test from 'node:test';

import { ALL_ACTIVITIES } from '../src/halalCards/content';
import { SECTION_TITLE_CARDS } from '../src/halalCards/content/images';
import { coverCropPosition } from '../src/halalCards/imageCrop';

test('Halal Cards section covers declare face-aware focal points', () => {
  for (const section of Object.values(SECTION_TITLE_CARDS)) {
    assert.ok(typeof section.focalY === 'number' && section.focalY > 0 && section.focalY < 1);
    const position = coverCropPosition(16 / 9, section.focalY);
    assert.ok(position);
    const top = Number.parseInt(position.top, 10);
    assert.ok(top >= 0 && top <= 100);
    assert.equal(position.left, '50%');
  }
});

test('every activity cover uses an upper-middle focal crop in wide list tiles', () => {
  for (const activity of ALL_ACTIVITIES) {
    const position = coverCropPosition(16 / 10, activity.cover.focalY);
    assert.ok(position, `${activity.cover.id} has a wide-tile crop position`);
    assert.ok(Number.parseInt(position.top, 10) < 50, `${activity.cover.id} keeps faces above the mathematical centre`);
    assert.equal(position.left, '50%');
  }
});

test('face-aware cover crop avoids unnecessary cropping on portrait artwork', () => {
  assert.equal(coverCropPosition(4 / 5, 0.3), undefined);
  assert.equal(coverCropPosition(1, 0.3)?.top, '0%');
});
