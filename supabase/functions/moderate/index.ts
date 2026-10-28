/**
 * Checks queued photos and bios with OpenAI's free moderation endpoint
 * (omni-moderation-latest): no cost per photo or bio.
 *
 * allow, nothing happens.
 * remove, a photo comes off the profile (bios are never removed automatically).
 * review, the operator is emailed to decide.
 *
 * Every photo and selfie that passes it is then read by Luna (the rules are in
 * _shared/photoVerdict.ts): a picture of a screen or a print, or an image that
 * is not a camera photo, comes off; a face that does not match the member's
 * selfie goes to the operator; a selfie must be one live face.
 *
 * The endpoint scores harm categories (sexual, violence, hate, harassment,
 * self-harm, illicit). It cannot tell whether a photo shows the member's own
 * face; Luna does that. Contact details in bios are caught with a
 * plain pattern check, since the endpoint does not look for them.
 *
 * Needs the OPENAI_API_KEY secret. Without it, items stay queued and are
 * checked once the key is set. Called every two minutes by cron.
 */
import OpenAI from 'npm:openai';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import { withLuna } from '../_shared/luna.ts';
import {
  PHOTO_INSTRUCTIONS,
  PHOTO_SCHEMA,
  SELFIE_INSTRUCTIONS,
  SELFIE_SCHEMA,
  decidePhoto,
  decideSelfie,
  parsePhotoReading,
  parseSelfieReading,
  type Verdict as LunaVerdict,
} from '../_shared/photoVerdict.ts';

const MODEL = 'omni-moderation-latest';
const BLURRED_BUCKET = 'profile-photos-blurred';

interface Item {
  id: number;
  user_id: string;
  kind: 'photo' | 'bio' | 'selfie';
  ref: string;
  current: boolean;
  gender: string | null;
}

interface Verdict {
  decision: 'allow' | 'remove' | 'review';
  reason: string;
}

interface PhotoAnalysisItem {
  photo_hash: string;
  owner_id: string;
  storage_path: string;
}

interface PresentationFeatures {
  clarity: number;
  lighting: number;
  framing: number;
  background_distraction: number;
}

/** Categories that take a photo down straight away when flagged. */
const REMOVE = ['sexual', 'sexual/minors', 'violence/graphic', 'self-harm/instructions'];
/** Below the endpoint's own flag, a score this high still goes to review. */
const REVIEW_SCORE = 0.4;

/** Phone numbers, emails, links and "add me on…" handles. */
const CONTACT = [
  /\+?\d[\d\s().-]{7,}\d/,
  /[\w.+-]+@[\w-]+\.[\w.]+/,
  /\b(?:https?:\/\/|www\.)\S+/i,
  /\b\w+\.(?:com|net|org|io|me|co|link)\b/i,
  /(?:^|\s)@[a-z0-9_.]{3,}/i,
  /\b(?:insta(?:gram)?|snap(?:chat)?|whats ?app|telegram|tiktok|wechat|signal)\b/i,
];

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function judge(
  openai: OpenAI,
  input: OpenAI.Moderations.ModerationMultiModalInput[] | string,
  canRemove: boolean,
): Promise<Verdict> {
  const response = await openai.moderations.create({ model: MODEL, input });
  const result = response.results[0];
  if (!result) return { decision: 'review', reason: 'No verdict returned.' };
  const scores = result.category_scores as unknown as Record<string, number>;
  const flags = result.categories as unknown as Record<string, boolean>;
  const flagged = Object.keys(flags).filter((name) => flags[name]);
  const high = Object.keys(scores).filter((name) => scores[name] >= REVIEW_SCORE && !flags[name]);
  const top = (names: string[]) =>
    names.map((name) => `${name} ${Math.round(scores[name] * 100)}%`).join(', ');
  if (canRemove && flagged.some((name) => REMOVE.includes(name))) {
    return { decision: 'remove', reason: `Flagged: ${top(flagged)}` };
  }
  if (flagged.length) return { decision: 'review', reason: `Flagged: ${top(flagged)}` };
  if (high.length) return { decision: 'review', reason: `Borderline: ${top(high)}` };
  return { decision: 'allow', reason: 'Nothing flagged.' };
}

// The service client, typed loosely: the database types are not generated for these functions.
// deno-lint-ignore no-explicit-any
type AdminClient = any;

const SELFIE_BUCKET = 'verification-selfies';
const PHOTO_BUCKET = 'profile-photos';

async function imageUrl(client: AdminClient, bucket: string, path: string): Promise<string> {
  const file = await client.storage.from(bucket).download(path);
  if (file.error || !file.data) throw new Error(`download failed: ${file.error?.message}`);
  const type = ['image/jpeg', 'image/png', 'image/webp'].includes(file.data.type) ? file.data.type : 'image/jpeg';
  return `data:${type};base64,${toBase64(new Uint8Array(await file.data.arrayBuffer()))}`;
}



/** Luna's answer as text; the caller parses it and treats a refusal as no reading. */
async function askLuna(
  openai: OpenAI,
  name: string,
  schema: Record<string, unknown>,
  instructions: string,
  content: Array<Record<string, unknown>>,
): Promise<{ text: string; model: string }> {
  const { result, model } = await withLuna(openai, (selectedModel) => openai.responses.create({
    model: selectedModel,
    instructions,
    input: [{ role: 'user', content }] as never,
    max_output_tokens: 200,
    text: { format: { type: 'json_schema', name, strict: true, schema } },
  }));
  return { text: result.output_text ?? '', model };
}

async function judgeSelfie(
  openai: OpenAI,
  client: AdminClient,
  path: string,
): Promise<LunaVerdict & { model: string }> {
  const image = await imageUrl(client, SELFIE_BUCKET, path);
  const { text, model } = await askLuna(
    openai,
    'selfie_reading',
    SELFIE_SCHEMA as unknown as Record<string, unknown>,
    SELFIE_INSTRUCTIONS,
    [
      { type: 'input_text', text: 'Read this selfie.' },
      { type: 'input_image', image_url: image, detail: 'high' },
    ],
  );
  return { ...decideSelfie(parseSelfieReading(text)), model };
}

async function judgePhoto(
  openai: OpenAI,
  client: AdminClient,
  userId: string,
  path: string,
): Promise<LunaVerdict & { model: string }> {
  const selfiePath = await client.rpc('verified_selfie_path_service', { p_user_id: userId });
  if (selfiePath.error) throw new Error(`selfie lookup failed: ${selfiePath.error.message}`);
  const selfie = typeof selfiePath.data === 'string' && selfiePath.data
    ? await imageUrl(client, SELFIE_BUCKET, selfiePath.data)
    : null;
  const photo = await imageUrl(client, PHOTO_BUCKET, path);
  const content: Array<Record<string, unknown>> = [
    {
      type: 'input_text',
      text: selfie
        ? 'First image: the member selfie. Second image: the profile photo to read.'
        : 'Read this profile photo.',
    },
  ];
  if (selfie) content.push({ type: 'input_image', image_url: selfie, detail: 'high' });
  content.push({ type: 'input_image', image_url: photo, detail: 'high' });
  const { text, model } = await askLuna(
    openai,
    'photo_reading',
    PHOTO_SCHEMA as unknown as Record<string, unknown>,
    PHOTO_INSTRUCTIONS,
    content,
  );
  return { ...decidePhoto(parsePhotoReading(text)), model };
}

function parsePresentationFeatures(value: string): PresentationFeatures {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Luna returned an invalid photo presentation object');
  }
  const item = parsed as Record<string, unknown>;
  const keys = ['clarity', 'lighting', 'framing', 'background_distraction'];
  if (Object.keys(item).length !== keys.length || keys.some((key) =>
    typeof item[key] !== 'number' || !Number.isFinite(item[key])
      || (item[key] as number) < 0 || (item[key] as number) > 1
  )) {
    throw new Error('Luna returned out-of-range photo presentation values');
  }
  return item as unknown as PresentationFeatures;
}

// "They liked you": a member who has not paid sees the people who chose them
// through a tiny copy of the photo, made here, so the real file is never sent.
async function refreshBlurredCopies(client: AdminClient): Promise<{ made: number; removed: number }> {
  let made = 0;
  let removed = 0;
  const gone = await client.rpc('blurs_to_remove_service', { p_limit: 50 });
  for (const path of (Array.isArray(gone.data) ? gone.data : []) as string[]) {
    const result = await client.storage.from(BLURRED_BUCKET).remove([path]);
    if (result.error) continue;
    await client.rpc('forget_photo_blur_service', { p_path: path });
    removed += 1;
  }
  const due = await client.rpc('photos_to_blur_service', { p_limit: 10 });
  for (const item of (Array.isArray(due.data) ? due.data : []) as { user_id: string; path: string }[]) {
    try {
      const file = await client.storage.from(PHOTO_BUCKET).download(item.path);
      if (file.error || !file.data) continue;
      const image = await Image.decode(new Uint8Array(await file.data.arrayBuffer()));
      // 12 pixels wide is a colour wash, not a face; the app blurs it again.
      const small = image.resize(12, Image.RESIZE_AUTO);
      const jpeg = await small.encodeJPEG(60);
      const stored = await client.storage.from(BLURRED_BUCKET).upload(item.path, jpeg, { contentType: 'image/jpeg', upsert: true });
      if (stored.error) continue;
      await client.rpc('mark_photo_blurred_service', { p_user_id: item.user_id, p_path: item.path });
      made += 1;
    } catch (error) {
      // A format the decoder cannot read (WebP) just has no copy; the app shows a plain tile.
      console.error('blur failed', item.path, String(error));
    }
  }
  return { made, removed };
}

Deno.serve(async (request) => {
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const verified = await client.rpc('verify_mail_worker_secret', {
    p_secret: request.headers.get('x-mail-worker-secret') ?? '',
  });
  if (verified.error || verified.data !== true) return new Response('forbidden', { status: 403 });

  // Selfies are deleted once checked (migration 20261027110000), whether or not
  // anything is waiting to be moderated.
  let purged = 0;
  const due = await client.rpc('selfies_to_purge_service', { p_limit: 50 });
  for (const path of (Array.isArray(due.data) ? due.data : []) as string[]) {
    const removed = await client.storage.from(SELFIE_BUCKET).remove([path]);
    if (removed.error) continue;
    await client.rpc('mark_selfie_purged_service', { p_path: path });
    purged += 1;
  }

  const blurred = await refreshBlurredCopies(client);

  if (!Deno.env.get('OPENAI_API_KEY')) return Response.json({ purged, blurred, error: 'OPENAI_API_KEY is not set' }, { status: 503 });

  const openai = new OpenAI();
  const claimed = await client.rpc('claim_moderation_service', { p_limit: 10 });
  if (claimed.error) return new Response('claim failed', { status: 500 });
  const items = (claimed.data ?? []) as Item[];

  const tally = { allow: 0, remove: 0, review: 0, skipped: 0, failed: 0 };
  // The first failure, so a run can be diagnosed from its response alone.
  let firstError: string | null = null;
  for (const item of items) {
    try {
      if (!item.current) {
        await client.rpc('settle_moderation_service', { p_id: item.id, p_decision: 'allow', p_reason: 'No longer on the profile.' });
        tally.skipped += 1;
        continue;
      }
      let verdict: Verdict;
      let checkedBy = MODEL;
      if (item.kind === 'selfie' || item.kind === 'photo') {
        const bucket = item.kind === 'selfie' ? SELFIE_BUCKET : PHOTO_BUCKET;
        // The free harm check first: nothing explicit goes any further.
        verdict = await judge(openai, [
          { type: 'image_url', image_url: { url: await imageUrl(client, bucket, item.ref) } },
        ], true);
        if (verdict.decision === 'allow') {
          // Then Luna reads every photo that comes through: is it a real
          // camera photo, and is it the person in the selfie.
          const luna = item.kind === 'selfie'
            ? await judgeSelfie(openai, client, item.ref)
            : await judgePhoto(openai, client, item.user_id, item.ref);
          verdict = { decision: luna.decision, reason: luna.reason };
          checkedBy = luna.model;
        }
      } else if (CONTACT.some((pattern) => pattern.test(item.ref))) {
        verdict = { decision: 'review', reason: 'Looks like contact details.' };
      } else {
        verdict = await judge(openai, item.ref, false);
      }
      await client.rpc('settle_moderation_service', {
        p_id: item.id,
        p_decision: verdict.decision,
        p_reason: `${verdict.reason} (${checkedBy})`,
      });
      tally[verdict.decision] += 1;
    } catch (error) {
      console.error('moderation failed', item.id, String(error));
      firstError ??= String(error).slice(0, 300);
      await client.rpc('release_moderation_service', { p_id: item.id });
      tally.failed += 1;
    }
  }

  // This queue is empty while the Luna metric is off. Claiming it is bounded,
  // and existing photos are never backfilled unless an operator asks for it.
  const photoClaim = await client.rpc('claim_matching_photo_analysis_service', { p_limit: 2 });
  if (photoClaim.error) {
    firstError ??= `photo claim failed: ${photoClaim.error.message}`.slice(0, 300);
  }
  const photoItems = (photoClaim.data ?? []) as PhotoAnalysisItem[];
  let photosAnalyzed = 0;
  let photosFailed = 0;
  for (const photo of photoItems) {
    try {
      const file = await client.storage.from('profile-photos').download(photo.storage_path);
      if (file.error || !file.data) throw new Error(`photo download failed: ${file.error?.message}`);
      const type = ['image/jpeg', 'image/png', 'image/webp'].includes(file.data.type)
        ? file.data.type
        : 'image/jpeg';
      const image = `data:${type};base64,${toBase64(new Uint8Array(await file.data.arrayBuffer()))}`;
      const { result, model } = await withLuna(openai, (selectedModel) => openai.responses.create({
        model: selectedModel,
        instructions: [
          'Assess only the photograph as a piece of image presentation for a private profile.',
          'Do not judge the person, their attractiveness, identity, age, ethnicity, religion, emotion, personality, or suitability.',
          'Return four numbers from 0 to 1: clarity (sharpness and visibility), lighting (useful and even exposure), framing (the subject is sensibly composed), and background_distraction (1 means highly distracting, 0 means clean).',
          'If uncertain, use 0.5. Do not infer personal traits from the image.',
        ].join(' '),
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: 'Score the presentation of this image.' },
            { type: 'input_image', image_url: image, detail: 'low' },
          ],
        }],
        max_output_tokens: 120,
        text: {
          format: {
            type: 'json_schema',
            name: 'photo_presentation',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                clarity: { type: 'number' },
                lighting: { type: 'number' },
                framing: { type: 'number' },
                background_distraction: { type: 'number' },
              },
              required: ['clarity', 'lighting', 'framing', 'background_distraction'],
              additionalProperties: false,
            },
          },
        },
      }));
      const features = parsePresentationFeatures(result.output_text ?? '');
      const saved = await client.rpc('complete_matching_photo_analysis_service', {
        p_photo_hash: photo.photo_hash,
        p_owner_id: photo.owner_id,
        p_storage_path: photo.storage_path,
        p_features: features,
        p_model_id: model,
        p_analysis_version: 'presentation-v1',
      });
      if (saved.error) throw new Error(`photo analysis save failed: ${saved.error.message}`);
      photosAnalyzed += 1;
    } catch (error) {
      console.error('matching photo analysis failed', photo.photo_hash.slice(0, 12), String(error));
      firstError ??= String(error).slice(0, 300);
      await client.rpc('release_matching_photo_analysis_service', { p_photo_hash: photo.photo_hash });
      photosFailed += 1;
    }
  }
  return Response.json({ model: MODEL, ...tally, photosAnalyzed, photosFailed, purged, firstError });
});
