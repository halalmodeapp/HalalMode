import { useQuery, useQueryClient } from '@tanstack/react-query';
import { signedMediaOptions } from '@/api/privateMedia';
import { privatePathFromUrl, type PrivateMediaBucket } from '@/lib/privateMediaQuery';
import { USE_MOCKS } from '@/lib/supabase';
import { useAuth } from '@/state/auth';
import { useScreenActive } from './useScreenActive';

export function usePrivateMedia(source: unknown, bucket: PrivateMediaBucket, storagePath?: string) {
  const { user } = useAuth();
  const client = useQueryClient();
  const active = useScreenActive();
  const path = storagePath ?? privatePathFromUrl(source, process.env.EXPO_PUBLIC_SUPABASE_URL, bucket);
  const privateMedia = !USE_MOCKS && !!path;
  const query = useQuery({
    ...signedMediaOptions(user?.id ?? '', bucket, path ?? ''),
    enabled: privateMedia && !!user && active,
  });
  return {
    url: privateMedia ? query.data : source,
    privateMedia,
    ensure: async () => {
      if (!privateMedia) return source;
      if (!user || !active) return undefined;
      return client.fetchQuery(signedMediaOptions(user.id, bucket, path!));
    },
    retry: () => { if (privateMedia && user && active) void query.refetch({ cancelRefetch: false }); },
  };
}
