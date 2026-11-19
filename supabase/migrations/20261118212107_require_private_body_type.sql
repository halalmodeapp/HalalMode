-- A primary build is required before introductions. Members can also declare a second build.

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
    and length(trim(p.bio)) >= 50
    and cardinality(p.photos) >= 1
    and exists (select 1 from private_preferences pp where pp.user_id = p.id and valid_build(pp.own_build)),
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
      case when length(trim(p.bio)) < 50 then 'bio' end,
      case when cardinality(p.photos) < 1 then 'photo' end,
      case when pp.own_build is null then 'body_type' end
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
      case when pp.matching_preferences_completed_at is null then 'preferences' end
    ], null))
  )
  from profiles p
  left join private_preferences pp on pp.user_id = p.id
  where p.id = auth.uid();
$function$;


-- Installed apps may still send weight. Ignore it at the write boundary and
-- omit it from owner reads. Retention of historical values is a separate decision.
do $$
declare
  def text := pg_get_functiondef('public.update_my_private_preferences(jsonb)'::regprocedure);
begin
  def := regexp_replace(def, '(?in)^begin[[:blank:]]*$', E'begin\n  p_patch := p_patch - ''own_weight_kg'';');
  if strpos(def, 'p_patch := p_patch - ''own_weight_kg''') = 0 then raise exception 'Missing preference patch anchor'; end if;
  execute def;
end;
$$;
create or replace function public.get_my_private_preferences()
returns jsonb
language plpgsql
security definer
set search_path = public as $$
declare v_preferences private_preferences%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_preferences from private_preferences where user_id = auth.uid();
  if v_preferences is null then raise exception 'Private preferences were not found' using errcode = 'P0002'; end if;
  return to_jsonb(v_preferences) - 'user_id' - 'updated_at' - 'own_weight_kg';
end;
$$;
