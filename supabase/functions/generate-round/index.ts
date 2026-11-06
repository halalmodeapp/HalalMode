/** Builds the daily introduction rounds: starts a league worker, and more if there is work left. */
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { runLeagueWorker } from './league.ts';

/** League workers running side by side. Each is a few database connections at most. */
const LEAGUE_PARALLEL_WORKERS = 4;

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const suppliedSecret = request.headers.get('x-cron-secret') ?? '';
  const verified = await client.rpc('verify_round_scheduler_secret', {
    p_secret: suppliedSecret,
  });
  if (verified.error || verified.data !== true) {
    return new Response('Forbidden', { status: 403 });
  }

  // Small tables share a request, and a large one has it to itself, well inside the 2 s of CPU.
  const result = await runLeagueWorker(client, { computeBudgetMs: 400, wallBudgetMs: 110_000 });
  if (result.stopped === 'more') {
    const started = Number(new URL(request.url).searchParams.get('branch') ?? 0);
    // The cron's worker opens a few parallel lines. Each line then hands on to one successor.
    const successors = started === 0 ? LEAGUE_PARALLEL_WORKERS : 1;
    const carryOn = Array.from({ length: successors }, (_, line) =>
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-round?branch=${started + line + 1}`, {
        method: 'POST',
        headers: { 'x-cron-secret': suppliedSecret, 'Content-Type': 'application/json' },
        body: '{}',
      }).catch((error) => console.error('league successor failed to start:', error)));
    // Stays alive only long enough for the requests to leave; each runs under its own limits.
    await Promise.race([Promise.all(carryOn), new Promise((done) => setTimeout(done, 500))]);
  }
  return Response.json(result);
});
