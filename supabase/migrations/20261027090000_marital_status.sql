-- Marital status and marriage preferences.
--
-- Every member declares a marital status (men: never married, divorced,
-- widowed, currently married; women: the first three) and says which statuses
-- they are open to. Matching treats it as a hard rule in both directions; a
-- currently-married man is only paired with a woman who chose to be open to
-- that. The status is shown on profiles; the preferences stay private.
--
-- Status changes are logged, and the admin is told only when a member who had
-- settled as currently married switches to a single status and stays there,
-- without flip-flopping. Existing members have no status until they declare one.

alter table public.profiles add column if not exists marital_status text;
alter table public.profiles drop constraint if exists profiles_marital_status_check;
alter table public.profiles add constraint profiles_marital_status_check
  check (marital_status is null or marital_status in ('never_married', 'divorced', 'widowed', 'married'));

alter table public.private_preferences
  add column if not exists accepted_marital_statuses text[] not null
    default array['never_married', 'divorced', 'widowed']::text[];
alter table public.private_preferences drop constraint if exists private_preferences_marital_check;
alter table public.private_preferences add constraint private_preferences_marital_check
  check (accepted_marital_statuses <@ array['never_married', 'divorced', 'widowed', 'married']::text[]
    and cardinality(accepted_marital_statuses) >= 1);

-- ---------------------------------------------------------------- change log and alert settings
create table if not exists halal_mode_private.marital_status_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null,
  previous_status text,
  changed_at timestamptz not null default now(),
  alerted_at timestamptz
);
create index if not exists marital_status_log_user on halal_mode_private.marital_status_log (user_id, id);
alter table halal_mode_private.marital_status_log enable row level security;
revoke all on halal_mode_private.marital_status_log from public, anon, authenticated;

-- One row. The three numbers decide when a change of status tells the admin.
create table if not exists halal_mode_private.marital_alert_settings (
  id boolean primary key default true check (id),
  settled_days integer not null default 2 check (settled_days >= 0),
  stay_hours integer not null default 24 check (stay_hours >= 0),
  flip_days integer not null default 14 check (flip_days >= 0),
  max_prior_changes integer not null default 1 check (max_prior_changes >= 0)
);
insert into halal_mode_private.marital_alert_settings (id) values (true) on conflict (id) do nothing;
alter table halal_mode_private.marital_alert_settings enable row level security;
revoke all on halal_mode_private.marital_alert_settings from public, anon, authenticated;

alter table halal_mode_private.moderation_queue drop constraint if exists moderation_queue_kind_check;
alter table halal_mode_private.moderation_queue add constraint moderation_queue_kind_check
  check (kind in ('photo', 'bio', 'selfie', 'marital'));

-- ---------------------------------------------------------------- the member's own calls
create or replace function public.set_my_marital_status(p_status text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_gender text;
  v_previous text;
begin
  if v_user is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('never_married', 'divorced', 'widowed', 'married') then
    raise exception 'Choose a marital status' using errcode = '22023';
  end if;
  select gender::text, marital_status into v_gender, v_previous from public.profiles where id = v_user;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  if p_status = 'married' and v_gender <> 'male' then
    raise exception 'That status is not available' using errcode = '22023';
  end if;
  if v_previous is not distinct from p_status then return; end if;
  update public.profiles set marital_status = p_status where id = v_user;
  insert into halal_mode_private.marital_status_log (user_id, status, previous_status)
  values (v_user, p_status, v_previous);
end;
$function$;

create or replace function public.set_my_marital_preferences(p_statuses text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_gender text;
  v_clean text[];
begin
  if v_user is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  select array_agg(distinct s) into v_clean from unnest(coalesce(p_statuses, '{}'::text[])) as s;
  if v_clean is null or not (v_clean <@ array['never_married', 'divorced', 'widowed', 'married']::text[]) then
    raise exception 'Choose at least one status' using errcode = '22023';
  end if;
  select gender::text into v_gender from public.profiles where id = v_user;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  -- Only a woman can be open to a man who is already married.
  if 'married' = any(v_clean) and v_gender <> 'female' then
    raise exception 'That choice is not available' using errcode = '22023';
  end if;
  update public.private_preferences set accepted_marital_statuses = v_clean, updated_at = now()
  where user_id = v_user;
  if not found then raise exception 'Private preferences were not found' using errcode = 'P0002'; end if;
end;
$function$;

create or replace function public.get_my_marital_settings()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'status', p.marital_status,
    'accepted', pp.accepted_marital_statuses)
  from public.profiles p
  join public.private_preferences pp on pp.user_id = p.id
  where p.id = auth.uid();
$function$;

revoke all on function public.set_my_marital_status(text) from public, anon;
revoke all on function public.set_my_marital_preferences(text[]) from public, anon;
revoke all on function public.get_my_marital_settings() from public, anon;
grant execute on function public.set_my_marital_status(text) to authenticated;
grant execute on function public.set_my_marital_preferences(text[]) to authenticated;
grant execute on function public.get_my_marital_settings() to authenticated;

-- ---------------------------------------------------------------- what others see
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.safe_member_profile'::regproc) into v_def;
  if position('jsonb_build_object(' in v_def) = 0 then
    raise exception 'safe_member_profile: jsonb_build_object not found';
  end if;
  v_def := regexp_replace(v_def, 'jsonb_build_object\(', E'jsonb_build_object(\n    ''maritalStatus'', p_profile.marital_status,', '');
  execute v_def;
end;
$$;

-- ---------------------------------------------------------------- the report reason
do $$
declare
  v_name text;
  v_def text;
begin
  foreach v_name in array array['public.report_connection_member', 'public.report_introduction_member'] loop
    select pg_get_functiondef(p.oid) into v_def
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = split_part(v_name, '.', 2)
    limit 1;
    if position('''misrepresentation'',' in v_def) = 0 then
      raise exception '% does not list the misrepresentation reason', v_name;
    end if;
    v_def := replace(v_def, '''misrepresentation'',', '''misrepresentation'', ''marital_status_mismatch'',');
    execute v_def;
  end loop;
end;
$$;

-- ---------------------------------------------------------------- matching: marital status is a hard rule
CREATE OR REPLACE FUNCTION halal_mode_private.matching_shortlist_batch_edges(p_run_id uuid, p_male_ids uuid[], p_female_ids uuid[], p_evaluated_at timestamp with time zone, p_max_pair_appearances integer)
 RETURNS TABLE(user_low uuid, user_high uuid, pair_times_shown integer, pair_first_score numeric, pair_last_score numeric, cooldown_until timestamp with time zone, retired_at timestamp with time zone, explicit_pass_count smallint, soft_select_count smallint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'halal_mode_private'
 SET work_mem TO '24MB'
AS $function$
  with
  current_members as materialized (
    select
      snapshot.*,
      lower(btrim(snapshot.country)) as country_key,
      coalesce((
        select array_agg(lower(btrim(allowed.country)))
        from unnest(coalesce(snapshot.preferred_countries, '{}'::text[]))
          as allowed(country)
      ), '{}'::text[]) as preferred_country_keys,
      case when jsonb_typeof(coalesce(snapshot.must_have, '{}'::jsonb) -> 'age') = 'boolean'
        then (snapshot.must_have ->> 'age')::boolean else false end as must_age,
      case when jsonb_typeof(coalesce(snapshot.must_have, '{}'::jsonb) -> 'height') = 'boolean'
        then (snapshot.must_have ->> 'height')::boolean else false end as must_height,
      case when jsonb_typeof(coalesce(snapshot.must_have, '{}'::jsonb) -> 'build') = 'boolean'
        then (snapshot.must_have ->> 'build')::boolean else false end as must_build,
      case when jsonb_typeof(coalesce(snapshot.must_have, '{}'::jsonb) -> 'practice') = 'boolean'
        then (snapshot.must_have ->> 'practice')::boolean else false end as must_practice,
      case when jsonb_typeof(coalesce(snapshot.must_have, '{}'::jsonb) -> 'timeline') = 'boolean'
        then (snapshot.must_have ->> 'timeline')::boolean else false end as must_timeline,
      case when jsonb_typeof(coalesce(snapshot.must_have, '{}'::jsonb) -> 'children') = 'boolean'
        then (snapshot.must_have ->> 'children')::boolean else false end as must_children,
      case when jsonb_typeof(coalesce(snapshot.must_have, '{}'::jsonb) -> 'sect') = 'boolean'
        then (snapshot.must_have ->> 'sect')::boolean else false end as must_sect,
      case when jsonb_typeof(coalesce(snapshot.must_have, '{}'::jsonb) -> 'distance') = 'boolean'
        then (snapshot.must_have ->> 'distance')::boolean else false end as must_distance,
      -- Madhhab is read live: the snapshot table predates it.
      live_profile.sect_detail,
      -- Marriage status and who each member is open to, read live like madhhab.
      live_profile.marital_status,
      coalesce(live_preferences.accepted_marital_statuses,
        array['never_married', 'divorced', 'widowed']::text[]) as accepted_marital_statuses,
      coalesce(live_preferences.preferred_sect_details, '{}'::text[]) as preferred_sect_details,
      coalesce(live_profile.tier = 'premium', false) as is_premium,
      live_preferences.own_build_also
    from halal_mode_private.matching_run_member_snapshots snapshot
    left join public.profiles live_profile on live_profile.id = snapshot.user_id
    left join public.private_preferences live_preferences on live_preferences.user_id = snapshot.user_id
    where snapshot.run_id = p_run_id
  ),
  country_pairs as materialized (
    select
      male.user_id as male_id,
      female.user_id as female_id,
      male.user_id = any(coalesce(p_male_ids, '{}'::uuid[])) as male_in_batch,
      female.user_id = any(coalesce(p_female_ids, '{}'::uuid[])) as female_in_batch,
      least(male.user_id, female.user_id) as user_low,
      greatest(male.user_id, female.user_id) as user_high,
      male.country_key = female.country_key as same_country,
      male.latitude is not null and male.longitude is not null
        and female.latitude is not null and female.longitude is not null
        as coordinates_available,
      case
        when male.country_key = female.country_key
         and (male.must_distance or female.must_distance)
         and male.latitude is not null and male.longitude is not null
         and female.latitude is not null and female.longitude is not null then
          6371 * acos(least(1, greatest(-1,
            cos(radians(male.latitude)) * cos(radians(female.latitude))
              * cos(radians(female.longitude) - radians(male.longitude))
            + sin(radians(male.latitude)) * sin(radians(female.latitude))
          )))
        else null
      end as distance_km,
      coalesce(abs(male.age - female.age), 0)::double precision
        + coalesce(
            sqrt(
              power((female.latitude - male.latitude) * 111.0, 2)
              + power((female.longitude - male.longitude) * 111.0
                  * cos(radians((male.latitude + female.latitude) / 2)), 2)
            ) / 100.0,
            0
          ) as apartness
    from current_members male
    join current_members female on female.gender = 'female'
    where male.gender = 'male'
      and (
        male.user_id = any(coalesce(p_male_ids, '{}'::uuid[]))
        or female.user_id = any(coalesce(p_female_ids, '{}'::uuid[]))
      )
      and (
        male.country_key = female.country_key
        or (male.relocation in ('open', 'willing_abroad')
          and (cardinality(male.preferred_country_keys) = 0
            or female.country_key = any(male.preferred_country_keys)))
      )
      and (
        female.country_key = male.country_key
        or (female.relocation in ('open', 'willing_abroad')
          and (cardinality(female.preferred_country_keys) = 0
            or male.country_key = any(female.preferred_country_keys)))
      )
  ),
  eligible_pairs as materialized (
    select
      pair.*,
      coalesce(exposure.times_shown, 0) as pair_times_shown,
      exposure.first_reciprocal_score as pair_first_score,
      exposure.last_reciprocal_score as pair_last_score,
      exposure.cooldown_until,
      exposure.retired_at,
      coalesce(exposure.explicit_pass_count, 0)::smallint as explicit_pass_count,
      coalesce(exposure.soft_select_count, 0)::smallint as soft_select_count
    from country_pairs pair
    join current_members male on male.user_id = pair.male_id
    join current_members female on female.user_id = pair.female_id
    left join halal_mode_private.pair_exposure exposure
      on exposure.user_low = pair.user_low and exposure.user_high = pair.user_high
    -- Marital status is a hard rule, in both directions: each person's declared
    -- status must be one the other is open to. A man who is currently married
    -- is therefore only ever paired with a woman who chose to be open to that.
    -- Anyone who has not declared a status is not paired.
    where male.marital_status is not null and female.marital_status is not null
      and male.marital_status = any(female.accepted_marital_statuses)
      and female.marital_status = any(male.accepted_marital_statuses)
      and (not male.must_age or female.age between male.min_age and male.max_age)
      and (not female.must_age or male.age between female.min_age and female.max_age)
      and (not male.must_height or female.own_height_cm is null
        or female.own_height_cm between male.min_height_cm and male.max_height_cm)
      and (not female.must_height or male.own_height_cm is null
        or male.own_height_cm between female.min_height_cm and female.max_height_cm)
      and (not (male.must_build and male.is_premium) or cardinality(male.preferred_builds) = 0
        or female.own_build is null or female.own_build = any(male.preferred_builds)
        or coalesce(female.own_build_also = any(male.preferred_builds), false))
      and (not (female.must_build and female.is_premium) or cardinality(female.preferred_builds) = 0
        or male.own_build is null or male.own_build = any(female.preferred_builds)
        or coalesce(male.own_build_also = any(female.preferred_builds), false))
      and (not (male.must_practice and male.is_premium) or cardinality(male.preferred_practice) = 0
        or female.religious_practice = any(male.preferred_practice))
      and (not (female.must_practice and female.is_premium) or cardinality(female.preferred_practice) = 0
        or male.religious_practice = any(female.preferred_practice))
      and (not (male.must_timeline and male.is_premium) or cardinality(male.desired_timeline) = 0
        or female.timeline = any(male.desired_timeline))
      and (not (female.must_timeline and female.is_premium) or cardinality(female.desired_timeline) = 0
        or male.timeline = any(female.desired_timeline))
      and (not (male.must_children and male.is_premium) or cardinality(male.desired_family_goals) = 0
        or female.family_goals = any(male.desired_family_goals))
      and (not (female.must_children and female.is_premium) or cardinality(female.desired_family_goals) = 0
        or male.family_goals = any(female.desired_family_goals))
      and (not male.must_sect or halal_mode_private.sect_allows(
        male.preferred_sects, male.preferred_sect_details, female.sect, female.sect_detail))
      and (not female.must_sect or halal_mode_private.sect_allows(
        female.preferred_sects, female.preferred_sect_details, male.sect, male.sect_detail))
      and halal_mode_private.premium_filters_allow(pair.male_id, pair.female_id)
      and halal_mode_private.premium_filters_allow(pair.female_id, pair.male_id)
      and (not pair.same_country or (
        pair.coordinates_available
        and (not male.must_distance or pair.distance_km <= male.max_distance_km)
        and (not female.must_distance or pair.distance_km <= female.max_distance_km)
      ))
      and not exists (
        select 1 from public.connections connection
        where connection.user_a = pair.user_low and connection.user_b = pair.user_high
      )
      and not exists (
        select 1 from public.blocks block
        where block.blocker_id = pair.male_id and block.blocked_id = pair.female_id
      )
      and not exists (
        select 1 from public.blocks block
        where block.blocker_id = pair.female_id and block.blocked_id = pair.male_id
      )
      and not exists (
        select 1 from halal_mode_private.member_hides hidden
        where hidden.hider_id = pair.male_id and hidden.hidden_id = pair.female_id
      )
      and not exists (
        select 1 from halal_mode_private.member_hides hidden
        where hidden.hider_id = pair.female_id and hidden.hidden_id = pair.male_id
      )
      and not exists (
        select 1 from public.introduction_selections selection
        where selection.decision = 'explicit_pass'
          and selection.viewer_id = pair.male_id
          and selection.subject_id = pair.female_id
      )
      and not exists (
        select 1 from public.introduction_selections selection
        where selection.decision = 'explicit_pass'
          and selection.viewer_id = pair.female_id
          and selection.subject_id = pair.male_id
      )
      and exposure.retired_at is null
      and coalesce(exposure.times_shown, 0) < p_max_pair_appearances
      and (exposure.cooldown_until is null or exposure.cooldown_until <= p_evaluated_at)
  ),
  ranked_pairs as (
    select
      eligible.*,
      row_number() over (
        partition by eligible.male_id
        order by eligible.apartness, eligible.female_id
      ) as his_rank,
      row_number() over (
        partition by eligible.female_id
        order by eligible.apartness, eligible.male_id
      ) as her_rank
    from eligible_pairs eligible
  )
  select
    ranked.user_low,
    ranked.user_high,
    ranked.pair_times_shown,
    ranked.pair_first_score,
    ranked.pair_last_score,
    ranked.cooldown_until,
    ranked.retired_at,
    ranked.explicit_pass_count,
    ranked.soft_select_count
  from ranked_pairs ranked
  where (ranked.male_in_batch and ranked.his_rank <= 40)
     or (ranked.female_in_batch and ranked.her_rank <= 40);
$function$;

-- ---------------------------------------------------------------- the admin alert
-- A member who had settled as currently married, then switched to a single
-- status and has stayed there, is flagged once for the admin to look at. A
-- quick flip back, or a pattern of changing back and forth, never alerts.
create or replace function halal_mode_private.check_marital_status_changes()
returns integer
language plpgsql
security definer
set search_path to 'public', 'halal_mode_private'
as $function$
declare
  s halal_mode_private.marital_alert_settings%rowtype;
  r record;
  v_queue bigint;
  v_count integer := 0;
begin
  select * into s from halal_mode_private.marital_alert_settings where id;
  for r in
    select cur.id as cur_id, cur.user_id, cur.status as new_status, cur.changed_at as switched_at,
           prev.changed_at as married_since
    from halal_mode_private.marital_status_log cur
    join lateral (
      select p.* from halal_mode_private.marital_status_log p
      where p.user_id = cur.user_id and p.id < cur.id order by p.id desc limit 1
    ) prev on true
    where cur.alerted_at is null
      and cur.status <> 'married' and prev.status = 'married'
      -- still their latest status, held long enough
      and not exists (select 1 from halal_mode_private.marital_status_log n where n.user_id = cur.user_id and n.id > cur.id)
      and cur.changed_at <= now() - make_interval(hours => s.stay_hours)
      -- and they had settled as married before switching
      and cur.changed_at - prev.changed_at >= make_interval(days => s.settled_days)
      -- and are not flipping back and forth
      and (
        select count(*) from halal_mode_private.marital_status_log b
        where b.user_id = cur.user_id and b.id < cur.id and b.previous_status is not null
          and b.changed_at > cur.changed_at - make_interval(days => s.flip_days)
      ) <= s.max_prior_changes
  loop
    insert into halal_mode_private.moderation_queue (user_id, kind, ref, decided_at, decision, reason)
    values (
      r.user_id, 'marital', 'marital:' || r.cur_id, now(), 'review',
      'Was currently married for ' || greatest(1, round(extract(epoch from (r.switched_at - r.married_since)) / 86400))::int
        || ' days, then switched to ' || replace(r.new_status, '_', ' ') || ' and has stayed there.')
    returning id into v_queue;
    insert into halal_mode_private.mail_outbox (kind, ref_id) values ('moderation', v_queue::text);
    update halal_mode_private.marital_status_log set alerted_at = now() where id = r.cur_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$function$;
revoke all on function halal_mode_private.check_marital_status_changes() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'halal-mode-marital-watch') then
    perform cron.unschedule('halal-mode-marital-watch');
  end if;
  perform cron.schedule('halal-mode-marital-watch', '23 * * * *',
    'select halal_mode_private.check_marital_status_changes()');
end;
$$;

-- ---------------------------------------------------------------- terms
-- The terms and privacy notice now say marital status must be true; members
-- accept the new version through the existing consent flow.
update halal_mode_private.legal_document_registry set is_current = false where is_current;
insert into halal_mode_private.legal_document_registry
  (document_type, version, title, effective_date, url, is_current)
values
  ('terms', '2026-10-27', 'Terms of Service', date '2026-10-27', 'https://halalmo.de/legal/terms', true),
  ('privacy', '2026-10-27', 'Privacy Notice', date '2026-10-27', 'https://halalmo.de/legal/privacy', true)
on conflict (document_type, version) do update set
  title = excluded.title,
  effective_date = excluded.effective_date,
  url = excluded.url,
  is_current = true;
