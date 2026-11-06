/**
 * Rehearses going live on a local copy: the migrations production has, then its rows from a backup, then
 * the new migrations, then a day of matching. A fresh install cannot show what breaks on existing data.
 *
 * Needs the local server (scripts/backend-sim/local/postgres.mjs). Refuses anywhere else.
 *
 *   node --experimental-strip-types scripts/backend-sim/rehearse-upgrade.mts <backup.json> <first-new-migration>
 */
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

import { runLeagueWorker } from '../../supabase/functions/generate-round/league.ts';

const pg = createRequire(import.meta.url)('pg');
const here = import.meta.dirname;
const repo = resolve(here, '../..');
const base = 'postgres://postgres:postgres@127.0.0.1:54322';
const [backupPath, firstNew] = process.argv.slice(2);
if (!backupPath || !firstNew) throw new Error('Usage: rehearse-upgrade.mts <backup.json> <first-new-migration>');

const log = (...parts: unknown[]) => console.log(...parts);
const name = `rehearse_${Date.now()}`;
const admin = new pg.Client({ connectionString: `${base}/postgres` });
await admin.connect();
await admin.query(`create database ${name}`);
await admin.end();
const db = new pg.Client({ connectionString: `${base}/${name}` });
await db.connect();
const sql = async (text: string, args: unknown[] = []) => (await db.query(text, args)).rows;

await db.query(readFileSync(join(here, 'local/supabase-shim.sql'), 'utf8'));
const dir = join(repo, 'supabase/migrations');
const files = readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();
const apply = async (file: string) => {
  await db.query('begin');
  await db.query(readFileSync(join(dir, file), 'utf8'));
  await db.query('commit');
};
const before = files.filter((file) => file < firstNew);
const after = files.filter((file) => file >= firstNew);
for (const file of before) await apply(file);
log(`applied ${before.length} migrations production already has`);

// Everything in the backup, with triggers off, as it stood.
const backup = JSON.parse(readFileSync(backupPath, 'utf8')) as { tables: Record<string, unknown[]> };
await db.query(`set session_replication_role = replica`);
// What the migrations seeded is replaced by what production really holds.
for (const table of Object.keys(backup.tables)) {
  if ((await sql(`select to_regclass($1) t`, [table]))[0].t) await db.query(`truncate ${table} cascade`);
}
const counts: Record<string, number> = {};
const skipped: string[] = [];
for (const [table, rows] of Object.entries(backup.tables)) {
  if (!rows.length) continue;
  const [schema, relation] = table.split('.') as [string, string];
  const columns = await sql(`select column_name c from information_schema.columns
    where table_schema = $1 and table_name = $2 and is_generated = 'NEVER'`, [schema, relation]);
  if (!columns.length) {
    skipped.push(table);
    continue;
  }
  const list = columns.map((row) => `"${row.c}"`).join(', ');
  await sql(`insert into ${table} (${list}) overriding system value
    select ${list} from jsonb_populate_recordset(null::${table}, $1::jsonb)`, [JSON.stringify(rows)]);
  counts[table] = rows.length;
}
await db.query(`set session_replication_role = origin`);
log('loaded', Object.keys(counts).length, 'tables,', Object.values(counts).reduce((a, b) => a + b, 0), 'rows; not in this local copy:', skipped.join(', ') || 'none');

const openBefore = await sql(`select id, user_id, opens_at, expires_at, submitted_at from public.rounds where submitted_at is null`);

for (const file of after) {
  const started = Date.now();
  await apply(file);
  log(`applied ${file} in ${Date.now() - started} ms`);
}

// Nothing the backup held may be lost, apart from what these migrations remove on purpose.
for (const [table, count] of Object.entries(counts)) {
  const exists = (await sql(`select to_regclass($1) t`, [table]))[0].t;
  if (!exists) {
    log('table removed on purpose:', table);
    continue;
  }
  const now = Number((await sql(`select count(*) from ${table}`))[0].count);
  if (now !== count) log('ROWS CHANGED', table, count, '->', now);
}
const flag = (await sql(`select enabled from halal_mode_private.release_flags where key = 'league_matching'`))[0].enabled;
log('matching switch after migrations:', flag);
log('open rounds kept:', openBefore.length, '->', (await sql(`select count(*)::int n from public.rounds where submitted_at is null`))[0].n);
log('every member marked as seen:', (await sql(`select (select count(*) from public.profiles) = (select count(*) from halal_mode_private.league_member_activity) ok`))[0].ok);
log('pool:', (await sql(`select count(*)::int n from halal_mode_private.league_pool`))[0].n);

// A day, the way the worker does it.
await sql(`update halal_mode_private.release_flags set enabled = true where key = 'league_matching'`);
const client = {
  async rpc(fn: string, args: Record<string, unknown> = {}) {
    const names = Object.keys(args);
    const call = names.map((key, at) => `${key} => $${at + 1}`).join(', ');
    const values = names.map((key) => (key === 'p_error' ? args[key] : JSON.stringify(args[key])));
    try {
      const rows = await sql(`select public.${fn}(${call}) as result`, values);
      return { data: rows[0].result, error: null };
    } catch (error) {
      return { data: null, error: { message: String(error) } };
    }
  },
};
const dawn = () => ({ opensAt: new Date(Date.now() + 3_600_000), expiresAt: new Date(Date.now() + 25 * 3_600_000) });
for (let tries = 0; tries < 200; tries += 1) {
  const result = await runLeagueWorker(client, { computeBudgetMs: 60_000, wallBudgetMs: 60_000, dawn });
  if (result.errors.length) log('worker errors', result.errors);
  if (result.stopped === 'done') break;
}
log('day:', JSON.stringify((await sql(`select
  (select phase from halal_mode_private.league_cycles order by cycle_date desc limit 1) phase,
  (select count(*)::int from halal_mode_private.league_jobs where status = 'failed') failed,
  (select count(*)::int from public.rounds where cycle_date is not null) league_rounds,
  (select count(*)::int from public.introductions i join public.rounds r on r.id = i.round_id where r.cycle_date is not null) cards,
  (select count(*)::int from public.introductions i join public.rounds r on r.id = i.round_id where r.cycle_date is not null and i.reciprocal_id is null) one_way,
  (select count(*)::int from public.rounds where submitted_at is null and cycle_date is null) legacy_open`))[0]));

// Every real member can still load the app's main screens, old open set and all.
let fine = 0;
const broken: string[] = [];
for (const { id } of await sql(`select id from public.profiles`)) {
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: id, role: 'authenticated' })]);
  try {
    await sql(`select public.get_current_round_state()`);
    await sql(`select public.get_my_reach()`);
    await sql(`select public.get_my_farewells()`);
    await sql(`select public.get_my_photo_coach()`);
    await sql(`select public.get_my_liked_you()`);
    fine += 1;
  } catch (error) {
    broken.push(`${String(error).slice(0, 120)}`);
  }
}
await db.query(`select set_config('request.jwt.claims', '', false)`);
log('members whose screens load:', fine, 'broken:', JSON.stringify([...new Set(broken)]));
await db.end();
log('left in place for inspection:', name);
