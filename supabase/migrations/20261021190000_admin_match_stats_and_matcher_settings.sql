-- Admin panel: match stats (who is picked, who is matched, who is waiting)
-- and a short, bounded list of matcher settings an owner may change. Same
-- rules as the other admin RPCs: admin list + two-factor to read; owner +
-- a code from the last 15 minutes + an audit row to change.

create or replace function public.admin_match_stats(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_days integer := greatest(7, least(coalesce(p_days, 30), 365));
  v_since timestamptz := now() - make_interval(days => greatest(7, least(coalesce(p_days, 30), 365)));
  v_latest_live uuid;
begin
  perform halal_mode_private.require_admin(false);
  select r.id into v_latest_live
  from halal_mode_private.matching_runs r
  where r.mode = 'live' and r.finished_at is not null and r.error is null
  order by r.started_at desc limit 1;

  return (
    with decided as (
      select s.subject_id, s.viewer_id, s.decision, p.gender::text as subject_gender
      from public.introduction_selections s
      join public.profiles p on p.id = s.subject_id
      where s.decided_at >= v_since and s.decision in ('kept', 'released')
        and not exists (select 1 from halal_mode_private.demo_members d where d.user_id in (s.subject_id, s.viewer_id))
    ), kept as (
      select viewer_id, subject_id from decided where decision = 'kept'
    ), matched as (
      select c.user_a as user_id from public.connections c where c.created_at >= v_since
      union all
      select c.user_b from public.connections c where c.created_at >= v_since
    ), per_subject as (
      select subject_id, count(*) as shown, count(*) filter (where decision = 'kept') as picked
      from decided group by subject_id
    )
    select jsonb_build_object(
      'days', v_days,
      'shown', (select count(*) from decided),
      'picks', (select count(*) from kept),
      'matches', (select count(*) from public.connections c where c.created_at >= v_since),
      -- A pick with no pick back: the main measure of one-sided interest.
      'one_sided_picks', (
        select count(*) from kept k
        where not exists (
          select 1 from public.connections c
          where c.user_a = least(k.viewer_id, k.subject_id) and c.user_b = greatest(k.viewer_id, k.subject_id)
        )
      ),
      'members_shown', (select count(*) from per_subject),
      'picked_by_nobody', (select count(*) from per_subject where shown >= 3 and picked = 0),
      'picked_not_matched', (
        select count(*) from per_subject ps
        where ps.picked > 0 and not exists (select 1 from matched m where m.user_id = ps.subject_id)
      ),
      'members_matched', (select count(distinct user_id) from matched),
      'by_gender', (
        select coalesce(jsonb_object_agg(g.subject_gender, jsonb_build_object(
          'shown', g.shown, 'picked', g.picked,
          'members', g.members,
          'matched', (select count(distinct m.user_id) from matched m join public.profiles p on p.id = m.user_id where p.gender::text = g.subject_gender)
        )), '{}'::jsonb)
        from (
          select subject_gender, count(*) as shown, count(*) filter (where decision = 'kept') as picked, count(distinct subject_id) as members
          from decided group by subject_gender
        ) g
      ),
      -- From the latest real run: how long members have gone without a match.
      'waiting', (
        select jsonb_build_object(
          'members', count(*),
          'r0_3', count(*) filter (where s.rounds_since_last_mutual <= 3),
          'r4_7', count(*) filter (where s.rounds_since_last_mutual between 4 and 7),
          'r8_13', count(*) filter (where s.rounds_since_last_mutual between 8 and 13),
          'r14', count(*) filter (where s.rounds_since_last_mutual >= 14)
        )
        from halal_mode_private.matching_run_member_snapshots s where s.run_id = v_latest_live
      ),
      'daily_matches', (
        select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'count', d.n) order by d.day), '[]'::jsonb)
        from (
          select g::date as day,
            (select count(*) from public.connections c where c.created_at >= g and c.created_at < g + interval '1 day') as n
          from generate_series(date_trunc('day', now()) - make_interval(days => v_days - 1), date_trunc('day', now()), interval '1 day') g
        ) d
      )
    )
  );
end;
$function$;
revoke all on function public.admin_match_stats(integer) from public, anon;
grant execute on function public.admin_match_stats(integer) to authenticated;

-- The matcher settings an owner may change, with safe ranges. Anything else
-- stays a reviewed migration.
create or replace function halal_mode_private.admin_matcher_setting_bounds()
returns table (key text, min_value numeric, max_value numeric, whole boolean)
language sql
immutable
as $function$
  values
    ('min_reciprocal_score', 0, 0.5, false),
    ('exposure_boost_weight', 0, 0.6, false),
    ('no_match_boost_weight', 0, 0.6, false),
    ('boost_cap', 0, 0.5, false),
    ('no_match_rounds_full', 2, 30, true),
    ('exposure_window_rounds', 3, 30, true),
    ('repeat_cooldown_days', 1, 90, true),
    ('max_pair_appearances', 1, 10, true)
$function$;
revoke all on function halal_mode_private.admin_matcher_setting_bounds() from public, anon, authenticated, service_role;

create or replace function public.admin_matcher_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_row halal_mode_private.matching_config%rowtype;
begin
  perform halal_mode_private.require_admin(false);
  select * into v_row from halal_mode_private.matching_config
  where activated_at is not null order by version desc limit 1;
  return jsonb_build_object(
    'version', v_row.version,
    'activated_at', v_row.activated_at,
    'notes', v_row.notes,
    'settings', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', b.key, 'value', v_row.params -> b.key, 'min', b.min_value, 'max', b.max_value, 'whole', b.whole
      ) order by b.key), '[]'::jsonb)
      from halal_mode_private.admin_matcher_setting_bounds() b
      where v_row.params ? b.key
    )
  );
end;
$function$;
revoke all on function public.admin_matcher_settings() from public, anon;
grant execute on function public.admin_matcher_settings() to authenticated;

-- Saves a new matcher version with one setting changed and makes it the one
-- active version. The table's own check validates the full set of settings.
create or replace function public.admin_set_matcher_setting(p_key text, p_value numeric, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_reason text;
  v_bound record;
  v_active halal_mode_private.matching_config%rowtype;
  v_version integer;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  select * into v_bound from halal_mode_private.admin_matcher_setting_bounds() b where b.key = p_key;
  if not found then
    raise exception 'That matcher setting cannot be changed here' using errcode = '22023';
  end if;
  if p_value is null or p_value < v_bound.min_value or p_value > v_bound.max_value
     or (v_bound.whole and p_value <> trunc(p_value)) then
    raise exception 'Choose a value from % to %', v_bound.min_value, v_bound.max_value using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('matching-config', 0));
  select * into v_active from halal_mode_private.matching_config
  where activated_at is not null order by version desc limit 1 for update;
  if not (v_active.params ? p_key) then
    raise exception 'The active matcher does not use that setting' using errcode = '22023';
  end if;
  if (v_active.params ->> p_key)::numeric = p_value then
    return jsonb_build_object('changed', false, 'version', v_active.version);
  end if;

  update halal_mode_private.matching_config set activated_at = null where activated_at is not null;
  insert into halal_mode_private.matching_config (params, notes, activated_at, source)
  values (
    jsonb_set(v_active.params, array[p_key], case when v_bound.whole then to_jsonb(p_value::integer) else to_jsonb(p_value) end),
    'Admin panel: ' || p_key || ' ' || (v_active.params ->> p_key) || ' -> ' || p_value::text || '. ' || v_reason,
    now(), 'policy'
  )
  returning version into v_version;

  perform halal_mode_private.admin_audit('matcher.set', jsonb_build_object(
    'setting', p_key, 'before', v_active.params -> p_key, 'after', p_value,
    'from_version', v_active.version, 'version', v_version, 'reason', v_reason));
  return jsonb_build_object('changed', true, 'version', v_version);
end;
$function$;
revoke all on function public.admin_set_matcher_setting(text, numeric, text) from public, anon;
grant execute on function public.admin_set_matcher_setting(text, numeric, text) to authenticated;
