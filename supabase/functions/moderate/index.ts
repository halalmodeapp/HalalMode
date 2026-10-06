/**
 * Checks queued photos and bios with OpenAI's free moderation endpoint
 * (omni-moderation-latest): no cost per photo or bio.
 *
 * allow  — nothing happens.
 * remove — a photo comes off the profile (bios are never removed automatically).
 * review — the operator is emailed to decide.
 *
 * The endpoint scores harm categories (sexual, violence, hate, harassment,
 * self-harm, illicit). It cannot tell whether a photo shows the member's own
 * face, so that is left to reports. Contact details in bios are caught with a
 * plain pattern check, since the endpoint does not look for them.
 *
 * Needs the OPENAI_API_KEY secret. Without it, items stay queued and are
 * checked once the key is set. Called every two minutes by cron.
 */
import OpenAI from 'npm:openai';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MODEL = 'omni-moderation-latest';

interface Item {
  id: number;
  user_id: string;
  kind: 'photo' | 'bio';
  ref: string;
  current: boolean;
  gender: string | null;
}

interface Verdict {
  decision: 'allow' | 'remove' | 'review';
  reason: string;
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

Deno.serve(async (request) => {
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const verified = await client.rpc('verify_mail_worker_secret', {
    p_secret: request.headers.get('x-mail-worker-secret') ?? '',
  });
  if (verified.error || verified.data !== true) return new Response('forbidden', { status: 403 });
  if (!Deno.env.get('OPENAI_API_KEY')) return new Response('OPENAI_API_KEY is not set', { status: 503 });

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
      if (item.kind === 'photo') {
        const file = await client.storage.from('profile-photos').download(item.ref);
        if (file.error || !file.data) throw new Error(`download failed: ${file.error?.message}`);
        const type = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.data.type) ? file.data.type : 'image/jpeg';
        verdict = await judge(openai, [
          { type: 'image_url', image_url: { url: `data:${type};base64,${toBase64(new Uint8Array(await file.data.arrayBuffer()))}` } },
        ], true);
      } else if (CONTACT.some((pattern) => pattern.test(item.ref))) {
        verdict = { decision: 'review', reason: 'Looks like contact details.' };
      } else {
        verdict = await judge(openai, item.ref, false);
      }
      await client.rpc('settle_moderation_service', {
        p_id: item.id,
        p_decision: verdict.decision,
        p_reason: `${verdict.reason} (${MODEL})`,
      });
      tally[verdict.decision] += 1;
    } catch (error) {
      console.error('moderation failed', item.id, String(error));
      firstError ??= String(error).slice(0, 300);
      await client.rpc('release_moderation_service', { p_id: item.id });
      tally.failed += 1;
    }
  }
  return Response.json({ model: MODEL, ...tally, firstError });
});
