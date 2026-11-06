-- Where a member is looking: the countries they chose, and nothing else.
--
-- Wanting someone from another country is not the same as being willing to move, so this has nothing
-- to do with `relocation`, which shows on profiles and feeds compatibility. Choosing nobody's country
-- means your own, so nobody is shown anyone abroad unless they asked. Both people must have chosen each
-- other's country. Your own is an ordinary choice, so you can leave it out.

-- The list used to mean "abroad, as well as home", so existing lists keep home.
update public.private_preferences pp
set preferred_countries = pp.preferred_countries || p.country
from public.profiles p
where p.id = pp.user_id
  and cardinality(coalesce(pp.preferred_countries, '{}')) > 0
  and nullif(btrim(p.country), '') is not null
  and not exists (
    select 1 from unnest(pp.preferred_countries) chosen
    where lower(btrim(chosen)) = lower(btrim(p.country))
  );

create or replace view halal_mode_private.member_matching_facts as
select
  p.id,
  p.gender::text as gender,
  p.marital_status,
  lower(btrim(p.country)) as country_key,
  p.relocation::text as relocation,
  p.latitude,
  p.longitude,
  p.sect,
  p.sect_detail,
  (p.tier = 'premium') as is_premium,
  extract(year from age(p.birth_date))::int as age,
  p.religious_practice::text as religious_practice,
  p.timeline::text as timeline,
  p.family_goals::text as family_goals,
  pp.min_age, pp.max_age, pp.min_height_cm, pp.max_height_cm, pp.own_height_cm,
  pp.preferred_builds, pp.own_build, pp.own_build_also,
  pp.preferred_practice::text[] as preferred_practice,
  pp.desired_timeline::text[] as desired_timeline,
  pp.desired_family_goals::text[] as desired_family_goals,
  pp.preferred_sects, pp.preferred_sect_details, pp.max_distance_km,
  coalesce(
    (select array_agg(lower(btrim(c))) from unnest(pp.preferred_countries) as c),
    array[lower(btrim(p.country))]
  ) as preferred_country_keys,
  coalesce(pp.accepted_marital_statuses, array['never_married', 'divorced', 'widowed']::text[]) as accepted_marital_statuses,
  coalesce(pp.must_have, '{}'::jsonb) as must_have,
  p.has_children,
  nullif(p.occupation, '') as occupation,
  p.education,
  p.religious_dress,
  coalesce(p.languages_spoken, '{}') as languages_spoken,
  coalesce(p.ethnicities, '{}') as ethnicities,
  coalesce(p.heritage_countries, '{}') as heritage_countries,
  coalesce(p.grew_up_countries, '{}') as grew_up_countries,
  coalesce(p.diet, '{}') as diet,
  coalesce(pp.premium_must_have, '{}'::jsonb) as premium_must_have,
  coalesce(pp.preferred_has_children, '{}') as preferred_has_children,
  coalesce(pp.preferred_occupations, '{}') as preferred_occupations,
  coalesce(pp.preferred_languages, '{}') as preferred_languages,
  coalesce(pp.preferred_education, '{}') as preferred_education,
  coalesce(pp.preferred_dress, '{}') as preferred_dress,
  coalesce(pp.preferred_ethnicities, '{}') as preferred_ethnicities,
  coalesce(pp.preferred_heritage_countries, '{}') as preferred_heritage_countries,
  coalesce(pp.preferred_grew_up_countries, '{}') as preferred_grew_up_countries,
  coalesce(pp.preferred_diet, '{}') as preferred_diet
from public.profiles p
join public.private_preferences pp on pp.user_id = p.id;
revoke all on halal_mode_private.member_matching_facts from public, anon, authenticated;

-- One direction: does `a` accept `b` under a's own hard rules? `p_relax` asks the
-- same question with one of a's must-haves switched off, which is how a member can
-- be told which of their choices is costing them the most.
--
-- This takes the two members' rows rather than their ids and reads nothing else, so
-- a query can load everyone once and test thousands of pairs for almost nothing.
create function halal_mode_private.accepts_row(
  a halal_mode_private.member_matching_facts,
  b halal_mode_private.member_matching_facts,
  p_relax text
)
returns boolean
language sql
stable
set search_path = public, halal_mode_private
as $function$
  select coalesce(
    b.marital_status is not null and b.marital_status = any(a.accepted_marital_statuses)
    and (p_relax is not distinct from 'age' or coalesce(a.must_have ->> 'age', 'false') <> 'true' or b.age between a.min_age and a.max_age)
    and (p_relax is not distinct from 'height' or coalesce(a.must_have ->> 'height', 'false') <> 'true' or b.own_height_cm is null
         or b.own_height_cm between a.min_height_cm and a.max_height_cm)
    and (p_relax is not distinct from 'build' or coalesce(a.must_have ->> 'build', 'false') <> 'true'
         or cardinality(a.preferred_builds) = 0 or b.own_build is null
         or b.own_build = any(a.preferred_builds)
         or coalesce(b.own_build_also = any(a.preferred_builds), false))
    and (p_relax is not distinct from 'practice' or not (coalesce(a.must_have ->> 'practice', 'false') = 'true' and a.is_premium)
         or cardinality(a.preferred_practice) = 0 or coalesce(b.religious_practice = any(a.preferred_practice), false))
    and (p_relax is not distinct from 'timeline' or not (coalesce(a.must_have ->> 'timeline', 'false') = 'true' and a.is_premium)
         or cardinality(a.desired_timeline) = 0 or coalesce(b.timeline = any(a.desired_timeline), false))
    and (p_relax is not distinct from 'children' or not (coalesce(a.must_have ->> 'children', 'false') = 'true' and a.is_premium)
         or cardinality(a.desired_family_goals) = 0 or coalesce(b.family_goals = any(a.desired_family_goals), false))
    and (p_relax is not distinct from 'sect' or coalesce(a.must_have ->> 'sect', 'false') <> 'true'
         or halal_mode_private.sect_allows(a.preferred_sects, a.preferred_sect_details, b.sect, b.sect_detail))
    -- A must-have distance is a must-have wherever the other person lives, so a
    -- neighbour across a border counts and someone on another continent does not.
    -- Unknown coordinates are not near.
    and (p_relax is not distinct from 'distance' or coalesce(a.must_have ->> 'distance', 'false') <> 'true'
         or coalesce(public.distance_km(a.latitude, a.longitude, b.latitude, b.longitude) <= a.max_distance_km, false))
    and (p_relax is not distinct from 'countries' or b.country_key = any(a.preferred_country_keys))
    -- Premium filters, which only a Premium member has.
    and (not a.is_premium or (
      (coalesce(a.premium_must_have ->> 'has_children', 'false') <> 'true' or cardinality(a.preferred_has_children) = 0
        or b.has_children is null or b.has_children = 'prefer_not_to_say' or b.has_children = any(a.preferred_has_children))
      and (coalesce(a.premium_must_have ->> 'occupations', 'false') <> 'true' or cardinality(a.preferred_occupations) = 0
        or b.occupation is null or b.occupation = any(a.preferred_occupations))
      and (coalesce(a.premium_must_have ->> 'languages', 'false') <> 'true' or cardinality(a.preferred_languages) = 0
        or cardinality(b.languages_spoken) = 0 or b.languages_spoken && a.preferred_languages)
      and (coalesce(a.premium_must_have ->> 'education', 'false') <> 'true' or cardinality(a.preferred_education) = 0
        or b.education is null or b.education = any(a.preferred_education))
      and (coalesce(a.premium_must_have ->> 'dress', 'false') <> 'true' or cardinality(a.preferred_dress) = 0
        or b.religious_dress is null or b.religious_dress = any(a.preferred_dress))
      and (coalesce(a.premium_must_have ->> 'ethnicities', 'false') <> 'true' or cardinality(a.preferred_ethnicities) = 0
        or cardinality(b.ethnicities) = 0 or 'prefer_not_to_say' = any(b.ethnicities) or b.ethnicities && a.preferred_ethnicities)
      and (coalesce(a.premium_must_have ->> 'heritage', 'false') <> 'true' or cardinality(a.preferred_heritage_countries) = 0
        or cardinality(b.heritage_countries) = 0 or 'prefer_not_to_say' = any(b.heritage_countries) or b.heritage_countries && a.preferred_heritage_countries)
      and (coalesce(a.premium_must_have ->> 'grew_up', 'false') <> 'true' or cardinality(a.preferred_grew_up_countries) = 0
        or cardinality(b.grew_up_countries) = 0 or b.grew_up_countries && a.preferred_grew_up_countries)
      and (coalesce(a.premium_must_have ->> 'diet', 'false') <> 'true' or cardinality(a.preferred_diet) = 0
        or cardinality(b.diet) = 0 or b.diet && a.preferred_diet)
    )),
    false
  );
$function$;
revoke all on function halal_mode_private.accepts_row(halal_mode_private.member_matching_facts, halal_mode_private.member_matching_facts, text) from public, anon, authenticated;

create or replace function halal_mode_private.member_accepts(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select coalesce((
    select halal_mode_private.accepts_row(a, b, null)
    from halal_mode_private.member_matching_facts a, halal_mode_private.member_matching_facts b
    where a.id = p_a and b.id = p_b
  ), false);
$function$;
