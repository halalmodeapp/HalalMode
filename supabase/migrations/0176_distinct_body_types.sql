-- Body type: seven distinct options instead of seventeen overlapping ones, and
-- a member may describe themselves with up to two.
--
-- "Slim", "Slender", "Lean" and "Tall & Lean" were one answer in four words;
-- "Fit / Active", "Athletic" and "Toned" another; "Broad", "Stocky" and
-- "Robust / Sturdy" a third. Members could not tell them apart, and a filter
-- had to tick all of them to mean one thing. Now:
--
--   Slim · Athletic · Muscular · Average · Curvy · Stocky · Full-Figured
--
-- own_build stays the main answer (matching's closeness scoring reads it);
-- own_build_also is an optional second. A body-type filter is met by either.
-- Existing answers and filters are mapped to the nearest new option.

create or replace function public.valid_build(p text)
returns boolean
language sql
immutable
set search_path to 'public'
as $function$
  select p in ('Slim', 'Athletic', 'Muscular', 'Average', 'Curvy', 'Stocky', 'Full-Figured');
$function$;

create or replace function halal_mode_private.map_old_build(p text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case p
    when 'Petite' then 'Slim' when 'Slim' then 'Slim' when 'Slender' then 'Slim'
    when 'Lean' then 'Slim' when 'Tall & Lean' then 'Slim'
    when 'Average' then 'Average' when 'Medium / Solid' then 'Average'
    when 'Fit / Active' then 'Athletic' when 'Athletic' then 'Athletic' when 'Toned' then 'Athletic'
    when 'Muscular' then 'Muscular'
    when 'Curvy' then 'Curvy'
    when 'Full-Figured' then 'Full-Figured' when 'Plus Size' then 'Full-Figured'
    when 'Broad' then 'Stocky' when 'Stocky' then 'Stocky' when 'Robust / Sturdy' then 'Stocky'
    else null
  end;
$function$;

alter table public.private_preferences add column if not exists own_build_also text;

update public.private_preferences
set own_build = halal_mode_private.map_old_build(own_build)
where own_build is not null and not public.valid_build(own_build);

update public.private_preferences
set preferred_builds = array(
  select distinct m from (
    select halal_mode_private.map_old_build(b) as m from unnest(preferred_builds) as b
  ) mapped where m is not null order by m
)
where cardinality(preferred_builds) > 0;

alter table public.private_preferences
  drop constraint if exists private_preferences_own_build_check,
  add constraint private_preferences_own_build_check check (
    (own_build is null or public.valid_build(own_build))
    and (own_build_also is null
      or (public.valid_build(own_build_also) and own_build is not null and own_build_also <> own_build))
  );

-- The closeness scale matching uses, in an order where neighbours are alike.
delete from halal_mode_private.criterion_scale where criterion = 'build';
insert into halal_mode_private.criterion_scale (criterion, value, position) values
  ('build', 'Slim', 1), ('build', 'Athletic', 2), ('build', 'Muscular', 3), ('build', 'Average', 4),
  ('build', 'Curvy', 5), ('build', 'Stocky', 6), ('build', 'Full-Figured', 7);

-- Saving: the second answer, and only known values.
do $$
declare
  v_def text;
  procedure_parts text[][] := array[
    array['''own_height_cm'', ''own_weight_kg'', ''own_build'',', '''own_height_cm'', ''own_weight_kg'', ''own_build'', ''own_build_also'','],
    array['v_own_build text;', 'v_own_build text; v_own_build_also text;'],
    array['own_build = v_own_build,', 'own_build = v_own_build, own_build_also = v_own_build_also,']
  ];
  v_anchor text := $a$v_own_build := case when p_patch ? 'own_build' then nullif(left(trim(p_patch->>'own_build'), 60), '') else v_current.own_build end;$a$;
  i int;
begin
  select pg_get_functiondef('public.update_my_private_preferences'::regproc) into v_def;
  if position('own_build_also' in v_def) > 0 then return; end if;
  for i in 1 .. array_length(procedure_parts, 1) loop
    if position(procedure_parts[i][1] in v_def) = 0 then
      raise exception 'update_my_private_preferences: anchor % not found', procedure_parts[i][1];
    end if;
    v_def := replace(v_def, procedure_parts[i][1], procedure_parts[i][2]);
  end loop;
  if position(v_anchor in v_def) = 0 then
    raise exception 'update_my_private_preferences: own_build anchor not found';
  end if;
  v_def := replace(v_def, v_anchor, v_anchor || E'\n  '
    || $b$v_own_build_also := case when p_patch ? 'own_build_also' then nullif(left(trim(p_patch->>'own_build_also'), 60), '') else v_current.own_build_also end;$b$);
  execute v_def;
end;
$$;

-- Filters: a body-type filter is met by either of a member's answers.
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.passes_criteria'::regproc) into v_def;
  if position('own_build_also' in v_def) = 0 then
    if position('and not (s_prefs.own_build = any (v.preferred_builds)) then' in v_def) = 0 then
      raise exception 'passes_criteria: build anchor not found';
    end if;
    v_def := replace(v_def, 'and not (s_prefs.own_build = any (v.preferred_builds)) then',
      'and not (s_prefs.own_build = any (v.preferred_builds) or coalesce(s_prefs.own_build_also = any (v.preferred_builds), false)) then');
    execute v_def;
  end if;

  select pg_get_functiondef('halal_mode_private.most_restrictive_must_have'::regproc) into v_def;
  if position('own_build_also' in v_def) = 0 then
    if position('and not (pp.own_build = any (v.preferred_builds));' in v_def) = 0 then
      raise exception 'most_restrictive_must_have: build anchor not found';
    end if;
    v_def := replace(v_def, 'and not (pp.own_build = any (v.preferred_builds));',
      'and not (pp.own_build = any (v.preferred_builds) or coalesce(pp.own_build_also = any (v.preferred_builds), false));');
    execute v_def;
  end if;

  select pg_get_functiondef('halal_mode_private.matching_shortlist_batch_edges'::regproc) into v_def;
  if position('own_build_also' in v_def) = 0 then
    if position('coalesce(live_profile.tier = ''premium'', false) as is_premium' in v_def) = 0
       or position('or female.own_build is null or female.own_build = any(male.preferred_builds))' in v_def) = 0
       or position('or male.own_build is null or male.own_build = any(female.preferred_builds))' in v_def) = 0 then
      raise exception 'matching_shortlist_batch_edges: build anchors not found';
    end if;
    -- Read live, like the madhhab: the snapshot table predates the column.
    v_def := replace(v_def, 'coalesce(live_profile.tier = ''premium'', false) as is_premium',
      'coalesce(live_profile.tier = ''premium'', false) as is_premium,' || E'\n      ' || 'live_preferences.own_build_also');
    v_def := replace(v_def, 'or female.own_build is null or female.own_build = any(male.preferred_builds))',
      'or female.own_build is null or female.own_build = any(male.preferred_builds)'
      || E'\n        ' || 'or coalesce(female.own_build_also = any(male.preferred_builds), false))');
    v_def := replace(v_def, 'or male.own_build is null or male.own_build = any(female.preferred_builds))',
      'or male.own_build is null or male.own_build = any(female.preferred_builds)'
      || E'\n        ' || 'or coalesce(male.own_build_also = any(female.preferred_builds), false))');
    execute v_def;
  end if;
end;
$$;
