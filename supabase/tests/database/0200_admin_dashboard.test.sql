begin;
set local search_path = public, extensions, halal_mode_private;
select plan(16);

select ok(
  has_function_privilege('authenticated', 'public.admin_session()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.admin_overview()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_overview()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_set_matching_metric(text, boolean, numeric, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_queue_luna_backfill(integer, text)', 'EXECUTE'),
  'the dashboard RPCs need a signed-in session, and check the admin list themselves'
);
select ok(
  not has_table_privilege('authenticated', 'halal_mode_private.admin_members', 'SELECT')
  and not has_table_privilege('authenticated', 'halal_mode_private.admin_audit_log', 'SELECT')
  and not has_table_privilege('authenticated', 'halal_mode_private.admin_audit_log', 'INSERT'),
  'members cannot read the admin list or the audit log, or write to it'
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000020001', 'pgtap.admin.owner@example.test'),
  ('00000000-0000-0000-0000-000000020002', 'pgtap.admin.viewer@example.test'),
  ('00000000-0000-0000-0000-000000020003', 'pgtap.admin.member@example.test');
insert into halal_mode_private.admin_members (user_id, role, note) values
  ('00000000-0000-0000-0000-000000020001', 'owner', 'Owner'),
  ('00000000-0000-0000-0000-000000020002', 'viewer', null);

-- An ordinary member.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020003","role":"authenticated","aal":"aal2"}', true);
select is(public.admin_session(), '{"admin": false}'::jsonb, 'a member learns only that they are not an admin');
select throws_ok($$ select public.admin_overview() $$, '42501', 'This account is not an administrator',
  'and cannot read the dashboard, even with two-factor sign-in');

-- An admin who has not completed two-factor sign-in.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020001","role":"authenticated","aal":"aal1"}', true);
select is(public.admin_session()->>'mfa', 'false', 'the page is told two-factor sign-in is still needed');
select throws_ok($$ select public.admin_overview() $$, '42501', 'Complete two-factor sign-in to continue',
  'an admin without two-factor sign-in reads nothing');

-- A read-only admin.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020002","role":"authenticated","aal":"aal2"}', true);
select ok(public.admin_overview() ?& array['waitlist', 'referrals', 'members', 'matching', 'signals', 'luna', 'mail', 'safety', 'audit'],
  'a viewer with two-factor sign-in sees every section');
select ok(public.admin_overview()::text not like '%@%', 'the overview never includes an email address');
select is(jsonb_array_length(public.admin_overview()->'signals'->'distribution'), 10,
  'reception is shown as ten anonymous bands');
select throws_ok(
  $$ select public.admin_set_matching_metric('bio_attention', false, 0.1, 'testing a viewer') $$,
  '42501', 'Only an owner can change settings', 'a viewer cannot change settings');

-- The owner.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020001","role":"authenticated","aal":"aal2"}', true);
select is(public.admin_set_matching_metric('bio_attention', false, 0.12, 'pausing bio timing')->>'changed', 'true',
  'the owner can switch a signal off and reweight it');
select ok(
  (select not enabled and weight = 0.12 from halal_mode_private.matching_signal_metric_config where metric_key = 'bio_attention')
  and exists (
    select 1 from halal_mode_private.admin_audit_log
    where action = 'matching_metric.set' and detail->>'metric' = 'bio_attention'
      and detail->'before'->>'enabled' = 'true' and detail->'after'->>'enabled' = 'false'
      and detail->>'reason' = 'pausing bio timing'
  ),
  'the change is applied and audited with the previous value for rollback'
);
select throws_ok(
  $$ select public.admin_set_matching_metric('reception_similarity', true, 0.5, 'too strong') $$,
  '22023', null, 'reception similarity cannot be raised into a score band');
select throws_ok(
  $$ select public.admin_queue_luna_backfill(10, 'yes') $$,
  '22023', 'Type QUEUE to confirm', 'a Luna backfill needs the exact confirmation');
select throws_ok(
  $$ select public.admin_queue_luna_backfill(10, 'QUEUE') $$,
  '55000', null, 'and Luna must be switched on first');

select set_config('request.jwt.claims', '', true);
select throws_ok(
  $$ update halal_mode_private.admin_audit_log set action = 'rewritten' $$,
  '42501', 'The admin audit log is append-only', 'audit history cannot be rewritten');

select * from finish();
rollback;
