/**
 * A short written summary of how two members' answers compare.
 *
 * Called from the recap screen once both members have answered every
 * question. Writes one or two plain paragraphs: where they already think
 * alike, and what is worth talking through. Never a score, never a verdict on
 * whether they should marry.
 *
 * Written once per connection and language, then reused, so each pair costs
 * one small model call, on OpenAI's cheapest tier (see _shared/luna.ts).
 * Without an OPENAI_API_KEY secret it returns
 * { summary: null } and the app shows its own simpler summary instead.
 */
import OpenAI from 'npm:openai';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { withLuna } from '../_shared/luna.ts';

import questions from './questions.json' with { type: 'json' };

const QUESTIONS = questions as Record<string, { en: string; ar: string }>;

/** Marks a summary being written, so a second request does not start another. */
const PENDING = '…';

/** The app's languages, named the way the model should write them. */
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

type SummaryData = {
  allowed: boolean;
  cached: { body: string; created_at: string } | null;
  picked: { question_id: string }[];
  answers: { user_id: string; question_id: string; body: string }[];
  people: { id: string; first_name: string }[];
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  const me = auth.user?.id;
  if (!me) return reply({ error: 'Sign in first' }, 401);

  const { connectionId, language: requested } = await request.json().catch(() => ({}));
  const language = typeof requested === 'string' && requested in LANGUAGES ? requested : 'en';
  if (typeof connectionId !== 'string') return reply({ error: 'Missing connection' }, 400);

  const { data: connection } = await admin
    .from('connections')
    .select('id, user_a, user_b, stage, closed_at')
    .eq('id', connectionId)
    .maybeSingle();
  if (!connection || connection.closed_at || (connection.user_a !== me && connection.user_b !== me)) {
    return reply({ error: 'Connection not found' }, 404);
  }
  // Only once both have answered everything, so nothing sealed leaks early.
  if (connection.stage !== 'recap' && connection.stage !== 'open') {
    return reply({ summary: null });
  }
  // This is a single service-only database snapshot: consent, the cache row,
  // and (when needed) the answer inputs are read under the same boundary.
  const loadSummaryData = () => admin.rpc('get_connection_summary_data_service', {
    p_connection_id: connectionId,
    p_viewer_id: me,
    p_language: language,
  });
  const initial = await loadSummaryData();
  const initialData = initial.data as SummaryData | null;
  if (initial.error || !initialData?.allowed) return reply({ summary: null });
  const cached = initialData.cached;
  if (cached?.body && cached.body !== PENDING) return reply({ summary: cached.body });

  if (!Deno.env.get('OPENAI_API_KEY')) return reply({ summary: null });

  // One generation per connection and language. The first request claims the
  // row; others get "not yet" and the app shows its own summary meanwhile. A
  // claim older than two minutes is treated as abandoned.
  if (cached?.body === PENDING) {
    // Being written by another request: say so, so the app keeps waiting.
    if (Date.now() - Date.parse(cached.created_at) < 120_000) return reply({ summary: null, pending: true });
    await admin.from('connection_summaries').delete()
      .eq('connection_id', connectionId).eq('language', language).eq('body', PENDING);
  }
  const claim = await admin.from('connection_summaries')
    .insert({ connection_id: connectionId, language, body: PENDING });
  if (claim.error) return reply({ summary: null, pending: true });
  const release = async () => {
    await admin.from('connection_summaries').delete()
      .eq('connection_id', connectionId).eq('language', language).eq('body', PENDING);
  };

  // Consent or relationship state may have changed while the claim was being
  // inserted. Re-load through the same guarded RPC before using any answer.
  const snapshot = await loadSummaryData();
  const data = snapshot.data as SummaryData | null;
  if (snapshot.error || !data?.allowed) {
    await release();
    return reply({ summary: null });
  }
  const { picked, answers, people } = data;
  // The provider sees "Person A" and "Person B", never names; the names go
  // back in here, after the text comes back.
  const realName = (id: string) => people?.find((p) => p.id === id)?.first_name ?? '';
  const a = connection.user_a;
  const b = connection.user_b;
  const nameOf = (id: string) => (id === a ? 'Person A' : 'Person B');

  const transcript = (picked ?? [])
    .map(({ question_id }) => {
      const question = QUESTIONS[question_id]?.en ?? question_id;
      const of = (user: string) => answers?.find((x) => x.user_id === user && x.question_id === question_id)?.body ?? '(no answer)';
      return `Question: ${question}\n${nameOf(a)}: ${of(a)}\n${nameOf(b)}: ${of(b)}`;
    })
    .join('\n\n');

  const instructions = [
    `You are writing for ${nameOf(a)} and ${nameOf(b)}, two Muslims considering marriage on Halal Mode.`,
    'They each answered the same questions privately. Write one or two short paragraphs (at most 130 words in total), addressed to both of them.',
    'Briefly and warmly summarize where their answers align and where they differ. Do not write conversation questions, chat openers, discussion prompts, or suggested next steps; the app provides chat suggestions separately.',
    'Never give a score, a percentage or a verdict on whether they suit each other. Never give religious rulings. Do not invent anything that is not in their answers. Do not quote them at length.',
    `Write in ${LANGUAGES[language]}.`,
    'Refer to them only as Person A and Person B, exactly as written.',
    'Return only the paragraphs, with no heading.',
  ].join(' ');

  let summary = '';
  try {
    const openai = new OpenAI();
    const { result } = await withLuna(openai, (model) => openai.responses.create({
      model,
      instructions,
      input: transcript,
      max_output_tokens: 500,
    }));
    summary = (result.output_text ?? '').trim().slice(0, 4000);
  } catch {
    summary = '';
  }
  if (!summary) {
    await release();
    return reply({ summary: null });
  }
  const named = summary
    .replaceAll('Person A', realName(a) || 'Person A')
    .replaceAll('Person B', realName(b) || 'Person B');

  await admin.from('connection_summaries')
    .update({ body: named })
    .eq('connection_id', connectionId).eq('language', language);
  return reply({ summary: named });
});
