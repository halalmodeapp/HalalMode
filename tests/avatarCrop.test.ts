import assert from 'node:assert/strict';
import test from 'node:test';
import { validAvatarCrop } from '../src/lib/avatarCrop';

test('invalid stored avatar crops fall back instead of producing broken geometry', () => {
  const valid = { path: 'member/photo.jpg', cx: 0.5, cy: 0.5, size: 0.5 };
  assert.deepEqual(validAvatarCrop(valid), valid);
  for (const crop of [null, {}, { ...valid, path: '' }, { ...valid, cx: null },
    { ...valid, cy: undefined }, { ...valid, size: 0 }, { ...valid, cx: NaN },
    { ...valid, cy: Infinity }, { ...valid, cx: -0.1 }, { ...valid, size: 1.1 }]) {
    assert.equal(validAvatarCrop(crop), null);
  }
});
