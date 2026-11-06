/**
 * The hosted test: the real Edge function, PostgREST, Auth and cron, on a throwaway Supabase project.
 * The local harness (run.mts) covers scale and behaviour. This covers what only exists on real servers.
 *
 *   TEST_DB_URL=... TEST_REF=... TEST_ANON=... TEST_SERVICE=... node scripts/backend-sim/hosted.mts <step>
 *
 * Steps: secure, seed, watch, burst, concurrency, journey, nextday, facts.
 * Refuses to run against the live project.
 */
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const pg = createRequire(import.meta.url)('pg');

const LIVE_REF = 'lfuuywsmydruvqkqwvzw';
const { TEST_DB_URL, TEST_REF, TEST_ANON, TEST_SERVICE } = process.env;
if (!TEST_DB_URL || !TEST_REF) throw new Error('Set TEST_DB_URL and TEST_REF');
if (TEST_REF === LIVE_REF || TEST_DB_URL.includes(LIVE_REF)) throw new Error('Refusing to run against the live project.');

const BASE = `https://${TEST_REF}.supabase.co`;
const pool = new pg.Pool({ connectionString: TEST_DB_URL, ssl: { rejectUnauthorized: false }, max: 4 });
const sql = async (text: string, args: unknown[] = []) => (await pool.query(text, args)).rows;
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const log = (...parts: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...parts);

const INVARIANTS: Record<string, string> = {
  mislinked_introductions: `select count(*) from public.introductions a join public.introductions b on b.id = a.reciprocal_id
    where b.reciprocal_id <> a.id or b.viewer_id <> a.subject_id or b.subject_id <> a.viewer_id`,
  waiting_yes_lost: `select count(*) from halal_mode_private.league_returns w
    left join public.introduction_selections s on s.introduction_id = w.introduction_id and s.decision = 'kept'
    where s.introduction_id is null`,
  same_gender: `select count(*) from public.introductions i join public.profiles a on a.id = i.viewer_id
    join public.profiles b on b.id = i.subject_id where a.gender = b.gender`,
  over_budget: `select count(*) from (select r.id from public.rounds r join public.introductions i on i.round_id = r.id
    group by r.id, r.seats having count(*) > r.seats) x`,
  duplicate_in_set: `select count(*) from (select round_id, subject_id from public.introductions group by 1, 2 having count(*) > 1) x`,
  connection_without_mutual: `select count(*) from public.connections c where not exists (
    select 1 from public.introductions i
    join public.introduction_selections a on a.introduction_id = i.id and a.decision in ('kept', 'expired')
    join public.introduction_selections b on b.introduction_id = i.reciprocal_id and b.decision in ('kept', 'expired')
    where i.viewer_id = c.user_a and i.subject_id = c.user_b)`,
};

async function facts() {
  const [row] = await sql(`select
    (select cycle_date from halal_mode_private.league_cycles order by cycle_date desc limit 1) cycle,
    (select phase from halal_mode_private.league_cycles order by cycle_date desc limit 1) phase,
    (select count(*)::int from halal_mode_private.league_jobs j where j.cycle_date = (select max(cycle_date) from halal_mode_private.league_cycles)) jobs,
    (select count(*)::int from halal_mode_private.league_jobs j where j.status = 'failed') failed_jobs,
    (select count(*)::int from halal_mode_private.league_jobs j where j.last_error is not null) jobs_with_error,
    (select count(*)::int from public.rounds r where r.cycle_date = (select max(cycle_date) from halal_mode_private.league_cycles)) rounds,
    (select count(*)::int from public.rounds r where r.cycle_date = (select max(cycle_date) from halal_mode_private.league_cycles)
       and (select count(*) from public.introductions i where i.round_id = r.id) >= 5) sets_with_five,
    (select count(*)::int from public.rounds r where r.cycle_date = (select max(cycle_date) from halal_mode_private.league_cycles)
       and not exists (select 1 from public.introductions i where i.round_id = r.id)) sets_empty,
    (select count(*)::int from public.introductions i join public.rounds r on r.id = i.round_id
       where r.cycle_date = (select max(cycle_date) from halal_mode_private.league_cycles) and i.reciprocal_id is null) one_way,
    (select count(*)::int from halal_mode_private.league_returns) waiting,
    (select count(*)::int from public.connections) connections`);
  const bad: Record<string, number> = {};
  for (const [name, text] of Object.entries(INVARIANTS)) {
    const n = Number((await sql(text))[0].count);
    if (n) bad[name] = n;
  }
  const http = await sql(`select status_code, count(*)::int n from net._http_response group by 1 order by 1`).catch(() => []);
  return { ...row, broken: bad, http };
}

// ---------------------------------------------------------------------------- steps

/** Nothing here may call the live project, and the one job left calls this one. */
async function secure() {
  const before = await sql(`select jobname from cron.job where command like '%${LIVE_REF}%'`);
  log('jobs pointing at the live project:', before.length);
  await sql(`select cron.unschedule(jobid) from cron.job where jobname <> 'halal-mode-league'`);
  const [job] = await sql(`select jobid, command from cron.job where jobname = 'halal-mode-league'`);
  await sql(`select cron.alter_job($1::bigint, command := $2)`, [job.jobid, job.command.replaceAll(LIVE_REF, TEST_REF)]);
  const left = await sql(`select jobname, schedule, command like '%${TEST_REF}%' as here, command like '%${LIVE_REF}%' as live from cron.job`);
  log('jobs left:', JSON.stringify(left));
  await sql(`update halal_mode_private.league_config set start_minute_utc = extract(hour from now() at time zone 'utc')::int * 60`);
  // Off until there are members to match.
  await sql(`update halal_mode_private.release_flags set enabled = false where key = 'league_matching'`);
}

const BIO = 'A kind and steady person who is looking to build a calm and faithful home with the right person.';

async function seed(total: number, menShare: number) {
  // Adds to whoever is there. Consent history is append-only, so members are never deleted here.
  await sql(`update halal_mode_private.release_flags set enabled = false where key = 'league_matching'`);
  const [{ n: already }] = await sql(`select count(*)::int n from auth.users where email like 'hosted-%@halalmodetest.com'`);
  const rows = Array.from({ length: total }, (_, at) => {
    const index = already + at;
    const male = at < total * menShare;
    const age = 24 + (index % 14);
    return {
      id: randomUUID(), email: `hosted-${index}@halalmodetest.com`, gender: male ? 'male' : 'female', tier: index % 10 === 0 ? 'premium' : 'free',
      birth: `${2026 - age}-03-01`, lat: 51.5 + (index % 20) / 200, lng: -0.12 + (index % 20) / 200, name: `Hosted${index}`,
      dress: male ? 'trimmed_beard' : 'hijab', min_age: Math.max(18, age - 8), max_age: age + 8, height: male ? 176 : 163, build: 'Average',
    };
  });
  const payload = JSON.stringify(rows);
  const recordset = `jsonb_to_recordset($1::jsonb) as s(id uuid, email text, gender gender, tier membership_tier, birth date, lat float8, lng float8, name text, dress text, min_age int, max_age int, height int, build text)`;
  await sql(`insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, now(), extensions.crypt('hosted-test-only', extensions.gen_salt('bf', 4)), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from ${recordset}`, [payload]);
  await signable();
  await sql(`insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    select gen_random_uuid(), id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now() from ${recordset}`, [payload]);
  await sql(`insert into public.profiles (
      id, name, first_name, birth_date, gender, tier, city, country, latitude, longitude, bio, photos, onboarding_complete,
      religious_practice, timeline, sect, family_goals, family_goals_answered_at, relocation, languages_spoken, education,
      occupation, has_children, marital_status, religious_dress, ethnicities, heritage_countries)
    select id, name, name, birth, gender, tier, 'London', 'United Kingdom', lat, lng, '${BIO}', array['sim/' || id || '.jpg'], true,
      'practicing', 'within_1_year', 'sunni', 'wants_children_soon', now(), 'preferred_local', array['English'], 'University',
      'Engineer', 'no', 'never_married', dress, array['south_asian'], array['PK']
    from ${recordset}
    on conflict (id) do update set name = excluded.name, first_name = excluded.first_name, birth_date = excluded.birth_date, gender = excluded.gender,
      tier = excluded.tier, city = excluded.city, country = excluded.country, latitude = excluded.latitude, longitude = excluded.longitude, bio = excluded.bio,
      photos = excluded.photos, onboarding_complete = true, religious_practice = excluded.religious_practice, timeline = excluded.timeline, sect = excluded.sect,
      family_goals = excluded.family_goals, family_goals_answered_at = excluded.family_goals_answered_at, relocation = excluded.relocation,
      languages_spoken = excluded.languages_spoken, education = excluded.education, occupation = excluded.occupation, has_children = excluded.has_children,
      marital_status = excluded.marital_status, religious_dress = excluded.religious_dress, ethnicities = excluded.ethnicities, heritage_countries = excluded.heritage_countries`, [payload]);
  await sql(`insert into public.private_preferences (user_id, min_age, max_age, preferred_countries, max_distance_km, own_height_cm, own_build, matching_preferences_completed_at)
    select id, min_age, max_age, array['United Kingdom'], 100, height, build, now() from ${recordset}
    on conflict (user_id) do update set min_age = excluded.min_age, max_age = excluded.max_age, preferred_countries = excluded.preferred_countries,
      max_distance_km = excluded.max_distance_km, own_height_cm = excluded.own_height_cm, own_build = excluded.own_build,
      matching_preferences_completed_at = excluded.matching_preferences_completed_at`, [payload]);
  await sql(`insert into halal_mode_private.member_legal_consent_history (user_id, document_type, version, acceptance_context)
    select p.id, d.document_type, d.version, 'onboarding' from public.profiles p
    cross join halal_mode_private.legal_document_registry d
    where d.is_current and p.id in (select id from ${recordset})`, [payload]);
  await sql(`update public.profiles set sensitive_consent_at = now() where sensitive_consent_at is null`);
  // Premium comes from an entitlement, and the profile's tier only mirrors it.
  await sql(`insert into halal_mode_private.member_entitlements (user_id, tier, state, provider)
    select id, 'premium', 'active', 'legacy' from public.profiles where tier = 'premium'
    on conflict (user_id) do nothing`);
  await sql('analyze');
  log('in pool', (await sql(`select count(*)::int n from halal_mode_private.league_pool`))[0].n);
}

/** Auth cannot read these columns as null, so accounts written directly need them set. */
const signable = () => sql(`update auth.users set confirmation_token = '', recovery_token = '', email_change_token_new = '', email_change = ''
  where email like 'hosted-%@halalmodetest.com'`);

/** Takes jobs and is never heard from again, as a worker that died would. Another must pick them up. */
async function abandon(count: number) {
  await sql(`update halal_mode_private.release_flags set enabled = true where key = 'league_matching'`);
  const started = Date.now();
  const held: string[] = [];
  while (held.length < count && Date.now() - started < 150_000) {
    const answer = await fetch(`${BASE}/rest/v1/rpc/league_next_job_service`, {
      method: 'POST', headers: { apikey: TEST_SERVICE!, Authorization: `Bearer ${TEST_SERVICE}`, 'Content-Type': 'application/json' }, body: '{}',
    });
    const job = await answer.json() as { kind?: string; job?: { wave: number; tableNo: number } };
    if (job.kind === 'table' || job.kind === 'prepare') {
      held.push(`${job.kind} ${job.job?.wave}/${job.job?.tableNo}`);
      // Its seats and rounds still have to be done by whoever takes over.
      continue;
    }
    if (job.kind === 'done') break;
    await sleep(1500);
  }
  log('walked away from', JSON.stringify(held));
}

/** Turns the switch on and leaves it to cron and the Edge function. */
async function watch(maxMinutes: number, crashes = false) {
  await sql(`update halal_mode_private.release_flags set enabled = true where key = 'league_matching'`);
  const started = Date.now();
  while (Date.now() - started < maxMinutes * 60_000) {
    await sleep(10_000);
    if (crashes) {
      // A worker that died: its lease runs out with the job unfinished, and another must take over.
      const hit = await sql(`update halal_mode_private.league_jobs set lease_until = now() - interval '1 second'
        where status = 'leased' and random() < 0.5 returning 1`);
      if (hit.length) log('leases broken', hit.length);
    }
    const now = await facts();
    log(JSON.stringify({ phase: now.phase, jobs: now.jobs, rounds: now.rounds, five: now.sets_with_five, oneWay: now.one_way, failed: now.failed_jobs, http: now.http }));
    if (now.phase === 'sealed') {
      log('sealed after', Math.round((Date.now() - started) / 1000), 's');
      return;
    }
  }
  throw new Error(`not sealed in ${maxMinutes} minutes`);
}

/** Many requests at once, as overlapping cron ticks would be, and a stranger knocking. */
async function burst() {
  const url = `${BASE}/functions/v1/generate-round`;
  const stranger = await fetch(url, { method: 'POST', headers: { 'x-cron-secret': 'wrong', Authorization: `Bearer ${TEST_ANON}` }, body: '{}' });
  log('wrong secret:', stranger.status);
  const [{ decrypted_secret: secret }] = await sql(`select decrypted_secret from vault.decrypted_secrets where name = 'halal_mode_round_scheduler' order by created_at desc limit 1`);
  const answers = await Promise.all(Array.from({ length: 12 }, () =>
    fetch(url, { method: 'POST', headers: { 'x-cron-secret': secret, 'Content-Type': 'application/json' }, body: '{}' })
      .then(async (r) => ({ status: r.status, body: (await r.text()).slice(0, 160) }))));
  log('burst:', JSON.stringify(answers.map((a) => a.status)), answers[0]?.body);
}

/** Calls the real function over and over, as cron and its fan-out do, and counts how each call ended. */
async function drive(maxMinutes: number) {
  await sql(`update halal_mode_private.release_flags set enabled = true where key = 'league_matching'`);
  const [{ decrypted_secret: secret }] = await sql(`select decrypted_secret from vault.decrypted_secrets where name = 'halal_mode_round_scheduler' order by created_at desc limit 1`);
  const url = `${BASE}/functions/v1/generate-round?branch=9`;
  const statuses: Record<string, number> = {};
  let worst = 0;
  const started = Date.now();
  let done = false;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (!done && Date.now() - started < maxMinutes * 60_000) {
      const answer = await fetch(url, { method: 'POST', headers: { 'x-cron-secret': secret, 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null);
      const status = String(answer?.status ?? 'network');
      statuses[status] = (statuses[status] ?? 0) + 1;
      const text = await answer?.text().catch(() => '') ?? '';
      try {
        const body = JSON.parse(text) as { stopped?: string; worstTableMs?: number };
        worst = Math.max(worst, body.worstTableMs ?? 0);
        if (body.stopped === 'done') done = true;
      } catch { /* a function that was killed says nothing useful */ }
    }
  }));
  log(done ? 'sealed' : 'NOT sealed', 'after', Math.round((Date.now() - started) / 1000), 's', JSON.stringify(statuses), 'worst table', Math.round(worst), 'ms');
  await sql(`update halal_mode_private.release_flags set enabled = false where key = 'league_matching'`);
}

async function signIn(email: string) {
  const answer = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: TEST_ANON!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'hosted-test-only' }),
  });
  const body = await answer.json() as { access_token?: string; msg?: string };
  if (!body.access_token) throw new Error(`sign in failed for ${email}: ${answer.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body.access_token;
}
const rpc = async (token: string, name: string, args: Record<string, unknown> = {}) => {
  const answer = await fetch(`${BASE}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: { apikey: TEST_ANON!, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
  });
  const text = await answer.text();
  return { status: answer.status, body: text ? JSON.parse(text) : null };
};

/** Sets opened, so people can act on them. */
const openSets = () => sql(`update public.rounds set opens_at = now() - interval '1 minute'
  where cycle_date = (select max(cycle_date) from halal_mode_private.league_cycles)`);

/** Real sign-ins and PostgREST: someone picks and passes at the same moment, or asks twice at once. */
async function concurrency() {
  await openSets();
  const people = await sql(`select p.id, u.email, r.id as round_id from public.profiles p join auth.users u on u.id = p.id
    join public.rounds r on r.user_id = p.id and r.cycle_date = (select max(cycle_date) from halal_mode_private.league_cycles)
    where p.gender = 'male' and p.tier = 'free' order by p.id limit 12`);
  const statuses: Record<string, number> = {};
  const count = (key: string) => { statuses[key] = (statuses[key] ?? 0) + 1; };
  for (const person of people) {
    const token = await signIn(person.email);
    const cards = await sql(`select id, subject_id, reciprocal_id from public.introductions where round_id = $1 and viewer_id = $2 order by reciprocal_id is null desc`, [person.round_id, person.id]);
    const state = await rpc(token, 'get_current_round');
    count(`get_current_round ${state.status}`);
    const [a, b] = cards;
    if (!a || !b) continue;
    const answers = await Promise.all([
      rpc(token, 'pass_introduction', { p_introduction_id: b.id }),
      rpc(token, 'pass_introduction', { p_introduction_id: b.id }),
      rpc(token, 'submit_round_selections_ranked_with_signals', { p_round_id: person.round_id, p_ordered_introduction_ids: [a.id], p_engagement: [] }),
    ]);
    for (const answer of answers) count(`act ${answer.status}`);
    const [exposure] = await sql(`select explicit_pass_count from halal_mode_private.pair_exposure
      where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [person.id, b.subject_id]);
    count(`passes counted ${exposure?.explicit_pass_count ?? 0}`);
  }
  log('concurrency', JSON.stringify(statuses));

  // What a member must not reach.
  const token = await signIn(people[0].email);
  for (const name of ['league_next_job_service', 'league_commit_edges_service', 'league_finish_job_service', 'photo_coach_claim_service']) {
    const answer = await rpc(token, name, name === 'league_next_job_service' ? {} : { p_job: {}, p_edges: [], p_user: people[0].id });
    log('member calling', name, answer.status);
  }
  log(JSON.stringify(await facts()));
}

/** Yesterday, as the database sees it, so a second day can be dealt without waiting for one. */
async function nextDay() {
  // Two steps, so a date that must stay unique never collides with yesterday's row.
  await sql(`update public.rounds set cycle_date = cycle_date - 40000 where cycle_date is not null`);
  await sql(`update public.rounds set cycle_date = cycle_date + 39999, opens_at = opens_at - interval '2 days', expires_at = expires_at - interval '2 days' where cycle_date is not null`);
  await sql(`delete from halal_mode_private.league_cycles`);
  // A real new day would start a new schedule once this one's rotation is done.
  await sql(`delete from halal_mode_private.league_schedules`);
  // A little at a time: each row takes locks, and a small server only has room for so many at once.
  for (let part = 0; part < 256; part += 1) {
    await sql(`update halal_mode_private.pair_exposure set last_shown_at = last_shown_at - interval '2 days'
      where abs(hashtext(user_low::text || user_high::text)) % 256 = $1`, [part]);
  }
  await sql(`update halal_mode_private.league_returns set created_at = created_at - interval '1 day', expires_at = expires_at - interval '1 day'`);
  log('moved to yesterday');
}

/** The whole path of a one-way card through real sign-ins: yes, wait, delivered, answered, matched. */
async function journey() {
  await openSets();
  const [wait] = await sql(`select w.recipient, w.sender, w.introduction_id, w.delivered_id, d.id as card, r.id as round_id, u.email, s.email as sender_email
    from halal_mode_private.league_returns w
    join public.introductions d on d.id = w.delivered_id
    join public.rounds r on r.id = d.round_id and r.cycle_date = (select max(cycle_date) from halal_mode_private.league_cycles)
    join auth.users u on u.id = w.recipient
    join auth.users s on s.id = w.sender
    limit 1`);
  if (!wait) throw new Error('no delivered yes to answer');
  log('a yes reached its recipient');
  const token = await signIn(wait.email);
  const shown = await rpc(token, 'get_current_round');
  const cards = (shown.body?.introductions ?? []) as { id: string }[];
  log('it is in their set:', cards.some((c) => c.id === wait.card), 'of', cards.length);
  const before = (await sql(`select count(*)::int n from public.connections`))[0].n;
  const answer = await rpc(token, 'submit_round_selections_ranked_with_signals', { p_round_id: wait.round_id, p_ordered_introduction_ids: [wait.card], p_engagement: [] });
  log('answering yes:', answer.status, JSON.stringify(answer.body).slice(0, 160));
  log('connections before and after:', before, (await sql(`select count(*)::int n from public.connections`))[0].n);
  log('wait over:', (await sql(`select count(*)::int n from halal_mode_private.league_returns where recipient = $1 and sender = $2`, [wait.recipient, wait.sender]))[0].n === 0);

  // Someone who said yes must not be able to see a thing about whether it was seen.
  const sender = await signIn(wait.sender_email);
  const tray = await rpc(sender, 'get_my_liked_you');
  log('sender tray status', tray.status);
  log(JSON.stringify(await facts()));
}

const step = process.argv[2];
try {
  if (step === 'secure') await secure();
  else if (step === 'seed') await seed(Number(process.argv[3] ?? 1000), Number(process.argv[4] ?? 0.65));
  else if (step === 'watch') await watch(Number(process.argv[3] ?? 15), process.argv[4] === 'crashes');
  else if (step === 'burst') await burst();
  else if (step === 'drive') await drive(Number(process.argv[3] ?? 8));
  else if (step === 'signable') await signable();
  else if (step === 'abandon') await abandon(Number(process.argv[3] ?? 2));
  else if (step === 'concurrency') await concurrency();
  else if (step === 'nextday') await nextDay();
  else if (step === 'journey') await journey();
  else log(JSON.stringify(await facts()));
} finally {
  await pool.end();
}
