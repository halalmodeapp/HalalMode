-- Sect as a must-have now honours madhhab too. A member can ask for any
-- sect (nothing chosen), a whole sect ("Sunni"), or a madhhab within it
-- ("Hanafi"). As before, someone who prefers not to state their sect is never
-- ruled out, and the same courtesy applies one level down: a Sunni who has not
-- named a madhhab still passes a "Hanafi" filter.
--
-- Only matching_shortlist_batch_edges changes; it is restated from
-- 20260813091106 with the two sect clauses and two live columns swapped in.

create or replace function halal_mode_private.sect_allows(
  p_wanted_sects sect[],
  p_wanted_details text[],
  p_sect sect,
  p_detail text
) returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select
    cardinality(coalesce(p_wanted_sects, '{}')) = 0
    or p_sect = 'prefer_not_to_say'
    or (
      p_sect = any(p_wanted_sects)
      and (
        -- The whole sect was chosen: no madhhab picked under it.
        not exists (
          select 1 from unnest(coalesce(p_wanted_details, '{}'::text[])) as wanted(detail)
          where public.sect_of_detail(wanted.detail) = p_sect
        )
        or p_detail is null
        or p_detail = any(p_wanted_details)
      )
    )
$$;

revoke all on function halal_mode_private.sect_allows(sect[], text[], sect, text)
  from public, anon, authenticated;

create or replace function halal_mode_private.matching_shortlist_batch_edges(
  p_run_id uuid,
  p_male_ids uuid[],
  p_female_ids uuid[],
  p_evaluated_at timestamptz,
  p_max_pair_appearances integer
) returns table (
  user_low uuid,
  user_high uuid,
  pair_times_shown integer,
  pair_first_score numeric,
  pair_last_score numeric,
  cooldown_until timestamptz,
  retired_at timestamptz,
  explicit_pass_count smallint,
  soft_select_count smallint
)
language sql
stable
security definer
set search_path = pg_catalog, public, halal_mode_private
set work_mem = '24MB' as $$
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
      coalesce(live_preferences.preferred_sect_details, '{}'::text[]) as preferred_sect_details
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
      and (not male.must_build or cardinality(male.preferred_builds) = 0
        or female.own_build is null or female.own_build = any(male.preferred_builds))
      and (not female.must_build or cardinality(female.preferred_builds) = 0
        or male.own_build is null or male.own_build = any(female.preferred_builds))
      and (not male.must_practice or cardinality(male.preferred_practice) = 0
        or female.religious_practice = any(male.preferred_practice))
      and (not female.must_practice or cardinality(female.preferred_practice) = 0
        or male.religious_practice = any(female.preferred_practice))
      and (not male.must_timeline or cardinality(male.desired_timeline) = 0
        or female.timeline = any(male.desired_timeline))
      and (not female.must_timeline or cardinality(female.desired_timeline) = 0
        or male.timeline = any(female.desired_timeline))
      and (not male.must_children or cardinality(male.desired_family_goals) = 0
        or female.family_goals = any(male.desired_family_goals))
      and (not female.must_children or cardinality(female.desired_family_goals) = 0
        or male.family_goals = any(female.desired_family_goals))
      and (not male.must_sect or halal_mode_private.sect_allows(
        male.preferred_sects, male.preferred_sect_details, female.sect, female.sect_detail))
      and (not female.must_sect or halal_mode_private.sect_allows(
        female.preferred_sects, female.preferred_sect_details, male.sect, male.sect_detail))
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
$$;

revoke all on function halal_mode_private.matching_shortlist_batch_edges(
  uuid, uuid[], uuid[], timestamptz, integer
) from public, anon, authenticated, service_role;

-- A tiny truth table, so a later restatement cannot quietly change the rule.
do $$
begin
  assert halal_mode_private.sect_allows('{}', '{}', 'shia', null), 'no preference allows everyone';
  assert halal_mode_private.sect_allows('{sunni}', '{}', 'sunni', 'maliki'), 'all Sunni allows any madhhab';
  assert not halal_mode_private.sect_allows('{sunni}', '{}', 'shia', 'twelver'), 'all Sunni rules out Shia';
  assert halal_mode_private.sect_allows('{sunni}', '{hanafi}', 'sunni', 'hanafi'), 'Hanafi allows Hanafi';
  assert not halal_mode_private.sect_allows('{sunni}', '{hanafi}', 'sunni', 'maliki'), 'Hanafi rules out Maliki';
  assert halal_mode_private.sect_allows('{sunni}', '{hanafi}', 'sunni', null), 'an unnamed madhhab is never ruled out';
  assert halal_mode_private.sect_allows('{sunni}', '{hanafi}', 'prefer_not_to_say', null), 'unstated sect is never ruled out';
  assert halal_mode_private.sect_allows('{sunni,shia}', '{hanafi}', 'shia', 'twelver'), 'Hanafi plus all Shia allows Shia';
end;
$$;
