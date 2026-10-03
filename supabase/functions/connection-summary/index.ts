/**
 * A short written summary of how two members' answers compare.
 *
 * Called from the recap screen once both members have answered every
 * question. Writes one or two plain paragraphs: where they already think
 * alike, and what is worth talking through. Never a score, never a verdict on
 * whether they should marry.
 *
 * Written once per connection and language, then reused, so each pair costs
 * one small model call. Without an ANTHROPIC_API_KEY secret it returns
 * { summary: null } and the app shows its own simpler summary instead.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

import questions from './questions.json' with { type: 'json' };

const MODEL = 'claude-haiku-4-5-20251001';
const QUESTIONS = questions as Record<string, { en: string; ar: string }>;

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

  const { data: cached } = await admin
    .from('connection_summaries')
    .select('body')
    .eq('connection_id', connectionId)
    .eq('language', language)
    .maybeSingle();
  if (cached?.body) return reply({ summary: cached.body });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return reply({ summary: null });

  const [{ data: picked }, { data: answers }, { data: people }] = await Promise.all([
    admin.from('connection_questions').select('question_id').eq('connection_id', connectionId),
    admin.from('question_answers').select('user_id, question_id, body').eq('connection_id', connectionId),
    admin.from('profiles').select('id, first_name').in('id', [connection.user_a, connection.user_b]),
  ]);
  const nameOf = (id: string) => people?.find((p) => p.id === id)?.first_name ?? 'They';
  const a = connection.user_a;
  const b = connection.user_b;

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
    'First say, warmly and specifically, where their answers already sound alike. Then name the one or two things most worth talking through together, as gentle prompts rather than problems.',
    'Never give a score, a percentage or a verdict on whether they suit each other. Never give religious rulings. Do not invent anything that is not in their answers. Do not quote them at length.',
    `Write in ${LANGUAGES[language]}.`,
    'Return only the paragraphs, with no heading.',
  ].join(' ');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: instructions,
      messages: [{ role: 'user', content: transcript }],
    }),
  });
  if (!response.ok) return reply({ summary: null });
  const result = await response.json();
  const summary = (result.content ?? [])
    .filter((part: { type: string }) => part.type === 'text')
    .map((part: { text: string }) => part.text)
    .join('\n')
    .trim()
    .slice(0, 4000);
  if (!summary) return reply({ summary: null });

  await admin.from('connection_summaries').insert({ connection_id: connectionId, language, body: summary });
  return reply({ summary });
});
