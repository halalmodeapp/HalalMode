begin;
set local search_path = public, extensions;
select plan(4);

select ok(
  not has_function_privilege('authenticated', 'public.profile_is_ready_for_matching(uuid)', 'EXECUTE'),
  'members cannot invoke the matching-readiness helper directly'
);
select ok(
  position('length(trim(p.bio)) >= 50' in pg_get_functiondef('public.profile_is_ready_for_matching(uuid)'::regprocedure)) > 0
    and position('cardinality(p.photos) >= 1' in pg_get_functiondef('public.profile_is_ready_for_matching(uuid)'::regprocedure)) > 0,
  'readiness requires a substantive bio and photo'
);
select ok(
  position('matching_preferences_completed_at' in pg_get_functiondef('public.profile_is_ready_for_matching(uuid)'::regprocedure)) = 0
    and position('ethnicities' in pg_get_functiondef('public.profile_is_ready_for_matching(uuid)'::regprocedure)) = 0,
  'readiness asks only for name, location, a bio and a photo: the optional answers wait for a match'
);
select ok(
  position('not profile_is_ready_for_matching(auth.uid())' in pg_get_functiondef('public.get_current_round()'::regprocedure)) > 0,
  'an older, existing round is not exposed to an incomplete profile'
);

select * from finish();
rollback;
