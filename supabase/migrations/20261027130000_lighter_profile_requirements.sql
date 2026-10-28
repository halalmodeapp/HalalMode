-- Introductions start sooner.
--
-- Before, a member had to fill in thirteen things before their first
-- introduction: name, location, bio, a photo, languages, education, children,
-- religious dress, ethnicity, heritage, height, body type and saved
-- preferences. Every extra field costs sign-ups, and matching copes without
-- the rest: a blank answer is never held against anyone, and the Premium
-- filters treat an unanswered profile as a match.
--
-- Now only four things are required: name, location, a bio and a photo.
-- Everything else is recommended: it is asked for once the member has a match,
-- and filling it in still helps others get to know them.
--
-- get_my_profile_readiness() therefore returns two lists: `missing` (required)
-- and `recommended`.

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
    and cardinality(p.photos) >= 1,
    false
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
      case when cardinality(p.photos) < 1 then 'photo' end
    ], null)),
    'recommended', to_jsonb(array_remove(array[
      case when cardinality(p.languages_spoken) < 1 then 'languages' end,
      case when nullif(trim(p.education), '') is null then 'education' end,
      case when p.has_children is null then 'has_children' end,
      case when p.family_goals_answered_at is null then 'children_when' end,
      case when p.gender = 'female' and p.religious_dress is null then 'dress' end,
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
