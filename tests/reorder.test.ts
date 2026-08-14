import assert from 'node:assert/strict';
import test from 'node:test';

import { moveItem, slotFromPosition, slotPosition } from '../src/lib/reorder';

const grid = { cellWidth: 100, cellHeight: 133, gap: 8, columns: 3 };

test('moving an item shifts the others along without losing any', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c']);
});

test('an impossible move changes nothing rather than corrupting the list', () => {
  assert.deepEqual(moveItem(['a', 'b'], 5, 0), ['a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 0, -1), ['a', 'b']);
});

test('a slot and its position agree with each other', () => {
  for (let index = 0; index < 6; index += 1) {
    const { x, y } = slotPosition({ index, ...grid });
    const slot = slotFromPosition({
      centreX: x + grid.cellWidth / 2,
      centreY: y + grid.cellHeight / 2,
      count: 6,
      ...grid,
    });
    assert.equal(slot, index, `slot ${index} should round-trip`);
  }
});

test('right to left mirrors the columns, so dragging left moves it left', () => {
  // Index 0 is the rightmost column when the interface is right to left.
  assert.equal(slotPosition({ index: 0, ...grid, isRTL: true }).x, 216);
  assert.equal(slotPosition({ index: 2, ...grid, isRTL: true }).x, 0);

  const first = slotPosition({ index: 0, ...grid, isRTL: true });
  assert.equal(
    slotFromPosition({
      centreX: first.x + grid.cellWidth / 2,
      centreY: first.y + grid.cellHeight / 2,
      count: 6,
      isRTL: true,
      ...grid,
    }),
    0,
  );
});

test('dragging past the edge lands on the nearest real slot', () => {
  // Beyond the last photo, not into empty space after it.
  assert.equal(slotFromPosition({ centreX: 900, centreY: 900, count: 4, ...grid }), 3);
  // Dragged above and left of the grid.
  assert.equal(slotFromPosition({ centreX: -50, centreY: -50, count: 4, ...grid }), 0);
});

test('an unmeasured grid does not divide by zero', () => {
  assert.equal(
    slotFromPosition({ centreX: 10, centreY: 10, cellWidth: 0, cellHeight: 0, gap: 8, columns: 3, count: 3 }),
    0,
  );
});
