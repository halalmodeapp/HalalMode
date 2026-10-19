import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveProfileMedia } from '../src/lib/resolveProfileMedia';
import type { Profile } from '../src/types';

const owner = '11111111-1111-4111-8111-111111111111';
const photo = (n: number) => `${owner}/22222222-2222-4222-8222-${String(n).padStart(12, '0')}.jpg`;
const voice = `${owner}/33333333-3333-4333-8333-333333333333.m4a`;
const profile = (photos: string[], audioGreetingUrl?: string) => ({ id: owner, photos, audioGreetingUrl }) as Profile;

test('one failed photo preserves its slot and does not hide other media', async () => {
  const result = await resolveProfileMedia(profile([photo(1), photo(2)], voice), async (_, path) => {
    if (path === photo(1)) throw new Error('denied');
    return `https://signed.example/${path}`;
  });
  assert.deepEqual(result.photos, ['', `https://signed.example/${photo(2)}`]);
  assert.equal(result.photoMedia?.[0]?.storagePath, photo(1));
  assert.equal(result.audioGreetingUrl, `https://signed.example/${voice}`);
});

test('voice failure does not reject photos and retains its private retry reference', async () => {
  const result = await resolveProfileMedia(profile([photo(1)], voice), async (bucket) => {
    if (bucket === 'voice-introductions') throw new Error('missing');
    return 'https://signed.example/photo';
  });
  assert.deepEqual(result.photos, ['https://signed.example/photo']);
  assert.equal(result.audioGreetingUrl, undefined);
  assert.equal(result.audioGreetingStoragePath, voice);
});

test('a stalled signer is bounded and cannot replace results after the deadline', async () => {
  let finish!: (url: string) => void;
  const stalled = new Promise<string>(resolve => { finish = resolve; });
  const result = await resolveProfileMedia(profile([photo(1), photo(2)]),
    async (_, path) => path === photo(1) ? stalled : 'https://signed.example/ok', 5);
  assert.deepEqual(result.photos, ['', 'https://signed.example/ok']);
  finish('https://signed.example/late');
  await Promise.resolve();
  assert.equal(result.photos[0], '');
});

test('retry can resolve an already hydrated failed profile using retained paths', async () => {
  const input = profile([photo(1)]);
  const failed = await resolveProfileMedia(input, async () => { throw new Error('offline'); });
  const recovered = await resolveProfileMedia(failed, async (_, path) => {
    assert.equal(path, photo(1));
    return 'https://signed.example/recovered';
  });
  assert.deepEqual(recovered.photos, ['https://signed.example/recovered']);
  assert.deepEqual(input.photos, [photo(1)]);
});

test('legacy and bundled URLs do not call Storage signing', async () => {
  const photos = ['https://example.com/legacy.jpg', 'demo-profile:sample:0'];
  const result = await resolveProfileMedia(profile(photos), async () => { assert.fail('unexpected signing'); });
  assert.deepEqual(result.photos, photos);
});
