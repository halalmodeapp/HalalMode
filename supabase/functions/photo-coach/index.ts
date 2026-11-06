/**
 * Halal Bot: looks at a member's own photos when they ask, and says how to make them more attractive.
 *
 * What they are allowed is decided in the database (`photo_coach_claim_service`). A look that fails costs
 * them nothing. Without an OPENAI_API_KEY secret it does nothing, and says so.
 */
import OpenAI from 'npm:openai';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

import { FALLBACK_MODEL } from '../_shared/luna.ts';
import { parsePhotoAdvice, PHOTO_ADVICE_SCHEMA, photoAdviceInstructions } from '../_shared/photoCoach.ts';

/** Luna 6.1 on low effort, and the model the rest of the app uses if that is unavailable. */
const COACH_MODEL = Deno.env.get('PHOTO_COACH_MODEL') ?? 'gpt-6.1-luna';

const LANGUAGES: Record<string, string> = {
  en: 'English', ar: 'Arabic', ur: 'Urdu', fa: 'Persian (Farsi)', hi: 'Hindi',
  id: 'Indonesian', ms: 'Malay', bn: 'Bengali', fr: 'French', tr: 'Turkish',
  ha: 'Hausa', am: 'Amharic', so: 'Somali', es: 'Spanish', ru: 'Russian',
  'zh-Hans': 'Simplified Chinese',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  const me = auth.user?.id;
  if (!me) return reply({ error: 'Sign in first' }, 401);
  if (!Deno.env.get('OPENAI_API_KEY')) return reply({ error: 'unavailable' }, 503);

  const { language: requested } = await request.json().catch(() => ({}));
  const language = LANGUAGES[typeof requested === 'string' ? requested : 'en'] ?? LANGUAGES.en!;

  const claimed = await admin.rpc('photo_coach_claim_service', { p_user: me });
  if (claimed.error) return reply({ error: claimed.error.message }, 500);
  const { token: claim, photos } = claimed.data as { token: string; photos: string[] };

  const openai = new OpenAI();
  let looked = 0;
  for (const photo of photos) {
    try {
      const file = await admin.storage.from('profile-photos').download(photo);
      if (file.error || !file.data) continue;
      const type = ['image/jpeg', 'image/png', 'image/webp'].includes(file.data.type) ? file.data.type : 'image/jpeg';
      const image = `data:${type};base64,${encodeBase64(new Uint8Array(await file.data.arrayBuffer()))}`;
      const ask = (model: string) => openai.responses.create({
        model,
        instructions: photoAdviceInstructions(language),
        input: [{ role: 'user', content: [
          { type: 'input_text', text: 'Here is my profile photo. How can I make it better?' },
          { type: 'input_image', image_url: image, detail: 'high' },
        ] }] as never,
        reasoning: { effort: 'low' },
        max_output_tokens: 400,
        text: { format: { type: 'json_schema', name: 'photo_advice', strict: true, schema: PHOTO_ADVICE_SCHEMA as unknown as Record<string, unknown> } },
      });
      let model = COACH_MODEL;
      const answer = await ask(COACH_MODEL).catch(() => {
        model = FALLBACK_MODEL;
        return ask(FALLBACK_MODEL);
      });
      const advice = parsePhotoAdvice(answer.output_text ?? '');
      if (!advice) continue;
      const saved = await admin.rpc('photo_coach_save_fenced_service', { p_user: me, p_photo: photo, p_token: claim, p_advice: advice, p_model: model });
      if (!saved.error && saved.data === true) looked += 1;
    } catch (error) {
      console.error('photo coach look failed:', error);
    }
  }
  return reply({ looked, asked: photos.length });
});
