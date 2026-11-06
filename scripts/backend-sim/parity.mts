/**
 * Holds the table's copy of the matching rules to the database's.
 *
 * A worker's rules (src/matching/league.ts) only propose; the database decides. If the two drifted
 * apart nothing unsafe could happen, but introductions would quietly go missing. So this builds a few
 * hundred members with deliberately awkward preferences, asks both
 * about every pair in both directions, and fails on any disagreement.
 *
 *   node scripts/backend-sim/parity.mts
 */

import { createRequire } from 'node:module';

import { accepts, distanceKm, type LeagueMember } from '../../src/matching/league.ts';
import { pickFrom, prng } from './behaviour.mts';

const pg = createRequire(import.meta.url)('pg');
pg.types.setTypeParser(1700, Number);
pg.types.setTypeParser(20, Number);

const BASE = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost', '::1'].includes(new URL(BASE).hostname)) throw new Error('Refusing to run anywhere but a local database.');

const COUNT = 300;
const random = prng(11);
const chance = (share: number) => random() < share;
const someOf = <T,>(items: readonly T[], share = 0.4) => items.filter(() => chance(share));

const db = new pg.Client({ connectionString: BASE });
await db.connect();
// Everything here happens in one transaction that is rolled back, so nothing is left behind.
await db.query('begin');
// The point is awkward combinations, so what the app would refuse to save does not matter here.
// Only what the rules do with it.
for (const { conname, table } of (await db.query(`
  select conname, conrelid::regclass::text as table from pg_constraint
  where contype = 'c' and conrelid in ('public.profiles'::regclass, 'public.private_preferences'::regclass)`)).rows) {
  await db.query(`alter table ${table} drop constraint "${conname}"`);
}

const PRACTICE = ['very_practicing', 'practicing', 'moderate', 'learning'];
const TIMELINE = ['within_3_months', 'within_6_months', 'within_1_year', '1_to_2_years'];
const FAMILY = ['wants_children_soon', 'wants_children_later', 'open_to_children', 'no_children'];
const SECTS = ['sunni', 'shia', 'prefer_not_to_say'];
const DETAILS = ['hanafi', 'shafii', 'maliki', 'hanbali'];
const ETHNIC = ['arab', 'south_asian', 'black'];
const orDeclined = (items: string[]) => (chance(0.15) ? ['prefer_not_to_say'] : someOf(items));
const LANGUAGES = ['English', 'Arabic', 'Urdu'];
const BUILDS = ['Slim', 'Athletic', 'Average', 'Curvy'];
const MARITAL = ['never_married', 'divorced', 'widowed'];
const COUNTRIES = [['United Kingdom', 51.5, -0.1], ['Ireland', 54.3, -6.2], ['Turkey', 41, 29], ['Pakistan', 24.9, 67]] as const;

for (let i = 0; i < COUNT; i += 1) {
  const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
  const male = i % 2 === 0;
  const place = pickFrom(random, COUNTRIES);
  const lat = chance(0.03) ? null : place[1] + random() - 0.5;
  const age = 20 + Math.floor(random() * 25);
  const sect = pickFrom(random, SECTS);
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `parity-${i}@example.test`]);
  await db.query(
    `insert into public.profiles (id, name, first_name, birth_date, gender, tier, city, country, latitude, longitude, bio, photos, onboarding_complete,
       religious_practice, timeline, sect, sect_detail, family_goals, has_children, occupation, education, religious_dress,
       languages_spoken, ethnicities, heritage_countries, grew_up_countries, diet, marital_status)
     values ($1,'P','P',$2,$3,$4,'C',$5,$6,$7,'b','{}',true,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
    [id, `${2026 - age}-01-01`, male ? 'male' : 'female', chance(0.5) ? 'premium' : 'free', place[0], lat, lat === null ? null : place[2] + random() - 0.5,
      pickFrom(random, PRACTICE), pickFrom(random, TIMELINE), sect, sect === 'sunni' && chance(0.6) ? pickFrom(random, DETAILS) : null, pickFrom(random, FAMILY),
      pickFrom(random, ['no', 'yes', 'prefer_not_to_say']), chance(0.2) ? '' : pickFrom(random, ['engineer', 'teacher']),
      chance(0.2) ? null : pickFrom(random, ['University', 'School']), chance(0.3) ? null : pickFrom(random, ['hijab', 'modest']),
      someOf(LANGUAGES), orDeclined(ETHNIC), orDeclined(['SA', 'PK']), someOf(['GB', 'TR']), someOf(['halal_only', 'vegetarian']), pickFrom(random, MARITAL)],
  );
  const sects = someOf(SECTS.slice(0, 2));
  const must: Record<string, boolean> = {};
  for (const key of ['age', 'height', 'build', 'practice', 'timeline', 'children', 'sect', 'distance']) if (chance(0.25)) must[key] = true;
  const premiumMust: Record<string, boolean> = {};
  for (const key of ['has_children', 'occupations', 'languages', 'education', 'dress', 'ethnicities', 'heritage', 'grew_up', 'diet']) if (chance(0.2)) premiumMust[key] = true;
  await db.query(
    `insert into public.private_preferences (user_id, min_age, max_age, min_height_cm, max_height_cm, own_height_cm, preferred_builds, own_build, own_build_also,
       preferred_practice, desired_timeline, desired_family_goals, preferred_sects, preferred_sect_details, max_distance_km, preferred_countries,
       accepted_marital_statuses, must_have, premium_must_have, preferred_has_children, preferred_occupations, preferred_languages,
       preferred_education, preferred_dress, preferred_ethnicities, preferred_heritage_countries, preferred_grew_up_countries, preferred_diet)
     values ($1,$2,$3,150,190,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
    [id, Math.max(18, age - 5), age + 5, chance(0.3) ? null : 145 + Math.floor(random() * 50), someOf(BUILDS), chance(0.3) ? null : pickFrom(random, BUILDS), chance(0.8) ? null : pickFrom(random, BUILDS),
      someOf(PRACTICE), someOf(TIMELINE), someOf(FAMILY), sects, chance(0.4) ? someOf(DETAILS) : [], pickFrom(random, [10, 50, 300, 5000]),
      chance(0.7) ? [] : someOf(COUNTRIES.map((c) => c[0])), [pickFrom(random, MARITAL), ...someOf(MARITAL, 0.5)], JSON.stringify(must), JSON.stringify(premiumMust),
      someOf(['no', 'yes']), someOf(['engineer']), someOf(LANGUAGES), someOf(['University']),
      someOf(['hijab']), someOf(ETHNIC), someOf(['SA', 'PK']), someOf(['GB']), someOf(['halal_only'])],
  );
}

// Premium comes from an entitlement, and the profile's tier only mirrors it.
await db.query(`insert into halal_mode_private.member_entitlements (user_id, tier, state, provider)
  select id, 'premium', 'active', 'legacy' from public.profiles where tier = 'premium'
  on conflict (user_id) do nothing`);

const { rows: people } = await db.query(`select (halal_mode_private.league_member_json(f, 1, 0)) as member from halal_mode_private.member_matching_facts f`);
const members: LeagueMember[] = people.map((row: { member: LeagueMember }) => row.member);
const { rows: truth } = await db.query(`
  select a.id a, b.id b, halal_mode_private.accepts_row(a, b, null) ok
  from halal_mode_private.member_matching_facts a, halal_mode_private.member_matching_facts b
  where a.id <> b.id`);
const byId = new Map(members.map((m) => [m.id, m]));

let agree = 0;
let accepted = 0;
const wrong: string[] = [];
for (const row of truth) {
  const a = byId.get(row.a)!;
  const b = byId.get(row.b)!;
  const mine = accepts(a, b, distanceKm(a, b));
  if (row.ok) accepted += 1;
  if (mine === row.ok) agree += 1;
  else if (wrong.length < 10) wrong.push(`${row.a} accepts ${row.b}: sql ${row.ok}, table ${mine}. ${JSON.stringify({ must: a.mustHave, premium: a.premiumMustHave, abroad: a.matchAbroad })}`);
}

await db.query('rollback');
await db.end();

console.log(`${truth.length} ordered pairs, ${accepted} accepted, ${truth.length - agree} disagreements`);
for (const line of wrong) console.log(line);
if (agree !== truth.length) process.exit(1);
// A rule that accepted everyone or nobody would agree with itself and prove nothing.
if (accepted < truth.length * 0.02 || accepted > truth.length * 0.98) {
  console.log('The members are not varied enough for this to mean anything.');
  process.exit(1);
}
