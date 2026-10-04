-- Premium filters (2026-10-04).
--
-- Free members filter by age, height, location/distance and sect. Everything
-- else is Premium: body type, practice, marriage timing, children (has
-- children, and when they want them), career, languages, education level,
-- religious dress and ethnicity.
--
-- As with the existing criteria, a filter only rules people out when its
-- "must have" is on; otherwise it is the member's preference, kept for them.
-- Someone who has not stated a value is never ruled out by it.

-- ---------------------------------------------------------------------------
-- What a member says about themselves.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists has_children text
    check (has_children is null or has_children in ('no', 'yes', 'prefer_not_to_say')),
  add column if not exists religious_dress text
    check (religious_dress is null or religious_dress in (
      'niqab', 'hijab', 'modest', 'full_beard', 'trimmed_beard', 'traditional_dress', 'no_religious_dress'
    )),
  add column if not exists ethnicity text
    check (ethnicity is null or ethnicity in (
      'arab', 'south_asian', 'southeast_asian', 'east_asian', 'central_asian', 'persian', 'turkish',
      'kurdish', 'amazigh', 'black_african', 'african_caribbean', 'white', 'hispanic_latino', 'mixed',
      'other', 'prefer_not_to_say'
    ));

create or replace function public.set_my_profile_details(
  p_has_children text,
  p_religious_dress text,
  p_ethnicity text
) returns void
language plpgsql
security definer
set search_path = public
as $$
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
  update public.profiles
  set has_children = p_has_children,
      religious_dress = p_religious_dress,
      ethnicity = p_ethnicity
  where id = auth.uid();
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.set_my_profile_details(text, text, text) from public, anon;
grant execute on function public.set_my_profile_details(text, text, text) to authenticated;

-- The owner sees their own answers.
create or replace function public.get_my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public as $$
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
    'ethnicity', p.ethnicity
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- What a Premium member is looking for.
-- ---------------------------------------------------------------------------

alter table public.private_preferences
  add column if not exists preferred_has_children text[] not null default '{}',
  add column if not exists preferred_occupations text[] not null default '{}',
  add column if not exists preferred_languages text[] not null default '{}',
  add column if not exists preferred_education text[] not null default '{}',
  add column if not exists preferred_dress text[] not null default '{}',
  add column if not exists preferred_ethnicities text[] not null default '{}',
  add column if not exists premium_must_have jsonb not null default '{}'::jsonb;

create or replace function public.set_my_premium_preferences(p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
    if v_key not in ('has_children', 'occupations', 'languages', 'education', 'dress', 'ethnicities', 'must_have') then
      raise exception 'Unknown preference: %', v_key using errcode = '22023';
    end if;
    if v_key <> 'must_have' and (
      jsonb_typeof(p_patch->v_key) <> 'array' or jsonb_array_length(p_patch->v_key) > 200
    ) then
      raise exception 'Preference % is invalid', v_key using errcode = '22023';
    end if;
  end loop;
  if p_patch ? 'must_have' then
    if jsonb_typeof(p_patch->'must_have') <> 'object' or exists (
      select 1 from jsonb_object_keys(p_patch->'must_have') as k(key)
      where key not in ('has_children', 'occupations', 'languages', 'education', 'dress', 'ethnicities')
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
    premium_must_have = case when p_patch ? 'must_have' then p_patch->'must_have' else pp.premium_must_have end
  where pp.user_id = auth.uid();
  if not found then raise exception 'Preferences not found' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.set_my_premium_preferences(jsonb) from public, anon;
grant execute on function public.set_my_premium_preferences(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Matching: one predicate for the Premium filters, both directions.
-- ---------------------------------------------------------------------------

create or replace function halal_mode_private.premium_filters_allow(p_viewer uuid, p_candidate uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
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
        and (not coalesce((pp.premium_must_have->>'ethnicities')::boolean, false)
          or cardinality(pp.preferred_ethnicities) = 0
          or c.ethnicity is null or c.ethnicity = 'prefer_not_to_say'
          or c.ethnicity = any(pp.preferred_ethnicities))
      )
    from public.profiles v
    join public.private_preferences pp on pp.user_id = v.id
    join public.profiles c on c.id = p_candidate
    where v.id = p_viewer
  ), true);
$$;

revoke all on function halal_mode_private.premium_filters_allow(uuid, uuid) from public, anon, authenticated;

create or replace function halal_mode_private.patch_function(p_signature text, p_find text, p_replace text)
returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_signature::regprocedure);
begin
  if position(p_find in v_def) = 0 then
    raise exception 'patch_function: anchor not found in %: %', p_signature, p_find;
  end if;
  execute replace(v_def, p_find, p_replace);
end;
$$;

do $$
declare
  v_sig text := 'halal_mode_private.matching_shortlist_batch_edges(uuid,uuid[],uuid[],timestamp with time zone,integer)';
  v_side text;
  v_crit text;
begin
  perform halal_mode_private.patch_function(
    v_sig,
    'coalesce(live_preferences.preferred_sect_details, ''{}''::text[]) as preferred_sect_details',
    'coalesce(live_preferences.preferred_sect_details, ''{}''::text[]) as preferred_sect_details,
      coalesce(live_profile.tier = ''premium'', false) as is_premium'
  );
  -- Body type, practice, timing and children are Premium: a free member's
  -- must-have on them no longer rules anyone out.
  foreach v_side in array array['male', 'female'] loop
    foreach v_crit in array array['build', 'practice', 'timeline', 'children'] loop
      perform halal_mode_private.patch_function(
        v_sig,
        format('(not %s.must_%s or', v_side, v_crit),
        format('(not (%s.must_%s and %s.is_premium) or', v_side, v_crit, v_side)
      );
    end loop;
  end loop;
  perform halal_mode_private.patch_function(
    v_sig,
    'female.preferred_sects, female.preferred_sect_details, male.sect, male.sect_detail))',
    'female.preferred_sects, female.preferred_sect_details, male.sect, male.sect_detail))
      and halal_mode_private.premium_filters_allow(pair.male_id, pair.female_id)
      and halal_mode_private.premium_filters_allow(pair.female_id, pair.male_id)'
  );
end;
$$;

drop function halal_mode_private.patch_function(text, text, text);
