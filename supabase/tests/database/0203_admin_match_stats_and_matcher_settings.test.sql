begin;
set local search_path = public, extensions, halal_mode_private;
select plan(10);

select ok(
  not has_function_privilege('anon', 'public.admin_match_stats(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_matcher_settings()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_set_matcher_setting(text, numeric, text)', 'EXECUTE'),
  'match stats and matcher settings are closed to signed-out callers'
);

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-000000020301', 'pgtap.matcher.owner@example.test', now()),
  ('00000000-0000-0000-0000-000000020302', 'pgtap.matcher.viewer@example.test', now());
insert into halal_mode_private.admin_members (user_id, role, note) values
  ('00000000-0000-0000-0000-000000020301', 'owner', 'Owner'),
  ('00000000-0000-0000-0000-000000020302', 'viewer', 'Viewer');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020302","role":"authenticated","aal":"aal2"}', true);
select ok(public.admin_match_stats(30) ?& array['shown', 'picks', 'matches', 'one_sided_picks', 'picked_by_nobody', 'picked_not_matched', 'waiting', 'by_gender'],
  'a viewer sees match stats');
select ok(public.admin_match_stats(30)::text not like '%@%', 'with no email addresses');
select ok(jsonb_array_length(public.admin_matcher_settings()->'settings') > 0, 'and the changeable matcher settings');
select throws_ok($$ select public.admin_set_matcher_setting('no_match_boost_weight', 0.3, 'more help for waiting members') $$,
  '42501', 'Only an owner can change settings', 'but cannot change them');

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '00000000-0000-0000-0000-000000020301', 'role', 'authenticated', 'aal', 'aal2',
  'amr', jsonb_build_array(jsonb_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 60))
)::text, true);
select throws_ok($$ select public.admin_set_matcher_setting('p_min', 0.1, 'not on the list') $$,
  '22023', 'That matcher setting cannot be changed here', 'only listed settings can change');
select throws_ok($$ select public.admin_set_matcher_setting('no_match_boost_weight', 0.9, 'too much') $$,
  '22023', null, 'and only within safe ranges');

select lives_ok($$ select public.admin_set_matcher_setting('no_match_boost_weight', 0.31, 'more help for waiting members') $$,
  'an owner can change a listed setting');
select ok(
  (select count(*) from halal_mode_private.matching_config where activated_at is not null) = 1
  and (halal_mode_private.active_matching_config() ->> 'no_match_boost_weight')::numeric = 0.31,
  'as a new, single active matcher version'
);
select ok(exists (
  select 1 from halal_mode_private.admin_audit_log
  where action = 'matcher.set' and detail->>'setting' = 'no_match_boost_weight' and detail->>'reason' = 'more help for waiting members'
), 'and the change is in the activity log');

select * from finish();
rollback;
