-- Ethnicity and heritage, as two questions that cover everybody.
--
-- The single ethnicity answer (0171) and its list of specific peoples (0174)
-- mixed race, ethnicity, nationality and diaspora identity in one box, left
-- many people out, and allowed only one choice, so "Lebanese American" or
-- "Black, Nigerian and British" could not be said. Members now give:
--
--   ethnicities         up to two broad ethnicities (two for mixed heritage)
--   heritage_countries  up to three countries they or their family are from,
--                       as ISO codes, so every country in the world is there
--
-- Either may be "prefer not to say" on its own. A Premium filter on either
-- matches anyone who shares at least one answer.
--
-- The old single column stays (nobody answered it) but is no longer read.

alter table public.profiles drop constraint if exists profiles_ethnicity_check;
drop function if exists public.ethnicity_region(text);
comment on column public.profiles.ethnicity is 'Superseded by ethnicities and heritage_countries (migration 0175); not read.';

create or replace function public.valid_ethnicities(p text[])
returns boolean
language sql
immutable
set search_path to 'public'
as $function$
  select cardinality(p) <= 2
    and p <@ array['arab', 'amazigh', 'black', 'central_asian', 'east_asian', 'hispanic_latino',
                   'indigenous', 'kurdish', 'pacific_islander', 'persian', 'south_asian',
                   'southeast_asian', 'turkic', 'white', 'other', 'prefer_not_to_say']::text[]
    and (not 'prefer_not_to_say' = any(p) or cardinality(p) = 1);
$function$;

create or replace function public.valid_heritage_countries(p text[])
returns boolean
language sql
immutable
set search_path to 'public'
as $function$
  select cardinality(p) <= 3
    and (p = array['prefer_not_to_say']::text[]
      or coalesce((select bool_and(c ~ '^[A-Z]{2}$') from unnest(p) as c), true))
    and cardinality(p) = (select count(distinct c) from unnest(p) as c);
$function$;

alter table public.profiles
  add column if not exists ethnicities text[] not null default '{}'
    constraint profiles_ethnicities_check check (public.valid_ethnicities(ethnicities)),
  add column if not exists heritage_countries text[] not null default '{}'
    constraint profiles_heritage_countries_check check (public.valid_heritage_countries(heritage_countries));

alter table public.private_preferences
  add column if not exists preferred_heritage_countries text[] not null default '{}';

-- Filters saved against the old ids keep only what still exists.
update public.private_preferences
set preferred_ethnicities = array(
  select e from unnest(preferred_ethnicities) as e
  where public.valid_ethnicities(array[e]) and e <> 'prefer_not_to_say'
)
where cardinality(preferred_ethnicities) > 0;

drop function if exists public.set_my_profile_details(text, text, text);

create or replace function public.set_my_profile_details(
  p_has_children text,
  p_religious_dress text,
  p_ethnicities text[],
  p_heritage_countries text[]
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_gender text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  select gender::text into v_gender from public.profiles where id = auth.uid();
  -- Dress options differ for women and men; an answer from the wrong list is refused.
  if p_religious_dress is not null and p_religious_dress <> 'no_religious_dress' and not (
    (v_gender = 'female' and p_religious_dress in ('niqab', 'hijab', 'modest'))
    or (v_gender = 'male' and p_religious_dress in ('full_beard', 'trimmed_beard', 'traditional_dress'))
  ) then
    raise exception 'That option does not apply' using errcode = '22023';
  end if;
  if not public.valid_ethnicities(coalesce(p_ethnicities, '{}'))
     or not public.valid_heritage_countries(coalesce(p_heritage_countries, '{}')) then
    raise exception 'That option does not apply' using errcode = '22023';
  end if;
  update public.profiles
  set has_children = p_has_children,
      religious_dress = p_religious_dress,
      ethnicities = coalesce(p_ethnicities, '{}'),
      heritage_countries = coalesce(p_heritage_countries, '{}')
  where id = auth.uid();
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
end;
$function$;

revoke all on function public.set_my_profile_details(text, text, text[], text[]) from public, anon;
grant execute on function public.set_my_profile_details(text, text, text[], text[]) to authenticated;

-- What others see on a profile.
do $$
declare
  v_def text;
  v_anchor constant text := $a$'ethnicity', p_profile.ethnicity$a$;
begin
  select pg_get_functiondef('public.safe_member_profile'::regproc) into v_def;
  if position(v_anchor in v_def) = 0 then
    raise exception 'safe_member_profile: ethnicity anchor not found';
  end if;
  v_def := replace(v_def, v_anchor,
    $r$'ethnicities', p_profile.ethnicities,
    'heritageCountries', p_profile.heritage_countries$r$);
  execute v_def;
end;
$$;

create or replace function public.get_my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare p profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into p from profiles where id = auth.uid();
  if p is null then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  return safe_member_profile(p) || jsonb_build_object(
    'isPaused', p.is_paused,
    'sect', p.sect,
    'sect_detail', p.sect_detail,
    'has_children', p.has_children,
    'religious_dress', p.religious_dress,
    'ethnicities', p.ethnicities,
    'heritage_countries', p.heritage_countries,
    'family_goals_answered', p.family_goals_answered_at is not null
  );
end;
$function$;

create or replace function public.profile_is_ready_for_matching(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    nullif(trim(p.first_name), '') is not null
    and nullif(trim(p.city), '') is not null
    and nullif(trim(p.country), '') is not null
    and length(trim(p.bio)) >= 80
    and cardinality(p.photos) >= 1
    and cardinality(p.languages_spoken) >= 1
    and nullif(trim(p.education), '') is not null
    and p.has_children is not null
    and p.family_goals_answered_at is not null
    and p.religious_dress is not null
    and cardinality(p.ethnicities) >= 1
    and cardinality(p.heritage_countries) >= 1,
    false
  )
  and exists (
    select 1 from private_preferences pp
    where pp.user_id = p_user_id
      and pp.matching_preferences_completed_at is not null
      and pp.own_height_cm is not null
      and nullif(trim(pp.own_build), '') is not null
  )
  from profiles p where p.id = p_user_id;
$function$;

create or replace function public.get_my_profile_readiness()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'ready', profile_is_ready_for_matching(auth.uid()),
    'missing', to_jsonb(array_remove(array[
      case when nullif(trim(p.first_name), '') is null then 'name' end,
      case when nullif(trim(p.city), '') is null or nullif(trim(p.country), '') is null then 'location' end,
      case when length(trim(p.bio)) < 80 then 'bio' end,
      case when cardinality(p.photos) < 1 then 'photo' end,
      case when cardinality(p.languages_spoken) < 1 then 'languages' end,
      case when nullif(trim(p.education), '') is null then 'education' end,
      case when p.has_children is null then 'has_children' end,
      case when p.family_goals_answered_at is null then 'children_when' end,
      case when p.religious_dress is null then 'dress' end,
      case when cardinality(p.ethnicities) < 1 then 'ethnicity' end,
      case when cardinality(p.heritage_countries) < 1 then 'heritage' end,
      case when pp.own_height_cm is null then 'height' end,
      case when nullif(trim(pp.own_build), '') is null then 'body_type' end,
      case when pp.matching_preferences_completed_at is null then 'preferences' end
    ], null))
  )
  from profiles p
  left join private_preferences pp on pp.user_id = p.id
  where p.id = auth.uid();
$function$;

create or replace function public.set_my_premium_preferences(p_patch jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_key text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if (select tier from public.profiles where id = auth.uid()) is distinct from 'premium' then
    raise exception 'Premium filters need Halal Mode Premium' using errcode = '42501';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Preference changes must be an object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('has_children', 'occupations', 'languages', 'education', 'dress', 'ethnicities', 'heritage', 'must_have') then
      raise exception 'Unknown preference: %', v_key using errcode = '22023';
    end if;
    if v_key <> 'must_have' and (
      jsonb_typeof(p_patch->v_key) <> 'array' or jsonb_array_length(p_patch->v_key) > 300
    ) then
      raise exception 'Preference % is invalid', v_key using errcode = '22023';
    end if;
  end loop;
  if p_patch ? 'must_have' then
    if jsonb_typeof(p_patch->'must_have') <> 'object' or exists (
      select 1 from jsonb_object_keys(p_patch->'must_have') as k(key)
      where key not in ('has_children', 'occupations', 'languages', 'education', 'dress', 'ethnicities', 'heritage')
         or jsonb_typeof(p_patch->'must_have'->key) <> 'boolean'
    ) then
      raise exception 'Must-have choices are invalid' using errcode = '22023';
    end if;
  end if;

  update public.private_preferences pp set
    preferred_has_children = case when p_patch ? 'has_children'
      then array(select jsonb_array_elements_text(p_patch->'has_children')) else pp.preferred_has_children end,
    preferred_occupations = case when p_patch ? 'occupations'
      then array(select jsonb_array_elements_text(p_patch->'occupations')) else pp.preferred_occupations end,
    preferred_languages = case when p_patch ? 'languages'
      then array(select jsonb_array_elements_text(p_patch->'languages')) else pp.preferred_languages end,
    preferred_education = case when p_patch ? 'education'
      then array(select jsonb_array_elements_text(p_patch->'education')) else pp.preferred_education end,
    preferred_dress = case when p_patch ? 'dress'
      then array(select jsonb_array_elements_text(p_patch->'dress')) else pp.preferred_dress end,
    preferred_ethnicities = case when p_patch ? 'ethnicities'
      then array(select jsonb_array_elements_text(p_patch->'ethnicities')) else pp.preferred_ethnicities end,
    preferred_heritage_countries = case when p_patch ? 'heritage'
      then array(select jsonb_array_elements_text(p_patch->'heritage')) else pp.preferred_heritage_countries end,
    premium_must_have = case when p_patch ? 'must_have' then p_patch->'must_have' else pp.premium_must_have end
  where pp.user_id = auth.uid();
  if not found then raise exception 'Preferences not found' using errcode = 'P0002'; end if;
end;
$function$;

create or replace function halal_mode_private.premium_filters_allow(p_viewer uuid, p_candidate uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((
    select
      -- Only a Premium member's filters apply; a free member's are kept but unused.
      v.tier is distinct from 'premium'
      or (
        (not coalesce((pp.premium_must_have->>'has_children')::boolean, false)
          or cardinality(pp.preferred_has_children) = 0
          or c.has_children is null or c.has_children = 'prefer_not_to_say'
          or c.has_children = any(pp.preferred_has_children))
        and (not coalesce((pp.premium_must_have->>'occupations')::boolean, false)
          or cardinality(pp.preferred_occupations) = 0
          or nullif(c.occupation, '') is null
          or c.occupation = any(pp.preferred_occupations))
        and (not coalesce((pp.premium_must_have->>'languages')::boolean, false)
          or cardinality(pp.preferred_languages) = 0
          or cardinality(coalesce(c.languages_spoken, '{}')) = 0
          or c.languages_spoken && pp.preferred_languages)
        and (not coalesce((pp.premium_must_have->>'education')::boolean, false)
          or cardinality(pp.preferred_education) = 0
          or c.education is null
          or c.education = any(pp.preferred_education))
        and (not coalesce((pp.premium_must_have->>'dress')::boolean, false)
          or cardinality(pp.preferred_dress) = 0
          or c.religious_dress is null
          or c.religious_dress = any(pp.preferred_dress))
        -- Ethnicity and heritage: anyone sharing at least one answer. "Prefer
        -- not to say" is never held against someone.
        and (not coalesce((pp.premium_must_have->>'ethnicities')::boolean, false)
          or cardinality(pp.preferred_ethnicities) = 0
          or cardinality(c.ethnicities) = 0 or 'prefer_not_to_say' = any(c.ethnicities)
          or c.ethnicities && pp.preferred_ethnicities)
        and (not coalesce((pp.premium_must_have->>'heritage')::boolean, false)
          or cardinality(pp.preferred_heritage_countries) = 0
          or cardinality(c.heritage_countries) = 0 or 'prefer_not_to_say' = any(c.heritage_countries)
          or c.heritage_countries && pp.preferred_heritage_countries)
      )
    from public.profiles v
    join public.private_preferences pp on pp.user_id = v.id
    join public.profiles c on c.id = p_candidate
    where v.id = p_viewer
  ), true);
$function$;
