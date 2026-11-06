-- The league: how the daily round is built.
--
-- The pool is dealt onto tables of about a thousand. Each table is matched on its
-- own by a worker, and committed on its own after a check against the live rules.
-- A table is the unit of everything: speed, memory, failure, retry and growth. If
-- one fails only its members lose anything, and another worker picks it up.
--
-- Each side of a country is split into groups, frozen for a cycle, and a schedule
-- moves them between tables, so every pair shares a table within days. A country
-- with fewer than a table's worth of members is one table, which compares everyone.
--
-- There are no snapshots. Workers read live data and commit checks live data, so a
-- member who blocks, pauses or leaves is simply gone, and nothing private outlives
-- the day: a seat holds only a member's id and cascades when the account goes.

create table halal_mode_private.league_config (
  id boolean primary key default true check (id),
  -- People at a table, half from each side. Bigger than this and real Edge workers run out of CPU.
  table_size int not null default 500 check (table_size >= 2),
  games int not null default 5 check (games between 1 and 10),
  -- Two-way passes for anyone short after the games. One-way cards fill whatever these leave.
  makeup_waves int not null default 1 check (makeup_waves between 0 and 10),
  -- Days before the same two people may be shown again. New people always come first, and a familiar
  -- face beats an empty seat, so this is as short as it can be without repeating within a day.
  repeat_gap_days int not null default 1 check (repeat_gap_days >= 1),
  fresh_decay numeric not null default 0.7,
  seat_decay numeric not null default 0.7,
  -- How strongly people at the same level are favoured. See docs/BACKEND_SIMULATION.md for the trade.
  like_meets_like numeric not null default 2,
  base_seats int not null default 5,
  -- Passes that give anyone still short one-way cards, each trying the next of their countries.
  topup_waves int not null default 3 check (topup_waves between 0 and 10),
  -- Days a yes on a one-way card waits to be answered.
  return_days int not null default 7 check (return_days >= 1),
  -- Hours since a member was last seen before they stop taking up introductions.
  dormant_after_days int not null default 14,
  -- When a day's cycle begins. In the middle of the Pacific, so almost nobody's dawn is near.
  start_minute_utc int not null default 870,
  lease_seconds int not null default 120,
  max_attempts int not null default 4
);
insert into halal_mode_private.league_config default values;
revoke all on halal_mode_private.league_config from public, anon, authenticated;

create table halal_mode_private.league_cycles (
  cycle_date date primary key,
  seed bigint not null,
  phase text not null default 'prepare' check (phase in ('prepare', 'returns', 'main', 'makeup', 'topup', 'sealed')),
  makeup_wave int not null default 0,
  topup_wave int not null default 0,
  -- How far delivering the waiting yeses has got, a few people at a time.
  returns_after uuid,
  started_at timestamptz not null default now(),
  sealed_at timestamptz
);

create table halal_mode_private.league_schedules (
  stratum text primary key,
  groups int not null,
  games int not null,
  started_on date not null,
  days int not null
);

create table halal_mode_private.league_jobs (
  cycle_date date not null references halal_mode_private.league_cycles (cycle_date) on delete cascade,
  wave int not null,
  stratum text not null,
  table_no int not null,
  status text not null default 'pending' check (status in ('pending', 'leased', 'done', 'failed')),
  lease_token uuid,
  lease_until timestamptz,
  attempts int not null default 0,
  edges int not null default 0,
  last_error text,
  -- A table of one-way cards: those with seats are shown people, and the others are only shown.
  one_way boolean not null default false,
  primary key (cycle_date, wave, stratum, table_no)
);
create index league_jobs_open_idx on halal_mode_private.league_jobs (cycle_date, wave, table_no)
  where status in ('pending', 'leased');

create table halal_mode_private.league_seats (
  cycle_date date not null,
  wave int not null,
  stratum text not null,
  table_no int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seats int not null check (seats >= 0),
  -- Seats already spent, so a table retried after a crash only deals what is left.
  used int not null default 0,
  primary key (cycle_date, wave, stratum, table_no, user_id),
  foreign key (cycle_date, wave, stratum, table_no)
    references halal_mode_private.league_jobs (cycle_date, wave, stratum, table_no) on delete cascade
);
create index league_seats_user_idx on halal_mode_private.league_seats (user_id);

create table halal_mode_private.league_member_activity (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

-- A yes on a one-way card, waiting to reach the person it is about. It takes an ordinary place in their
-- set, and links back to the card, so the usual check for a mutual pick does the rest.
create table halal_mode_private.league_returns (
  recipient uuid not null references public.profiles (id) on delete cascade,
  sender uuid not null references public.profiles (id) on delete cascade,
  introduction_id uuid not null references public.introductions (id) on delete cascade,
  -- The card it is on today. It goes when they have answered, and comes back if they never opened it.
  delivered_id uuid references public.introductions (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (recipient, sender)
);
create index league_returns_sender_idx on halal_mode_private.league_returns (sender);
create index league_returns_introduction_idx on halal_mode_private.league_returns (introduction_id);
create index league_returns_delivered_idx on halal_mode_private.league_returns (delivered_id);

revoke all on halal_mode_private.league_cycles, halal_mode_private.league_schedules,
  halal_mode_private.league_jobs, halal_mode_private.league_seats,
  halal_mode_private.league_member_activity, halal_mode_private.league_returns from public, anon, authenticated;

-- What each person has seen, because a one-way card tells the other person nothing.
alter table halal_mode_private.pair_exposure
  add column seen_by_low int not null default 0,
  add column seen_by_high int not null default 0;
update halal_mode_private.pair_exposure set seen_by_low = times_shown, seen_by_high = times_shown;

-- Being shown no longer holds a pair apart for weeks, so only a pass sets a wait. How soon a pair may
-- return is `repeat_gap_days`, in one place.
drop trigger pair_exposure_cooldown_from_score on halal_mode_private.pair_exposure;
drop function halal_mode_private.pair_exposure_set_cooldown();
update halal_mode_private.pair_exposure
set cooldown_until = case when last_passed_at is not null then last_passed_at + make_interval(
  days => coalesce((halal_mode_private.active_matching_config() ->> 'explicit_pass_first_cooldown_days')::int, 30)
) end;

-- A second pass closes the pair for good.
update halal_mode_private.pair_exposure set retired_at = coalesce(retired_at, now()) where explicit_pass_count >= 2;
select halal_mode_private.patch_function_any_newline(
  'public.pass_introduction(uuid)',
  'v_cfg := halal_mode_private.active_matching_config();',
  '-- Asking twice about the same card is one pass, even at the same moment.
  perform pg_advisory_xact_lock(hashtextextended(least(v_viewer, v_introduction.subject_id)::text, 1919));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_viewer, v_introduction.subject_id)::text, 1919));
  if exists (select 1 from introduction_selections s
             where s.introduction_id = v_introduction.id and s.decision in (''released'', ''explicit_pass'')) then
    return;
  end if;

  v_cfg := halal_mode_private.active_matching_config();'
);
select halal_mode_private.patch_function_any_newline(
  'public.pass_introduction(uuid)',
  'returning pe.explicit_pass_count into v_passes;
',
  'returning pe.explicit_pass_count into v_passes;

  if v_passes >= v_ban_after then
    update halal_mode_private.pair_exposure
    set retired_at = coalesce(retired_at, now())
    where user_low = least(v_viewer, v_introduction.subject_id)
      and user_high = greatest(v_viewer, v_introduction.subject_id);
  end if;
'
);

-- A set can now be prepared while today's is still open. The legacy generator keeps
-- its one-open-round promise, since its rows have no cycle.
alter table public.rounds
  add column cycle_date date,
  add column seats int,
  add column thin jsonb;
drop index if exists public.rounds_open_per_user_idx;
create unique index rounds_open_uncycled_per_user_idx on public.rounds (user_id)
  where submitted_at is null and cycle_date is null;
create unique index rounds_user_cycle_idx on public.rounds (user_id, cycle_date)
  where cycle_date is not null;
create index rounds_cycle_idx on public.rounds (cycle_date) where cycle_date is not null;

-- If the league is turned off with sets prepared, the legacy generator must leave them alone.
select halal_mode_private.patch_function_any_newline(
  'public.generate_round_for_pairs_scheduled(jsonb)',
  'select id into round_a from rounds where user_id = pair.male_id and submitted_at is null limit 1;',
  'select id into round_a from rounds where user_id = pair.male_id and submitted_at is null and cycle_date is null limit 1;'
);
select halal_mode_private.patch_function_any_newline(
  'public.generate_round_for_pairs_scheduled(jsonb)',
  'select id into round_b from rounds where user_id = pair.female_id and submitted_at is null limit 1;',
  'select id into round_b from rounds where user_id = pair.female_id and submitted_at is null and cycle_date is null limit 1;'
);

-- A prepared set is announced when it is finished, with how many it really holds.
create or replace function halal_mode_private.notify_round_ready()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  if new.cycle_date is not null then return new; end if;
  perform halal_mode_private.enqueue_notification(
    new.user_id, 'round_ready',
    jsonb_build_object('count', (select l.introductions from public.tier_limits(new.tier) l)),
    greatest(new.opens_at - now(), interval '0')
  );
  return new;
end;
$function$;

-- People open their sets at their own dawn, hours apart, so a pick has to wait for the
-- other person's window to close, not its own.
select halal_mode_private.patch_function_any_newline(
  'public.expire_stale_rounds()',
  'and r.expires_at < now()
    and not exists (',
  'and r.expires_at < now()
    and not exists (
      select 1 from introductions twin
      join rounds their_round on their_round.id = twin.round_id
      where twin.id = i.reciprocal_id and their_round.expires_at >= now()
    )
    and not exists (
      select 1 from halal_mode_private.league_returns waiting where waiting.introduction_id = i.id
    )
    and not exists ('
);

-- Who takes part today. Everyone who could use a set, and nobody who has stopped coming.
create view halal_mode_private.league_pool as
select
  p.id,
  p.gender::text as gender,
  p.tier,
  lower(btrim(p.country)) as country_key,
  p.latitude,
  p.longitude,
  p.high_latitude_fajr_method
from public.profiles p
join public.private_preferences pp on pp.user_id = p.id
left join halal_mode_private.league_member_activity a on a.user_id = p.id
cross join halal_mode_private.league_config cfg
cross join lateral public.tier_limits(p.tier) l
where p.onboarding_complete
  and not p.is_paused
  and p.marital_status is not null
  and p.latitude is not null and p.longitude is not null
  and pp.matching_preferences_completed_at is not null
  and coalesce(a.last_seen_at, p.created_at) > now() - make_interval(days => cfg.dormant_after_days)
  and public.profile_is_ready_for_matching(p.id)
  and halal_mode_private.member_has_current_legal_consents(p.id)
  and (select count(*) from public.connections c
       where c.closed_at is null and (c.user_a = p.id or c.user_b = p.id)) < l.open_connections;
revoke all on halal_mode_private.league_pool from public, anon, authenticated;

-- --------------------------------------------------------------------- the deal

-- First the rounds, because only a worker can work out each member's dawn.
create function halal_mode_private.league_deal_prepare(p_cycle date)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_count int;
  v_tables int;
begin
  select count(*) into v_count from halal_mode_private.league_pool;
  v_tables := greatest(1, ceil(v_count / 500.0)::int);
  insert into halal_mode_private.league_jobs (cycle_date, wave, stratum, table_no)
  select p_cycle, -1, 'prepare', n from generate_series(0, v_tables - 1) n;
  insert into halal_mode_private.league_seats (cycle_date, wave, stratum, table_no, user_id, seats)
  select p_cycle, -1, 'prepare', (row_number() over (order by pool.id) - 1)::int % v_tables, pool.id, 1
  from halal_mode_private.league_pool pool;
end;
$function$;

-- Clears out the yeses that have had their answer or run out of time. Each is then treated like any
-- other that went unanswered. Someone who came to the app while the card was theirs has seen it.
create function halal_mode_private.league_forget_returns()
returns void
language sql
security definer
set search_path = public, halal_mode_private
as $function$
  delete from halal_mode_private.league_returns ret
  where ret.expires_at <= now()
     or exists (select 1 from public.introduction_selections s where s.introduction_id = ret.delivered_id)
     or exists (select 1 from public.connections c
                where c.user_a = least(ret.recipient, ret.sender) and c.user_b = greatest(ret.recipient, ret.sender))
     or exists (select 1 from halal_mode_private.pair_exposure e
                where e.user_low = least(ret.recipient, ret.sender) and e.user_high = greatest(ret.recipient, ret.sender)
                  and (e.retired_at is not null or e.cooldown_until > now()))
     or exists (select 1 from public.introductions d
                join public.rounds r on r.id = d.round_id
                join halal_mode_private.league_member_activity a on a.user_id = ret.recipient
                where d.id = ret.delivered_id and r.expires_at < now()
                  and a.last_seen_at between r.opens_at and r.expires_at);
$function$;

-- Puts waiting yeses in the sets of the next few people they are about, oldest first, as far as each set
-- has room. Returns the last person dealt with, or null when nobody is left. A batch at a time, under the
-- same locks in the same order as a pick, so this can neither deadlock with one nor hold too many at once.
-- Each is checked here, and again when shown and when picked, so a block or a pause simply ends it.
create function halal_mode_private.league_deliver_returns(p_cycle date, p_after uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_people uuid[];
  v_user uuid;
begin
  select array_agg(x.recipient order by x.recipient) into v_people
  from (
    select distinct w.recipient from halal_mode_private.league_returns w
    where p_after is null or w.recipient > p_after
    order by w.recipient limit 100
  ) x;
  if v_people is null then return null; end if;

  -- Exactly these, so a yes arriving now waits for the next day rather than slipping past the locks.
  create temporary table league_batch on commit drop as
  select w.recipient, w.sender from halal_mode_private.league_returns w where w.recipient = any(v_people);

  for v_user in
    select distinct id from (
      select recipient as id from league_batch
      union all
      select sender from league_batch
    ) members order by id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  end loop;

  -- A card still theirs to answer stays where it is, so what they pick on it still counts.
  create temporary table league_ready on commit drop as
  with waiting as materialized (
    select w.recipient, w.sender, w.introduction_id, w.delivered_id, w.created_at, r.id as round_id, r.opens_at, r.seats
    from halal_mode_private.league_returns w
    join league_batch batch on batch.recipient = w.recipient and batch.sender = w.sender
    join public.rounds r on r.user_id = w.recipient and r.cycle_date = p_cycle
    where r.submitted_at is null and r.opens_at > now()
      and not exists (select 1 from public.introductions d
                      join public.rounds dr on dr.id = d.round_id
                      where d.id = w.delivered_id and dr.submitted_at is null and dr.expires_at >= now())
  ), people as materialized (
    select f as facts, f.id, p.is_paused, halal_mode_private.member_has_current_legal_consents(f.id) as consented
    from halal_mode_private.member_matching_facts f
    join public.profiles p on p.id = f.id
    where f.id in (select recipient from waiting union select sender from waiting)
  )
  select w.*, gen_random_uuid() as card,
    coalesce(
      not a.is_paused and not b.is_paused and a.consented and b.consented
      and halal_mode_private.accepts_row(a.facts, b.facts, null)
      and halal_mode_private.accepts_row(b.facts, a.facts, null)
      and not exists (select 1 from public.blocks x
                      where (x.blocker_id = w.recipient and x.blocked_id = w.sender)
                         or (x.blocker_id = w.sender and x.blocked_id = w.recipient))
      and not exists (select 1 from halal_mode_private.member_hides x
                      where (x.hider_id = w.recipient and x.hidden_id = w.sender)
                         or (x.hider_id = w.sender and x.hidden_id = w.recipient)),
      false) as stands
  from waiting w
  left join people a on a.id = w.recipient
  left join people b on b.id = w.sender;

  delete from halal_mode_private.league_returns ret
  using league_ready ready
  where ret.recipient = ready.recipient and ret.sender = ready.sender and not ready.stands;
  delete from league_ready where not stands;
  -- Only those who still stand compete for a place.
  delete from league_ready ready
  using (
    select recipient, sender, row_number() over (partition by recipient order by created_at, sender) as place
    from league_ready
  ) ranked
  where ranked.recipient = ready.recipient and ranked.sender = ready.sender and ranked.place > ready.seats;

  -- A pair with a yes waiting is never dealt, and this runs before any table, so these are the first
  -- cards in these sets and nothing can be in the way.
  insert into public.introductions (id, round_id, viewer_id, subject_id, reciprocal_id, agreements)
  select card, round_id, recipient, sender, introduction_id, public.agreement_summary(recipient, sender)
  from league_ready;

  update public.introductions i set reciprocal_id = null
  from league_ready ready where i.id = ready.delivered_id;
  update public.introductions i set reciprocal_id = ready.card
  from league_ready ready where i.id = ready.introduction_id;
  update halal_mode_private.league_returns ret set delivered_id = ready.card
  from league_ready ready where ret.recipient = ready.recipient and ret.sender = ready.sender;

  insert into halal_mode_private.pair_exposure as pe (
    user_low, user_high, times_shown, seen_by_low, seen_by_high, last_shown_at
  )
  select least(recipient, sender), greatest(recipient, sender), 1,
         case when recipient < sender then 1 else 0 end,
         case when recipient > sender then 1 else 0 end,
         opens_at
  from league_ready
  on conflict (user_low, user_high) do update set
    times_shown = pe.times_shown + 1,
    seen_by_low = pe.seen_by_low + excluded.seen_by_low,
    seen_by_high = pe.seen_by_high + excluded.seen_by_high,
    last_shown_at = excluded.last_shown_at;

  drop table league_ready;
  drop table league_batch;
  return v_people[cardinality(v_people)];
end;
$function$;

-- The games everyone plays. Each of a member's seats is in one of the countries they chose, taking the
-- list in turn, so someone looking in two countries spends about half their day in each. A table is
-- simply everyone with a seat in that country that game, wherever they live, and only people who chose
-- each other's countries can meet there.
create function halal_mode_private.league_deal_main(p_cycle date, p_seed bigint)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  cfg halal_mode_private.league_config;
begin
  select * into cfg from halal_mode_private.league_config;

  -- Whoever has already said yes to someone takes up a place, and the games fill the rest.
  create temporary table league_people on commit drop as
  select
    pool.id,
    pool.gender,
    f.preferred_country_keys as places,
    greatest(0, cfg.base_seats - (select count(*)::int from public.introductions i where i.round_id = r.id)) as base
  from halal_mode_private.league_pool pool
  join halal_mode_private.member_matching_facts f on f.id = pool.id
  join public.rounds r on r.user_id = pool.id and r.cycle_date = p_cycle;

  create temporary table league_places on commit drop as
  select
    person.id,
    person.gender,
    person.places[1 + ((abs(hashtextextended(person.id::text || ':' || p_cycle, p_seed)) + seat) % cardinality(person.places))::int] as stratum,
    count(*)::int as count
  from league_people person
  cross join lateral generate_series(0, person.base - 1) seat
  group by 1, 2, 3;

  -- A schedule stays frozen until every group has met every group, so coverage is a promise.
  with counts as (
    select stratum,
      count(*) filter (where gender = 'male') as men,
      count(*) filter (where gender <> 'male') as women
    from league_places group by stratum
  ), wanted as (
    select stratum,
      greatest(1, ceil(greatest(men, women) / (cfg.table_size / 2.0))::int) as groups
    from counts
  )
  insert into halal_mode_private.league_schedules (stratum, groups, games, started_on, days)
  select stratum, groups, least(cfg.games, groups), p_cycle,
    greatest(1, ceil(groups::numeric / least(cfg.games, groups))::int)
  from wanted
  on conflict (stratum) do update set
    groups = excluded.groups, games = excluded.games,
    started_on = excluded.started_on, days = excluded.days
  where halal_mode_private.league_schedules.started_on + halal_mode_private.league_schedules.days <= p_cycle;

  create temporary table league_dealt on commit drop as
  with placed as (
    select
      place.id, place.gender, place.stratum, place.count, s.groups, s.games, s.started_on,
      (abs(hashtextextended(place.id::text || ':' || s.started_on || ':' || place.gender, s.groups)) % s.groups)::int as grp
    from league_places place
    join halal_mode_private.league_schedules s on s.stratum = place.stratum
  )
  select
    p_cycle as cycle_date,
    game.n as wave,
    placed.stratum,
    case when placed.gender = 'male' then placed.grp
         else ((placed.grp - ((p_cycle - placed.started_on) * placed.games + game.n)) % placed.groups + placed.groups) % placed.groups
    end::int as table_no,
    placed.id as user_id,
    (floor(placed.count * (game.n + 1)::numeric / placed.games) - floor(placed.count * game.n::numeric / placed.games))::int as seats
  from placed
  cross join lateral generate_series(0, placed.games - 1) game(n);

  insert into halal_mode_private.league_jobs (cycle_date, wave, stratum, table_no)
  select distinct cycle_date, wave, stratum, table_no from league_dealt where seats > 0;
  insert into halal_mode_private.league_seats (cycle_date, wave, stratum, table_no, user_id, seats)
  select cycle_date, wave, stratum, table_no, user_id, seats from league_dealt where seats > 0;

  drop table league_dealt;
  drop table league_places;
  drop table league_people;
end;
$function$;

-- Then anyone with a seat left, a seat at a time, so no table is ever bigger than a game's. Each wave
-- tries the next of the member's countries, so if one is short of people the others make it up.
-- Premium extras are simply seats left once everyone has had their five games.
create function halal_mode_private.league_deal_short(p_cycle date, p_seed bigint, p_wave int)
returns int
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  cfg halal_mode_private.league_config;
  v_jobs int;
begin
  select * into cfg from halal_mode_private.league_config;

  create temporary table league_short on commit drop as
  select
    r.user_id as id,
    f.gender,
    f.preferred_country_keys[1 + ((abs(hashtextextended(r.user_id::text, p_seed)) + p_wave) % cardinality(f.preferred_country_keys))::int] as stratum,
    r.seats - (select count(*)::int from public.introductions i where i.round_id = r.id) as seats_left
  from public.rounds r
  join halal_mode_private.member_matching_facts f on f.id = r.user_id
  where r.cycle_date = p_cycle
    and r.seats > (select count(*)::int from public.introductions i where i.round_id = r.id);

  create temporary table league_dealt on commit drop as
  with sized as (
    select stratum,
      greatest(1, ceil(greatest(count(*) filter (where gender = 'male'),
                                count(*) filter (where gender <> 'male')) / (cfg.table_size / 2.0))::int) as groups
    from league_short group by stratum
    having count(*) filter (where gender = 'male') > 0 and count(*) filter (where gender <> 'male') > 0
  )
  select
    p_cycle as cycle_date,
    p_wave as wave,
    person.stratum,
    (abs(hashtextextended(person.id::text || ':' || p_wave, p_seed + sized.groups)) % sized.groups)::int as table_no,
    person.id as user_id,
    case when sized.groups = 1 then person.seats_left else 1 end as seats
  from league_short person
  join sized on sized.stratum = person.stratum;

  insert into halal_mode_private.league_jobs (cycle_date, wave, stratum, table_no)
  select distinct cycle_date, wave, stratum, table_no from league_dealt;
  get diagnostics v_jobs = row_count;
  insert into halal_mode_private.league_seats (cycle_date, wave, stratum, table_no, user_id, seats)
  select cycle_date, wave, stratum, table_no, user_id, seats from league_dealt;

  drop table league_dealt;
  drop table league_short;
  return v_jobs;
end;
$function$;

-- Then anyone still short is shown people one way, so a seat is empty only if nobody is left to fill it.
-- Each person takes their next country, and sits with those living there who have been seen least today.
-- They are only shown, so being here costs them nothing, and they see this person only if this person
-- says yes.
create function halal_mode_private.league_deal_topup(p_cycle date, p_seed bigint, p_wave int)
returns int
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  cfg halal_mode_private.league_config;
  v_jobs int;
begin
  select * into cfg from halal_mode_private.league_config;

  create temporary table league_viewers on commit drop as
  select
    r.user_id as id,
    f.gender,
    f.preferred_country_keys[1 + ((abs(hashtextextended(r.user_id::text, p_seed)) + p_wave) % cardinality(f.preferred_country_keys))::int] as stratum,
    r.seats - (select count(*)::int from public.introductions i where i.round_id = r.id) as seats_left
  from public.rounds r
  join halal_mode_private.member_matching_facts f on f.id = r.user_id
  where r.cycle_date = p_cycle and r.opens_at > now() and r.submitted_at is null
    and r.seats > (select count(*)::int from public.introductions i where i.round_id = r.id);

  create temporary table league_sized on commit drop as
  select stratum, greatest(1, ceil(count(*) / (cfg.table_size / 2.0))::int) as groups
  from league_viewers group by stratum;

  create temporary table league_dealt on commit drop as
  with exposure as (
    select i.subject_id as id, count(*) as seen
    from public.introductions i
    join public.rounds r on r.id = i.round_id
    where r.cycle_date = p_cycle
    group by i.subject_id
  ), sat as (
    select
      v.id as user_id, v.stratum,
      (abs(hashtextextended(v.id::text || ':' || p_wave, p_seed + z.groups)) % z.groups)::int as table_no,
      v.seats_left as seats
    from league_viewers v join league_sized z on z.stratum = v.stratum
  ), shown as (
    select
      r.user_id, z.stratum,
      ((row_number() over (partition by z.stratum, f.gender
                           order by coalesce(x.seen, 0), hashtextextended(r.user_id::text || ':' || p_wave, p_seed)) - 1) % z.groups)::int as table_no,
      row_number() over (partition by z.stratum, f.gender
                         order by coalesce(x.seen, 0), hashtextextended(r.user_id::text || ':' || p_wave, p_seed)) as place,
      z.groups
    from public.rounds r
    join halal_mode_private.member_matching_facts f on f.id = r.user_id
    join public.profiles p on p.id = r.user_id
    -- Where they live, because that is what the person being shown them chose.
    join league_sized z on z.stratum = lower(btrim(p.country))
    left join exposure x on x.id = r.user_id
    where r.cycle_date = p_cycle and r.opens_at > now() and r.submitted_at is null
  )
  select p_cycle as cycle_date, p_wave as wave, stratum, table_no, user_id, max(seats)::int as seats
  from (
    select stratum, table_no, user_id, seats from sat
    union all
    select stratum, table_no, user_id, 0 from shown
    where place <= groups * (cfg.table_size / 2)
      and (stratum, table_no) in (select stratum, table_no from sat)
  ) everyone
  group by stratum, table_no, user_id;

  insert into halal_mode_private.league_jobs (cycle_date, wave, stratum, table_no, one_way)
  select distinct cycle_date, wave, stratum, table_no, true from league_dealt;
  get diagnostics v_jobs = row_count;
  insert into halal_mode_private.league_seats (cycle_date, wave, stratum, table_no, user_id, seats)
  select cycle_date, wave, stratum, table_no, user_id, seats from league_dealt;

  drop table league_dealt;
  drop table league_sized;
  drop table league_viewers;
  return v_jobs;
end;
$function$;

-- Announce the finished sets, with how many they really hold.
create function halal_mode_private.league_seal(p_cycle date)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v record;
begin
  for v in
    select r.user_id, r.opens_at, count(i.id)::int as introductions
    from public.rounds r
    join public.introductions i on i.round_id = r.id
    where r.cycle_date = p_cycle and r.submitted_at is null
    group by r.id
  loop
    perform halal_mode_private.enqueue_notification(
      v.user_id, 'round_ready', jsonb_build_object('count', v.introductions),
      greatest(v.opens_at - now(), interval '0')
    );
  end loop;
  update halal_mode_private.league_cycles set phase = 'sealed', sealed_at = now() where cycle_date = p_cycle;
end;
$function$;

-- Moves the day forward. Safe to call at any time, from anywhere, as often as you like:
-- it only acts when everything the next step needs is finished, so there is no daily
-- claim to lose. A worker that dies leaves a lease that runs out, and that is all.
create function halal_mode_private.league_advance()
returns date
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  cfg halal_mode_private.league_config;
  v_cycle date;
  c halal_mode_private.league_cycles;
  v_jobs int;
  v_after uuid;
begin
  select * into cfg from halal_mode_private.league_config;
  v_cycle := ((now() at time zone 'utc') - make_interval(mins => cfg.start_minute_utc))::date;

  -- Only one worker moves the day forward at a time. The others just get on with tables.
  if not pg_try_advisory_xact_lock(hashtextextended('league_advance', 7301)) then
    return v_cycle;
  end if;

  select * into c from halal_mode_private.league_cycles where cycle_date = v_cycle;
  if not found then
    delete from halal_mode_private.league_cycles where cycle_date < v_cycle - 1;
    perform public.expire_stale_rounds();
    -- Read before the day is dealt, and never allowed to stop it.
    begin
      perform public.capture_matching_outcomes_service(30);
    exception when others then
      raise warning 'outcome measurement skipped: %', sqlerrm;
    end;
    insert into halal_mode_private.league_cycles (cycle_date, seed)
    values (v_cycle, abs(hashtextextended(v_cycle::text, 7302)));
    perform halal_mode_private.league_deal_prepare(v_cycle);
    return v_cycle;
  end if;
  if c.phase = 'sealed' then return v_cycle; end if;

  update halal_mode_private.league_jobs
  set status = 'failed', lease_token = null
  where cycle_date = v_cycle and attempts >= cfg.max_attempts
    and (status = 'pending' or (status = 'leased' and lease_until < now()));
  if exists (select 1 from halal_mode_private.league_jobs
             where cycle_date = v_cycle and status in ('pending', 'leased')) then
    return v_cycle;
  end if;

  if c.phase = 'prepare' then
    update public.rounds r
    set seats = case when pool.tier = 'premium' then greatest(10, cfg.base_seats) else cfg.base_seats end
    from halal_mode_private.league_pool pool
    where r.user_id = pool.id and r.cycle_date = v_cycle;
    perform halal_mode_private.league_forget_returns();
    update halal_mode_private.league_cycles set phase = 'returns' where cycle_date = v_cycle;
    return v_cycle;
  end if;

  if c.phase = 'returns' then
    v_after := halal_mode_private.league_deliver_returns(v_cycle, c.returns_after);
    if v_after is not null then
      update halal_mode_private.league_cycles set returns_after = v_after where cycle_date = v_cycle;
      return v_cycle;
    end if;
    perform halal_mode_private.league_deal_main(v_cycle, c.seed);
    update halal_mode_private.league_cycles set phase = 'main' where cycle_date = v_cycle;
    return v_cycle;
  end if;

  if c.phase in ('main', 'makeup') and c.makeup_wave < cfg.makeup_waves then
    v_jobs := halal_mode_private.league_deal_short(v_cycle, c.seed, cfg.games + c.makeup_wave);
    update halal_mode_private.league_cycles
    set phase = 'makeup', makeup_wave = c.makeup_wave + 1 where cycle_date = v_cycle;
    return v_cycle;
  end if;

  if c.topup_wave < cfg.topup_waves then
    v_jobs := halal_mode_private.league_deal_topup(v_cycle, c.seed, cfg.games + cfg.makeup_waves + c.topup_wave);
    update halal_mode_private.league_cycles
    set phase = 'topup', topup_wave = c.topup_wave + 1 where cycle_date = v_cycle;
    return v_cycle;
  end if;

  perform halal_mode_private.league_seal(v_cycle);
  return v_cycle;
end;
$function$;

-- ------------------------------------------------------------------- the workers

-- What a table is told about a member, in the shape src/matching/league.ts reads.
create function halal_mode_private.league_member_json(
  f halal_mode_private.member_matching_facts, p_seats int, p_given int
)
returns jsonb
language sql
stable
set search_path = public, halal_mode_private
as $function$
  select jsonb_build_object(
    'id', f.id, 'gender', f.gender, 'isPremium', f.is_premium, 'seats', p_seats, 'given', p_given,
    'receptionScore', coalesce((select e.score from halal_mode_private.matching_signal_estimates e where e.user_id = f.id), 0.5),
    'receptionConfidence', coalesce((select e.confidence from halal_mode_private.matching_signal_estimates e where e.user_id = f.id), 0),
    'maritalStatus', f.marital_status, 'countryKey', f.country_key,
    'latitude', f.latitude, 'longitude', f.longitude, 'age', f.age,
    'sect', f.sect, 'sectDetail', f.sect_detail, 'religiousPractice', f.religious_practice,
    'timeline', f.timeline, 'familyGoals', f.family_goals,
    'hasChildren', f.has_children, 'occupation', f.occupation, 'education', f.education,
    'religiousDress', f.religious_dress, 'languagesSpoken', f.languages_spoken,
    'ethnicities', f.ethnicities, 'heritageCountries', f.heritage_countries,
    'grewUpCountries', f.grew_up_countries, 'diet', f.diet
  ) || jsonb_build_object(
    'minAge', f.min_age, 'maxAge', f.max_age, 'minHeightCm', f.min_height_cm, 'maxHeightCm', f.max_height_cm,
    'ownHeightCm', f.own_height_cm, 'preferredBuilds', coalesce(f.preferred_builds, '{}'),
    'ownBuild', f.own_build, 'ownBuildAlso', f.own_build_also,
    'preferredPractice', coalesce(f.preferred_practice, '{}'), 'desiredTimeline', coalesce(f.desired_timeline, '{}'),
    'desiredFamilyGoals', coalesce(f.desired_family_goals, '{}'), 'preferredSects', coalesce(f.preferred_sects, '{}'),
    'preferredSectDetails', coalesce(f.preferred_sect_details, '{}'),
    'detailSects', coalesce((select jsonb_object_agg(d, public.sect_of_detail(d))
                             from unnest(f.preferred_sect_details) d), '{}'::jsonb),
    'maxDistanceKm', f.max_distance_km, 'preferredCountryKeys', f.preferred_country_keys,
    'acceptedMaritalStatuses', f.accepted_marital_statuses, 'mustHave', f.must_have,
    'premiumMustHave', f.premium_must_have,
    'preferredHasChildren', f.preferred_has_children,
    'preferredOccupations', f.preferred_occupations,
    'preferredLanguages', f.preferred_languages,
    'preferredEducation', f.preferred_education,
    'preferredDress', f.preferred_dress,
    'preferredEthnicities', f.preferred_ethnicities,
    'preferredHeritageCountries', f.preferred_heritage_countries,
    'preferredGrewUpCountries', f.preferred_grew_up_countries,
    'preferredDiet', f.preferred_diet
  );
$function$;
revoke all on function halal_mode_private.league_member_json(halal_mode_private.member_matching_facts, int, int) from public, anon, authenticated;

-- A worker's whole conversation with the database is these calls. The next one to do, or
-- nothing. `league_matching` is the switch: off, no new work starts and nothing commits.
create function public.league_next_job_service()
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
set statement_timeout = '120s'
as $function$
declare
  cfg halal_mode_private.league_config;
  v_cycle date;
  job halal_mode_private.league_jobs;
  v_token uuid := gen_random_uuid();
  v_seed bigint;
  v_ids uuid[];
begin
  if not coalesce((select enabled from halal_mode_private.release_flags where key = 'league_matching'), false) then
    return jsonb_build_object('kind', 'off');
  end if;

  select * into cfg from halal_mode_private.league_config;
  v_cycle := halal_mode_private.league_advance();

  update halal_mode_private.league_jobs j
  set status = 'leased', lease_token = v_token,
      lease_until = now() + make_interval(secs => cfg.lease_seconds), attempts = j.attempts + 1
  where (j.cycle_date, j.wave, j.stratum, j.table_no) = (
    select o.cycle_date, o.wave, o.stratum, o.table_no
    from halal_mode_private.league_jobs o
    where o.cycle_date = v_cycle and o.attempts < cfg.max_attempts
      and (o.status = 'pending' or (o.status = 'leased' and o.lease_until < now()))
    order by o.wave, o.table_no, o.stratum
    for update skip locked limit 1
  )
  returning * into job;
  if job.cycle_date is null then
    if exists (select 1 from halal_mode_private.league_jobs
               where cycle_date = v_cycle and status in ('pending', 'leased')) then
      return jsonb_build_object('kind', 'wait');
    end if;
    return jsonb_build_object('kind', case
      when (select phase from halal_mode_private.league_cycles where cycle_date = v_cycle) = 'sealed' then 'done'
      else 'again' end);
  end if;

  if job.wave = -1 then
    return jsonb_build_object(
      'kind', 'prepare',
      'after', (select started_at from halal_mode_private.league_cycles where cycle_date = job.cycle_date),
      'job', jsonb_build_object('cycleDate', job.cycle_date, 'wave', job.wave, 'stratum', job.stratum, 'tableNo', job.table_no, 'token', v_token),
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id', p.id, 'latitude', p.latitude, 'longitude', p.longitude,
          'high_latitude_fajr_method', p.high_latitude_fajr_method))
        from halal_mode_private.league_seats s
        join public.profiles p on p.id = s.user_id
        where (s.cycle_date, s.wave, s.stratum, s.table_no) = (job.cycle_date, job.wave, job.stratum, job.table_no)
      ), '[]'::jsonb)
    );
  end if;

  select seed into v_seed from halal_mode_private.league_cycles where cycle_date = v_cycle;
  select array_agg(s.user_id) into v_ids
  from halal_mode_private.league_seats s
  where (s.cycle_date, s.wave, s.stratum, s.table_no) = (job.cycle_date, job.wave, job.stratum, job.table_no);

  return jsonb_build_object(
    'kind', 'table',
    'job', jsonb_build_object('cycleDate', job.cycle_date, 'wave', job.wave, 'stratum', job.stratum, 'tableNo', job.table_no, 'token', v_token),
    'table', jsonb_build_object(
      'seed', (v_seed + job.wave * 31 + job.table_no) % 2147483647,
      'oneWay', job.one_way,
      'members', (
        select jsonb_agg(halal_mode_private.league_member_json(f, s.seats - s.used, coalesce(already.n, 0)::int))
        from halal_mode_private.league_seats s
        join halal_mode_private.member_matching_facts f on f.id = s.user_id
        left join (
          -- At a one-way table what matters is how many sets someone is already in today.
          select case when job.one_way then i.subject_id else r.user_id end as user_id, count(*) as n
          from public.rounds r
          join public.introductions i on i.round_id = r.id
          where r.cycle_date = job.cycle_date
            and case when job.one_way then i.subject_id else r.user_id end = any(v_ids)
          group by 1
        ) already on already.user_id = s.user_id
        where (s.cycle_date, s.wave, s.stratum, s.table_no) = (job.cycle_date, job.wave, job.stratum, job.table_no)
          and (s.seats > s.used or job.one_way)
      ),
      -- Everyone at this table who must not meet, for any reason. Each is read once, here,
      -- rather than once per pair, which is most of why a table is quick.
      'closed', coalesce((
        select jsonb_agg(jsonb_build_array(x.a, x.b)) from (
          select e.user_low a, e.user_high b from halal_mode_private.pair_exposure e
          where e.user_low = any(v_ids) and e.user_high = any(v_ids)
            and (e.retired_at is not null or e.cooldown_until > now()
                 or e.last_shown_at > now() - make_interval(days => cfg.repeat_gap_days - 1))
          union
          select b.blocker_id, b.blocked_id from public.blocks b
          where b.blocker_id = any(v_ids) and b.blocked_id = any(v_ids)
          union
          select h.hider_id, h.hidden_id from halal_mode_private.member_hides h
          where h.hider_id = any(v_ids) and h.hidden_id = any(v_ids)
          union
          select c.user_a, c.user_b from public.connections c
          where c.user_a = any(v_ids) and c.user_b = any(v_ids)
          union
          select sel.viewer_id, sel.subject_id from public.introduction_selections sel
          where sel.decision = 'explicit_pass' and sel.viewer_id = any(v_ids) and sel.subject_id = any(v_ids)
          union
          -- Someone already waiting on an answer is not dealt again, either way round.
          select ret.recipient, ret.sender from halal_mode_private.league_returns ret
          where ret.recipient = any(v_ids) and ret.sender = any(v_ids)
        ) x
      ), '[]'::jsonb),
      'shown', coalesce((
        select jsonb_agg(jsonb_build_array(e.user_low, e.user_high, e.times_shown))
        from halal_mode_private.pair_exposure e
        where e.user_low = any(v_ids) and e.user_high = any(v_ids) and e.times_shown > 0
      ), '[]'::jsonb),
      'seen', case when job.one_way then coalesce((
        select jsonb_agg(jsonb_build_array(e.user_low, e.user_high, e.seen_by_low, e.seen_by_high))
        from halal_mode_private.pair_exposure e
        where e.user_low = any(v_ids) and e.user_high = any(v_ids) and e.times_shown > 0
      ), '[]'::jsonb) else '[]'::jsonb end
    ),
    'settings', jsonb_build_object(
      'seatDecay', cfg.seat_decay,
      'freshDecay', cfg.fresh_decay,
      'likeMeetsLike', cfg.like_meets_like,
      'weights', coalesce(halal_mode_private.active_matching_config() -> 'weights', '{}'::jsonb),
      'falloff', coalesce(halal_mode_private.active_matching_config() -> 'falloff', '{}'::jsonb),
      'distanceFreeKm', coalesce((halal_mode_private.active_matching_config() ->> 'distance_free_km')::numeric, 25),
      'sectMismatchScore', coalesce((halal_mode_private.active_matching_config() ->> 'sect_mismatch_score')::numeric, 0.15),
      'scales', (
        select jsonb_object_agg(criterion, values_by_position) from (
          select criterion, jsonb_object_agg(value, position) as values_by_position
          from halal_mode_private.criterion_scale group by criterion
        ) scales
      )
    )
  );
end;
$function$;

-- Only the worker holding a table may write to it, and it holds that table's row until it commits, so
-- nobody can take the table over halfway through a write. Nor can anything be written once the switch is off.
create function halal_mode_private.league_take_lease(p_job jsonb)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_lease int;
begin
  if not coalesce((select enabled from halal_mode_private.release_flags where key = 'league_matching'), false) then
    raise exception 'LEAGUE_OFF' using errcode = '55P03';
  end if;
  perform 1 from halal_mode_private.league_jobs j
  where j.cycle_date = (p_job ->> 'cycleDate')::date
    and j.wave = (p_job ->> 'wave')::int
    and j.stratum = p_job ->> 'stratum'
    and j.table_no = (p_job ->> 'tableNo')::int
    and j.status = 'leased'
    and j.lease_token = (p_job ->> 'token')::uuid
    and j.lease_until > now()
  for update;
  if not found then
    raise exception 'LEAGUE_LEASE_LOST' using errcode = '55P03';
  end if;
  select lease_seconds into v_lease from halal_mode_private.league_config;
  update halal_mode_private.league_jobs j
  set lease_until = now() + make_interval(secs => v_lease)
  where j.cycle_date = (p_job ->> 'cycleDate')::date
    and j.wave = (p_job ->> 'wave')::int
    and j.stratum = p_job ->> 'stratum'
    and j.table_no = (p_job ->> 'tableNo')::int;
end;
$function$;

create function public.league_commit_rounds_service(p_job jsonb, p_windows jsonb)
returns int
language plpgsql
security definer
set search_path = public, halal_mode_private
set statement_timeout = '30s'
as $function$
declare
  v_count int;
begin
  perform halal_mode_private.league_take_lease(p_job);
  insert into public.rounds (user_id, tier, opens_at, expires_at, cycle_date)
  select w.user_id, p.tier, w.opens_at, w.expires_at, (p_job ->> 'cycleDate')::date
  from jsonb_to_recordset(p_windows) as w(user_id uuid, opens_at timestamptz, expires_at timestamptz)
  join public.profiles p on p.id = w.user_id
  on conflict (user_id, cycle_date) where cycle_date is not null do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

-- Commits proposals from a table. The worker's view of who may meet is only a proposal: each is
-- checked here against live data, and any that fail are simply dropped. Safe to repeat. At a one-way
-- table, `a` is shown `b` and nothing else happens: `b` gives up no seat and is shown nothing.
create function public.league_commit_edges_service(p_job jsonb, p_edges jsonb)
returns int
language plpgsql
security definer
set search_path = public, halal_mode_private
set statement_timeout = '30s'
as $function$
declare
  v_cycle date := (p_job ->> 'cycleDate')::date;
  v_gap int;
  v_count int;
  v_user uuid;
  v_one_way boolean;
begin
  perform halal_mode_private.league_take_lease(p_job);
  select repeat_gap_days into v_gap from halal_mode_private.league_config;
  select j.one_way into v_one_way from halal_mode_private.league_jobs j
  where j.cycle_date = v_cycle and j.wave = (p_job ->> 'wave')::int
    and j.stratum = p_job ->> 'stratum' and j.table_no = (p_job ->> 'tableNo')::int;

  -- The same locks a block, a pause, a pick or a new connection takes, in one order. Whatever else
  -- happens to these people happens wholly before these checks or wholly after this commit.
  for v_user in
    select distinct id from (
      select (e ->> 'a')::uuid as id from jsonb_array_elements(p_edges) e
      union select (e ->> 'b')::uuid from jsonb_array_elements(p_edges) e
    ) members order by id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  end loop;

  -- Everyone once, then every pair from those rows, which is what makes checking 400 pairs quick.
  with proposed as (
    select e.a, e.b, e.score,
      row_number() over (partition by e.a) as seq_a,
      row_number() over (partition by e.b) as seq_b,
      row_number() over (partition by least(e.a, e.b), greatest(e.a, e.b)) as seq_pair
    from jsonb_to_recordset(p_edges) as e(a uuid, b uuid, score numeric)
  ), people as materialized (
    select f as facts, f.id, r.id as round_id, r.opens_at, r.seats,
      seat.seats - seat.used as seats_here,
      -- Out here, so it runs once for each person in the result and not for everyone scanned.
      halal_mode_private.member_has_current_legal_consents(f.id) as consented,
      (select count(*) from public.introductions i where i.round_id = r.id) as holding
    from halal_mode_private.member_matching_facts f
    join public.profiles p on p.id = f.id
    join public.rounds r on r.user_id = f.id and r.cycle_date = v_cycle
    join halal_mode_private.league_seats seat
      on seat.user_id = f.id and seat.cycle_date = v_cycle
     and seat.wave = (p_job ->> 'wave')::int and seat.stratum = p_job ->> 'stratum'
     and seat.table_no = (p_job ->> 'tableNo')::int
    cross join lateral public.tier_limits(p.tier) l
    where f.id in (select a from proposed union select b from proposed)
      and (select count(*) from public.connections c
           where c.closed_at is null and (c.user_a = f.id or c.user_b = f.id)) < l.open_connections
      and not p.is_paused
      and r.submitted_at is null
      -- Nothing is added to a set someone has already started looking at.
      and r.opens_at > now()
  ), checked as (
    select pr.a, pr.b, pr.score, pa.round_id as round_a, pb.round_id as round_b,
           case when v_one_way then pa.opens_at else greatest(pa.opens_at, pb.opens_at) end as available_at,
           gen_random_uuid() as intro_a, gen_random_uuid() as intro_b
    from proposed pr
    join people pa on pa.id = pr.a
    join people pb on pb.id = pr.b
    where pa.consented and pb.consented
      and pr.seq_pair = 1
      and (pa.facts).gender <> (pb.facts).gender
      and pa.holding + pr.seq_a <= pa.seats
      and (v_one_way or pb.holding + pr.seq_b <= pb.seats)
      and pr.seq_a <= pa.seats_here
      and (v_one_way or pr.seq_b <= pb.seats_here)
      and halal_mode_private.accepts_row(pa.facts, pb.facts, null)
      and halal_mode_private.accepts_row(pb.facts, pa.facts, null)
      and not exists (
        select 1 from halal_mode_private.pair_exposure x
        where x.user_low = least(pr.a, pr.b) and x.user_high = greatest(pr.a, pr.b)
          and (x.retired_at is not null or x.cooldown_until > now()
               or x.last_shown_at > now() - make_interval(days => v_gap - 1))
      )
      and not exists (select 1 from public.blocks x
                      where (x.blocker_id = pr.a and x.blocked_id = pr.b)
                         or (x.blocker_id = pr.b and x.blocked_id = pr.a))
      and not exists (select 1 from halal_mode_private.member_hides x
                      where (x.hider_id = pr.a and x.hidden_id = pr.b)
                         or (x.hider_id = pr.b and x.hidden_id = pr.a))
      and not exists (select 1 from halal_mode_private.league_returns x
                      where (x.recipient = pr.a and x.sender = pr.b)
                         or (x.recipient = pr.b and x.sender = pr.a))
      and not exists (select 1 from public.connections x
                      where x.user_a = least(pr.a, pr.b) and x.user_b = greatest(pr.a, pr.b))
      and not exists (select 1 from public.introduction_selections x
                      where x.decision = 'explicit_pass'
                        and ((x.viewer_id = pr.a and x.subject_id = pr.b)
                          or (x.viewer_id = pr.b and x.subject_id = pr.a)))
  ), written as (
    insert into public.introductions (id, round_id, viewer_id, subject_id, reciprocal_id, agreements)
    select intro_a, round_a, a, b, case when v_one_way then null else intro_b end, public.agreement_summary(a, b) from checked
    union all
    select intro_b, round_b, b, a, intro_a, public.agreement_summary(b, a) from checked where not v_one_way
    on conflict (round_id, subject_id) do nothing
    returning 1
  ), spent as (
    update halal_mode_private.league_seats seat
    set used = seat.used + x.n
    from (
      select id, count(*)::int as n from (select a as id from checked union all select b from checked where not v_one_way) y group by id
    ) x
    where seat.user_id = x.id and seat.cycle_date = v_cycle
      and seat.wave = (p_job ->> 'wave')::int and seat.stratum = p_job ->> 'stratum'
      and seat.table_no = (p_job ->> 'tableNo')::int
    returning 1
  ), remembered as (
    insert into halal_mode_private.pair_exposure as pe (
      user_low, user_high, times_shown, seen_by_low, seen_by_high,
      first_reciprocal_score, last_reciprocal_score, last_shown_at, last_round_id
    )
    select least(a, b), greatest(a, b), 1,
           case when not v_one_way or a < b then 1 else 0 end,
           case when not v_one_way or a > b then 1 else 0 end,
           score, score, available_at,
           case when a < b then round_a else round_b end
    from checked
    on conflict (user_low, user_high) do update set
      times_shown = pe.times_shown + 1,
      seen_by_low = pe.seen_by_low + excluded.seen_by_low,
      seen_by_high = pe.seen_by_high + excluded.seen_by_high,
      last_reciprocal_score = excluded.last_reciprocal_score,
      last_shown_at = excluded.last_shown_at,
      last_round_id = excluded.last_round_id
    returning 1
  )
  select (select count(*) from written) / case when v_one_way then 1 else 2 end into v_count;

  update halal_mode_private.league_jobs
  set edges = edges + v_count
  where cycle_date = v_cycle and wave = (p_job ->> 'wave')::int
    and stratum = p_job ->> 'stratum' and table_no = (p_job ->> 'tableNo')::int
    and lease_token = (p_job ->> 'token')::uuid;
  return v_count;
end;
$function$;

create function public.league_finish_job_service(p_job jsonb, p_error text default null)
returns void
language sql
security definer
set search_path = public, halal_mode_private
as $function$
  update halal_mode_private.league_jobs
  set status = case when p_error is null then 'done' else 'pending' end,
      last_error = p_error, lease_token = null, lease_until = null
  where cycle_date = (p_job ->> 'cycleDate')::date
    and wave = (p_job ->> 'wave')::int
    and stratum = p_job ->> 'stratum'
    and table_no = (p_job ->> 'tableNo')::int
    and lease_token = (p_job ->> 'token')::uuid;
$function$;

-- These run in long-lived connections while the tables they read go from empty to full within
-- minutes, so a plan cached at the start of the day can be wrong by orders of magnitude.
alter function public.league_next_job_service() set plan_cache_mode = force_custom_plan;
alter function public.league_commit_edges_service(jsonb, jsonb) set plan_cache_mode = force_custom_plan;
-- Tables running at once share people, so a commit may have to wait its turn. Under its own 30 seconds.
alter function public.league_commit_edges_service(jsonb, jsonb) set lock_timeout = '25s';
alter function halal_mode_private.league_advance() set plan_cache_mode = force_custom_plan;
alter function halal_mode_private.league_deal_main(date, bigint) set plan_cache_mode = force_custom_plan;
alter function halal_mode_private.league_deal_short(date, bigint, int) set plan_cache_mode = force_custom_plan;
alter function halal_mode_private.league_deal_topup(date, bigint, int) set plan_cache_mode = force_custom_plan;
alter function halal_mode_private.league_deliver_returns(date, uuid) set plan_cache_mode = force_custom_plan;

revoke all on function public.league_next_job_service(),
  public.league_commit_rounds_service(jsonb, jsonb),
  public.league_commit_edges_service(jsonb, jsonb),
  public.league_finish_job_service(jsonb, text) from public, anon, authenticated;
grant execute on function public.league_next_job_service(),
  public.league_commit_rounds_service(jsonb, jsonb),
  public.league_commit_edges_service(jsonb, jsonb),
  public.league_finish_job_service(jsonb, text) to service_role;

revoke all on function halal_mode_private.league_advance(),
  halal_mode_private.league_seal(date),
  halal_mode_private.league_deal_prepare(date),
  halal_mode_private.league_deal_main(date, bigint),
  halal_mode_private.league_deal_short(date, bigint, int),
  halal_mode_private.league_deal_topup(date, bigint, int),
  halal_mode_private.league_deliver_returns(date, uuid),
  halal_mode_private.league_forget_returns(),
  halal_mode_private.league_take_lease(jsonb) from public, anon, authenticated;

insert into halal_mode_private.release_flags (key, enabled) values ('league_matching', false)
on conflict (key) do nothing;

-- ------------------------------------------------------------------- what members see

-- Changing a must-have or hiding someone takes the same locks as a block or a pause, so a commit or a
-- pick sees each of them wholly before or wholly after.
create trigger matching_member_lock_preferences
  before insert or update or delete on public.private_preferences
  for each row execute function halal_mode_private.lock_matching_member_mutation('user_id');
create trigger matching_pair_lock_hides
  before insert or update or delete on halal_mode_private.member_hides
  for each row execute function halal_mode_private.lock_matching_pair_mutation('hider_id', 'hidden_id');

-- Whether an introduction from the league still stands. A set is prepared hours before it opens and
-- then lasts a day, and someone can pause, withdraw consent or change a must-have at any point in that.
create function halal_mode_private.league_pair_stands(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select coalesce((
    select not pa.is_paused and not pb.is_paused
      and halal_mode_private.accepts_row(a, b, null)
      and halal_mode_private.accepts_row(b, a, null)
    from halal_mode_private.member_matching_facts a
    join halal_mode_private.member_matching_facts b on b.id = p_b
    join public.profiles pa on pa.id = a.id
    join public.profiles pb on pb.id = b.id
    where a.id = p_a
  ), false)
    and halal_mode_private.member_has_current_legal_consents(p_b)
    and not exists (select 1 from public.blocks x
                    where (x.blocker_id = p_a and x.blocked_id = p_b)
                       or (x.blocker_id = p_b and x.blocked_id = p_a))
    and not halal_mode_private.pair_is_hidden(p_a, p_b);
$function$;
revoke all on function halal_mode_private.league_pair_stands(uuid, uuid) from public, anon, authenticated;

-- A pass ends a pair at the moment of a pick. It is not part of whether a card stands, because a card
-- vanishing from the other person's set would tell them they had been passed on.
create function halal_mode_private.league_pair_passed(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select exists (select 1 from halal_mode_private.pair_exposure x
                 where x.user_low = least(p_a, p_b) and x.user_high = greatest(p_a, p_b)
                   and (x.retired_at is not null or x.cooldown_until > now()));
$function$;
revoke all on function halal_mode_private.league_pair_passed(uuid, uuid) from public, anon, authenticated;
-- Dear to run, so a query tests everything else first.
alter function halal_mode_private.league_pair_stands(uuid, uuid) cost 10000;

select halal_mode_private.patch_function_any_newline(
  'public.get_current_round()',
  'where i.round_id = r.id
      and i.viewer_id = auth.uid()
',
  'where i.round_id = r.id
      and i.viewer_id = auth.uid()
      and (r.cycle_date is null or halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id))
'
);
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.can_read_current_introduction(uuid)',
  'and r.opens_at <= now()
      and not exists (',
  'and r.opens_at <= now()
      and (r.cycle_date is null or halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id))
      and not exists ('
);
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.can_read_profile_media(text)',
  'and r.opens_at <= now()
  ) or exists (',
  'and r.opens_at <= now()
      and (r.cycle_date is null or halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id))
  ) or exists ('
);
-- A pick of someone who no longer stands is simply not made, and the rest of the set is unaffected.
-- Checked under the same locks a pause or a block takes, so nothing can slip in between. The round is
-- locked only as far as its own columns, so it cannot deadlock with a commit adding to it.
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.submit_round_selections_after_legal_consent(uuid,uuid[])',
  'where id = p_round_id and user_id = auth.uid()
  for update;',
  'where id = p_round_id and user_id = auth.uid()
  for no key update;'
);
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.submit_round_selections_after_legal_consent(uuid,uuid[])',
  'insert into introduction_selections (introduction_id, viewer_id, subject_id, decision, decided_at)',
  'if r.cycle_date is not null then
    -- One pick at a time. As a query, the planner is free to test every introduction there is first.
    foreach v_subject in array v_ids loop
      if not coalesce((
        select halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id)
           and not halal_mode_private.league_pair_passed(i.viewer_id, i.subject_id)
        from introductions i where i.id = v_subject
      ), false) then
        v_ids := array_remove(v_ids, v_subject);
      end if;
    end loop;
  end if;

  insert into introduction_selections (introduction_id, viewer_id, subject_id, decision, decided_at)'
);
-- A yes on a one-way card goes to wait for the other person, and answering a waiting yes ends the wait.
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.submit_round_selections_after_legal_consent(uuid,uuid[])',
  'update rounds set submitted_at = now() where id = r.id and submitted_at is null;',
  'if r.cycle_date is not null then
    insert into halal_mode_private.league_returns (recipient, sender, introduction_id, expires_at)
    select i.subject_id, i.viewer_id, i.id,
           now() + make_interval(days => (select return_days from halal_mode_private.league_config))
    from introductions i
    join introduction_selections s on s.introduction_id = i.id and s.decision = ''kept''
    where i.round_id = r.id and i.viewer_id = auth.uid() and i.reciprocal_id is null
    on conflict (recipient, sender) do nothing;
    delete from halal_mode_private.league_returns ret
    using introductions i
    where ret.delivered_id = i.id and i.round_id = r.id;
  end if;

  update rounds set submitted_at = now() where id = r.id and submitted_at is null;'
);
-- A yes they have not yet been shown stays out of the tray: it is on its way as an ordinary card.
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.liked_you_current(uuid)',
  'where p.member_id = p_member
',
  'where p.member_id = p_member
    and not exists (select 1 from halal_mode_private.league_returns waiting
                    where waiting.recipient = p_member and waiting.sender = p.liker_id)
    and not exists (select 1 from halal_mode_private.pair_exposure closed
                    where closed.user_low = least(p_member, p.liker_id)
                      and closed.user_high = greatest(p_member, p.liker_id)
                      and closed.retired_at is not null)
'
);
-- Liking back is a pick too, so a pass since that like ends it here. It stays in the tray, because
-- removing it would give the pass away.
select halal_mode_private.patch_function_any_newline(
  'public.like_back(uuid)',
  '-- My own interest, recorded like any other, on the card I was shown.',
  'perform pg_advisory_xact_lock(hashtextextended(least(v_me, p_liker_id)::text, 1919));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_me, p_liker_id)::text, 1919));
  if halal_mode_private.league_pair_passed(v_me, p_liker_id) then
    raise exception ''That like is no longer available'' using errcode = ''P0002'';
  end if;

  -- My own interest, recorded like any other, on the card I was shown.'
);
-- Ranks count only the picks that were made, so the first of them is still first.
select halal_mode_private.patch_function_any_newline(
  'public.submit_round_selections_ranked_with_signals(uuid,uuid[],jsonb)',
  'perform halal_mode_private.record_selection_ranks(auth.uid(), p_round_id, v_ids);',
  'perform halal_mode_private.record_selection_ranks(auth.uid(), p_round_id, array(
    select chosen.id from unnest(v_ids) with ordinality as chosen(id, at)
    join public.introduction_selections s on s.introduction_id = chosen.id
    where s.decision = ''kept''
    order by chosen.at
  ));'
);
-- A mutual waiting for a free slot does not become a connection with someone who has since paused.
-- It waits, and it is there when they come back.
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.promote_waiting_connections(uuid[])',
  'if v_count_a < v_cap_a and v_count_b < v_cap_b then',
  'if v_count_a < v_cap_a and v_count_b < v_cap_b
       and not exists (select 1 from profiles p where p.id in (v_pair.a, v_pair.b) and p.is_paused) then'
);

-- How many people could this member ever be shown, and which of their own must-haves is costing
-- them the most. Only worked out for someone with few, so most members never pay for it.
create function halal_mode_private.member_reach(p_user uuid)
returns table (reach int, wanted int, criterion text, gain int)
language plpgsql
stable
security definer
set search_path = public, halal_mode_private
as $function$
declare
  cfg halal_mode_private.league_config;
  v_me halal_mode_private.member_matching_facts;
  v_option text;
  v_gain int;
  v_others uuid[];
begin
  select * into cfg from halal_mode_private.league_config;
  select * into v_me from halal_mode_private.member_matching_facts where id = p_user;
  -- Enough to fill a set. A familiar face beats an empty seat, so a filter is only to blame below this.
  wanted := cfg.base_seats;
  gain := 0;
  if v_me.id is null then reach := 0; return next; return; end if;

  -- Who would have this member, read once. Then each of the member's own rules against them.
  select coalesce(array_agg(f.id), '{}') into v_others
  from halal_mode_private.member_matching_facts f
  join public.profiles p on p.id = f.id
  left join halal_mode_private.league_member_activity seen on seen.user_id = f.id
  where f.gender <> v_me.gender and f.id <> p_user
    and p.onboarding_complete and not p.is_paused
    and coalesce(seen.last_seen_at, p.created_at) > now() - make_interval(days => cfg.dormant_after_days)
    and public.profile_is_ready_for_matching(f.id)
    and halal_mode_private.accepts_row(f, v_me, null)
    and not exists (select 1 from public.blocks b
                    where (b.blocker_id = p_user and b.blocked_id = f.id)
                       or (b.blocker_id = f.id and b.blocked_id = p_user))
    and not exists (select 1 from halal_mode_private.member_hides h
                    where (h.hider_id = p_user and h.hidden_id = f.id)
                       or (h.hider_id = f.id and h.hidden_id = p_user))
    and not exists (select 1 from public.connections c
                    where c.user_a = least(p_user, f.id) and c.user_b = greatest(p_user, f.id));

  select count(*)::int into reach from halal_mode_private.member_matching_facts f
  where f.id = any(v_others) and halal_mode_private.accepts_row(v_me, f, null);

  if reach < wanted then
    foreach v_option in array array['age', 'height', 'build', 'practice', 'timeline', 'children', 'sect', 'distance', 'countries'] loop
      continue when v_option <> 'countries' and not halal_mode_private.is_must_have(v_me.must_have, v_option);
      select count(*)::int - reach into v_gain from halal_mode_private.member_matching_facts f
      where f.id = any(v_others) and halal_mode_private.accepts_row(v_me, f, v_option);
      if v_gain > gain then
        gain := v_gain;
        criterion := v_option;
      end if;
    end loop;
  end if;
  return next;
end;
$function$;
revoke all on function halal_mode_private.member_reach(uuid) from public, anon, authenticated;

create function public.get_my_reach()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v record;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v from halal_mode_private.member_reach(auth.uid());
  return jsonb_build_object('reach', v.reach, 'wanted', v.wanted, 'criterion', v.criterion, 'gain', v.gain);
end;
$function$;
revoke all on function public.get_my_reach() from public, anon;
grant execute on function public.get_my_reach() to authenticated;

create or replace function halal_mode_private.pool_size_for(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select reach from halal_mode_private.member_reach(p_user);
$function$;

-- Coming back keeps a member in the pool. At most one write an hour, however often the app asks.
select halal_mode_private.patch_function_any_newline(
  'public.get_current_round_state()',
  'select jsonb_agg(jsonb_build_object(
           ''connectionId'', o.connection_id,',
  'insert into halal_mode_private.league_member_activity (user_id) values (v_member_id)
  on conflict (user_id) do update set last_seen_at = now()
  where halal_mode_private.league_member_activity.last_seen_at < now() - interval ''1 hour'';

  select jsonb_agg(jsonb_build_object(
           ''connectionId'', o.connection_id,'
);

-- A short set says why, once a day, and only blames the member's filters if they are the cause.
create function halal_mode_private.league_thin_note(p_round uuid, p_user uuid, p_count int)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  r public.rounds%rowtype;
  v record;
  v_note jsonb;
begin
  select * into r from public.rounds where id = p_round;
  if r.cycle_date is null or p_count >= least(5, coalesce(r.seats, 5)) then return null; end if;
  if r.thin is not null then return nullif(r.thin, '{}'::jsonb); end if;
  select * into v from halal_mode_private.member_reach(p_user);
  v_note := case when v.criterion is not null and v.reach < v.wanted
    then jsonb_build_object('reach', v.reach, 'criterion', v.criterion, 'gain', v.gain)
    else '{}'::jsonb end;
  update public.rounds set thin = v_note where id = p_round;
  return nullif(v_note, '{}'::jsonb);
end;
$function$;
revoke all on function halal_mode_private.league_thin_note(uuid, uuid, int) from public, anon, authenticated;

select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.get_current_round_state_before_answer_gate()',
  'return jsonb_build_object(''status'', ''ready'', ''round'', v_round);',
  'return jsonb_build_object(''status'', ''ready'', ''round'', v_round)
      || coalesce(jsonb_build_object(''thin'', halal_mode_private.league_thin_note(
           (v_round ->> ''id'')::uuid, v_member_id,
           jsonb_array_length(v_round -> ''introductions''))), ''{}''::jsonb);'
);
-- jsonb_build_object keeps a null note as a key; the app reads it as nothing to say.
alter function halal_mode_private.get_current_round_state_before_answer_gate() volatile;

select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.get_current_round_state_before_answer_gate()',
  'select o.outcome into v_outcome',
  '-- A set that opened empty. Either it is still being built, or nobody could be found, and
  -- only the member''s own filters may be blamed if relaxing one would really help.
  if v_round is not null and exists (
    select 1 from public.rounds r where r.id = (v_round ->> ''id'')::uuid and r.cycle_date is not null
  ) then
    if not exists (
      select 1 from public.rounds r
      join halal_mode_private.league_cycles c on c.cycle_date = r.cycle_date
      where r.id = (v_round ->> ''id'')::uuid and c.phase = ''sealed''
    ) then
      return jsonb_build_object(''status'', ''waiting_for_first_set'', ''round'', null);
    end if;
    select m.criterion into v_criterion from halal_mode_private.member_reach(v_member_id) m;
    if v_criterion is not null then
      return jsonb_build_object(''status'', ''filters_too_narrow'', ''criterion'', v_criterion, ''round'', null);
    end if;
    return jsonb_build_object(''status'', ''no_suitable_introductions'', ''round'', null);
  end if;

  select o.outcome into v_outcome'
);
