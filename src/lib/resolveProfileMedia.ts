import type { Profile, ProfileMediaSource } from '../types';
import { withDeadline } from './withDeadline';

export const PROFILE_PHOTO_BUCKET = 'profile-photos';
export const VOICE_INTRODUCTION_BUCKET = 'voice-introductions';
const PHOTO_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|heic|heif)$/;
const VOICE_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(m4a|aac|mp3|webm)$/;

type SignMedia = (bucket: typeof PROFILE_PHOTO_BUCKET | typeof VOICE_INTRODUCTION_BUCKET, path: string) => Promise<string>;

/** A failed private object must not hide the profile or shift photo indices.
 * Empty display URLs represent unavailable media, never a public-path fallback.
 * Paths remain available for authorized retry and owner reorder/delete actions.
 */
export async function resolveProfileMedia(profile: Profile, sign: SignMedia, timeoutMs = 10_000): Promise<Profile> {
  async function safeSign(bucket: Parameters<SignMedia>[0], path: string): Promise<string> {
    try {
      return await withDeadline(sign(bucket, path), timeoutMs);
    } catch {
      return '';
    }
  }

  const voicePath = profile.audioGreetingStoragePath ?? profile.audioGreetingUrl;
  const privateVoice = !!voicePath && VOICE_PATH.test(voicePath);
  const [photoMedia, voiceUrl] = await Promise.all([
    Promise.all(profile.photos.map(async (value, index): Promise<ProfileMediaSource> => {
      const path = profile.photoMedia?.[index]?.storagePath ?? value;
      if (!PHOTO_PATH.test(path)) return { displayUrl: value };
      return { storagePath: path, displayUrl: await safeSign(PROFILE_PHOTO_BUCKET, path) };
    })),
    privateVoice ? safeSign(VOICE_INTRODUCTION_BUCKET, voicePath!) : Promise.resolve(voicePath),
  ]);

  return {
    ...profile,
    photos: photoMedia.map(media => media.displayUrl),
    photoMedia,
    audioGreetingUrl: voiceUrl || undefined,
    audioGreetingStoragePath: privateVoice ? voicePath : undefined,
  };
}
