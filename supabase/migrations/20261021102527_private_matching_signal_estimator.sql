-- Private, configurable matching signals.
--
-- Private member reception is one bounded input to the reciprocal matcher.
-- Fair exposure remains a separate rotation rule, so a low estimate never
-- removes a member from the pool. Each metric can be switched and weighted
-- independently by a trusted backend operator.

-- The updated privacy notice explains the new private reception and view-time
-- signals before the app starts submitting them. Members accept this version
-- through the existing first-party legal consent flow.
update halal_mode_private.legal_document_registry set is_current = false where is_current;
insert into halal_mode_private.legal_document_registry
  (document_type, version, title, effective_date, url, is_current)
values
  ('terms', '2026-10-21', 'Terms of Service', date '2026-10-21', 'https://halalmo.de/legal/terms', true),
  ('privacy', '2026-10-21', 'Privacy Notice', date '2026-10-21', 'https://halalmo.de/legal/privacy', true)
on conflict (document_type, version) do update set
  title = excluded.title,
  effective_date = excluded.effective_date,
  url = excluded.url,
  is_current = true;

create table halal_mode_private.matching_signal_metric_config (
  metric_key text primary key check (metric_key in (
    'selection_rate',
    'first_choice_rate',
    'profile_attention',
    'bio_attention',
    'photo_attention',
    'mutual_first_choice',
    'luna_presentation',
    'reception_similarity'
  )),
  enabled boolean not null,
  weight numeric(6,5) not null check (weight between 0 and 1),
  updated_at timestamptz not null default now()
);
alter table halal_mode_private.matching_signal_metric_config enable row level security;
revoke all on halal_mode_private.matching_signal_metric_config
  from public, anon, authenticated, service_role;

insert into halal_mode_private.matching_signal_metric_config
  (metric_key, enabled, weight)
values
  ('selection_rate', true, 0.40000),
  ('first_choice_rate', true, 0.20000),
  ('profile_attention', true, 0.05000),
  ('bio_attention', true, 0.10000),
  ('photo_attention', true, 0.15000),
  ('mutual_first_choice', true, 0.15000),
  -- Luna analysis is available, but costs API usage. Turn it on when wanted.
  ('luna_presentation', false, 0.10000),
  -- A deliberately small soft preference, not a hard score band.
  ('reception_similarity', true, 0.08000);

create table halal_mode_private.matching_signal_config_state (
  singleton boolean primary key default true check (singleton),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into halal_mode_private.matching_signal_config_state (singleton)
values (true);
alter table halal_mode_private.matching_signal_config_state enable row level security;
revoke all on halal_mode_private.matching_signal_config_state
  from public, anon, authenticated, service_role;

-- Raw dwell is rounded and bounded before it reaches this table. Photo paths
-- are hashed by Postgres; neither a storage path nor a signed URL is retained.
create table halal_mode_private.matching_engagement_observations (
  introduction_id uuid primary key references public.introductions(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  profile_seconds smallint check (
    profile_seconds is null or (profile_seconds between 0 and 120 and profile_seconds % 5 = 0)
  ),
  bio_seconds smallint check (
    bio_seconds is null or (bio_seconds between 0 and 120 and bio_seconds % 5 = 0)
  ),
  photo_seconds jsonb not null default '[]'::jsonb
    check (jsonb_typeof(photo_seconds) = 'array' and jsonb_array_length(photo_seconds) <= 6),
  created_at timestamptz not null default now(),
  check (viewer_id <> subject_id)
);
create index matching_engagement_subject_created_idx
  on halal_mode_private.matching_engagement_observations (subject_id, created_at desc);
create index matching_engagement_viewer_created_idx
  on halal_mode_private.matching_engagement_observations (viewer_id, created_at desc);
alter table halal_mode_private.matching_engagement_observations enable row level security;
revoke all on halal_mode_private.matching_engagement_observations
  from public, anon, authenticated, service_role;

-- Luna describes image presentation only. There is deliberately no field for
-- attractiveness, identity, age, ethnicity, faith, emotion, or personality.
create table halal_mode_private.matching_photo_presentations (
  photo_hash text primary key check (photo_hash ~ '^[0-9a-f]{64}$'),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  clarity numeric(4,3) not null check (clarity between 0 and 1),
  lighting numeric(4,3) not null check (lighting between 0 and 1),
  framing numeric(4,3) not null check (framing between 0 and 1),
  background_distraction numeric(4,3) not null check (background_distraction between 0 and 1),
  model_id text not null check (length(model_id) between 1 and 80),
  analysis_version text not null check (length(analysis_version) between 1 and 80),
  analyzed_at timestamptz not null default now()
);
create index matching_photo_presentations_owner_idx
  on halal_mode_private.matching_photo_presentations (owner_id);
alter table halal_mode_private.matching_photo_presentations enable row level security;
revoke all on halal_mode_private.matching_photo_presentations
  from public, anon, authenticated, service_role;

create table halal_mode_private.matching_photo_analysis_queue (
  photo_hash text primary key check (photo_hash ~ '^[0-9a-f]{64}$'),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now(),
  claimed_until timestamptz,
  attempts smallint not null default 0 check (attempts between 0 and 5)
);
create index matching_photo_analysis_pending_idx
  on halal_mode_private.matching_photo_analysis_queue (created_at)
  where attempts < 5;
alter table halal_mode_private.matching_photo_analysis_queue enable row level security;
revoke all on halal_mode_private.matching_photo_analysis_queue
  from public, anon, authenticated, service_role;

create table halal_mode_private.matching_signal_estimates (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  score numeric(5,4) not null check (score between 0.05 and 0.95),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  components jsonb not null check (jsonb_typeof(components) = 'object'),
  exposure_count integer not null default 0 check (exposure_count >= 0),
  config_version bigint not null,
  computed_at timestamptz not null default now()
);
alter table halal_mode_private.matching_signal_estimates enable row level security;
revoke all on halal_mode_private.matching_signal_estimates
  from public, anon, authenticated, service_role;

-- Freeze the private signal used by a run along with its other inputs. Old
-- runs keep the neutral default; new runs receive the estimate once at start.
alter table halal_mode_private.matching_run_member_snapshots
  add column reception_score numeric(5,4) not null default 0.5000
    check (reception_score between 0.05 and 0.95),
  add column reception_confidence numeric(4,3) not null default 0
    check (reception_confidence between 0 and 1),
  add column reception_similarity_weight numeric(4,3) not null default 0.080
    check (reception_similarity_weight between 0 and 0.200);

create or replace function halal_mode_private.snapshot_matching_reception_signal()
returns trigger
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
begin
  select estimate.score, estimate.confidence
  into new.reception_score, new.reception_confidence
  from halal_mode_private.matching_signal_estimates estimate
  where estimate.user_id = new.user_id;

  if not found then
    new.reception_score := 0.5000;
    new.reception_confidence := 0;
  end if;
  select case when config.enabled then least(0.200, config.weight) else 0 end
  into new.reception_similarity_weight
  from halal_mode_private.matching_signal_metric_config config
  where config.metric_key = 'reception_similarity';
  new.reception_similarity_weight := coalesce(new.reception_similarity_weight, 0);
  return new;
end;
$function$;
revoke all on function halal_mode_private.snapshot_matching_reception_signal()
  from public, anon, authenticated, service_role;
create trigger matching_run_snapshot_reception_signal
before insert on halal_mode_private.matching_run_member_snapshots
for each row execute function halal_mode_private.snapshot_matching_reception_signal();

-- Snapshot service returns one frozen set of inputs for the whole run. The
-- return type changes, so replace the RPC explicitly rather than changing its
-- OUT columns in place.
drop function public.matching_member_signals_service(uuid);
create function public.matching_member_signals_service(p_run_id uuid)
returns table (
  user_id uuid,
  gender public.gender,
  tier public.membership_tier,
  times_shown integer,
  times_kept integer,
  rounds_since_last_mutual integer,
  rounds_since_last_served integer,
  exposures_in_window integer,
  introductions_per_round integer,
  reception_score numeric,
  reception_confidence numeric,
  reception_similarity_weight numeric
)
language plpgsql
stable
security definer
set search_path = pg_catalog, halal_mode_private as $function$
declare
  v_run halal_mode_private.matching_runs%rowtype;
begin
  if (auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'Matching member signals require service role'
      using errcode = '42501';
  end if;
  if p_run_id is null then
    raise exception 'A matching run id is required' using errcode = '22023';
  end if;

  select * into v_run
  from halal_mode_private.matching_runs
  where id = p_run_id;
  if v_run.id is null or v_run.cycle_date is null then
    raise exception 'A snapshot-capable matching run is required'
      using errcode = '22023';
  end if;
  if v_run.finished_at is not null then
    raise exception 'A finished matching run cannot read member signals'
      using errcode = '22023';
  end if;
  if v_run.candidate_snapshot_prepared_at is null then
    raise exception 'Prepare the matching candidate snapshot before reading signals'
      using errcode = '55000';
  end if;

  return query
  select m.user_id, m.gender, m.tier, m.times_shown, m.times_kept,
    m.rounds_since_last_mutual, m.rounds_since_last_served,
    m.exposures_in_window, m.introductions_per_round,
    m.reception_score, m.reception_confidence,
    m.reception_similarity_weight
  from halal_mode_private.matching_run_member_snapshots m
  where m.run_id = p_run_id
  order by m.user_id;
end;
$function$;
revoke all on function public.matching_member_signals_service(uuid)
  from public, anon, authenticated;
grant execute on function public.matching_member_signals_service(uuid)
  to service_role;

comment on table halal_mode_private.matching_signal_metric_config is
  'Private global switches and weights. Setting changes recompute every member’s private matching estimate.';
comment on table halal_mode_private.matching_engagement_observations is
  'Private, short-lived profile reading observations. Never exposed to members or other profiles.';
comment on table halal_mode_private.matching_photo_presentations is
  'Private Luna estimates of image presentation only, keyed by a one-way hash of the private photo path.';
comment on table halal_mode_private.matching_signal_estimates is
  'Private component breakdown and reception score used only by the reciprocal matcher.';

create or replace function halal_mode_private.recompute_matching_signal_estimates(
  p_user_ids uuid[] default null
) returns void
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog
as $function$
declare
  v_version bigint;
  v_now timestamptz := now();
begin
  select version into v_version
  from halal_mode_private.matching_signal_config_state
  where singleton;

  with scoped_users as (
    select p.id
    from public.profiles p
    where p_user_ids is null or p.id = any(p_user_ids)
  ),
  exposure_rows as (
    select
      i.subject_id,
      i.viewer_id,
      i.round_id,
      s.decision,
      s.rank,
      s.decided_at,
      e.profile_seconds,
      e.bio_seconds,
      e.photo_seconds
    from scoped_users target
    join public.introductions i on i.subject_id = target.id
    join public.introduction_selections s on s.introduction_id = i.id
    left join halal_mode_private.matching_engagement_observations e
      on e.introduction_id = i.id
    where s.decision in ('kept', 'released')
      and s.decided_at >= v_now - interval '180 days'
  ),
  outcomes as (
    select
      subject_id,
      count(*)::integer as shown,
      count(*) filter (where decision = 'kept')::integer as kept,
      count(*) filter (where decision = 'kept' and rank = 1)::integer as first_choices
    from exposure_rows
    group by subject_id
  ),
  bio_ranks as (
    select subject_id, avg(relative_rank)::numeric as value, count(*)::integer as samples
    from (
      select subject_id,
        case when count(*) over (partition by viewer_id, round_id) < 2 then 0.5
          else percent_rank() over (partition by viewer_id, round_id order by bio_seconds)::numeric
        end as relative_rank
      from exposure_rows
      where bio_seconds is not null
    ) ranked
    group by subject_id
  ),
  profile_ranks as (
    select subject_id, avg(relative_rank)::numeric as value, count(*)::integer as samples
    from (
      select subject_id,
        case when count(*) over (partition by viewer_id, round_id) < 2 then 0.5
          else percent_rank() over (partition by viewer_id, round_id order by profile_seconds)::numeric
        end as relative_rank
      from exposure_rows
      where profile_seconds is not null
    ) ranked
    group by subject_id
  ),
  photo_ranks as (
    select subject_id, avg(relative_rank)::numeric as value, count(*)::integer as samples
    from (
      -- Average per profile first. A member with six photos should not count
      -- six times as much as someone with one photo in the same round.
      select subject_id,
        case when count(*) over (partition by viewer_id, round_id) < 2 then 0.5
          else percent_rank() over (
            partition by viewer_id, round_id order by seconds
          )::numeric
        end as relative_rank
      from (
        select exposure.subject_id, exposure.viewer_id, exposure.round_id,
          avg(greatest(0, least(120, (photo.value ->> 'seconds')::integer)))::numeric as seconds
        from exposure_rows exposure
        cross join lateral jsonb_array_elements(coalesce(exposure.photo_seconds, '[]'::jsonb)) photo(value)
        where jsonb_typeof(photo.value -> 'seconds') = 'number'
          and (photo.value ->> 'seconds')::integer > 0
        group by exposure.subject_id, exposure.viewer_id, exposure.round_id
      ) per_profile
    ) ranked
    group by subject_id
  ),
  mutual_first_choices as (
    select target.id as user_id, count(*)::integer as count
    from scoped_users target
    join halal_mode_private.mutual_first_choices mutual
      on mutual.user_low = target.id or mutual.user_high = target.id
    where mutual.matched_at >= v_now - interval '180 days'
    group by target.id
  ),
  luna_features as (
    select p.id as user_id,
      avg((photo.clarity + photo.lighting + photo.framing
        + (1 - photo.background_distraction)) / 4)::numeric as value,
      count(*)::integer as samples
    from scoped_users target
    join public.profiles p on p.id = target.id
    cross join lateral unnest(coalesce(p.photos, '{}'::text[])) current_photo(photo_path)
    join halal_mode_private.matching_photo_presentations photo
      on photo.owner_id = p.id
     and photo.photo_hash = encode(extensions.digest(current_photo.photo_path, 'sha256'), 'hex')
    group by p.id
  ),
  raw_components as (
    select target.id as user_id,
      coalesce((o.kept + 2)::numeric / nullif(o.shown + 4, 0), 0.5) as selection_rate,
      coalesce((o.first_choices + 1)::numeric / nullif(o.kept + 2, 0), 0.5) as first_choice_rate,
      coalesce(profile.value, 0.5) as profile_attention,
      coalesce(bio.value, 0.5) as bio_attention,
      coalesce(photo.value, 0.5) as photo_attention,
      coalesce((mutual.count + 1)::numeric / nullif(o.shown + 2, 0), 0.5) as mutual_first_choice,
      coalesce(luna.value, 0.5) as luna_presentation,
      least(1, coalesce(o.shown, 0)::numeric / 15) as selection_support,
      least(1, coalesce(o.kept, 0)::numeric / 8) as first_choice_support,
      least(1, coalesce(profile.samples, 0)::numeric / 8) as profile_support,
      least(1, coalesce(bio.samples, 0)::numeric / 8) as bio_support,
      least(1, coalesce(photo.samples, 0)::numeric / 8) as photo_support,
      least(1, coalesce(o.shown, 0)::numeric / 15) as mutual_support,
      least(1, coalesce(luna.samples, 0)::numeric / 3) as luna_support,
      coalesce(o.shown, 0) as exposure_count
    from scoped_users target
    left join outcomes o on o.subject_id = target.id
    left join profile_ranks profile on profile.subject_id = target.id
    left join bio_ranks bio on bio.subject_id = target.id
    left join photo_ranks photo on photo.subject_id = target.id
    left join mutual_first_choices mutual on mutual.user_id = target.id
    left join luna_features luna on luna.user_id = target.id
  ),
  component_values as (
    select user_id, metric_key, metric_value, support
    from raw_components
    cross join lateral (values
      ('selection_rate', selection_rate, selection_support),
      ('first_choice_rate', first_choice_rate, first_choice_support),
      ('profile_attention', profile_attention, profile_support),
      ('bio_attention', bio_attention, bio_support),
      ('photo_attention', photo_attention, photo_support),
      ('mutual_first_choice', mutual_first_choice, mutual_support),
      ('luna_presentation', luna_presentation, luna_support)
    ) component(metric_key, metric_value, support)
  ),
  scored as (
    select raw.user_id,
      coalesce(
        sum(value.support * config.weight) filter (where config.enabled)
        / nullif(sum(config.weight) filter (where config.enabled), 0),
        0
      )::numeric(4,3) as confidence,
      greatest(0.05, least(0.95, (
        coalesce(
        sum(value.metric_value * config.weight) filter (where config.enabled)
        / nullif(sum(config.weight) filter (where config.enabled), 0),
        0.5
      )))::numeric(5,4) as score,
      jsonb_build_object(
        'selection_rate', round(raw.selection_rate, 4),
        'first_choice_rate', round(raw.first_choice_rate, 4),
        'profile_attention', round(raw.profile_attention, 4),
        'bio_attention', round(raw.bio_attention, 4),
        'photo_attention', round(raw.photo_attention, 4),
        'mutual_first_choice', round(raw.mutual_first_choice, 4),
        'luna_presentation', round(raw.luna_presentation, 4),
        'support', jsonb_build_object(
          'selection_rate', round(raw.selection_support, 3),
          'first_choice_rate', round(raw.first_choice_support, 3),
          'profile_attention', round(raw.profile_support, 3),
          'bio_attention', round(raw.bio_support, 3),
          'photo_attention', round(raw.photo_support, 3),
          'mutual_first_choice', round(raw.mutual_support, 3),
          'luna_presentation', round(raw.luna_support, 3)
        )
      ) as components,
      raw.exposure_count
    from raw_components raw
    join component_values value on value.user_id = raw.user_id
    join halal_mode_private.matching_signal_metric_config config
      on config.metric_key = value.metric_key
    group by raw.user_id, raw.selection_rate, raw.first_choice_rate,
      raw.profile_attention, raw.bio_attention, raw.photo_attention, raw.mutual_first_choice,
      raw.selection_support, raw.first_choice_support, raw.profile_support,
      raw.bio_support, raw.photo_support, raw.mutual_support, raw.luna_support,
      raw.luna_presentation, raw.exposure_count
  )
  insert into halal_mode_private.matching_signal_estimates
    (user_id, score, confidence, components, exposure_count, config_version, computed_at)
  select user_id, score, confidence, components, exposure_count, v_version, v_now
  from scored
  on conflict (user_id) do update set
    score = excluded.score,
    confidence = excluded.confidence,
    components = excluded.components,
    exposure_count = excluded.exposure_count,
    config_version = excluded.config_version,
    computed_at = excluded.computed_at;

  insert into public.selection_scores
    (user_id, score, band, times_shown, times_kept, last_recomputed_at)
  select estimate.user_id, estimate.score, 3, 0, 0, v_now
  from halal_mode_private.matching_signal_estimates estimate
  where estimate.computed_at = v_now
    and (p_user_ids is null or estimate.user_id = any(p_user_ids))
  on conflict (user_id) do update set
    score = excluded.score,
    last_recomputed_at = excluded.last_recomputed_at;
end;
$function$;
revoke all on function halal_mode_private.recompute_matching_signal_estimates(uuid[])
  from public, anon, authenticated, service_role;

-- The app sends only observed details. The database supplies decisions and
-- ranks from the authoritative selection rows, and hashes each verified photo.
create or replace function halal_mode_private.record_matching_engagement(
  p_round_id uuid,
  p_observations jsonb
) returns uuid[]
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog
as $function$
declare
  v_viewer uuid := auth.uid();
  v_profile_enabled boolean;
  v_bio_enabled boolean;
  v_photo_enabled boolean;
  v_row jsonb;
  v_photo jsonb;
  v_intro uuid;
  v_subject uuid;
  v_profile smallint;
  v_bio smallint;
  v_photo_seconds jsonb;
  v_path text;
  v_seconds smallint;
  v_hash text;
  v_subjects uuid[] := '{}'::uuid[];
begin
  if v_viewer is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if not halal_mode_private.member_has_current_legal_consents(v_viewer) then
    raise exception 'Accept the current privacy notice before submitting matching signals'
      using errcode = '42501';
  end if;
  select
    coalesce(bool_or(metric_key = 'profile_attention' and enabled), false),
    coalesce(bool_or(metric_key = 'bio_attention' and enabled), false),
    coalesce(bool_or(metric_key = 'photo_attention' and enabled), false)
  into v_profile_enabled, v_bio_enabled, v_photo_enabled
  from halal_mode_private.matching_signal_metric_config;
  if p_observations is null or p_observations = 'null'::jsonb then return v_subjects; end if;
  if jsonb_typeof(p_observations) <> 'array' or jsonb_array_length(p_observations) > 10 then
    raise exception 'Engagement observations are invalid' using errcode = '22023';
  end if;

  for v_row in select value from jsonb_array_elements(p_observations)
  loop
    if jsonb_typeof(v_row) <> 'object' then
      raise exception 'Engagement observation must be an object' using errcode = '22023';
    end if;
    v_intro := (v_row ->> 'introductionId')::uuid;
    select i.subject_id into v_subject
    from public.introductions i
    where i.id = v_intro and i.round_id = p_round_id and i.viewer_id = v_viewer;
    if v_subject is null then
      raise exception 'Engagement observation is outside this round' using errcode = '42501';
    end if;
    v_profile := null;
    if v_profile_enabled then
      if v_row ? 'profileSeconds' and jsonb_typeof(v_row -> 'profileSeconds') not in ('number', 'null') then
        raise exception 'Profile time must be numeric' using errcode = '22023';
      end if;
      v_profile := case when v_row -> 'profileSeconds' is null or v_row -> 'profileSeconds' = 'null'::jsonb
        then null
        else greatest(0, least(120, round(((v_row ->> 'profileSeconds')::numeric) / 5) * 5))::smallint
      end;
    end if;
    v_bio := null;
    if v_bio_enabled then
      if v_row ? 'bioSeconds' and jsonb_typeof(v_row -> 'bioSeconds') not in ('number', 'null') then
        raise exception 'Bio time must be numeric' using errcode = '22023';
      end if;
      v_bio := case when v_row -> 'bioSeconds' is null or v_row -> 'bioSeconds' = 'null'::jsonb
        then null
        else greatest(0, least(120, round(((v_row ->> 'bioSeconds')::numeric) / 5) * 5))::smallint
      end;
    end if;
    if v_photo_enabled then
      if jsonb_typeof(coalesce(v_row -> 'photos', '[]'::jsonb)) <> 'array'
         or jsonb_array_length(coalesce(v_row -> 'photos', '[]'::jsonb)) > 6 then
        raise exception 'Photo time must be a list of at most six images' using errcode = '22023';
      end if;
    end if;

    v_photo_seconds := '[]'::jsonb;
    for v_photo in
      select value from jsonb_array_elements(
        case when v_photo_enabled then coalesce(v_row -> 'photos', '[]'::jsonb) else '[]'::jsonb end
      )
    loop
      if jsonb_typeof(v_photo) <> 'object'
         or jsonb_typeof(v_photo -> 'storagePath') <> 'string'
         or jsonb_typeof(v_photo -> 'seconds') <> 'number' then
        raise exception 'Photo time entry is invalid' using errcode = '22023';
      end if;
      v_path := v_photo ->> 'storagePath';
      if length(v_path) > 512 then continue; end if;
      v_seconds := greatest(0, least(120, round(((v_photo ->> 'seconds')::numeric) / 5) * 5))::smallint;
      -- A removed or replaced photo is ignored rather than making submission fail.
      if v_path = any(coalesce((select p.photos from public.profiles p where p.id = v_subject), '{}'::text[])) then
        v_hash := encode(extensions.digest(v_path, 'sha256'), 'hex');
        v_photo_seconds := v_photo_seconds || jsonb_build_array(
          jsonb_build_object('hash', v_hash, 'seconds', v_seconds)
        );
      end if;
    end loop;

    if v_profile is not null or v_bio is not null or jsonb_array_length(v_photo_seconds) > 0 then
      insert into halal_mode_private.matching_engagement_observations
        (introduction_id, viewer_id, subject_id, profile_seconds, bio_seconds, photo_seconds)
      values (v_intro, v_viewer, v_subject, v_profile, v_bio, v_photo_seconds)
      on conflict (introduction_id) do update set
        profile_seconds = excluded.profile_seconds,
        bio_seconds = excluded.bio_seconds,
        photo_seconds = excluded.photo_seconds,
        created_at = now();
      v_subjects := array_append(v_subjects, v_subject);
    end if;
  end loop;

  return array(select distinct subject from unnest(v_subjects) subject order by subject);
end;
$function$;
revoke all on function halal_mode_private.record_matching_engagement(uuid, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.submit_round_selections_ranked_with_signals(
  p_round_id uuid,
  p_ordered_introduction_ids uuid[],
  p_engagement jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_ids uuid[] := coalesce(p_ordered_introduction_ids, '{}'::uuid[]);
  v_result jsonb;
  v_subjects uuid[];
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if exists (select 1 from halal_mode_private.owed_connection(auth.uid())) then
    raise exception 'Answer the questions you owe before continuing' using errcode = '22023';
  end if;

  v_result := public.submit_round_selections(p_round_id, v_ids);
  perform halal_mode_private.record_selection_ranks(auth.uid(), p_round_id, v_ids);

  select coalesce(array_agg(distinct i.subject_id order by i.subject_id), '{}'::uuid[])
  into v_subjects
  from public.introductions i
  where i.round_id = p_round_id and i.viewer_id = auth.uid();

  if exists (
    select 1 from halal_mode_private.matching_signal_metric_config
    where enabled and metric_key in ('profile_attention', 'bio_attention', 'photo_attention')
  ) then
    perform halal_mode_private.record_matching_engagement(p_round_id, p_engagement);
  end if;
  if cardinality(v_subjects) > 0 then
    perform halal_mode_private.recompute_matching_signal_estimates(v_subjects);
  end if;
  return v_result;
end;
$function$;
revoke all on function public.submit_round_selections_ranked_with_signals(uuid, uuid[], jsonb)
  from public, anon;
grant execute on function public.submit_round_selections_ranked_with_signals(uuid, uuid[], jsonb)
  to authenticated;

-- Keep older app builds working. They simply submit without new dwell signals.
create or replace function public.submit_round_selections_ranked(
  p_round_id uuid,
  p_ordered_introduction_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  return public.submit_round_selections_ranked_with_signals(
    p_round_id, p_ordered_introduction_ids, null
  );
end;
$function$;
revoke all on function public.submit_round_selections_ranked(uuid, uuid[]) from public, anon;
grant execute on function public.submit_round_selections_ranked(uuid, uuid[]) to authenticated;

-- One row per member/photo-version. The job queue alone keeps the raw path so
-- Luna can fetch the private object; completed analysis stores its hash only.
create or replace function halal_mode_private.queue_matching_photo_analysis()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
declare
  v_path text;
  v_hash text;
  v_recheck_existing_photos boolean := false;
begin
  if not exists (
    select 1 from halal_mode_private.matching_signal_metric_config
    where metric_key = 'luna_presentation' and enabled
  ) or not halal_mode_private.member_has_current_legal_consents(new.id)
     or exists (select 1 from halal_mode_private.demo_members d where d.user_id = new.id) then
    return new;
  end if;

  -- A newly accepted notice can make already-uploaded images eligible; queue
  -- that one member's images only after the operator has enabled Luna.
  if tg_op = 'UPDATE' and old.sensitive_consent_at is distinct from new.sensitive_consent_at then
    v_recheck_existing_photos := true;
  end if;

  for v_path in
    select unnest(coalesce(new.photos, '{}'::text[]))
    except
    select unnest(case
      when v_recheck_existing_photos then '{}'::text[]
      when tg_op = 'UPDATE' then coalesce(old.photos, '{}'::text[])
      else '{}'::text[]
    end)
  loop
    if v_path not like 'https://%' then
      v_hash := encode(extensions.digest(v_path, 'sha256'), 'hex');
      if not exists (
        select 1 from halal_mode_private.matching_photo_presentations
        where photo_hash = v_hash and owner_id = new.id
      ) then
        insert into halal_mode_private.matching_photo_analysis_queue
          (photo_hash, owner_id, storage_path)
        values (v_hash, new.id, v_path)
        on conflict (photo_hash) do update set
          owner_id = excluded.owner_id,
          storage_path = excluded.storage_path,
          claimed_until = null,
          attempts = 0;
      end if;
    end if;
  end loop;
  return new;
end;
$function$;

drop trigger if exists profiles_matching_photo_analysis on public.profiles;
create trigger profiles_matching_photo_analysis
after insert or update of photos, sensitive_consent_at on public.profiles
for each row execute function halal_mode_private.queue_matching_photo_analysis();
revoke all on function halal_mode_private.queue_matching_photo_analysis()
  from public, anon, authenticated, service_role;

create or replace function halal_mode_private.queue_matching_photo_analysis_after_consent()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
declare
  v_path text;
  v_hash text;
  v_photos text[];
begin
  if new.document_type <> 'privacy'
     or not exists (
       select 1 from halal_mode_private.matching_signal_metric_config
       where metric_key = 'luna_presentation' and enabled
     )
     or not halal_mode_private.member_has_current_legal_consents(new.user_id)
     or exists (select 1 from halal_mode_private.demo_members d where d.user_id = new.user_id) then
    return new;
  end if;

  select coalesce(p.photos, '{}'::text[]) into v_photos
  from public.profiles p
  where p.id = new.user_id and p.sensitive_consent_at is not null;
  if not found then return new; end if;

  foreach v_path in array v_photos loop
    if v_path not like 'https://%' then
      v_hash := encode(extensions.digest(v_path, 'sha256'), 'hex');
      if not exists (
        select 1 from halal_mode_private.matching_photo_presentations
        where photo_hash = v_hash and owner_id = new.user_id
      ) then
        insert into halal_mode_private.matching_photo_analysis_queue
          (photo_hash, owner_id, storage_path)
        values (v_hash, new.user_id, v_path)
        on conflict (photo_hash) do nothing;
      end if;
    end if;
  end loop;
  return new;
end;
$function$;
revoke all on function halal_mode_private.queue_matching_photo_analysis_after_consent()
  from public, anon, authenticated, service_role;
create trigger member_privacy_consent_queue_matching_photos
after insert on halal_mode_private.member_legal_consent_history
for each row execute function halal_mode_private.queue_matching_photo_analysis_after_consent();

create or replace function public.claim_matching_photo_analysis_service(p_limit integer default 3)
returns jsonb
language sql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
  with enabled as (
    select exists (
      select 1 from halal_mode_private.matching_signal_metric_config
      where metric_key = 'luna_presentation' and matching_signal_metric_config.enabled
    ) as yes
  ), picked as (
    select q.photo_hash
    from halal_mode_private.matching_photo_analysis_queue q
    cross join enabled
    where enabled.yes and q.attempts < 5
      and (q.claimed_until is null or q.claimed_until < now())
      and exists (
        select 1 from public.profiles p
        where p.id = q.owner_id and q.storage_path = any(coalesce(p.photos, '{}'::text[]))
          and halal_mode_private.member_has_current_legal_consents(p.id)
      )
    order by q.created_at
    limit greatest(1, least(coalesce(p_limit, 3), 5))
    for update of q skip locked
  ), claimed as (
    update halal_mode_private.matching_photo_analysis_queue q
    set claimed_until = now() + interval '5 minutes', attempts = q.attempts + 1
    from picked where q.photo_hash = picked.photo_hash
    returning q.photo_hash, q.owner_id, q.storage_path
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'photo_hash', photo_hash, 'owner_id', owner_id, 'storage_path', storage_path
  )), '[]'::jsonb)
  from claimed;
$function$;
revoke all on function public.claim_matching_photo_analysis_service(integer) from public, anon, authenticated;
grant execute on function public.claim_matching_photo_analysis_service(integer) to service_role;

create or replace function public.release_matching_photo_analysis_service(p_photo_hash text)
returns void
language sql
security definer
set search_path = halal_mode_private
as $function$
  update halal_mode_private.matching_photo_analysis_queue
  set claimed_until = null
  where photo_hash = p_photo_hash and attempts < 5;
$function$;
revoke all on function public.release_matching_photo_analysis_service(text) from public, anon, authenticated;
grant execute on function public.release_matching_photo_analysis_service(text) to service_role;

create or replace function public.complete_matching_photo_analysis_service(
  p_photo_hash text,
  p_owner_id uuid,
  p_storage_path text,
  p_features jsonb,
  p_model_id text,
  p_analysis_version text
) returns boolean
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
declare
  v_saved boolean := false;
begin
  if (auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'Photo analysis is an internal service' using errcode = '42501';
  end if;
  if not exists (
    select 1 from halal_mode_private.matching_signal_metric_config
    where metric_key = 'luna_presentation' and enabled
  ) then
    delete from halal_mode_private.matching_photo_analysis_queue where photo_hash = p_photo_hash;
    return false;
  end if;
  if p_storage_path is null or p_photo_hash is distinct from encode(extensions.digest(p_storage_path, 'sha256'), 'hex')
     or p_features is null or jsonb_typeof(p_features) <> 'object'
     or length(coalesce(p_model_id, '')) not between 1 and 80
     or length(coalesce(p_analysis_version, '')) not between 1 and 80 then
    raise exception 'Photo analysis payload is invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_owner_id and p_storage_path = any(coalesce(p.photos, '{}'::text[]))
      and halal_mode_private.member_has_current_legal_consents(p.id)
  ) then
    delete from halal_mode_private.matching_photo_analysis_queue
    where photo_hash = p_photo_hash and owner_id = p_owner_id;
    return false;
  end if;
  if (select count(*) from jsonb_object_keys(p_features)) <> 4
     or not (p_features ?& array['clarity', 'lighting', 'framing', 'background_distraction']) then
    raise exception 'Photo presentation fields are incomplete' using errcode = '22023';
  end if;

  insert into halal_mode_private.matching_photo_presentations
    (photo_hash, owner_id, clarity, lighting, framing, background_distraction, model_id, analysis_version)
  values (
    p_photo_hash, p_owner_id,
    (p_features ->> 'clarity')::numeric,
    (p_features ->> 'lighting')::numeric,
    (p_features ->> 'framing')::numeric,
    (p_features ->> 'background_distraction')::numeric,
    p_model_id, p_analysis_version
  )
  on conflict (photo_hash) do update set
    owner_id = excluded.owner_id,
    clarity = excluded.clarity,
    lighting = excluded.lighting,
    framing = excluded.framing,
    background_distraction = excluded.background_distraction,
    model_id = excluded.model_id,
    analysis_version = excluded.analysis_version,
    analyzed_at = now();

  delete from halal_mode_private.matching_photo_analysis_queue
  where photo_hash = p_photo_hash and owner_id = p_owner_id;
  perform halal_mode_private.recompute_matching_signal_estimates(array[p_owner_id]);
  v_saved := true;
  return v_saved;
end;
$function$;
revoke all on function public.complete_matching_photo_analysis_service(text, uuid, text, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_matching_photo_analysis_service(text, uuid, text, jsonb, text, text)
  to service_role;

create or replace function halal_mode_private.bump_matching_config_version()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  update halal_mode_private.matching_signal_config_state
  set version = version + 1, updated_at = now()
  where singleton;
  -- Pair-level preference is snapshotted per matching run; it does not need
  -- to refresh every member's score cache.
  if new.metric_key <> 'reception_similarity' then
    perform halal_mode_private.recompute_matching_signal_estimates(null);
  end if;
  return new;
end;
$function$;
revoke all on function halal_mode_private.bump_matching_config_version()
  from public, anon, authenticated, service_role;

create trigger matching_signal_metric_config_changed
after update of enabled, weight
on halal_mode_private.matching_signal_metric_config
for each row
when (old.enabled is distinct from new.enabled
  or old.weight is distinct from new.weight)
execute function halal_mode_private.bump_matching_config_version();

create or replace function halal_mode_private.configure_matching_signal_metric(
  p_metric_key text,
  p_enabled boolean default null,
  p_weight numeric default null
) returns void
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_role text := auth.jwt() ->> 'role';
begin
  if v_role is not null and v_role <> 'service_role' then
    raise exception 'Matching metric settings are backend-only' using errcode = '42501';
  end if;
  if v_role is null and session_user <> 'postgres' then
    raise exception 'Matching metric settings are backend-only' using errcode = '42501';
  end if;
  if p_weight is not null and p_weight not between 0 and 1 then
    raise exception 'Metric weight must be between zero and one' using errcode = '22023';
  end if;
  update halal_mode_private.matching_signal_metric_config
  set enabled = coalesce(p_enabled, enabled),
      weight = coalesce(p_weight, weight),
      updated_at = now()
  where metric_key = p_metric_key;
  if not found then
    raise exception 'Unknown matching metric: %', p_metric_key using errcode = '22023';
  end if;

end;
$function$;
revoke all on function halal_mode_private.configure_matching_signal_metric(text, boolean, numeric)
  from public, anon, authenticated, service_role;
grant usage on schema halal_mode_private to service_role;
grant execute on function halal_mode_private.configure_matching_signal_metric(text, boolean, numeric)
  to service_role;

-- Public-schema wrapper is callable only with the server key, since the private
-- schema is intentionally not exposed through the Supabase REST API.
create or replace function public.configure_matching_signal_metric_service(
  p_metric_key text,
  p_enabled boolean default null,
  p_weight numeric default null
) returns void
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
begin
  if (auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'Matching metric settings are backend-only' using errcode = '42501';
  end if;
  perform halal_mode_private.configure_matching_signal_metric(p_metric_key, p_enabled, p_weight);
end;
$function$;
revoke all on function public.configure_matching_signal_metric_service(text, boolean, numeric)
  from public, anon, authenticated;
grant execute on function public.configure_matching_signal_metric_service(text, boolean, numeric)
  to service_role;

create or replace function public.get_matching_signal_metrics_service()
returns table (metric_key text, enabled boolean, weight numeric, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
begin
  if (auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'Matching metric settings are backend-only' using errcode = '42501';
  end if;
  return query
  select config.metric_key, config.enabled, config.weight, config.updated_at
  from halal_mode_private.matching_signal_metric_config config
  order by config.metric_key;
end;
$function$;
revoke all on function public.get_matching_signal_metrics_service()
  from public, anon, authenticated;
grant execute on function public.get_matching_signal_metrics_service()
  to service_role;

-- Enabling Luna only affects future photo changes. Existing images are queued
-- only by an explicit, bounded service call so a toggle cannot create a bill.
create or replace function public.queue_matching_photo_analysis_backfill_service(
  p_limit integer default 20
) returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
declare
  v_queued integer := 0;
begin
  if (auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'Photo backfill is an internal service' using errcode = '42501';
  end if;
  if not exists (
    select 1 from halal_mode_private.matching_signal_metric_config
    where metric_key = 'luna_presentation' and enabled
  ) then
    raise exception 'Enable Luna presentation analysis before queuing images' using errcode = '55000';
  end if;

  with candidates as (
    select p.id as owner_id, photo.photo_path,
      encode(extensions.digest(photo.photo_path, 'sha256'), 'hex') as photo_hash
    from public.profiles p
    cross join lateral unnest(coalesce(p.photos, '{}'::text[])) photo(photo_path)
    where photo.photo_path not like 'https://%'
      and halal_mode_private.member_has_current_legal_consents(p.id)
      and not exists (select 1 from halal_mode_private.demo_members d where d.user_id = p.id)
      and not exists (
        select 1 from halal_mode_private.matching_photo_presentations existing
        where existing.photo_hash = encode(extensions.digest(photo.photo_path, 'sha256'), 'hex')
      )
      and not exists (
        select 1 from halal_mode_private.matching_photo_analysis_queue queued
        where queued.photo_hash = encode(extensions.digest(photo.photo_path, 'sha256'), 'hex')
      )
    order by p.id, photo.photo_path
    limit greatest(1, least(coalesce(p_limit, 20), 50))
  ), inserted as (
    insert into halal_mode_private.matching_photo_analysis_queue
      (photo_hash, owner_id, storage_path)
    select photo_hash, owner_id, photo_path from candidates
    on conflict (photo_hash) do nothing
    returning 1
  )
  select count(*)::integer into v_queued from inserted;
  return v_queued;
end;
$function$;
revoke all on function public.queue_matching_photo_analysis_backfill_service(integer)
  from public, anon, authenticated;
grant execute on function public.queue_matching_photo_analysis_backfill_service(integer)
  to service_role;

create or replace function halal_mode_private.clear_removed_photo_presentation()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
declare
  v_path text;
  v_hash text;
begin
  for v_path in select unnest(coalesce(old.photos, '{}'::text[]))
  loop
    if not (v_path = any(coalesce(new.photos, '{}'::text[]))) then
      v_hash := encode(extensions.digest(v_path, 'sha256'), 'hex');
      delete from halal_mode_private.matching_photo_analysis_queue where photo_hash = v_hash;
      delete from halal_mode_private.matching_photo_presentations where photo_hash = v_hash;
    end if;
  end loop;
  return new;
end;
$function$;
revoke all on function halal_mode_private.clear_removed_photo_presentation()
  from public, anon, authenticated, service_role;
-- Cleanup is independent from the queue trigger, so photos removed while Luna
-- is switched off are still forgotten from its feature table.
create trigger profiles_clear_removed_photo_presentation
after update of photos on public.profiles
for each row
when (old.photos is distinct from new.photos)
execute function halal_mode_private.clear_removed_photo_presentation();

create or replace function halal_mode_private.prune_matching_engagement()
returns integer
language plpgsql
security definer
set search_path = halal_mode_private
as $function$
declare
  v_deleted integer;
begin
  delete from halal_mode_private.matching_engagement_observations
  where created_at < now() - interval '180 days';
  get diagnostics v_deleted = row_count;
  -- Outcomes and photo weights also age out of their 180-day window, so the
  -- private cache must be refreshed even on a day with no dwell rows to prune.
  perform halal_mode_private.recompute_matching_signal_estimates(null);
  return v_deleted;
end;
$function$;
revoke all on function halal_mode_private.prune_matching_engagement()
  from public, anon, authenticated, service_role;

-- Refresh the members involved when a connection forms, so the reciprocal
-- first-choice component can move without waiting for another round.
create or replace function halal_mode_private.refresh_matching_estimate_for_connection()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  perform halal_mode_private.recompute_matching_signal_estimates(array[new.user_a, new.user_b]);
  return new;
end;
$function$;
revoke all on function halal_mode_private.refresh_matching_estimate_for_connection()
  from public, anon, authenticated, service_role;
create trigger connections_refresh_matching_estimate
after insert on public.connections
for each row execute function halal_mode_private.refresh_matching_estimate_for_connection();

-- Build the initial component cache in one set-based pass. No API call is made
-- by the migration, and Luna remains off until the backend switch is enabled.
select halal_mode_private.recompute_matching_signal_estimates(null);

-- A single RPC is the only way the moderator can read a pending Luna image
-- path. All writes and reads remain private/service-only.
do $function$
begin
  if exists (select 1 from cron.job where jobname = 'halal-mode-moderate') then
    perform cron.unschedule('halal-mode-moderate');
  end if;
  perform cron.schedule(
    'halal-mode-moderate',
    '*/2 * * * *',
    $job$
      select net.http_post(
        url := 'https://ziboxxxiedcqfdgzqgjv.supabase.co/functions/v1/moderate',
        headers := jsonb_build_object(
          'x-mail-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'halal_mode_mail_worker' order by created_at desc limit 1),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      )
      where exists (
        select 1 from halal_mode_private.moderation_queue
        where decided_at is null and attempts < 4
      ) or exists (
        select 1 from halal_mode_private.matching_photo_analysis_queue q
        join halal_mode_private.matching_signal_metric_config c
          on c.metric_key = 'luna_presentation' and c.enabled
        where q.attempts < 5
      );
    $job$
  );
  if exists (select 1 from cron.job where jobname = 'halal-mode-prune-matching-engagement') then
    perform cron.unschedule('halal-mode-prune-matching-engagement');
  end if;
  perform cron.schedule(
    'halal-mode-prune-matching-engagement',
    '17 3 * * *',
    'select halal_mode_private.prune_matching_engagement()'
  );
end;
$function$;
