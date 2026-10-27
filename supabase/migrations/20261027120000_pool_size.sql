-- How many people can this member be introduced to?
--
-- Every hard rule (location and relocation, marital status, age, height and
-- the other Must have filters, Premium filters) narrows who a member can be
-- shown. With few members in each city, a narrow set of choices can leave
-- someone with nobody. get_my_pool_size() answers "about how many people match
-- my choices right now", so the app can show it next to the choices and the
-- operator can see it from the first day.
--
-- It restates the hard rules of matching_shortlist_batch_edges for one member,
-- from live data. It is an estimate for the member, never a promise: the daily
-- round also rotates people already shown and applies exposure limits.

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
  coalesce((
    select array_agg(lower(btrim(c))) from unnest(coalesce(pp.preferred_countries, '{}'::text[])) as c
  ), '{}'::text[]) as preferred_country_keys,
  coalesce(pp.accepted_marital_statuses, array['never_married', 'divorced', 'widowed']::text[]) as accepted_marital_statuses,
  coalesce(pp.must_have, '{}'::jsonb) as must_have
from public.profiles p
join public.private_preferences pp on pp.user_id = p.id;
revoke all on halal_mode_private.member_matching_facts from public, anon, authenticated;

-- One direction: does `a` accept `b` under a's own hard rules?
create or replace function halal_mode_private.member_accepts(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select coalesce((
    select
      b.marital_status is not null and b.marital_status = any(a.accepted_marital_statuses)
      and (coalesce(a.must_have ->> 'age', 'false') <> 'true' or b.age between a.min_age and a.max_age)
      and (coalesce(a.must_have ->> 'height', 'false') <> 'true' or b.own_height_cm is null
           or b.own_height_cm between a.min_height_cm and a.max_height_cm)
      and (not (coalesce(a.must_have ->> 'build', 'false') = 'true' and a.is_premium)
           or cardinality(a.preferred_builds) = 0 or b.own_build is null
           or b.own_build = any(a.preferred_builds)
           or coalesce(b.own_build_also = any(a.preferred_builds), false))
      and (not (coalesce(a.must_have ->> 'practice', 'false') = 'true' and a.is_premium)
           or cardinality(a.preferred_practice) = 0 or b.religious_practice = any(a.preferred_practice))
      and (not (coalesce(a.must_have ->> 'timeline', 'false') = 'true' and a.is_premium)
           or cardinality(a.desired_timeline) = 0 or b.timeline = any(a.desired_timeline))
      and (not (coalesce(a.must_have ->> 'children', 'false') = 'true' and a.is_premium)
           or cardinality(a.desired_family_goals) = 0 or b.family_goals = any(a.desired_family_goals))
      and (coalesce(a.must_have ->> 'sect', 'false') <> 'true'
           or halal_mode_private.sect_allows(a.preferred_sects, a.preferred_sect_details, b.sect, b.sect_detail))
      and (a.country_key = b.country_key
           or (a.relocation in ('open', 'willing_abroad')
               and (cardinality(a.preferred_country_keys) = 0 or b.country_key = any(a.preferred_country_keys))))
      and halal_mode_private.premium_filters_allow(a.id, b.id)
    from halal_mode_private.member_matching_facts a, halal_mode_private.member_matching_facts b
    where a.id = p_a and b.id = p_b
  ), false);
$function$;
revoke all on function halal_mode_private.member_accepts(uuid, uuid) from public, anon, authenticated;

create or replace function halal_mode_private.pool_size_for(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  with me as (select * from halal_mode_private.member_matching_facts where id = p_user)
  select count(*)::int
  from halal_mode_private.member_matching_facts them, me
  where them.id <> me.id
    and them.gender <> me.gender
    and me.marital_status is not null
    and exists (
      select 1 from public.profiles tp
      where tp.id = them.id and tp.onboarding_complete and not tp.is_paused
        and public.profile_is_ready_for_matching(tp.id)
    )
    and halal_mode_private.member_accepts(me.id, them.id)
    and halal_mode_private.member_accepts(them.id, me.id)
    -- People who live close enough, when either of you made distance a must.
    and (
      me.country_key <> them.country_key
      or (
        me.latitude is not null and me.longitude is not null
        and them.latitude is not null and them.longitude is not null
        and (
          (coalesce(me.must_have ->> 'distance', 'false') <> 'true' and coalesce(them.must_have ->> 'distance', 'false') <> 'true')
          or 6371 * acos(least(1, greatest(-1,
              cos(radians(me.latitude)) * cos(radians(them.latitude))
                * cos(radians(them.longitude) - radians(me.longitude))
              + sin(radians(me.latitude)) * sin(radians(them.latitude))))) <=
             least(
               case when coalesce(me.must_have ->> 'distance', 'false') = 'true' then me.max_distance_km else 1e9 end,
               case when coalesce(them.must_have ->> 'distance', 'false') = 'true' then them.max_distance_km else 1e9 end)
        )
      )
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = me.id and b.blocked_id = them.id) or (b.blocker_id = them.id and b.blocked_id = me.id)
    )
    and not exists (
      select 1 from public.connections c
      where c.user_a = least(me.id, them.id) and c.user_b = greatest(me.id, them.id)
    );
$function$;
revoke all on function halal_mode_private.pool_size_for(uuid) from public, anon, authenticated;

create or replace function public.get_my_pool_size()
returns integer
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select halal_mode_private.pool_size_for(auth.uid()) where auth.uid() is not null;
$function$;
revoke all on function public.get_my_pool_size() from public, anon;
grant execute on function public.get_my_pool_size() to authenticated;
