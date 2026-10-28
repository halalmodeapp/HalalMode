-- Where a member grew up, and their diet.
--
--   grew_up_countries  up to two countries (ISO codes) they grew up in
--   diet               any of: halal only, sometimes non-halal, vegetarian,
--                      pescatarian, vegan. Halal only and sometimes non-halal
--                      are opposites, so a member can hold at most one of them.
--
-- Both are shown on profiles, and both are Premium filters like heritage:
-- anyone sharing at least one answer matches, an unanswered profile is never
-- held against someone, and a filter only rules people out when its
-- "Must have" is on. Neither is required, so existing members are unaffected.

create or replace function public.valid_grew_up_countries(p text[])
returns boolean
language sql
immutable
set search_path to 'public'
as $function$
  select cardinality(p) <= 2
    and coalesce((select bool_and(c ~ '^[A-Z]{2}$') from unnest(p) as c), true)
    and cardinality(p) = (select count(distinct c) from unnest(p) as c);
$function$;

create or replace function public.valid_diet(p text[])
returns boolean
language sql
immutable
set search_path to 'public'
as $function$
  select p <@ array['halal_only', 'sometimes_non_halal', 'vegetarian', 'pescatarian', 'vegan']::text[]
    and not ('halal_only' = any(p) and 'sometimes_non_halal' = any(p))
    and cardinality(p) = (select count(distinct d) from unnest(p) as d);
$function$;

alter table public.profiles
  add column if not exists grew_up_countries text[] not null default '{}'
    constraint profiles_grew_up_countries_check check (public.valid_grew_up_countries(grew_up_countries)),
  add column if not exists diet text[] not null default '{}'
    constraint profiles_diet_check check (public.valid_diet(diet));

alter table public.private_preferences
  add column if not exists preferred_grew_up_countries text[] not null default '{}',
  add column if not exists preferred_diet text[] not null default '{}';

-- The member's own two answers.
create or replace function public.set_my_lifestyle(p_grew_up text[], p_diet text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  if not public.valid_grew_up_countries(coalesce(p_grew_up, '{}'))
     or not public.valid_diet(coalesce(p_diet, '{}')) then
    raise exception 'That option does not apply' using errcode = '22023';
  end if;
  update public.profiles
  set grew_up_countries = coalesce(p_grew_up, '{}'), diet = coalesce(p_diet, '{}')
  where id = auth.uid();
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
end;
$function$;

revoke all on function public.set_my_lifestyle(text[], text[]) from public, anon;
grant execute on function public.set_my_lifestyle(text[], text[]) to authenticated;

-- ---------------------------------------------------------------- what others see
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.safe_member_profile'::regproc) into v_def;
  if position('jsonb_build_object(' in v_def) = 0 then
    raise exception 'safe_member_profile: jsonb_build_object not found';
  end if;
  v_def := regexp_replace(v_def, 'jsonb_build_object\(',
    E'jsonb_build_object(\n    ''grewUpCountries'', p_profile.grew_up_countries,\n    ''diet'', p_profile.diet,', '');
  execute v_def;
end;
$$;

-- ---------------------------------------------------------------- the two Premium filters
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.set_my_premium_preferences(jsonb)'::regprocedure) into v_def;
  -- Both key lists accept the two new criteria.
  if position($a$'ethnicities', 'heritage'$a$ in v_def) = 0 then
    raise exception 'set_my_premium_preferences: criteria list not found';
  end if;
  v_def := replace(v_def, $a$'ethnicities', 'heritage'$a$, $a$'ethnicities', 'heritage', 'grew_up', 'diet'$a$);
  if position($a$premium_must_have = case when p_patch ? 'must_have'$a$ in v_def) = 0 then
    raise exception 'set_my_premium_preferences: update anchor not found';
  end if;
  v_def := replace(v_def, $a$premium_must_have = case when p_patch ? 'must_have'$a$,
    $r$preferred_grew_up_countries = case when p_patch ? 'grew_up'
      then array(select jsonb_array_elements_text(p_patch->'grew_up')) else pp.preferred_grew_up_countries end,
    preferred_diet = case when p_patch ? 'diet'
      then array(select jsonb_array_elements_text(p_patch->'diet')) else pp.preferred_diet end,
    premium_must_have = case when p_patch ? 'must_have'$r$);
  execute v_def;
end;
$$;

do $$
declare
  v_def text;
  v_anchor constant text := $a$c.heritage_countries && pp.preferred_heritage_countries)$a$;
begin
  select pg_get_functiondef('halal_mode_private.premium_filters_allow(uuid,uuid)'::regprocedure) into v_def;
  if position(v_anchor in v_def) = 0 then
    raise exception 'premium_filters_allow: heritage anchor not found';
  end if;
  v_def := replace(v_def, v_anchor, v_anchor || $r$
        -- Where they grew up and their diet: anyone sharing at least one answer.
        -- A profile that has not answered is never held against someone.
        and (not coalesce((pp.premium_must_have->>'grew_up')::boolean, false)
          or cardinality(pp.preferred_grew_up_countries) = 0
          or cardinality(c.grew_up_countries) = 0
          or c.grew_up_countries && pp.preferred_grew_up_countries)
        and (not coalesce((pp.premium_must_have->>'diet')::boolean, false)
          or cardinality(pp.preferred_diet) = 0
          or cardinality(c.diet) = 0
          or c.diet && pp.preferred_diet)$r$);
  execute v_def;
end;
$$;
