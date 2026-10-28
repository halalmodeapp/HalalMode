begin;
set local search_path = public, extensions, halal_mode_private;
select plan(5);

-- ---------------------------------------------------------------- the old email path is closed
select ok(
  not has_function_privilege('service_role', 'public.apply_report_action_service(uuid,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.apply_report_action_service(uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.apply_report_action_service(uuid,text)', 'EXECUTE'),
  'nobody can apply a report action without the admin panel');
select ok(
  not has_function_privilege('service_role', 'public.mail_link_secret_service()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.mail_link_secret_service()', 'EXECUTE'),
  'the report-link signing secret can no longer be read');

-- ---------------------------------------------------------------- the panel path still works and logs
select ok(
  has_function_privilege('service_role', 'public.apply_admin_report_action_service(uuid,text,uuid,text)', 'EXECUTE'),
  'report-action can still apply an admin decision');
select ok(
  position('admin_audit_log' in pg_get_functiondef(
    'public.apply_admin_report_action_service(uuid,text,uuid,text)'::regprocedure)) > 0,
  'every admin report decision writes the activity log');
select ok(
  position('admin_audit_log' in pg_get_functiondef(
    'public.apply_admin_member_action_service(uuid,text,uuid,text)'::regprocedure)) > 0,
  'every admin account action writes the activity log');

select * from finish();
rollback;
