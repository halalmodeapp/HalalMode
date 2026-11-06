begin;
set local search_path = public, extensions, halal_mode_private;
select plan(26);

-- Three men and one woman, so the games can only give the first man a card. The rest are short.
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000222' || n)::uuid, 'oneway-' || n || '@example.test'
from unnest(array['01', '02', '03', '04']) n;

insert into profiles (
  id, name, first_name, birth_date, gender, city, country, latitude, longitude, bio, photos,
  onboarding_complete, marital_status, sensitive_consent_at, tier
)
select ('00000000-0000-0000-0000-0000000222' || m.n)::uuid, 'Member ' || m.n, 'M' || m.n, '1995-01-01', m.gender::gender,
       'London', 'United Kingdom', 51.5, -0.1, repeat('A good person looking for someone kind. ', 3), array['p/' || m.n || '.jpg'],
       true, 'never_married', now(), 'free'
from (values ('01', 'male'), ('02', 'male'), ('03', 'male'), ('04', 'female')) as m(n, gender);

insert into private_preferences (user_id, matching_preferences_completed_at, preferred_countries)
select id, now(), array['United Kingdom'] from profiles where id::text like '00000000-0000-0000-0000-0000000222%';

insert into halal_mode_private.member_legal_consent_history (user_id, document_type, version, acceptance_context)
select p.id, d.document_type, d.version, 'onboarding'
from profiles p cross join halal_mode_private.legal_document_registry d
where d.is_current and p.id::text like '00000000-0000-0000-0000-0000000222%';

update halal_mode_private.release_flags set enabled = true where key = 'league_matching';
update profiles set is_paused = true where id::text not like '00000000-0000-0000-0000-0000000222%';

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.deliver(p_cycle date) returns void language plpgsql as $$
declare
  v_after uuid;
begin
  perform halal_mode_private.league_forget_returns();
  loop
    v_after := halal_mode_private.league_deliver_returns(p_cycle, v_after);
    exit when v_after is null;
  end loop;
end;
$$;

-- Two rounds, opening later today, and the day's main deal with returns delivered.
create function pg_temp.new_cycle(p_cycle date) returns void language plpgsql as $$
begin
  insert into rounds (user_id, tier, opens_at, expires_at, cycle_date)
  select id, 'free', now() + interval '1 hour', now() + interval '25 hours', p_cycle
  from profiles where id::text like '00000000-0000-0000-0000-0000000222%';
  update rounds set seats = 5 where cycle_date = p_cycle;
  perform pg_temp.deliver(p_cycle);
end;
$$;
create function pg_temp.card(p_viewer text, p_subject text, p_cycle date) returns uuid language sql as $$
  select i.id from introductions i join rounds r on r.id = i.round_id
  where i.viewer_id = p_viewer::uuid and i.subject_id = p_subject::uuid and r.cycle_date = p_cycle;
$$;
create function pg_temp.open_rounds(p_cycle date) returns void language sql as $$
  update rounds set opens_at = now() - interval '1 minute' where cycle_date = p_cycle;
$$;

-- ------------------------------------------------------------------ a one-way table
select pg_temp.new_cycle('2030-01-01');
insert into halal_mode_private.league_cycles (cycle_date, seed) values ('2030-01-01', 1);
insert into halal_mode_private.league_jobs (cycle_date, wave, stratum, table_no, one_way, status, lease_token, lease_until)
values ('2030-01-01', 20, 'united kingdom', 0, true, 'leased', '00000000-0000-0000-0000-000000000abc', now() + interval '2 minutes');
insert into halal_mode_private.league_seats (cycle_date, wave, stratum, table_no, user_id, seats) values
  ('2030-01-01', 20, 'united kingdom', 0, '00000000-0000-0000-0000-000000022201', 5),
  ('2030-01-01', 20, 'united kingdom', 0, '00000000-0000-0000-0000-000000022202', 5),
  ('2030-01-01', 20, 'united kingdom', 0, '00000000-0000-0000-0000-000000022204', 0);

select is(
  league_commit_edges_service(
    '{"cycleDate":"2030-01-01","wave":20,"stratum":"united kingdom","tableNo":0,"token":"00000000-0000-0000-0000-000000000abc"}',
    '[{"a":"00000000-0000-0000-0000-000000022201","b":"00000000-0000-0000-0000-000000022204","score":0.5},
      {"a":"00000000-0000-0000-0000-000000022202","b":"00000000-0000-0000-0000-000000022204","score":0.5}]'
  ),
  2,
  'two men are shown the same woman'
);
select ok(pg_temp.card('00000000-0000-0000-0000-000000022201', '00000000-0000-0000-0000-000000022204', '2030-01-01') is not null, 'the first has her card');
select is(pg_temp.card('00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022201', '2030-01-01'), null, 'she has no card of him');
select is((select reciprocal_id from introductions where id = pg_temp.card('00000000-0000-0000-0000-000000022201', '00000000-0000-0000-0000-000000022204', '2030-01-01')), null, 'it has no twin');
select is((select seen_by_low from pair_exposure where user_low = '00000000-0000-0000-0000-000000022201' and user_high = '00000000-0000-0000-0000-000000022204'), 1, 'he has seen her');
select is((select seen_by_high from pair_exposure where user_low = '00000000-0000-0000-0000-000000022201' and user_high = '00000000-0000-0000-0000-000000022204'), 0, 'and she has not seen him');
select is((select used from league_seats where wave = 20 and user_id = '00000000-0000-0000-0000-000000022204'), 0, 'being shown costs her no seat');

-- ------------------------------------------------------------------ his yes waits
select pg_temp.open_rounds('2030-01-01');
select pg_temp.act_as('00000000-0000-0000-0000-000000022201');
select submit_round_selections_ranked_with_signals(
  (select id from rounds where user_id = '00000000-0000-0000-0000-000000022201' and cycle_date = '2030-01-01'),
  array[pg_temp.card('00000000-0000-0000-0000-000000022201', '00000000-0000-0000-0000-000000022204', '2030-01-01')],
  '[]'::jsonb
);
select pg_temp.act_as('00000000-0000-0000-0000-000000022202');
select submit_round_selections_ranked_with_signals(
  (select id from rounds where user_id = '00000000-0000-0000-0000-000000022202' and cycle_date = '2030-01-01'),
  '{}'::uuid[], '[]'::jsonb
);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select is((select count(*)::int from league_returns), 1, 'only a yes waits, and a card left unchosen does not');
select is((select count(*)::int from liked_you_current('00000000-0000-0000-0000-000000022204')), 0, 'a waiting yes stays out of the tray');

-- The day ends. His yes has to survive it.
update rounds set expires_at = now() - interval '1 second' where cycle_date = '2030-01-01';
select expire_stale_rounds();
select is(
  (select decision::text from introduction_selections where introduction_id = pg_temp.card('00000000-0000-0000-0000-000000022201', '00000000-0000-0000-0000-000000022204', '2030-01-01')),
  'kept',
  'his yes outlives the day'
);

-- ------------------------------------------------------------------ the next day she sees him
select pg_temp.new_cycle('2030-01-02');
select ok(pg_temp.card('00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022201', '2030-01-02') is not null, 'his card reaches her set');
select is(
  (select reciprocal_id from introductions where id = pg_temp.card('00000000-0000-0000-0000-000000022201', '00000000-0000-0000-0000-000000022204', '2030-01-01')),
  pg_temp.card('00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022201', '2030-01-02'),
  'and the two cards are linked'
);

-- While that card is still hers, the next set does not take it from her.
select pg_temp.new_cycle('2030-01-03');
select is(pg_temp.card('00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022201', '2030-01-03'), null, 'a card still hers is left where it is');

-- She never opens it, so it comes back the day after, on a new card.
update rounds set expires_at = now() - interval '1 second' where cycle_date = '2030-01-02';
select expire_stale_rounds();
select pg_temp.deliver('2030-01-03');
select ok(pg_temp.card('00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022201', '2030-01-03') is not null, 'unopened, it comes back the next day');
select is(
  (select reciprocal_id from introductions where id = pg_temp.card('00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022201', '2030-01-02')),
  null,
  'and the old card lets go'
);

-- She says yes, and it is a match at once.
select pg_temp.open_rounds('2030-01-03');
select pg_temp.act_as('00000000-0000-0000-0000-000000022204');
select is(
  submit_round_selections_ranked_with_signals(
    (select id from rounds where user_id = '00000000-0000-0000-0000-000000022204' and cycle_date = '2030-01-03'),
    array[pg_temp.card('00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022201', '2030-01-03')],
    '[]'::jsonb
  ) -> 'mutualProfileIds' ->> 0,
  '00000000-0000-0000-0000-000000022201',
  'her yes makes the match'
);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is((select count(*)::int from league_returns), 0, 'and the wait is over');

-- ------------------------------------------------------------------ a wait that ends without an answer
insert into league_returns (recipient, sender, introduction_id, expires_at)
select '00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022202',
       pg_temp.card('00000000-0000-0000-0000-000000022202', '00000000-0000-0000-0000-000000022204', '2030-01-01'),
       now() - interval '1 second';
select pg_temp.deliver('2030-01-03');
select is((select count(*)::int from league_returns), 0, 'a yes out of time is gone');

insert into league_returns (recipient, sender, introduction_id, expires_at)
select '00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022202',
       pg_temp.card('00000000-0000-0000-0000-000000022202', '00000000-0000-0000-0000-000000022204', '2030-01-01'),
       now() + interval '7 days';
insert into blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022202');
update rounds set opens_at = now() + interval '1 hour', submitted_at = null where user_id = '00000000-0000-0000-0000-000000022204' and cycle_date = '2030-01-03';
select pg_temp.deliver('2030-01-03');
select is((select count(*)::int from league_returns), 0, 'a block ends the wait');
select is(pg_temp.card('00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022202', '2030-01-03'), null, 'and nothing reaches her');

-- ------------------------------------------------------------------ a second pass is for good
delete from blocks where blocker_id = '00000000-0000-0000-0000-000000022204';
update pair_exposure set explicit_pass_count = 1
where user_low = '00000000-0000-0000-0000-000000022203' and user_high = '00000000-0000-0000-0000-000000022204';
insert into pair_exposure (user_low, user_high, explicit_pass_count)
values ('00000000-0000-0000-0000-000000022203', '00000000-0000-0000-0000-000000022204', 1)
on conflict (user_low, user_high) do update set explicit_pass_count = 1;
insert into introductions (round_id, viewer_id, subject_id)
select r.id, r.user_id, '00000000-0000-0000-0000-000000022204' from rounds r
where r.user_id = '00000000-0000-0000-0000-000000022203' and r.cycle_date = '2030-01-03';
update rounds set submitted_at = null, expires_at = now() + interval '1 day' where user_id = '00000000-0000-0000-0000-000000022203' and cycle_date = '2030-01-03';
select pg_temp.act_as('00000000-0000-0000-0000-000000022203');
select pass_introduction(pg_temp.card('00000000-0000-0000-0000-000000022203', '00000000-0000-0000-0000-000000022204', '2030-01-03'));
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select ok(
  (select retired_at is not null from pair_exposure
   where user_low = '00000000-0000-0000-0000-000000022203' and user_high = '00000000-0000-0000-0000-000000022204'),
  'a second pass closes the pair for good'
);

select pg_temp.act_as('00000000-0000-0000-0000-000000022203');
select pass_introduction(pg_temp.card('00000000-0000-0000-0000-000000022203', '00000000-0000-0000-0000-000000022204', '2030-01-03'));
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(
  (select explicit_pass_count::int from pair_exposure
   where user_low = '00000000-0000-0000-0000-000000022203' and user_high = '00000000-0000-0000-0000-000000022204'),
  2,
  'asking twice about the same card is one pass'
);
select ok(league_pair_passed('00000000-0000-0000-0000-000000022203', '00000000-0000-0000-0000-000000022204'), 'a pick on either of their cards is not made');
select ok(league_pair_stands('00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022203'), 'but no card vanishes, which would give the pass away');

-- Someone who came to the app while the card was theirs has seen it.
insert into league_returns (recipient, sender, introduction_id, delivered_id, expires_at)
select '00000000-0000-0000-0000-000000022204', '00000000-0000-0000-0000-000000022202',
       pg_temp.card('00000000-0000-0000-0000-000000022202', '00000000-0000-0000-0000-000000022204', '2030-01-01'),
       i.id, now() + interval '7 days'
from introductions i where i.viewer_id = '00000000-0000-0000-0000-000000022204' and i.subject_id = '00000000-0000-0000-0000-000000022201'
limit 1;
update rounds set expires_at = now() - interval '1 second', opens_at = now() - interval '1 day'
where id = (select round_id from introductions where id = (select delivered_id from league_returns));
delete from introduction_selections where introduction_id = (select delivered_id from league_returns);
insert into league_member_activity (user_id, last_seen_at) values ('00000000-0000-0000-0000-000000022204', now() - interval '1 hour')
on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
select league_forget_returns();
select is((select count(*)::int from league_returns), 0, 'so it is not shown again');

select is((select repeat_gap_days from league_config), 1, 'repeats may come back the next day');

select * from finish();
rollback;
