-- Introductions start only once a member has completed their profile and
-- their preferences.
--
-- Until now matching asked for a name, a location, 40 characters of bio, a
-- photo and saved preferences. Members' own answers that others filter by
-- (children, religious dress, ethnicity, education, languages) and their own
-- height and body type were asked for on the profile but not required, so a
-- member could be introduced with half a profile. They are now all required,
-- and the bio needs 80 characters, as the profile screen already said.
--
-- "When would you like children" is stored in a column that has always had a
-- default, so every profile appeared to have answered it. A member now has to
-- choose it themselves: family_goals_answered_at records when they did. The
-- column itself is unchanged, so nothing that reads it is affected.
--
-- Sample members are not touched by readiness (their sets come through
-- request_demo_round, which checks only the member asking), but they are
-- marked as having answered so their profiles show the answer.

alter table public.profiles
  add column if not exists family_goals_answered_at timestamptz;

update public.profiles p
set family_goals_answered_at = now()
where p.family_goals_answered_at is null
  and exists (select 1 from halal_mode_private.demo_members d where d.user_id = p.id);

-- Saving the answer through the profile records that it was chosen.
do $$
declare
  v_def text;
  v_anchor constant text :=
    $a$family_goals = case when p_patch ? 'family_goals' then (p_patch->>'family_goals')::family_goals else family_goals end,$a$;
begin
  select pg_get_functiondef('public.update_my_profile'::regproc) into v_def;
  if position(v_anchor in v_def) = 0 then
    raise exception 'update_my_profile: family_goals anchor not found';
  end if;
  if position('family_goals_answered_at' in v_def) = 0 then
    v_def := replace(v_def, v_anchor, v_anchor || E'\n      family_goals_answered_at = case when p_patch ? ''family_goals'' then now() else family_goals_answered_at end,');
    execute v_def;
  end if;
end;
$$;

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
    and p.ethnicity is not null,
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

-- What is still missing, one key per answer; the app groups them into steps.
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
      case when p.ethnicity is null then 'ethnicity' end,
      case when pp.own_height_cm is null then 'height' end,
      case when nullif(trim(pp.own_build), '') is null then 'body_type' end,
      case when pp.matching_preferences_completed_at is null then 'preferences' end
    ], null))
  )
  from profiles p
  left join private_preferences pp on pp.user_id = p.id
  where p.id = auth.uid();
$function$;

-- The app needs to know whether the answer was chosen, not just what it is.
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
    'ethnicity', p.ethnicity,
    'family_goals_answered', p.family_goals_answered_at is not null
  );
end;
$function$;
