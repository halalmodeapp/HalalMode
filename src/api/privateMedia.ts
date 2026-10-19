import { requireSupabase, USE_MOCKS } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { privateMediaOptions, PRIVATE_MEDIA_TTL_SECONDS, type PrivateMediaBucket } from '@/lib/privateMediaQuery';

export function signedMediaOptions(memberId: string, bucket: PrivateMediaBucket, path: string, ttl = PRIVATE_MEDIA_TTL_SECONDS) {
  return privateMediaOptions(memberId, bucket, path, async () => {
    const client = requireSupabase();
    const before = await client.auth.getSession();
    if (before.error || before.data.session?.user.id !== memberId) throw new Error('Media session changed.');
    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, ttl);
    if (error) throw error;
    const after = await client.auth.getSession();
    if (after.error || after.data.session?.user.id !== memberId) throw new Error('Media session changed.');
    return data.signedUrl;
  }, ttl);
}

export async function createProfileMediaSignedUrl(bucket: PrivateMediaBucket, path: string, ttl = PRIVATE_MEDIA_TTL_SECONDS): Promise<string> {
  if (USE_MOCKS) return path;
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Media requires a session.');
  return queryClient.fetchQuery(signedMediaOptions(data.session.user.id, bucket, path, ttl));
}
