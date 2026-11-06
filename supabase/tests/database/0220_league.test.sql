begin;
set local search_path = public, extensions, halal_mode_private;
select plan(38);

-- Six people: four in the UK, one in Turkey, one who only wants their own country.
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000220' || n)::uuid, 'league-' || n || '@example.test'
from unnest(array['01', '02', '03', '04', '05', '06']) n;

insert into profiles (
  id, name, first_name, birth_date, gender, city, country, latitude, longitude, bio, photos,
  onboarding_complete, marital_status, sensitive_consent_at, tier
)
select ('00000000-0000-0000-0000-0000000220' || m.n)::uuid, 'Member ' || m.n, 'M' || m.n, '1995-01-01', m.gender::gender,
       m.city, m.country, m.lat, m.lng, repeat('A good person looking for someone kind. ', 3), array['p/' || m.n || '.jpg'],
       true, 'never_married', now(), 'free'
from (values
  ('01', 'male', 'London', 'United Kingdom', 51.5, -0.1),
  ('02', 'female', 'London', 'United Kingdom', 51.5, -0.1),
  ('03', 'male', 'London', 'United Kingdom', 51.5, -0.1),
  ('04', 'female', 'London', 'United Kingdom', 51.5, -0.1),
  ('05', 'female', 'Istanbul', 'Turkey', 41.0, 29.0),
  ('06', 'male', 'London', 'United Kingdom', 51.5, -0.1)
) as m(n, gender, city, country, lat, lng);

insert into private_preferences (user_id, matching_preferences_completed_at, preferred_countries)
select id, now(), case when id = '00000000-0000-0000-0000-000000022006' then array['United Kingdom'] else array['United Kingdom', 'Turkey'] end
from profiles where id::text like '00000000-0000-0000-0000-0000000220%';

insert into halal_mode_private.member_legal_consent_history (user_id, document_type, version, acceptance_context)
select p.id, d.document_type, d.version, 'onboarding'
from profiles p cross join halal_mode_private.legal_document_registry d
where d.is_current and p.id::text like '00000000-0000-0000-0000-0000000220%';

-- ---------------------------------------------------------------- the answer stays private
select ok(
  not exists (
    select 1 from profiles p
    where p.id = '00000000-0000-0000-0000-000000022006'
      and safe_member_profile(p)::text like '%preferred%'
  ),
  'the countries someone is looking in are never on a profile others can see');

-- ---------------------------------------------------------------- the switch
update halal_mode_private.release_flags set enabled = false where key = 'league_matching';
select is(public.league_next_job_service() ->> 'kind', 'off', 'with the switch off, no work is given out');
select is((select count(*)::int from halal_mode_private.league_cycles), 0, 'and no day is started');

insert into halal_mode_private.release_flags (key, enabled) values ('league_matching', true)
on conflict (key) do update set enabled = true;
update halal_mode_private.league_config set start_minute_utc = 0;

-- ---------------------------------------------------------------- first the rounds
create temporary table job_now (body jsonb) on commit drop;
insert into job_now select public.league_next_job_service();
select is((select body ->> 'kind' from job_now), 'prepare', 'the day begins by working out everyone''s dawn');
select ok((select jsonb_array_length(body -> 'members') >= 6 from job_now), 'everyone in the pool is listed');

select throws_ok(
  $$select public.league_commit_rounds_service(
      jsonb_set((select body -> 'job' from job_now), '{token}', to_jsonb(gen_random_uuid()::text)), '[]'::jsonb)$$,
  '55P03', null, 'a worker that has lost its lease cannot write');

select public.league_commit_rounds_service(
  (select body -> 'job' from job_now),
  (select jsonb_agg(jsonb_build_object('user_id', m ->> 'user_id', 'opens_at', now() + interval '1 hour', 'expires_at', now() + interval '25 hours'))
   from job_now, jsonb_array_elements(body -> 'members') m)
);
select public.league_finish_job_service((select body -> 'job' from job_now));

select is(
  (select count(*)::int from rounds where user_id::text like '00000000-0000-0000-0000-0000000220%' and cycle_date is not null),
  6, 'each member has a prepared round');
select is(
  (select count(*)::int from halal_mode_private.notification_outbox o
   where o.kind = 'round_ready' and o.user_id::text like '00000000-0000-0000-0000-0000000220%'),
  0, 'and nobody has been told about it, because it is not finished');

-- A prepared set sits beside today's open one without disturbing it.
insert into rounds (user_id, tier, opens_at, expires_at)
values ('00000000-0000-0000-0000-000000022001', 'free', now() - interval '2 hours', now() + interval '1 hour');
select pass('a prepared round can sit beside an open one');
select throws_ok(
  $$insert into rounds (user_id, tier, opens_at, expires_at)
    values ('00000000-0000-0000-0000-000000022001', 'free', now(), now() + interval '1 hour')$$,
  '23505', null, 'the legacy promise of one open round still holds');
delete from rounds where user_id = '00000000-0000-0000-0000-000000022001' and cycle_date is null;

-- ---------------------------------------------------------------- then the tables
truncate job_now;
insert into job_now select public.league_next_job_service();
-- Countries are dealt in turn. These checks want the UK's table.
do $$
begin
  while (select coalesce(body -> 'job' ->> 'stratum', '') from job_now) <> 'united kingdom' loop
    perform public.league_finish_job_service((select body -> 'job' from job_now));
    update job_now set body = public.league_next_job_service();
  end loop;
end;
$$;
select is((select body ->> 'kind' from job_now), 'table', 'then the tables are dealt');
select ok(
  (select bool_and((m ->> 'seats')::int > 0) from job_now, jsonb_array_elements(body -> 'table' -> 'members') m),
  'everyone at a table has a seat');
select ok(
  (select body -> 'settings' -> 'weights' is not null from job_now),
  'a table carries everything a worker needs');

create temporary view the_job as select body -> 'job' as job from job_now;
-- Sit the member from Turkey here too, so what stops that pair below is the rule and not the seating.
insert into halal_mode_private.league_seats (cycle_date, wave, stratum, table_no, user_id, seats)
select (job ->> 'cycleDate')::date, (job ->> 'wave')::int, job ->> 'stratum', (job ->> 'tableNo')::int,
       '00000000-0000-0000-0000-000000022005', 5
from the_job
on conflict do nothing;
create temporary view intro_count as
select count(*)::int as n from introductions i
where i.viewer_id::text like '00000000-0000-0000-0000-0000000220%';

-- ---------------------------------------------------------------- commit trusts nothing
select is(
  public.league_commit_edges_service((select job from the_job),
    '[{"a":"00000000-0000-0000-0000-000000022001","b":"00000000-0000-0000-0000-000000022002","score":0.5}]'::jsonb),
  1, 'a proposal that passes every live rule is written');
select is((select n from intro_count), 2, 'as a pair of twin introductions');
select ok(
  (select a.reciprocal_id = b.id and b.reciprocal_id = a.id
   from introductions a join introductions b on b.viewer_id = a.subject_id and b.subject_id = a.viewer_id
   where a.viewer_id = '00000000-0000-0000-0000-000000022001' and a.subject_id = '00000000-0000-0000-0000-000000022002'),
  'each pointing at the other');
select is(
  public.league_commit_edges_service((select job from the_job),
    '[{"a":"00000000-0000-0000-0000-000000022001","b":"00000000-0000-0000-0000-000000022002","score":0.5}]'::jsonb),
  0, 'committing the same proposal again changes nothing');
select is((select n from intro_count), 2, 'not even by a row');
select ok(
  (select last_shown_at = (select opens_at from rounds where user_id = '00000000-0000-0000-0000-000000022001' and cycle_date is not null)
   from halal_mode_private.pair_exposure
   where user_low = '00000000-0000-0000-0000-000000022001' and user_high = '00000000-0000-0000-0000-000000022002'),
  'the repeat gap runs from when they can actually see each other');

insert into blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-000000022003', '00000000-0000-0000-0000-000000022004');
select is(
  public.league_commit_edges_service((select job from the_job),
    '[{"a":"00000000-0000-0000-0000-000000022003","b":"00000000-0000-0000-0000-000000022004","score":0.5}]'::jsonb),
  0, 'a block made after the table was read still wins');
select is(
  public.league_commit_edges_service((select job from the_job),
    '[{"a":"00000000-0000-0000-0000-000000022006","b":"00000000-0000-0000-0000-000000022005","score":0.5}]'::jsonb),
  0, 'someone is never shown a country they did not choose, whatever a worker proposes');
select is(
  public.league_commit_edges_service((select job from the_job),
    '[{"a":"00000000-0000-0000-0000-000000022001","b":"00000000-0000-0000-0000-000000022003","score":0.5}]'::jsonb),
  0, 'two men are never introduced, whatever a worker proposes');

update profiles set is_paused = true where id = '00000000-0000-0000-0000-000000022004';
select is(
  public.league_commit_edges_service((select job from the_job),
    '[{"a":"00000000-0000-0000-0000-000000022006","b":"00000000-0000-0000-0000-000000022004","score":0.5}]'::jsonb),
  0, 'someone who paused a moment ago is not introduced');
update profiles set is_paused = false where id = '00000000-0000-0000-0000-000000022004';

update private_preferences set must_have = '{"age": true}'::jsonb, min_age = 60, max_age = 70
where user_id = '00000000-0000-0000-0000-000000022006';
select is(
  public.league_commit_edges_service((select job from the_job),
    '[{"a":"00000000-0000-0000-0000-000000022006","b":"00000000-0000-0000-0000-000000022004","score":0.5}]'::jsonb),
  0, 'a must-have changed a moment ago is honoured');
select is(
  (select r ->> 'criterion' from (select to_jsonb(m) r from halal_mode_private.member_reach('00000000-0000-0000-0000-000000022006') m) x),
  'age', 'and the member is told which of their own choices is costing them');
update private_preferences set must_have = '{}'::jsonb, min_age = 18, max_age = 60
where user_id = '00000000-0000-0000-0000-000000022006';

update rounds set seats = 0 where user_id = '00000000-0000-0000-0000-000000022006' and cycle_date is not null;
select is(
  public.league_commit_edges_service((select job from the_job),
    '[{"a":"00000000-0000-0000-0000-000000022006","b":"00000000-0000-0000-0000-000000022004","score":0.5}]'::jsonb),
  0, 'nobody is given more than their seats');
update rounds set seats = 5 where user_id = '00000000-0000-0000-0000-000000022006' and cycle_date is not null;

update rounds set opens_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-000000022006' and cycle_date is not null;
select is(
  public.league_commit_edges_service((select job from the_job),
    '[{"a":"00000000-0000-0000-0000-000000022006","b":"00000000-0000-0000-0000-000000022004","score":0.5}]'::jsonb),
  0, 'nothing is added to a set someone has already started looking at');
update rounds set opens_at = now() + interval '1 hour' where user_id = '00000000-0000-0000-0000-000000022006' and cycle_date is not null;

update halal_mode_private.release_flags set enabled = false where key = 'league_matching';
select throws_ok(
  $$select public.league_commit_edges_service((select job from the_job),
      '[{"a":"00000000-0000-0000-0000-000000022006","b":"00000000-0000-0000-0000-000000022004","score":0.5}]'::jsonb)$$,
  '55P03', null, 'turning the switch off stops commits that are already under way');
update halal_mode_private.release_flags set enabled = true where key = 'league_matching';

-- ---------------------------------------------------------------- a retry only deals what is left
select is(
  (select sum(used)::int from halal_mode_private.league_seats
   where (cycle_date, wave, stratum, table_no) = (
     select (job ->> 'cycleDate')::date, (job ->> 'wave')::int, job ->> 'stratum', (job ->> 'tableNo')::int from the_job)
     and user_id in ('00000000-0000-0000-0000-000000022001', '00000000-0000-0000-0000-000000022002')),
  2, 'each committed introduction spends a seat at this table, for both people');

-- ---------------------------------------------------------------- a lease is a real fence
update halal_mode_private.league_jobs set lease_until = now() - interval '1 second'
where lease_token = (select (job ->> 'token')::uuid from the_job);
select throws_ok(
  $$select public.league_commit_edges_service((select job from the_job),
      '[{"a":"00000000-0000-0000-0000-000000022006","b":"00000000-0000-0000-0000-000000022004","score":0.5}]'::jsonb)$$,
  '55P03', null, 'a worker whose lease ran out cannot write, even if nobody has taken the table yet');
update halal_mode_private.league_jobs set lease_until = now() + interval '1 minute'
where lease_token = (select (job ->> 'token')::uuid from the_job);

-- ---------------------------------------------------------------- a set stays honest once it is open
update rounds set opens_at = now() - interval '1 minute', expires_at = now() + interval '1 day'
where user_id = '00000000-0000-0000-0000-000000022001' and cycle_date is not null;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000022001","role":"authenticated"}', true);
select is(jsonb_array_length(public.get_current_round() -> 'introductions'), 1, 'an open set shows its introduction');
select set_config('request.jwt.claims', '', true);
update profiles set is_paused = true where id = '00000000-0000-0000-0000-000000022002';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000022001","role":"authenticated"}', true);
select is(jsonb_array_length(public.get_current_round() -> 'introductions'), 0, 'and stops showing someone who has since paused');
select ok(
  not halal_mode_private.can_read_profile_media('00000000-0000-0000-0000-000000022002'),
  'and their photos cannot be read through that introduction');
select is(
  halal_mode_private.current_introduction_subject(
    (select id from introductions where viewer_id = '00000000-0000-0000-0000-000000022001' and subject_id = '00000000-0000-0000-0000-000000022002')),
  '00000000-0000-0000-0000-000000022002'::uuid,
  'but they can still be reported or blocked through it');
select set_config('request.jwt.claims', '', true);
update profiles set is_paused = false where id = '00000000-0000-0000-0000-000000022002';

-- ---------------------------------------------------------------- two dawns
-- The first person's window has closed. The second's has not. The pick has to survive.
insert into introduction_selections (introduction_id, viewer_id, subject_id, decision, decided_at)
select i.id, i.viewer_id, i.subject_id, 'kept', now() from introductions i
where i.viewer_id = '00000000-0000-0000-0000-000000022001' and i.subject_id = '00000000-0000-0000-0000-000000022002';
update rounds set expires_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-000000022001' and cycle_date is not null;
select expire_stale_rounds();
select is(
  (select decision::text from introduction_selections
   where viewer_id = '00000000-0000-0000-0000-000000022001' and subject_id = '00000000-0000-0000-0000-000000022002'),
  'kept', 'a pick waits for the other person''s dawn window to close, not its own');
update rounds set expires_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-000000022002' and cycle_date is not null;
select expire_stale_rounds();
select is(
  (select decision::text from introduction_selections
   where viewer_id = '00000000-0000-0000-0000-000000022001' and subject_id = '00000000-0000-0000-0000-000000022002'),
  'expired', 'and expires once both have closed');

-- ---------------------------------------------------------------- recovery
update halal_mode_private.league_jobs set status = 'leased', lease_until = now() - interval '1 second', lease_token = gen_random_uuid()
where (cycle_date, wave, stratum, table_no) = (
  select cycle_date, wave, stratum, table_no from halal_mode_private.league_jobs where wave >= 0 order by wave limit 1);
select ok(
  (select public.league_next_job_service() ->> 'kind') = 'table',
  'a table whose worker died is given to another');
select ok(
  exists (select 1 from halal_mode_private.league_cycles where phase <> 'sealed'),
  'and the day carries on rather than being lost');

select * from finish();
rollback;
