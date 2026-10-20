-- Restates three matching functions exactly as production has them.
--
-- The 20260813* migrations sort after 0001-0190 by file name, so a fresh
-- database (CI, local resets) applied them last and ended with their August
-- versions, while production has the later ones (0138, 0158, 0165, 0171,
-- 0176). This file is the production text from pg_get_functiondef, so both
-- end the same. On production it changes nothing.

CREATE OR REPLACE FUNCTION public.matching_run_start_service(p_algorithm_version text, p_config_version integer, p_seed bigint, p_mode text, p_cycle_date date, p_evaluated_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'halal_mode_private'
AS $function$
declare
  v_run_id uuid;
  v_window_days integer;
  v_window_offset integer;
  v_window_starts_on date;
  v_window_ends_on date;
  v_pool_member_count integer;
begin
  if (auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'Matching run creation requires service role'
      using errcode = '42501';
  end if;
  if nullif(btrim(p_algorithm_version), '') is null
     or length(p_algorithm_version) > 100
     or p_seed is null
     or p_cycle_date is null
     or p_evaluated_at is null then
    raise exception 'A complete matching run context is required'
      using errcode = '22023';
  end if;
  if (p_evaluated_at at time zone 'Asia/Riyadh')::date is distinct from p_cycle_date then
    raise exception 'Matching evaluation time must fall on the cycle date in Riyadh'
      using errcode = '22023';
  end if;
  if p_mode not in ('live', 'shadow') then
    raise exception 'Matching mode must be live or shadow'
      using errcode = '22023';
  end if;
  if p_config_version is distinct from
       halal_mode_private.active_matching_config_version() then
    raise exception 'Matching run must use the active configuration version'
      using errcode = '22023';
  end if;

  select (params ->> 'exposure_window_rounds')::integer
  into v_window_days
  from halal_mode_private.matching_config
  where version = p_config_version;
  if v_window_days is null or v_window_days < 1 then
    raise exception 'Matching exposure window configuration is invalid'
      using errcode = '22023';
  end if;

  v_window_offset := mod(p_cycle_date - date '1970-01-01', v_window_days);
  if v_window_offset < 0 then
    v_window_offset := v_window_offset + v_window_days;
  end if;
  v_window_starts_on := p_cycle_date - v_window_offset;
  v_window_ends_on := v_window_starts_on + (v_window_days - 1);

  insert into halal_mode_private.matching_runs (
    algorithm_version, config_version, seed, mode, cycle_date, time_zone,
    window_starts_on, window_ends_on, rounds_elapsed_in_window,
    evaluated_at, pool_member_count
  ) values (
    btrim(p_algorithm_version), p_config_version, p_seed, p_mode,
    p_cycle_date, 'Asia/Riyadh', v_window_starts_on, v_window_ends_on,
    v_window_offset + 1, p_evaluated_at, 0
  ) returning id into v_run_id;

  insert into halal_mode_private.matching_run_member_snapshots (
    run_id, user_id, gender, tier, times_shown, times_kept,
    rounds_since_last_mutual, rounds_since_last_served,
    exposures_in_window, introductions_per_round,
    country, relocation, latitude, longitude, age,
    min_age, max_age, max_distance_km, preferred_countries, must_have,
    min_height_cm, max_height_cm, preferred_builds, preferred_practice,
    desired_timeline, desired_family_goals, preferred_sects,
    own_height_cm, own_build, religious_practice, timeline, family_goals,
    sect, languages_spoken
  )
  select
    v_run_id,
    pool.id,
    pool.gender,
    pool.tier,
    pool.qualified_exposures::integer,
    pool.times_picked_by_others::integer,
    pool.rounds_since_last_mutual::integer,
    pool.rounds_since_last_served::integer,
    (
      select count(*)::integer
      from public.introductions introduction
      join public.rounds round on round.id = introduction.round_id
      where introduction.viewer_id = pool.id
        and (round.opens_at at time zone 'Asia/Riyadh')::date
          between v_window_starts_on and p_cycle_date
    ),
    pool.introductions_per_round::integer,
    pool.country,
    pool.relocation::text,
    pool.latitude,
    pool.longitude,
    pool.age,
    pool.min_age,
    pool.max_age,
    pool.max_distance_km,
    pool.preferred_countries,
    pool.must_have,
    preferences.min_height_cm,
    preferences.max_height_cm,
    preferences.preferred_builds,
    preferences.preferred_practice,
    preferences.desired_timeline,
    preferences.desired_family_goals,
    preferences.preferred_sects,
    preferences.own_height_cm,
    preferences.own_build,
    profile.religious_practice,
    profile.timeline,
    profile.family_goals,
    profile.sect,
    profile.languages_spoken
  from halal_mode_private.matching_pool pool
  join public.profiles profile on profile.id = pool.id
  join public.private_preferences preferences on preferences.user_id = pool.id;
  get diagnostics v_pool_member_count = row_count;

  update halal_mode_private.matching_runs
  set pool_member_count = v_pool_member_count
  where id = v_run_id;

  return jsonb_build_object(
    'run_id', v_run_id,
    'seed', p_seed,
    'cycle_date', p_cycle_date,
    'time_zone', 'Asia/Riyadh',
    'window_starts_on', v_window_starts_on,
    'window_ends_on', v_window_ends_on,
    'rounds_elapsed_in_window', v_window_offset + 1,
    'evaluated_at', p_evaluated_at,
    'pool_member_count', v_pool_member_count
  );
end;
$function$;

CREATE OR REPLACE FUNCTION halal_mode_private.matching_candidate_snapshot_prepare_unclamped(p_run_id uuid, p_fail_limit bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'halal_mode_private'
 SET work_mem TO '24MB'
AS $function$
declare
  v_run halal_mode_private.matching_runs%rowtype;
  v_progress halal_mode_private.matching_run_shortlist_progress%rowtype;
  v_config jsonb;
  v_male_count bigint;
  v_female_count bigint;
  v_potential_edge_count bigint;
  v_candidate_edge_count bigint;
  v_max_pair_appearances integer;
  v_lock_deadline timestamptz;
  v_male_ids uuid[] := '{}'::uuid[];
  v_female_ids uuid[] := '{}'::uuid[];
  v_male_batch_count integer := 0;
  v_female_batch_count integer := 0;
  v_male_cursor uuid;
  v_female_cursor uuid;
  v_male_complete boolean;
  v_female_complete boolean;
  v_members_processed integer;
  v_shortlist_complete boolean;
  v_scoring_complete boolean := false;
begin
  if (auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'Matching snapshot preparation requires service role'
      using errcode = '42501';
  end if;
  if p_run_id is null or p_fail_limit is null or p_fail_limit < 1 then
    raise exception 'A run id and positive candidate fail limit are required'
      using errcode = '22023';
  end if;

  v_lock_deadline := clock_timestamp() + interval '5 seconds';
  perform halal_mode_private.take_matching_lock(
    p_run_id::text, 5701, v_lock_deadline
  );

  select * into v_run
  from halal_mode_private.matching_runs
  where id = p_run_id
  for update;

  if v_run.id is null or v_run.cycle_date is null then
    raise exception 'A snapshot-capable matching run is required'
      using errcode = '22023';
  end if;
  if v_run.finished_at is not null then
    raise exception 'A finished matching run cannot prepare candidates'
      using errcode = '22023';
  end if;

  select config.params into v_config
  from halal_mode_private.matching_config config
  where config.version = v_run.config_version;
  if v_config is null then
    raise exception 'The matching run has no configuration'
      using errcode = '22023';
  end if;
  v_max_pair_appearances := (v_config ->> 'max_pair_appearances')::integer;
  if v_max_pair_appearances is null or v_max_pair_appearances < 1 then
    raise exception 'The matching run has no valid pair appearance limit'
      using errcode = '22023';
  end if;

  if v_run.candidate_shortlist_prepared_at is not null then
    if v_run.candidate_snapshot_fail_limit is distinct from p_fail_limit then
      raise exception 'A prepared matching snapshot cannot change its fail limit'
        using errcode = '40001';
    end if;
    if ((
      select count(*)::bigint
      from halal_mode_private.matching_run_candidate_shortlists shortlist
      where shortlist.run_id = p_run_id
    ) is distinct from (case
      when v_run.candidate_snapshot_prepared_at is null
        then v_run.candidate_edge_count else 0 end))
    or ((
      select count(*)::bigint
      from halal_mode_private.matching_run_candidate_snapshots candidate
      where candidate.run_id = p_run_id
    ) is distinct from (case
      when v_run.candidate_snapshot_prepared_at is null
        then 0 else v_run.candidate_edge_count end)) then
      raise exception 'The prepared matching shortlist is inconsistent'
        using errcode = '55000';
    end if;
    return jsonb_build_object(
      'candidate_edge_count', v_run.candidate_edge_count,
      'potential_edge_count', v_run.potential_edge_count,
      'shortlist_complete', true,
      'shortlist_members_processed', v_run.pool_member_count,
      'scoring_complete', v_run.candidate_snapshot_prepared_at is not null
    );
  end if;

  select * into v_progress
  from halal_mode_private.matching_run_shortlist_progress progress
  where progress.run_id = p_run_id
  for update;

  if not found then
    if exists (
      select 1 from halal_mode_private.matching_run_candidate_shortlists shortlist
      where shortlist.run_id = p_run_id
    ) or exists (
      select 1 from halal_mode_private.matching_run_candidate_snapshots candidate
      where candidate.run_id = p_run_id
    ) then
      raise exception 'Uncommitted candidate rows conflict with run state'
        using errcode = '55000';
    end if;
    if (select count(*)::integer
        from halal_mode_private.matching_run_member_snapshots member
        where member.run_id = p_run_id) is distinct from v_run.pool_member_count then
      raise exception 'The matching member snapshot is inconsistent'
        using errcode = '55000';
    end if;

    select
      count(*) filter (where gender = 'male')::bigint,
      count(*) filter (where gender = 'female')::bigint
    into v_male_count, v_female_count
    from halal_mode_private.matching_run_member_snapshots
    where run_id = p_run_id;
    v_potential_edge_count := v_male_count * v_female_count;

    if v_potential_edge_count > p_fail_limit then
      raise exception 'Potential candidate edge count % exceeds fail limit %',
        v_potential_edge_count, p_fail_limit
        using errcode = '54000';
    end if;

    insert into halal_mode_private.matching_run_shortlist_progress(run_id)
    values (p_run_id)
    returning * into v_progress;

    update halal_mode_private.matching_runs
    set candidate_snapshot_fail_limit = p_fail_limit,
        potential_edge_count = v_potential_edge_count
    where id = p_run_id;
  else
    if v_run.candidate_snapshot_fail_limit is distinct from p_fail_limit then
      raise exception 'A preparing matching snapshot cannot change its fail limit'
        using errcode = '40001';
    end if;
    v_potential_edge_count := v_run.potential_edge_count;
  end if;

  if not v_progress.male_complete then
    select coalesce(array_agg(next_member.user_id order by next_member.user_id), '{}'::uuid[])
    into v_male_ids
    from (
      select member.user_id
      from halal_mode_private.matching_run_member_snapshots member
      where member.run_id = p_run_id
        and member.gender = 'male'
        and (v_progress.male_cursor is null or member.user_id > v_progress.male_cursor)
      order by member.user_id
      limit 40
    ) next_member;
  end if;
  if not v_progress.female_complete then
    select coalesce(array_agg(next_member.user_id order by next_member.user_id), '{}'::uuid[])
    into v_female_ids
    from (
      select member.user_id
      from halal_mode_private.matching_run_member_snapshots member
      where member.run_id = p_run_id
        and member.gender = 'female'
        and (v_progress.female_cursor is null or member.user_id > v_progress.female_cursor)
      order by member.user_id
      limit 40
    ) next_member;
  end if;

  v_male_batch_count := coalesce(cardinality(v_male_ids), 0);
  v_female_batch_count := coalesce(cardinality(v_female_ids), 0);
  v_male_cursor := case when v_male_batch_count > 0
    then v_male_ids[v_male_batch_count] else v_progress.male_cursor end;
  v_female_cursor := case when v_female_batch_count > 0
    then v_female_ids[v_female_batch_count] else v_progress.female_cursor end;

  insert into halal_mode_private.matching_run_candidate_shortlists (
    run_id, user_low, user_high,
    pair_times_shown, pair_first_score, pair_last_score,
    cooldown_until, retired_at, explicit_pass_count, soft_select_count
  )
  select
    p_run_id,
    edge.user_low,
    edge.user_high,
    edge.pair_times_shown,
    edge.pair_first_score,
    edge.pair_last_score,
    edge.cooldown_until,
    edge.retired_at,
    edge.explicit_pass_count,
    edge.soft_select_count
  from halal_mode_private.matching_shortlist_batch_edges(
    p_run_id,
    v_male_ids,
    v_female_ids,
    v_run.evaluated_at,
    v_max_pair_appearances
  ) edge
  on conflict (run_id, user_low, user_high) do nothing;

  v_male_complete := v_progress.male_complete or not exists (
    select 1
    from halal_mode_private.matching_run_member_snapshots member
    where member.run_id = p_run_id and member.gender = 'male'
      and (v_male_cursor is null or member.user_id > v_male_cursor)
  );
  v_female_complete := v_progress.female_complete or not exists (
    select 1
    from halal_mode_private.matching_run_member_snapshots member
    where member.run_id = p_run_id and member.gender = 'female'
      and (v_female_cursor is null or member.user_id > v_female_cursor)
  );
  v_shortlist_complete := v_male_complete and v_female_complete;

  update halal_mode_private.matching_run_shortlist_progress
  set male_cursor = v_male_cursor,
      female_cursor = v_female_cursor,
      male_complete = v_male_complete,
      female_complete = v_female_complete,
      male_processed_count = male_processed_count + v_male_batch_count,
      female_processed_count = female_processed_count + v_female_batch_count
  where run_id = p_run_id
  returning male_processed_count + female_processed_count
  into v_members_processed;

  select count(*)::bigint into v_candidate_edge_count
  from halal_mode_private.matching_run_candidate_shortlists shortlist
  where shortlist.run_id = p_run_id;

  if v_shortlist_complete then
    update halal_mode_private.matching_runs
    set candidate_shortlist_prepared_at = clock_timestamp(),
        candidate_edge_count = v_candidate_edge_count
    where id = p_run_id;

    delete from halal_mode_private.matching_run_shortlist_progress progress
    where progress.run_id = p_run_id;

    if v_candidate_edge_count = 0 then
      update halal_mode_private.matching_runs
      set candidate_snapshot_prepared_at = clock_timestamp()
      where id = p_run_id;
      v_scoring_complete := true;
    elsif v_candidate_edge_count <= 500 then
      perform public.matching_candidate_snapshot_score_batch_service(
        p_run_id, v_candidate_edge_count::integer
      );
      v_scoring_complete := true;
    end if;
  end if;

  return jsonb_build_object(
    'candidate_edge_count', v_candidate_edge_count,
    'potential_edge_count', v_potential_edge_count,
    'shortlist_complete', v_shortlist_complete,
    'shortlist_members_processed', v_members_processed,
    'scoring_complete', v_scoring_complete
  );
end;
$function$;

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
    where (not male.must_age or female.age between male.min_age and male.max_age)
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
