begin;
set local search_path = public, extensions, halal_mode_private;
select plan(11);

select ok(
  not has_function_privilege('anon', 'public.admin_reports(text, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_authorize_report_action(uuid, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_signups(integer)', 'EXECUTE'),
  'reports and trends are closed to signed-out callers'
);

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-000000020201', 'pgtap.reports.owner@example.test', now()),
  ('00000000-0000-0000-0000-000000020202', 'pgtap.reports.viewer@example.test', now()),
  ('00000000-0000-0000-0000-000000020203', 'pgtap.reports.reporter@example.test', now()),
  ('00000000-0000-0000-0000-000000020204', 'pgtap.reports.subject@example.test', now());
insert into halal_mode_private.admin_members (user_id, role, note) values
  ('00000000-0000-0000-0000-000000020201', 'owner', 'Owner'),
  ('00000000-0000-0000-0000-000000020202', 'viewer', 'Viewer');
insert into public.profiles (id, name, first_name, birth_date, gender, city, country) values
  ('00000000-0000-0000-0000-000000020203', 'Reporter Member', 'Reporter', '1992-01-01', 'female', 'Leeds', 'United Kingdom'),
  ('00000000-0000-0000-0000-000000020204', 'Subject Member', 'Subject', '1990-01-01', 'male', 'York', 'United Kingdom');
insert into public.reports (id, reporter_id, subject_id, reason, detail) values
  ('00000000-0000-0000-0000-0000000202a1', '00000000-0000-0000-0000-000000020203', '00000000-0000-0000-0000-000000020204', 'harassment', 'Rude messages');

-- A member cannot read reports through the panel.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020203","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.admin_reports('open', 50) $$, '42501', null, 'a member cannot read reports');

-- A viewer can read, with the context needed to decide, but not act.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020202","role":"authenticated","aal":"aal2"}', true);
select is(jsonb_array_length(public.admin_reports('open', 50)), 1, 'a viewer sees the open report');
select is(public.admin_reports('open', 50)->0->'subject'->>'first_name', 'Subject', 'with who was reported');
select ok(public.admin_reports('open', 50)::text not like '%@%', 'and no email addresses');
select throws_ok(
  $$ select public.admin_authorize_report_action('00000000-0000-0000-0000-0000000202a1', 'ban', 'serious harassment') $$,
  '42501', 'Only an owner can change settings', 'a viewer cannot act on a report');
select is((public.admin_signups(30)->>'days')::integer, 30, 'sign-up trends cover the asked range');
select is(jsonb_array_length(public.admin_signups(3)->'rows'), 7, 'with at least a week');

-- The owner, with a fresh code.
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '00000000-0000-0000-0000-000000020201', 'role', 'authenticated', 'aal', 'aal2',
  'amr', jsonb_build_array(jsonb_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 60))
)::text, true);
select throws_ok(
  $$ select public.admin_authorize_report_action('00000000-0000-0000-0000-0000000202a1', 'ban', '') $$,
  '22023', null, 'acting on a report needs a reason');
select ok(public.admin_authorize_report_action('00000000-0000-0000-0000-0000000202a1', 'suspend', 'repeated harassment'),
  'the owner may act on an open report');
select ok(exists (
  select 1 from halal_mode_private.admin_audit_log
  where action = 'report.suspend' and detail->>'reason' = 'repeated harassment'
), 'and the decision is in the activity log');

select * from finish();
rollback;
