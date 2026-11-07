begin;
set local search_path = public, extensions, halal_mode_private;
select plan(16);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000231' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.nobody() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;
insert into auth.users (id, email, email_confirmed_at)
select pg_temp.member(n), 'deal-' || n || '@example.test', now() from generate_series(1, 8) n;
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude,
                      bio, photos, onboarding_complete, marital_status, sensitive_consent_at)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01', case when n % 2 = 0 then 'female' else 'male' end::gender,
       'London', 'United Kingdom', 51.5, -0.1, repeat('a', 50), array[pg_temp.member(n)::text || '/p.jpg'],
       true, 'never_married', now() from generate_series(1, 8) n;
insert into private_preferences (user_id, matching_preferences_completed_at, preferred_countries)
select pg_temp.member(n), now(), array['United Kingdom'] from generate_series(1, 8) n;
insert into member_legal_consent_history (user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 8) n cross join legal_document_registry d where d.is_current;

-- M2 and M18. Only members at the leased table, only real Fajr-to-Fajr windows, one set per dawn.
update release_flags set enabled = true where key = 'league_matching';
insert into league_cycles (cycle_date, seed, started_at) values (current_date + 1, 231, now() - interval '1 minute');
insert into league_jobs (cycle_date, wave, stratum, table_no, status, lease_token, lease_until)
values (current_date + 1, -1, 'deal-test', 0, 'leased', pg_temp.member(8), now() + interval '1 hour');
insert into league_seats (cycle_date, wave, stratum, table_no, user_id, seats)
select current_date + 1, -1, 'deal-test', 0, pg_temp.member(n), 5 from generate_series(1, 4) n;
create function pg_temp.job() returns jsonb language sql as $$
  select jsonb_build_object('cycleDate', current_date + 1, 'wave', -1, 'stratum', 'deal-test', 'tableNo', 0, 'token', pg_temp.member(8));
$$;
create function pg_temp.window(n int, opens interval, lasts interval) returns jsonb language sql as $$
  select jsonb_build_object('user_id', pg_temp.member(n), 'opens_at', now() + opens, 'expires_at', now() + opens + lasts);
$$;
insert into rounds (user_id, tier, opens_at, expires_at, cycle_date, seats)
values (pg_temp.member(3), 'free', now() + interval '2 hours', now() + interval '26 hours', current_date, 5);
select is(league_commit_rounds_service(pg_temp.job(), jsonb_build_array(
  pg_temp.window(1, '2 hours', '24 hours'),
  pg_temp.window(2, '2 hours', '30 minutes'),
  pg_temp.window(3, '2 hours', '24 hours'),
  pg_temp.window(5, '2 hours', '24 hours'))), 1, 'only a real window, for a seated member, on a dawn not already dealt, is written');
select ok(exists (select 1 from rounds where user_id = pg_temp.member(1) and cycle_date = current_date + 1), 'the good window becomes a set');
select ok(not exists (select 1 from rounds where user_id = pg_temp.member(2) and cycle_date = current_date + 1), 'a half-hour window is refused');
select ok(not exists (select 1 from rounds where user_id = pg_temp.member(3) and cycle_date = current_date + 1), 'a dawn that already has a set is not dealt again');
select ok(not exists (select 1 from rounds where user_id = pg_temp.member(5) and cycle_date = current_date + 1), 'a member at another table is refused');
select ok(position('last_dawn' in pg_get_functiondef('public.league_next_job_service()'::regprocedure)) > 0, 'the worker is told each member''s last dawn');
select throws_ok($$update league_config set base_seats = 0$$, '23514', null, 'settings stay within their ranges');
select ok(position('r.tier = ''premium''' in pg_get_functiondef('halal_mode_private.league_advance()'::regprocedure)) > 0,
  'seats come from the tier the set was prepared with');

-- M5 and M15. A waiting yes needs a set with seats, its seven days still running at that dawn, and no pass.
delete from rounds where cycle_date is not null;
insert into rounds (user_id, tier, opens_at, expires_at, cycle_date, seats)
values (pg_temp.member(2), 'free', now() - interval '1 day', now() + interval '1 hour', current_date - 1, 5);
insert into introductions (round_id, viewer_id, subject_id)
select id, pg_temp.member(2), pg_temp.member(n) from rounds, generate_series(1, 5, 2) n where user_id = pg_temp.member(2);
insert into rounds (user_id, tier, opens_at, expires_at, cycle_date, seats)
select pg_temp.member(n), 'free', now() + interval '2 hours', now() + interval '26 hours', current_date + 2,
       case when n = 1 then null else 5 end
from generate_series(1, 5, 2) n;
insert into league_returns (recipient, sender, introduction_id, expires_at)
select i.subject_id, pg_temp.member(2), i.id,
       case when i.subject_id = pg_temp.member(3) then now() + interval '1 hour' else now() + interval '7 days' end
from introductions i where i.viewer_id = pg_temp.member(2);
insert into pair_exposure (user_low, user_high, retired_at) values (pg_temp.member(2), pg_temp.member(5), now());
select league_deliver_returns(current_date + 2);
select ok(not exists (select 1 from introductions i join rounds r on r.id = i.round_id where r.cycle_date = current_date + 2),
  'no yes is delivered into a seatless set, after its seven days, or after a pass');
select ok(exists (select 1 from league_returns where recipient = pg_temp.member(1)), 'the yes waiting on a seatless set keeps waiting');
update rounds set seats = 5 where user_id = pg_temp.member(1) and cycle_date = current_date + 2;
select league_deliver_returns(current_date + 2);
select is((select count(*)::int from introductions i join rounds r on r.id = i.round_id
           where r.cycle_date = current_date + 2 and r.user_id = pg_temp.member(1)), 1, 'once seats exist it is delivered');

-- M7. An opened set keeps its cards when a preference changes, and loses one for a pause.
delete from rounds where cycle_date is not null;
insert into rounds (user_id, tier, opens_at, expires_at, cycle_date, seats)
values (pg_temp.member(1), 'free', now() - interval '1 hour', now() + interval '23 hours', current_date, 5);
insert into introductions (round_id, viewer_id, subject_id)
select id, pg_temp.member(1), pg_temp.member(2) from rounds where user_id = pg_temp.member(1);
update private_preferences set min_age = 60, max_age = 70 where user_id = pg_temp.member(1);
select pg_temp.act_as(1);
select is(jsonb_array_length(get_current_round()->'introductions'), 1, 'a changed preference does not empty an opened set');
select pg_temp.nobody();
update profiles set is_paused = true where id = pg_temp.member(2);
select pg_temp.act_as(1);
select is(jsonb_array_length(get_current_round()->'introductions'), 0, 'a pause still takes the card away');
select pg_temp.nobody();
update profiles set is_paused = false where id = pg_temp.member(2);

-- M12. A failed table means an incomplete set, not "nobody fitted".
delete from introductions where viewer_id = pg_temp.member(1);
update league_cycles set phase = 'sealed' where cycle_date = current_date;
insert into league_cycles (cycle_date, seed, phase) values (current_date, 232, 'sealed') on conflict do nothing;
update league_cycles set phase = 'sealed' where cycle_date = current_date;
insert into league_jobs (cycle_date, wave, stratum, table_no, status) values (current_date, 0, 'deal-fail', 0, 'failed');
insert into league_seats (cycle_date, wave, stratum, table_no, user_id, seats) values (current_date, 0, 'deal-fail', 0, pg_temp.member(1), 5);
select pg_temp.act_as(1);
select is(get_current_round_state()->>'status', 'set_incomplete', 'a member whose table failed is told the set is incomplete');
select pg_temp.nobody();
update league_jobs set status = 'done' where stratum = 'deal-fail';
select pg_temp.act_as(1);
select isnt(get_current_round_state()->>'status', 'set_incomplete', 'a finished table is not called incomplete');
select pg_temp.nobody();
select ok(position('matching_member_eligible' in pg_get_functiondef('halal_mode_private.member_reach(uuid)'::regprocedure)) > 0,
  'a filter is blamed only against people who could really be dealt');

select * from finish();
rollback;
