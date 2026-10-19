/**
 * Validates the bytes of a freshly uploaded profile photo or voice note.
 * Storage metadata is client-controlled, so attachment RPCs only accept an
 * object after this service records a short-lived magic-byte validation.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PHOTO_BUCKET = 'profile-photos';
const VOICE_BUCKET = 'voice-introductions';
const PHOTO_LIMIT = 10 * 1024 * 1024;
const VOICE_LIMIT = 15 * 1024 * 1024;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json' },
});

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function hasFtyp(bytes: Uint8Array, brands: string[]): boolean {
  if (bytes.length < 12 || ascii(bytes, 4, 4) !== 'ftyp') return false;
  const candidates = [ascii(bytes, 8, 4)];
  for (let offset = 16; offset + 4 <= Math.min(bytes.length, 64); offset += 4) {
    candidates.push(ascii(bytes, offset, 4));
  }
  return candidates.some((brand) => brands.includes(brand));
}

function hasValidIsoBmff(bytes: Uint8Array, mediaBoxes: string[]): boolean {
  let offset = 0;
  let hasFtypBox = false;
  let hasMediaBox = false;
  while (offset + 8 <= bytes.length) {
    const size = (
      (bytes[offset] << 24)
      | (bytes[offset + 1] << 16)
      | (bytes[offset + 2] << 8)
      | bytes[offset + 3]
    ) >>> 0;
    if (size < 8 || offset + size > bytes.length) return false;
    const type = ascii(bytes, offset + 4, 4);
    if (type === 'ftyp') hasFtypBox = true;
    if (mediaBoxes.includes(type) && size > 8) hasMediaBox = true;
    offset += size;
  }
  return offset === bytes.length && hasFtypBox && hasMediaBox;
}

function detectMime(bytes: Uint8Array, mediaType: 'photo' | 'voice'): string | null {
  if (mediaType === 'photo') {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) return 'image/png';
    if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
    if (hasFtyp(bytes, ['heic', 'heix', 'hevc', 'hevx']) && hasValidIsoBmff(bytes, ['meta'])) return 'image/heic';
    if (hasFtyp(bytes, ['mif1', 'msf1']) && hasValidIsoBmff(bytes, ['meta'])) return 'image/heif';
    return null;
  }

  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return 'audio/webm';
  }
  if (bytes.length >= 3 && ascii(bytes, 0, 3) === 'ID3') return 'audio/mpeg';
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0) return 'audio/mpeg';
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) return 'audio/aac';
  if (hasFtyp(bytes, ['M4A ', 'isom', 'iso2', 'mp41', 'mp42'])
      && hasValidIsoBmff(bytes, ['moov', 'moof', 'mdat'])) return 'audio/mp4';
  return null;
}

function extensionMime(extension: string): string | null {
  return {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    mp3: 'audio/mpeg',
  }[extension] ?? (extension === 'webm' ? 'audio/webm' : null);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  const userId = auth.user?.id;
  if (!userId) return reply({ error: 'Sign in first' }, 401);

  const body = await request.json().catch(() => ({}));
  const bucket = body?.bucket;
  const path = body?.path;
  const mediaType = body?.mediaType;
  if ((bucket !== PHOTO_BUCKET && bucket !== VOICE_BUCKET)
      || (mediaType !== 'photo' && mediaType !== 'voice')
      || (bucket === PHOTO_BUCKET && mediaType !== 'photo')
      || (bucket === VOICE_BUCKET && mediaType !== 'voice')
      || typeof path !== 'string') {
    return reply({ error: 'Invalid media validation request' }, 400);
  }

  const match = path.match(new RegExp(`^(${UUID})/(${UUID})\\.([a-z]+)$`));
  if (!match || match[1] !== userId) return reply({ error: 'Invalid media path' }, 403);
  const extension = match[3];
  const expectedExtensions = mediaType === 'photo'
    ? ['jpg', 'png', 'webp', 'heic', 'heif']
    : ['m4a', 'aac', 'mp3', 'webm'];
  if (!expectedExtensions.includes(extension)) return reply({ error: 'Invalid media extension' }, 400);

  const download = await admin.storage.from(bucket).download(path);
  if (download.error || !download.data) return reply({ error: 'Uploaded media was not found' }, 404);
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  const maxBytes = mediaType === 'photo' ? PHOTO_LIMIT : VOICE_LIMIT;
  if (bytes.length === 0 || bytes.length > maxBytes) return reply({ error: 'Uploaded media is too large' }, 400);

  const detectedMime = detectMime(bytes, mediaType);
  if (!detectedMime || extensionMime(extension) !== detectedMime) {
    return reply({ error: 'Uploaded bytes do not match the file type' }, 415);
  }

  const recorded = await admin.rpc('record_profile_media_validation_service', {
    p_bucket_id: bucket,
    p_object_path: path,
    p_media_type: mediaType,
    p_detected_mime: detectedMime,
    p_size_bytes: bytes.length,
  });
  if (recorded.error) return reply({ error: 'Media validation could not be recorded' }, 500);
  return reply({ valid: true, mimeType: detectedMime, sizeBytes: bytes.length });
});
