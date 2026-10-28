import { withDeadline } from './withDeadline';

export type PrivateMediaBucket = 'profile-photos' | 'voice-introductions' | 'profile-photos-blurred';
// Signed URLs are bearer capabilities. Keep the provider-side window short so
// a copied URL expires soon after a block or relationship closure.
export const PRIVATE_MEDIA_TTL_SECONDS = 60;

/** Standard Query cache: one in-flight request per account/bucket/object.
 * Keep a safety margin. No timers or screen-data mutations.
 */
export function privateMediaOptions(
  memberId: string,
  bucket: PrivateMediaBucket,
  path: string,
  sign: () => Promise<string>,
  ttl = PRIVATE_MEDIA_TTL_SECONDS,
) {
  return {
    queryKey: ['private-media', memberId, bucket, path, ttl] as const,
    queryFn: () => withDeadline(sign(), 10_000),
    staleTime: Math.max(0, ttl - Math.min(300, ttl / 4)) * 1000,
    gcTime: ttl * 1000,
    retry: 1,
    refetchInterval: false as const,
  };
}

/** Only recognize our own Storage URLs, never arbitrary third-party URLs. */
export function privatePathFromUrl(url: unknown, origin: string | undefined, bucket: PrivateMediaBucket): string | undefined {
  if (typeof url !== 'string' || !origin) return;
  try {
    const parsed = new URL(url);
    const base = new URL(origin);
    const prefix = `${base.pathname.replace(/\/$/, '')}/storage/v1/object/sign/${bucket}/`;
    if (parsed.origin !== base.origin || !parsed.pathname.startsWith(prefix)) return;
    const path = decodeURIComponent(parsed.pathname.slice(prefix.length));
    if (/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|heic|heif|m4a|aac|mp3|webm)$/.test(path)) return path;
  } catch { /* Not a private Storage URL. */ }
}
