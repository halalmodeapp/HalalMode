import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { privateMediaOptions, privatePathFromUrl, PRIVATE_MEDIA_TTL_SECONDS } from '../src/lib/privateMediaQuery';
import { queryClient } from '../src/lib/queryClient';

test('thumbnail and full-size requests share signing and reuse a fresh link', async () => {
  const client = new QueryClient();
  let requests = 0;
  const options = { ...privateMediaOptions('member', 'profile-photos', 'path', async () => { requests++; return 'signed'; }), gcTime: 0 };
  try {
    assert.deepEqual(await Promise.all([client.fetchQuery(options), client.fetchQuery(options)]), ['signed', 'signed']);
    assert.equal(await client.fetchQuery(options), 'signed');
    assert.equal(requests, 1);
    client.setQueryData(options.queryKey, 'old', { updatedAt: Date.now() - 16 * 60_000 });
    assert.equal(await client.fetchQuery(options), 'signed');
    assert.equal(requests, 2);
  } finally { client.clear(); }
});

test('accounts and buckets cannot share cached private URLs', () => {
  const sign = async () => 'signed';
  const a = privateMediaOptions('a', 'profile-photos', 'path', sign);
  assert.notDeepEqual(a.queryKey, privateMediaOptions('b', 'profile-photos', 'path', sign).queryKey);
  assert.notDeepEqual(a.queryKey, privateMediaOptions('a', 'voice-introductions', 'path', sign).queryKey);
});

test('no media renewal timer or whole-profile polling remains', () => {
  const options = privateMediaOptions('a', 'profile-photos', 'path', async () => 'signed');
  assert.equal(options.refetchInterval, false);
  assert.equal(queryClient.getDefaultOptions().queries?.refetchInterval, undefined);
  assert.equal(options.staleTime, (PRIVATE_MEDIA_TTL_SECONDS - PRIVATE_MEDIA_TTL_SECONDS / 4) * 1000);
});

test('signing failure has a bounded retry count', async () => {
  const client = new QueryClient();
  let requests = 0;
  try {
    await assert.rejects(client.fetchQuery({
      ...privateMediaOptions('a', 'profile-photos', 'path', async () => { requests++; throw new Error('denied'); }),
      retryDelay: 0,
      gcTime: 0,
    }));
    assert.equal(requests, 2);
  } finally { client.clear(); }
});

test('account cache clearing cannot be undone by a late signing response', async () => {
  const client = new QueryClient();
  let finish!: (url: string) => void;
  const options = { ...privateMediaOptions('old', 'profile-photos', 'path', () => new Promise<string>(resolve => { finish = resolve; })), gcTime: 0 };
  const pending = client.fetchQuery(options).catch(() => undefined);
  client.clear();
  finish('old-secret-url');
  await pending;
  assert.equal(client.getQueryData(options.queryKey), undefined);
});

test('only this project’s signed Storage URLs are interpreted as private references', () => {
  const path = '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg';
  const origin = 'https://project.supabase.co';
  const url = `${origin}/storage/v1/object/sign/profile-photos/${path}?token=secret`;
  assert.equal(privatePathFromUrl(url, origin, 'profile-photos'), path);
  assert.equal(privatePathFromUrl(url, 'https://other.supabase.co', 'profile-photos'), undefined);
  assert.equal(privatePathFromUrl(url, origin, 'voice-introductions'), undefined);
  assert.equal(privatePathFromUrl('file:///private/image.jpg', origin, 'profile-photos'), undefined);
});
