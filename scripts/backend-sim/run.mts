/**
 * Backend simulation: thousands of fake members use the real database.
 *
 * Everything that decides an outcome is the production code: the migrations'
 * SQL, its RLS and triggers, the same RPCs the app calls as each member, and the
 * generate-round modules. Only the members are simulated (behaviour.mts).
 *
 * Refuses to run anywhere but a local database, so it cannot touch live members.
 *
 *   node scripts/backend-sim/run.mts --per-side 5000 --days 7
 *
 * See docs/BACKEND_SIMULATION.md.
 */

import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';

import { runLeagueWorker, type WorkerResult } from '../../supabase/functions/generate-round/league.ts';
import { Behaviour, SCENARIOS, gaussian, pickFrom, prng, weighted, type Member } from './behaviour.mts';

const pg = createRequire(import.meta.url)('pg');
pg.types.setTypeParser(1700, Number); // numeric: scores arrive as numbers, as they do through PostgREST
pg.types.setTypeParser(20, Number); // bigint counts

function flag(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1]! : fallback;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const PER_SIDE = Number(flag('per-side', '500'));
// Share of members who are men. Half by default.
const MEN = Number(flag('men', '0.5'));
const DAYS = Number(flag('days', '7'));
const SEED = Number(flag('seed', '20261104'));
/** League workers running at once, as a cron tick and its fan-out would. */
const WORKERS = Number(flag('workers', '8'));
/** Chance that a worker dies at each write, some before it lands and some after, with the answer lost. */
const CHAOS = Number(flag('chaos', '0'));
const SCENARIO = flag('scenario', 'base');
/** A simulated day lasts this long. 12 minutes is 120x real time, so the load is a deliberate overload. */
const DAY_MINUTES = Number(flag('day-minutes', '12'));
/** Roughly the connections PostgREST holds on a small Supabase instance. */
const POOL = Number(flag('pool', '20'));
const OUT = flag('out', `sim-results/league-${PER_SIDE}-${SCENARIO}.json`);
const BASE_URL = flag('database-url', process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:54322/postgres');

/** Share of members living outside the UK, in other countries' main cities. 0 keeps everyone in London. */
const ABROAD = Number(flag('abroad', '0'));
const ABROAD_CITIES = [['Pakistan', 24.86, 67.0], ['Bangladesh', 23.81, 90.41], ['Saudi Arabia', 24.71, 46.68], ['Turkey', 41.01, 28.98], ['Nigeria', 6.52, 3.38]] as const;

/** Published Supabase Edge Function limits, which generate-round runs under. */
const EDGE_CPU_MS = 2_000;
const EDGE_MEMORY_MB = 256;
const EDGE_IDLE_MS = 150_000;
const DEFAULT_STATEMENT_TIMEOUT_MS = 8_000;

const safetyHost = new URL(BASE_URL).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(safetyHost)) {
  throw new Error(`Refusing to simulate against ${safetyHost}: this harness writes thousands of fake members.`);
}
const scenario = SCENARIOS[SCENARIO];
if (!scenario) throw new Error(`Unknown scenario ${SCENARIO}`);

const random = prng(SEED);
const behaviour = new Behaviour(scenario, SEED);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const log = (...parts: unknown[]) => console.error(new Date().toISOString().slice(11, 19), ...parts);

// ------------------------------------------------------------------ database

interface Signature { args: Map<string, string>; timeoutMs: number; returnsSet: boolean }
interface RpcResult { data: any; error: { message: string; code?: string } | null }

class Database {
  pool: any;
  admin: any;
  signatures = new Map<string, Signature[]>();
  latency = new Map<string, number[]>();
  errors = new Map<string, number>();
  overLimit = new Map<string, { calls: number; worstMs: number; limitMs: number }>();
  queueWaits: number[] = [];

  async connect(url: string) {
    this.pool = new pg.Pool({ connectionString: url, max: POOL });
    this.pool.on('error', () => {});
    this.admin = new pg.Pool({ connectionString: url, max: 3 });
    const { rows } = await this.admin.query(`
      select p.proname, p.proretset, p.proconfig,
             coalesce(p.proargnames, '{}') names,
             array(select format_type(t, null) from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) t) types,
             coalesce(p.proargmodes::text[], '{}') modes
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'`);
    for (const row of rows) {
      const args = new Map<string, string>();
      (row.names as string[]).forEach((name, at) => {
        const mode = (row.modes as string[])[at];
        if (name && (!mode || mode === 'i')) args.set(name, (row.types as string[])[at]!);
      });
      const timeout = (row.proconfig as string[] | null)?.find((c) => c.startsWith('statement_timeout='));
      const seconds = timeout ? parseInt(timeout.split('=')[1]!, 10) : 0;
      const list = this.signatures.get(row.proname) ?? [];
      list.push({ args, timeoutMs: seconds ? seconds * 1000 : DEFAULT_STATEMENT_TIMEOUT_MS, returnsSet: row.proretset });
      this.signatures.set(row.proname, list);
    }
  }

  /**
   * One RPC, the way PostgREST would make it: its own transaction, the caller's
   * role and JWT claims, and the function's own statement timeout.
   *
   * `generous` lets a slow backend call finish so the run can continue, and
   * records that it would have been killed in production instead of stopping.
   */
  async rpc(claims: object, role: string, fn: string, args: Record<string, unknown> = {}, generous = false): Promise<RpcResult> {
    const names = Object.keys(args);
    const signature = (this.signatures.get(fn) ?? []).find((s) => names.every((n) => s.args.has(n)));
    if (!signature) throw new Error(`No public function ${fn}(${names.join(', ')})`);
    const values = names.map((name) => {
      const type = signature.args.get(name)!;
      return /^jsonb?$/.test(type) ? JSON.stringify(args[name]) : args[name];
    });
    const params = names.map((name, at) => `${name} => $${at + 1}::${signature.args.get(name)}`).join(', ');
    const timeoutMs = generous ? 1_800_000 : signature.timeoutMs;

    const waited = performance.now();
    const client = await this.pool.connect();
    this.queueWaits.push(performance.now() - waited);
    const started = performance.now();
    try {
      await client.query('begin');
      await client.query(
        `select set_config('role', $1, true), set_config('request.jwt.claims', $2, true), set_config('statement_timeout', $3, true)`,
        [role, JSON.stringify(claims), String(timeoutMs)]
      );
      const result = await client.query(`select * from public.${fn}(${params})`, values);
      await client.query('commit');
      this.record(fn, performance.now() - started, signature.timeoutMs);
      const single = result.fields.length === 1 && result.fields[0].name === fn;
      const rows = single ? result.rows.map((row: any) => row[fn]) : result.rows;
      return { data: signature.returnsSet || !single ? rows : rows[0], error: null };
    } catch (error: any) {
      await client.query('rollback').catch(() => {});
      this.record(fn, performance.now() - started, signature.timeoutMs);
      const key = `${fn}: ${error.code ?? '?'} ${String(error.message).slice(0, 90)}`;
      this.errors.set(key, (this.errors.get(key) ?? 0) + 1);
      return { data: null, error: { message: String(error.message), code: error.code } };
    } finally {
      client.release();
    }
  }

  private record(fn: string, ms: number, limitMs: number) {
    (this.latency.get(fn) ?? this.latency.set(fn, []).get(fn)!).push(ms);
    if (ms > limitMs) {
      const entry = this.overLimit.get(fn) ?? { calls: 0, worstMs: 0, limitMs };
      entry.calls += 1;
      entry.worstMs = Math.max(entry.worstMs, Math.round(ms));
      this.overLimit.set(fn, entry);
    }
  }

  service = (fn: string, args: Record<string, unknown> = {}, generous = true) =>
    this.rpc({ role: 'service_role' }, 'service_role', fn, args, generous);

  member = (id: string, fn: string, args: Record<string, unknown> = {}) =>
    this.rpc({ sub: id, role: 'authenticated', aud: 'authenticated' }, 'authenticated', fn, args);

  sql = async (text: string, values: unknown[] = []) => (await this.admin.query(text, values)).rows;
}

const db = new Database();

const percentile = (sorted: number[], p: number) =>
  sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]! * 10) / 10 : 0;

function latencySummary() {
  const out: Record<string, object> = {};
  for (const [fn, values] of db.latency) {
    const sorted = [...values].sort((a, b) => a - b);
    out[fn] = { calls: sorted.length, p50: percentile(sorted, 0.5), p95: percentile(sorted, 0.95), p99: percentile(sorted, 0.99), max: percentile(sorted, 1) };
  }
  return out;
}

// ---------------------------------------------------------------- population

const HERITAGE = [['PK', 'south_asian', 0.3], ['BD', 'south_asian', 0.22], ['IN', 'south_asian', 0.07], ['SO', 'black', 0.08], ['NG', 'black', 0.05],
  ['TR', 'turkic', 0.05], ['IQ', 'arab', 0.05], ['DZ', 'arab', 0.05], ['MA', 'arab', 0.05], ['AF', 'central_asian', 0.04], ['GB', 'white', 0.04]] as const;
const PRACTICE = [['very_practicing', 0.15], ['practicing', 0.45], ['moderate', 0.3], ['learning', 0.1]] as const;
const TIMELINE = [['within_3_months', 0.1], ['within_6_months', 0.25], ['within_1_year', 0.4], ['1_to_2_years', 0.25]] as const;
const SECT = [['sunni', 0.86], ['shia', 0.07], ['other', 0.02], ['prefer_not_to_say', 0.05]] as const;
const FAMILY = [['wants_children_soon', 0.35], ['wants_children_later', 0.35], ['open_to_children', 0.25], ['no_children', 0.05]] as const;
const BUILDS = ['Slim', 'Athletic', 'Muscular', 'Average', 'Curvy', 'Stocky', 'Full-Figured'];
const BIO = 'Sim member. Londoner, family first, works hard, prays when I can, looking for someone kind to build a life with.';

/** The countries a member chooses: their own, and with people abroad in this run, sometimes others. */
function lookingIn(home: string): string[] {
  const everywhere = ['United Kingdom', ...ABROAD_CITIES.map((c) => c[0])];
  if (!ABROAD) return [home];
  const kind = random();
  if (kind < 0.5) return [home];
  if (kind < 0.8) return [home, pickFrom(random, everywhere.filter((c) => c !== home))];
  return everywhere;
}

function makeMembers(): Member[] {
  const members: Member[] = [];
  const total = PER_SIDE * 2;
  for (let index = 0; index < total; index += 1) {
    const gender = index < total * MEN ? 'male' as const : 'female' as const;
    const age = Math.round(Math.min(45, Math.max(21, (gender === 'male' ? 30 : 27.5) + gaussian(random) * 4.5)));
    const spread = 3 + Math.floor(random() * 6);
    const distance = 10 * Math.sqrt(random()); // km from central London
    const angle = 2 * Math.PI * random();
    const practice = weighted(random, PRACTICE);
    const mustHave: Record<string, boolean> = {};
    if (random() < 0.35) mustHave.age = true;
    if (random() < 0.2) mustHave.distance = true;
    if (random() < 0.15) mustHave.practice = true;
    if (random() < 0.25) mustHave.sect = true;
    if (random() < 0.05) mustHave.timeline = true;
    const habit = weighted(random, scenario!.habits.map((h) => [h.openRate, h.share] as const));
    const stays = random();
    let lastDay = Number.POSITIVE_INFINITY;
    if (stays < scenario!.oneAndDone) lastDay = 0;
    else {
      const dropsOn = Math.floor(Math.log(Math.max(random(), 1e-9)) / Math.log(1 - scenario!.dailyDropout));
      if (dropsOn < DAYS) lastDay = dropsOn;
    }
    const tier = random() < 0.1 ? 'premium' as const : 'free' as const;
    const city = random() < ABROAD ? pickFrom(random, ABROAD_CITIES) : null;
    members.push({
      index,
      id: uuidFor(index),
      gender,
      tier,
      age,
      lat: (city?.[1] ?? 51.5074) + (distance * Math.sin(angle)) / 111,
      lng: (city?.[2] ?? -0.1278) + (distance * Math.cos(angle)) / 69,
      country: city?.[0] ?? 'United Kingdom',
      relocation: 'preferred_local',
      places: lookingIn(city?.[0] ?? 'United Kingdom'),
      practice,
      timeline: weighted(random, TIMELINE),
      sect: weighted(random, SECT),
      familyGoals: weighted(random, FAMILY),
      minAge: gender === 'male' ? Math.max(18, age - spread - 2) : Math.max(18, age - 2),
      maxAge: gender === 'male' ? age + 2 : age + spread + 2,
      maxKm: pickFrom(random, [10, 25, 50, 100]),
      preferredPractice: ['very_practicing', 'practicing', 'moderate', 'learning'].filter(
        (p) => p === practice || random() < 0.45
      ),
      mustHave,
      appeal: gaussian(random),
      selectivity: gaussian(random) * 0.5,
      openRate: Math.min(0.98, habit + (tier === 'premium' ? 0.08 : 0)),
      lastDay,
    });
  }
  return members;
}

/** Hash-derived, so id order says nothing about gender or arrival. */
function uuidFor(index: number): string {
  const hex = createHash('md5').update(`halal-sim-${SEED}-${index}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function seed(members: Member[]) {
  const started = performance.now();
  for (let at = 0; at < members.length; at += 1000) {
    const batch = members.slice(at, at + 1000).map((m) => {
      const heritage = weighted(random, HERITAGE.map((h) => [h, h[2]] as const));
      return {
        id: m.id, email: `sim-${m.index}@halalmodetest.com`, gender: m.gender, tier: m.tier,
        birth: new Date(Date.UTC(2026 - m.age, Math.floor(random() * 10), 1 + Math.floor(random() * 27))).toISOString().slice(0, 10),
        lat: m.lat, lng: m.lng, practice: m.practice, timeline: m.timeline, sect: m.sect, family: m.familyGoals,
        name: `Sim${m.index}`, country: m.country, relocation: m.relocation, places: m.places, heritage: heritage[0], ethnicity: heritage[1],
        dress: m.gender === 'female' ? pickFrom(random, ['hijab', 'hijab', 'modest', 'niqab']) : pickFrom(random, ['full_beard', 'trimmed_beard', 'no_religious_dress']),
        min_age: m.minAge, max_age: m.maxAge, max_km: m.maxKm, preferred: m.preferredPractice, must: m.mustHave,
        wanted_sects: m.mustHave.sect ? [m.sect] : [],
        // A third of Premium members filter on background, the filter the app offers most prominently.
        premium_must: m.tier === 'premium' && random() < 0.33 ? { ethnicities: true } : {},
        wanted_ethnicities: [heritage[1], pickFrom(random, ['south_asian', 'arab', 'black', 'turkic'])],
        height: Math.round((m.gender === 'male' ? 176 : 163) + gaussian(random) * 7), build: pickFrom(random, BUILDS),
      };
    });
    const payload = JSON.stringify(batch);
    const rows = `jsonb_to_recordset($1::jsonb) as s(id uuid, email text, gender gender, tier membership_tier, birth date, lat float8, lng float8,
      practice religious_practice, timeline marriage_timeline, sect sect, family family_goals, name text, country text, relocation relocation_preference, heritage text, ethnicity text, dress text,
      min_age int, max_age int, max_km int, preferred religious_practice[], must jsonb, height int, build text,
      wanted_sects sect[], premium_must jsonb, wanted_ethnicities text[], places text[])`;
    await db.sql(`insert into auth.users (id, email) select id, email from ${rows}`, [payload]);
    await db.sql(`insert into public.profiles (
        id, name, first_name, birth_date, gender, tier, city, country, latitude, longitude, bio, photos, onboarding_complete,
        religious_practice, timeline, sect, family_goals, family_goals_answered_at, relocation, languages_spoken, education,
        occupation, has_children, marital_status, religious_dress, ethnicities, heritage_countries)
      select id, name, name, birth, gender, tier, 'London', country, lat, lng, '${BIO}', array['sim/' || id || '.jpg'], true,
        practice, timeline, sect, family, now(), relocation, array['English'], 'University',
        'Engineer', 'no', 'never_married', dress, array[ethnicity], array[heritage]
      from ${rows}`, [payload]);
    await db.sql(`insert into public.private_preferences (
        user_id, min_age, max_age, preferred_countries, max_distance_km, preferred_practice, must_have,
        preferred_sects, premium_must_have, preferred_ethnicities, own_height_cm, own_build, matching_preferences_completed_at)
      select id, min_age, max_age, places, max_km, preferred,
        must, wanted_sects, premium_must, wanted_ethnicities, height, build, now()
      from ${rows}`, [payload]);
  }
  await db.sql(`insert into halal_mode_private.member_legal_consent_history (user_id, document_type, version, acceptance_context)
    select p.id, d.document_type, d.version, 'onboarding' from public.profiles p
    cross join halal_mode_private.legal_document_registry d where d.is_current`);
  await db.sql(`update public.profiles set sensitive_consent_at = now()`);
  // Premium comes from an entitlement, and the profile's tier only mirrors it.
  await db.sql(`insert into halal_mode_private.member_entitlements (user_id, tier, state, provider)
    select id, 'premium', 'active', 'legacy' from public.profiles where tier = 'premium'
    on conflict (user_id) do nothing`);
  await db.sql('analyze');
  const pool = await db.sql('select count(*)::int n from halal_mode_private.league_pool');
  log(`seeded ${members.length} members in ${Math.round(performance.now() - started)}ms, ${pool[0].n} in the matching pool`);
  return { seedMs: Math.round(performance.now() - started), inPool: pool[0].n as number };
}

// --------------------------------------------------------- round generation

function usage() {
  const cpu = process.cpuUsage();
  return { cpuMs: (cpu.user + cpu.system) / 1000, heapMb: process.memoryUsage().heapUsed / 1048576 };
}

const client = { rpc: (name: string, args: Record<string, unknown>) => db.service(name, args) };

interface Generated {
  ok: boolean;
  error?: string;
  wallMs: number;
  stages: Record<string, number>;
  edgeCpuMs?: number;
  edgeHeapMb?: number;
  breaches: string[];
  pairs: number;
  pool?: number;
  computeMs?: number;
  crashes?: number;
  proposed?: number;
  jobs?: number;
  failedJobs?: number;
}

/**
 * Runs league workers until the day's round is finished, exactly as production does but for one thing:
 * the clock stands still, so everyone's dawn is an hour from now and arrives when the workers are done.
 */
async function generateLeague(): Promise<Omit<Generated, 'wallMs'>> {
  const before = usage();
  const started = performance.now();
  const opens = () => new Date(Date.now() + 3_600_000);
  const dawn = () => ({ opensAt: opens(), expiresAt: new Date(opens().getTime() + 24 * 3_600_000) });
  const totals: WorkerResult = { stopped: 'more', jobs: 0, failedJobs: 0, edges: 0, proposed: 0, computeMs: 0, worstTableMs: 0, errors: [] };

  let crashes = 0;
  const flaky = {
    rpc: async (name: string, args?: Record<string, unknown>) => {
      const writes = name === 'league_commit_edges_service' || name === 'league_commit_rounds_service' || name === 'league_finish_job_service';
      // A dead worker reports nothing, so its lease simply has to run out.
      if (args?.p_error) return { data: null, error: null };
      if (CHAOS > 0 && writes && random() < CHAOS) {
        crashes += 1;
        if (random() < 0.5) await db.service(name, args);
        throw new Error('worker died');
      }
      return db.service(name, args);
    },
  };
  const worker = async () => {
    for (;;) {
      // The same budgets a real Edge request runs under.
      const result = await runLeagueWorker((CHAOS > 0 ? flaky : client) as any, { computeBudgetMs: 400, wallBudgetMs: 100_000, dawn });
      totals.jobs += result.jobs;
      totals.edges += result.edges;
      totals.proposed += result.proposed;
      totals.computeMs += result.computeMs;
      totals.worstTableMs = Math.max(totals.worstTableMs, result.worstTableMs);
      if (CHAOS === 0) {
        totals.failedJobs += result.failedJobs;
        totals.errors.push(...result.errors);
      }
      if (result.stopped === 'done' || result.stopped === 'off') return;
      if (result.stopped === 'wait') await sleep(100);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  const wallMs = Math.round(performance.now() - started);

  await db.sql(`update public.rounds set opens_at = now(), expires_at = now() + interval '24 hours' where cycle_date is not null and opens_at > now()`);
  const [cycle] = await db.sql(`select phase, makeup_wave,
      (select count(*) from halal_mode_private.league_jobs j where j.cycle_date = c.cycle_date) jobs,
      (select count(*) from halal_mode_private.league_jobs j where j.cycle_date = c.cycle_date and j.status = 'failed') failed_jobs,
      (select count(*) from public.rounds r where r.cycle_date = c.cycle_date) rounds
    from halal_mode_private.league_cycles c order by cycle_date desc limit 1`);
  const heap = usage().heapMb - before.heapMb;
  const breaches: string[] = [];
  if (totals.worstTableMs > EDGE_CPU_MS) breaches.push(`table took ${Math.round(totals.worstTableMs)}ms of CPU, over the ${EDGE_CPU_MS}ms limit`);
  return {
    ok: totals.failedJobs === 0 && Number(cycle?.failed_jobs ?? 0) === 0 && cycle?.phase === 'sealed',
    crashes,
    error: totals.errors[0],
    stages: { generate: wallMs },
    edgeCpuMs: Math.round(totals.worstTableMs),
    edgeHeapMb: Math.round(heap),
    breaches,
    pairs: totals.edges,
    proposed: totals.proposed,
    pool: Number(cycle?.rounds ?? 0),
    computeMs: Math.round(totals.computeMs),
    jobs: Number(cycle?.jobs ?? 0),
    failedJobs: Number(cycle?.failed_jobs ?? 0),
  };
}

// ------------------------------------------------------------ member sessions

let byId = new Map<string, Member>();
const dryDays = new Map<string, number>();
const tally = { sessions: 0, setsSeen: 0, submitted: 0, noneChosen: 0, picks: 0, mutualsLive: 0, mutualsQueued: 0, blockedByOwed: 0, questionSteps: 0, answerSteps: 0, opened: 0, messages: 0, closed: 0, followUps: 0 };
const zeroTally = () => { for (const key of Object.keys(tally) as (keyof typeof tally)[]) tally[key] = 0; };

interface Visit { hour: number; member: Member; reason: 'daily' | 'push' }
let timeline: Visit[] = [];
let scheduleVisit: (visit: Visit) => void = () => {};

/** Pushes a member answers in one day. Without a limit, each reply earns another visit, forever. */
const MAX_PUSH_VISITS = 2;
let pushVisits = new Map<string, number>();

function pushFollowUp(id: string, hour: number) {
  const member = byId.get(id);
  const answered = pushVisits.get(id) ?? 0;
  if (!member || answered >= MAX_PUSH_VISITS || random() >= scenario!.pushResponse) return;
  pushVisits.set(id, answered + 1);
  const later = hour + Math.min(8, Math.exp(gaussian(random) * 0.9 - 0.2));
  if (later < 24) {
    tally.followUps += 1;
    scheduleVisit({ hour: later, member, reason: 'push' });
  }
}

const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12'];
const ANSWER = 'I value honesty and patience, and I want a home built on faith and kindness.';

/** Moves this member's open connections on, the way the app's screens let them. */
async function progressConnections(visit: Visit, day: number) {
  const { member, hour } = visit;
  const list = await db.member(member.id, 'get_connections');
  if (list.error) return;
  for (const connection of (list.data ?? []) as any[]) {
    const other: string | undefined = connection.profile?.id;
    if (connection.stage === 'choosing_questions' && !connection.myQuestionPicksSubmitted) {
      if (random() < scenario!.completeStep) {
        const a = pickFrom(random, QUESTIONS);
        const b = pickFrom(random, QUESTIONS.filter((q) => q !== a));
        const done = await db.member(member.id, 'submit_question_picks', { p_connection_id: connection.id, p_question_ids: [a, b] });
        if (!done.error) { tally.questionSteps += 1; if (other) pushFollowUp(other, hour); }
      }
    } else if (connection.stage === 'answering') {
      const open = ((connection.questions ?? []) as any[]).filter((q) => !q.myAnswer);
      if (open.length && random() < scenario!.completeStep) {
        for (const question of open) {
          const done = await db.member(member.id, 'submit_answer', { p_connection_id: connection.id, p_question_id: question.questionId, p_answer: ANSWER });
          if (!done.error) tally.answerSteps += 1;
        }
        if (other) pushFollowUp(other, hour);
      }
    } else if (connection.stage === 'recap') {
      if (random() < scenario!.completeStep) {
        const done = await db.member(member.id, 'open_connection', { p_connection_id: connection.id });
        if (!done.error) tally.opened += 1;
      }
    } else if (connection.stage === 'open') {
      if (random() < scenario!.sendMessage) {
        await db.member(member.id, 'get_connection_messages', { p_connection_id: connection.id });
        const sent = await db.member(member.id, 'send_message', { p_connection_id: connection.id, p_body: 'Assalamu alaikum, how has your week been?', p_client_request_id: randomUUID() });
        if (!sent.error) { tally.messages += 1; if (other) pushFollowUp(other, hour); }
      }
    }
    // Conversations that go nowhere get let go, which frees the slot.
    const ageDays = (Date.now() - new Date(connection.createdAt ?? Date.now()).getTime()) / 86_400_000;
    if (ageDays > 5 && connection.stage !== 'open' && random() < 0.2) {
      const closed = await db.member(member.id, 'close_connection', { p_connection_id: connection.id });
      if (!closed.error) tally.closed += 1;
    }
  }
}

/** One visit to the app: the RPCs the daily screen makes, in its order. */
async function session(visit: Visit, day: number) {
  const { member, hour } = visit;
  tally.sessions += 1;
  let state = await db.member(member.id, 'get_current_round_state');
  if (state.error) return;
  await progressConnections(visit, day);
  if (state.data?.status === 'answers_owed') {
    // Doing what they owed sends them straight back to their set.
    state = await db.member(member.id, 'get_current_round_state');
    if (state.error) return;
    if (state.data?.status === 'answers_owed') {
      tally.blockedByOwed += 1;
      return;
    }
  }
  const round = state.data?.round;
  const cards: any[] = round?.introductions ?? round?.cards ?? [];
  if (visit.reason !== 'daily' || !round || !cards.length || round.submittedAt) return;
  tally.setsSeen += 1;

  const set = cards.map((card) => byId.get(card.profile?.id)).filter(Boolean) as Member[];
  const introFor = new Map(cards.map((card) => [card.profile?.id, card.id]));
  const chosen = behaviour.choose(member, set, member.tier === 'premium' ? 10 : 3, random);
  if (!chosen.length) { tally.noneChosen += 1; return; }

  const result = await db.member(member.id, 'submit_round_selections_ranked_with_signals', {
    p_round_id: cards[0].roundId ?? round.id,
    p_ordered_introduction_ids: chosen.map((subject) => introFor.get(subject.id)),
    p_engagement: null,
  });
  if (result.error) return;
  tally.submitted += 1;
  tally.picks += chosen.length;
  const mutual: string[] = result.data?.mutualProfileIds ?? [];
  const queued: string[] = result.data?.waitingMutualProfileIds ?? [];
  tally.mutualsLive += mutual.length;
  tally.mutualsQueued += queued.length;
  if (mutual.length) {
    dryDays.set(member.id, 0);
    for (const other of mutual) { dryDays.set(other, 0); pushFollowUp(other, hour); }
    pushFollowUp(member.id, hour);
  }
}

/** Plays one 24-hour day, compressed into DAY_MINUTES, at the load it implies. */
async function playDay(members: Member[], day: number) {
  zeroTally();
  timeline = [];
  pushVisits = new Map();
  for (const member of members) {
    const dry = dryDays.get(member.id) ?? 0;
    if (random() < behaviour.openChance(member, day, dry)) {
      timeline.push({ hour: behaviour.firstOpenHour(random), member, reason: 'daily' });
    }
    dryDays.set(member.id, dry + 1);
  }
  timeline.sort((a, b) => a.hour - b.hour);
  scheduleVisit = (visit) => {
    let at = timeline.length;
    while (at > 0 && timeline[at - 1]!.hour > visit.hour) at -= 1;
    timeline.splice(at, 0, visit);
  };

  const dayMs = DAY_MINUTES * 60_000;
  const start = performance.now();
  const inFlight = new Set<Promise<void>>();
  let worstLagMs = 0;
  let peakInFlight = 0;
  const perMinute = new Map<number, number>();

  while (timeline.length || inFlight.size) {
    const next = timeline[0];
    if (!next) { await Promise.race(inFlight); continue; }
    const due = start + (next.hour / 24) * dayMs;
    const wait = due - performance.now();
    if (wait > 1) { await sleep(Math.min(wait, 50)); continue; }
    if (inFlight.size >= 500) { await Promise.race(inFlight); continue; }
    timeline.shift();
    worstLagMs = Math.max(worstLagMs, -wait);
    const minute = Math.floor(next.hour * 60);
    perMinute.set(minute, (perMinute.get(minute) ?? 0) + 1);
    const running: Promise<void> = session(next, day).finally(() => { inFlight.delete(running); });
    inFlight.add(running);
    peakInFlight = Math.max(peakInFlight, inFlight.size);
  }
  return {
    playedMs: Math.round(performance.now() - start),
    targetMs: dayMs,
    worstLagMs: Math.round(worstLagMs),
    peakInFlight,
    peakVisitsPerSimMinute: Math.max(0, ...perMinute.values()),
    ...tally,
  };
}

// ------------------------------------------------------------------ the clock

let shiftPlan: { table: string; plain: string[]; dates: string[] }[] | null = null;

/**
 * One day passes: every timestamp in the application schemas becomes 24 hours
 * older. The real `now()`, cooldowns, expiries and windows then all behave as
 * they would tomorrow, with no change to the code being tested.
 */
async function advanceOneDay() {
  if (!shiftPlan) {
    const rows = await db.sql(`
      select c.table_schema || '.' || c.table_name t, c.column_name col, c.data_type dt
      from information_schema.columns c
      join information_schema.tables t using (table_schema, table_name)
      where c.table_schema in ('public', 'halal_mode_private') and t.table_type = 'BASE TABLE'
        and c.data_type in ('timestamp with time zone', 'timestamp without time zone', 'date')
        and c.is_generated = 'NEVER'
        and c.column_name <> 'birth_date'
        and c.table_name not in ('legal_document_registry', '__applied')`);
    const tables = new Map<string, { table: string; plain: string[]; dates: string[] }>();
    for (const row of rows) {
      const entry = tables.get(row.t) ?? { table: row.t, plain: [], dates: [] };
      (row.dt === 'date' ? entry.dates : entry.plain).push(row.col);
      tables.set(row.t, entry);
    }
    shiftPlan = [...tables.values()];
  }
  const started = performance.now();
  const connection = await db.admin.connect();
  try {
    await connection.query(`set session_replication_role = replica`);
    for (const { table, plain, dates } of shiftPlan) {
      const stamps = plain.map((c) => `"${c}" = "${c}" - interval '1 day'`);
      // Two steps, so a date that must stay unique never collides with yesterday's row.
      if (dates.length) {
        await connection.query(`update ${table} set ${dates.map((c) => `"${c}" = "${c}" - 40000`).join(', ')}`);
        await connection.query(`update ${table} set ${[...dates.map((c) => `"${c}" = "${c}" + 39999`), ...stamps].join(', ')}`);
      } else {
        await connection.query(`update ${table} set ${stamps.join(', ')}`);
      }
    }
  } finally {
    await connection.query(`set session_replication_role = origin`).catch(() => {});
    connection.release();
  }
  // Production has autovacuum over a day; here the same day took seconds.
  for (const table of ['public.rounds', 'public.introductions', 'public.introduction_selections', 'public.connections', 'halal_mode_private.pair_exposure']) {
    await db.sql(`vacuum analyze ${table}`);
  }
  return Math.round(performance.now() - started);
}

// ---------------------------------------------------------------- checks

/** Things that must never be true. Any non-zero count is a bug, not a statistic. */
const INVARIANTS: Record<string, string> = {
  // A one-way card has no twin until its yes reaches the other person, and then it must be the right one.
  mislinked_introductions: `select count(*) from public.introductions a join public.introductions b on b.id = a.reciprocal_id
    where b.reciprocal_id <> a.id or b.viewer_id <> a.subject_id or b.subject_id <> a.viewer_id`,
  waiting_yes_lost: `select count(*) from halal_mode_private.league_returns w
    left join public.introduction_selections s on s.introduction_id = w.introduction_id and s.decision = 'kept'
    where s.introduction_id is null`,
  same_gender_introductions: `select count(*) from public.introductions i join public.profiles a on a.id = i.viewer_id join public.profiles b on b.id = i.subject_id where a.gender = b.gender`,
  over_budget_set_size: `select count(*) from (select r.id from public.rounds r join public.introductions i on i.round_id = r.id
    cross join lateral public.tier_limits(r.tier) l group by r.id, r.seats, l.introductions having count(*) > coalesce(r.seats, l.introductions)) x`,
  over_tier_picks: `select count(*) from (select r.id from public.rounds r join public.introductions i on i.round_id = r.id
    join public.introduction_selections s on s.introduction_id = i.id and s.decision = 'kept'
    cross join lateral public.tier_limits(r.tier) l group by r.id, l.keeps having count(*) > l.keeps) x`,
  member_with_two_open_rounds: `select count(*) from (select user_id from public.rounds where submitted_at is null and opens_at <= now() and expires_at > now() group by user_id having count(*) > 1) x`,
  connection_over_capacity: `select count(*) from (select u, count(*) n, max(p.tier::text) t from (select user_a u from public.connections where closed_at is null union all select user_b from public.connections where closed_at is null) c
    join public.profiles p on p.id = u group by u) x cross join lateral public.tier_limits(x.t::membership_tier) l where x.n > l.open_connections`,
  mutual_lost: `select count(*) from public.introductions i
    join public.introduction_selections a on a.introduction_id = i.id and a.decision = 'kept'
    join public.introduction_selections b on b.introduction_id = i.reciprocal_id and b.decision = 'kept'
    where i.viewer_id < i.subject_id
      and not exists (select 1 from public.connections c where c.user_a = least(i.viewer_id, i.subject_id) and c.user_b = greatest(i.viewer_id, i.subject_id))
      and not exists (select 1 from public.mutual_connection_queue q where q.user_a = least(i.viewer_id, i.subject_id) and q.user_b = greatest(i.viewer_id, i.subject_id))`,
  connection_without_mutual: `select count(*) from public.connections c where not exists (
    select 1 from public.introductions i
      join public.introduction_selections a on a.introduction_id = i.id and a.decision in ('kept', 'expired')
      join public.introduction_selections b on b.introduction_id = i.reciprocal_id and b.decision in ('kept', 'expired')
    where i.viewer_id = c.user_a and i.subject_id = c.user_b)`,
  connected_pair_reintroduced: `select count(*) from public.connections c join public.rounds r on r.created_at > c.created_at
    join public.introductions i on i.round_id = r.id and i.viewer_id = r.user_id
    where (i.viewer_id = c.user_a and i.subject_id = c.user_b) or (i.viewer_id = c.user_b and i.subject_id = c.user_a)`,
  shown_outside_chosen_countries: `select count(*) from public.introductions i
    join halal_mode_private.member_matching_facts a on a.id = i.viewer_id
    join public.profiles b on b.id = i.subject_id
    where not lower(btrim(b.country)) = any(a.preferred_country_keys)`,
  pair_repeated_inside_gap: `select count(*) from public.introductions i join public.rounds r on r.id = i.round_id
    join public.introductions earlier on earlier.viewer_id = i.viewer_id and earlier.subject_id = i.subject_id and earlier.id <> i.id
    join public.rounds er on er.id = earlier.round_id
    where r.cycle_date is not null and er.cycle_date is not null and er.cycle_date < r.cycle_date
      and r.cycle_date - er.cycle_date < (select repeat_gap_days from halal_mode_private.league_config)`,
  must_have_age_violated: `select count(*) from public.introductions i join public.private_preferences v on v.user_id = i.viewer_id join public.profiles s on s.id = i.subject_id
    where coalesce((v.must_have ->> 'age')::boolean, false) and extract(year from age(s.birth_date)) not between v.min_age and v.max_age`,
  must_have_distance_violated: `select count(*) from public.introductions i join public.private_preferences v on v.user_id = i.viewer_id
    join public.profiles a on a.id = i.viewer_id join public.profiles s on s.id = i.subject_id
    where coalesce((v.must_have ->> 'distance')::boolean, false) and public.distance_km(a.latitude, a.longitude, s.latitude, s.longitude) > v.max_distance_km`,
};

async function checkInvariants() {
  const out: Record<string, number> = {};
  for (const [name, text] of Object.entries(INVARIANTS)) out[name] = Number((await db.sql(text))[0].count);
  return out;
}

async function dayFacts() {
  const [row] = await db.sql(`select
    (select count(*) from public.rounds where created_at > now() - interval '20 hours') rounds_today,
    (select count(*) from public.rounds r where r.created_at > now() - interval '20 hours'
       and (select count(*) from public.introductions i where i.round_id = r.id) >= 5) sets_with_five,
    (select count(*) from public.rounds r where r.created_at > now() - interval '20 hours'
       and not exists (select 1 from public.introductions i where i.round_id = r.id)) sets_empty,
    (select count(*) from public.introductions i join public.rounds r on r.id = i.round_id
       where r.created_at > now() - interval '20 hours' and i.reciprocal_id is null) one_way_cards,
    (select count(*) from halal_mode_private.league_returns) yeses_waiting,
    (select max(n) from (select i.subject_id, count(*) n from public.introductions i join public.rounds r on r.id = i.round_id
       where r.created_at > now() - interval '20 hours' group by 1) x) most_sets_today,
    (select count(*) from public.introductions i join public.rounds r on r.id = i.round_id where r.created_at > now() - interval '20 hours') / 2 pairs_today,
    (select count(*) from (select u from (select user_a u from public.connections where closed_at is null union all select user_b from public.connections where closed_at is null) x join public.profiles p on p.id = u group by u, p.tier having count(*) >= (select open_connections from public.tier_limits(p.tier))) y) members_at_capacity,
    (select count(*) from public.connections) connections_total,
    (select count(*) from public.connections where closed_at is null) connections_open,
    (select count(*) from public.connections where stage = 'choosing_questions' and closed_at is null) stage_choosing,
    (select count(*) from public.connections where stage = 'answering' and closed_at is null) stage_answering,
    (select count(*) from public.connections where stage = 'recap' and closed_at is null) stage_recap,
    (select count(*) from public.connections where stage = 'open' and closed_at is null) stage_open,
    (select count(*) from public.mutual_connection_queue) queued_mutuals,
    (select count(*) from (select connection_id from public.messages group by connection_id having count(distinct sender_id) = 2) x) both_wrote,
    (select count(*) from halal_mode_private.notification_outbox) notifications_total,
    (select pg_database_size(current_database())) db_bytes`);
  const sizes = await db.sql(`select c.oid::regclass::text t, pg_total_relation_size(c.oid) b, c.reltuples::bigint n from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where c.relkind = 'r' and s.nspname in ('public', 'halal_mode_private') order by 2 desc limit 8`);
  const sets = await db.sql(`select coalesce(x.n, 0) size, count(*) members from public.rounds r
    left join (select round_id, count(*) n from public.introductions group by 1) x on x.round_id = r.id
    where r.created_at > now() - interval '20 hours' group by 1 order by 1`);
  const abroad = await db.sql(`select case when cardinality(f.preferred_country_keys) = 1 then 'one country' else 'several' end answer,
      count(distinct a.id) members, count(*) shown,
      count(*) filter (where lower(trim(a.country)) <> lower(trim(b.country))) shown_abroad
    from public.introductions i join public.rounds r on r.id = i.round_id
    join public.profiles a on a.id = i.viewer_id join public.profiles b on b.id = i.subject_id
    join halal_mode_private.member_matching_facts f on f.id = a.id
    where r.created_at > now() - interval '20 hours' group by 1 order by 1`);
  const [crossBorder] = await db.sql(`select count(*) filter (where lower(trim(a.country)) <> lower(trim(b.country))) connections_abroad
    from public.connections c join public.profiles a on a.id = c.user_a join public.profiles b on b.id = c.user_b`);
  return { ...row, ...crossBorder, largest_tables: sizes, set_sizes_today: sets, shown_abroad_by_answer: abroad };
}

/** Who gets matched, by the hidden appeal only the simulation knows. Averages hide this. */
async function fairness(members: Member[]) {
  const rows = await db.sql(`select u, count(*)::int n from (select user_a u from public.connections union all select user_b from public.connections) x group by u`);
  const matches = new Map(rows.map((row: any) => [row.u, row.n as number]));
  const ranked = [...members].sort((a, b) => a.appeal - b.appeal);
  const deciles = [];
  for (let at = 0; at < 10; at += 1) {
    const group = ranked.slice(Math.floor((at * ranked.length) / 10), Math.floor(((at + 1) * ranked.length) / 10));
    const counts = group.map((m) => matches.get(m.id) ?? 0);
    deciles.push({
      decile: at + 1,
      meanMatches: Math.round((counts.reduce((sum, n) => sum + n, 0) / group.length) * 100) / 100,
      noMatchShare: Math.round((counts.filter((n) => n === 0).length / group.length) * 1000) / 1000,
    });
  }
  return { byAppealDecile: deciles, everMatchedShare: Math.round((matches.size / members.length) * 1000) / 1000 };
}

// --------------------------------------------------------------------- main

async function freshDatabase(): Promise<string> {
  if (!has('fresh')) return BASE_URL;
  const admin = new pg.Client({ connectionString: BASE_URL });
  await admin.connect();
  const name = `sim_${Date.now()}`;
  await admin.query(`create database ${name} template ${new URL(BASE_URL).pathname.slice(1)}`);
  await admin.end();
  const url = new URL(BASE_URL);
  url.pathname = `/${name}`;
  log(`working in a fresh copy of the database: ${name}`);
  return url.toString();
}

async function main() {
  await db.connect(await freshDatabase());

  const members = makeMembers();
  byId = new Map(members.map((m) => [m.id, m]));
  const seeded = await seed(members);
  await db.sql(`update halal_mode_private.release_flags set enabled = true where key = 'league_matching'`);
  if (CHAOS > 0) await db.sql(`update halal_mode_private.league_config set lease_seconds = 15, max_attempts = 12`);

  const report: any = {
    meta: { perSide: PER_SIDE, days: DAYS, seed: SEED, matcher: 'league', workers: WORKERS, scenario: SCENARIO, dayMinutes: DAY_MINUTES, compression: Math.round(1440 / DAY_MINUTES), pool: POOL, startedAt: new Date().toISOString(), node: process.version },
    seeded,
    days: [],
  };
  const save = () => {
    report.latencyMs = latencySummary();
    report.errors = Object.fromEntries([...db.errors].sort((a, b) => b[1] - a[1]));
    report.overStatementLimit = Object.fromEntries(db.overLimit);
    const waits = [...db.queueWaits].sort((a, b) => a - b);
    report.poolWaitMs = { p50: percentile(waits, 0.5), p95: percentile(waits, 0.95), p99: percentile(waits, 0.99), max: percentile(waits, 1) };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(report, null, 2));
  };

  for (let day = 0; day < DAYS; day += 1) {
    log(`day ${day + 1}: Fajr. Generating the round.`);

    const wallStart = performance.now();
    let generated: Omit<Generated, 'wallMs'>;
    try {
      generated = await generateLeague();
    } catch (error) {
      generated = { ok: false, error: String(error), stages: {}, breaches: [], pairs: 0 };
    }
    const generation = { ...generated, wallMs: Math.round(performance.now() - wallStart) };
    log(`  round: ok=${generation.ok} pairs=${generation.pairs} wall=${generation.wallMs}ms cpu=${generation.edgeCpuMs ?? '-'}ms ${JSON.stringify(generation.stages)} ${generation.error ?? ''}`);
    if (generation.breaches.length) log(`  over limit: ${generation.breaches.join('; ')}`);

    const errorsBefore = new Map(db.errors);
    const played = await playDay(members, day);
    log(`  played: ${played.sessions} visits, ${played.submitted} submitted, ${played.mutualsLive} matches, ${played.messages} messages, lag ${played.worstLagMs}ms`);
    const facts = await dayFacts();
    const invariants = await checkInvariants();
    const broken = Object.entries(invariants).filter(([, count]) => count > 0);
    if (broken.length) log(`  INVARIANT BROKEN: ${JSON.stringify(broken)}`);

    const shiftMs = day < DAYS - 1 ? await advanceOneDay() : 0;
    const errors = Object.fromEntries([...db.errors]
      .map(([what, count]) => [what, count - (errorsBefore.get(what) ?? 0)] as const)
      .filter(([, count]) => count > 0));
    report.days.push({ day: day + 1, generation, played, errors, facts, invariants, shiftMs });
    save();
  }

  report.fairness = await fairness(members);
  report.finishedAt = new Date().toISOString();
  save();
  log(`report written to ${OUT}`);
  await db.pool.end();
  await db.admin.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
