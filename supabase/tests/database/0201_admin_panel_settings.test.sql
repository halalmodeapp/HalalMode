begin;
set local search_path = public, extensions, halal_mode_private;
select plan(20);

select ok(
  not has_function_privilege('anon', 'public.admin_settings()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_set_release_flag(text, boolean, integer, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_add_member(text, text, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_remove_member(uuid, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'halal_mode_private.require_admin(boolean)', 'EXECUTE'),
  'settings, flags and team RPCs are closed to signed-out callers'
);

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-000000020101', 'pgtap.panel.owner@example.test', now()),
  ('00000000-0000-0000-0000-000000020102', 'pgtap.panel.helper@example.test', now()),
  ('00000000-0000-0000-0000-000000020103', 'pgtap.panel.member@example.test', now());
insert into halal_mode_private.admin_members (user_id, role, note) values
  ('00000000-0000-0000-0000-000000020101', 'owner', 'Owner');

create function pg_temp.as_owner(p_totp_age_seconds integer) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000020101', 'role', 'authenticated', 'aal', 'aal2',
    'amr', jsonb_build_array(
      jsonb_build_object('method', 'oauth', 'timestamp', extract(epoch from now())::bigint - 3600),
      jsonb_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - p_totp_age_seconds))
  )::text, true);
$$;

-- A member is refused everything.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020103","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.admin_settings() $$, '42501', null, 'a member cannot read settings');
select throws_ok($$ select public.admin_set_mail_daily_limit(500, 'not mine to change') $$, '42501', null,
  'or change one');

-- Step-up: an owner whose code is older than 15 minutes can read but not change.
select pg_temp.as_owner(3600);
select is(public.admin_session()->>'step_up_seconds', '0', 'the page is told changes are locked');
select ok(public.admin_settings() ?& array['flags', 'team', 'referral_link_base', 'mail_daily_limit'],
  'settings stay readable');
select throws_ok(
  $$ select public.admin_set_mail_daily_limit(500, 'raise the budget') $$,
  '42501', 'Confirm your authenticator code to make changes', 'changes need a fresh authenticator code');

select pg_temp.as_owner(30);
select ok((public.admin_session()->>'step_up_seconds')::integer between 800 and 900, 'a fresh code unlocks changes for 15 minutes');

-- Mail budget.
select is(public.admin_set_mail_daily_limit(500, 'raise the budget')->>'changed', 'true', 'the owner can set the mail budget');
select is((select daily_limit from halal_mode_private.mail_settings where id), 500, 'and it is saved');
select throws_ok($$ select public.admin_set_mail_daily_limit(5, 'too low') $$, '22023', null, 'with sane bounds');

-- Referral links stay on halalmo.de.
select throws_ok($$ select public.admin_set_referral_link_base('https://evil.example/?ref=', 'redirect invites') $$,
  '22023', null, 'referral links cannot point at another site');
select is(public.admin_set_referral_link_base('https://halalmo.de/app?ref=', 'launch routing')->>'changed', 'true',
  'but can move within halalmo.de');

-- Feature flags need the flag's own name as confirmation.
select throws_ok($$ select public.admin_set_release_flag('tester_tools', true, 10, 'yes', 'roll out to testers') $$,
  '22023', 'Type the flag name to confirm', 'a flag change needs its name typed');
select is(public.admin_set_release_flag('tester_tools', true, 10, 'tester_tools', 'roll out to testers')->>'changed', 'true',
  'and then applies');
select ok((select enabled and rollout_percentage = 10 from halal_mode_private.release_flags where key = 'tester_tools'),
  'the flag is saved');

-- Team.
select throws_ok($$ select public.admin_add_member('nobody@example.test', 'viewer', null, 'add a helper') $$,
  '22023', null, 'only existing accounts can be added');
select is(public.admin_add_member('PgTap.Panel.Helper@example.test', 'viewer', 'Helper', 'add a helper')->>'changed', 'true',
  'an existing account is added by email');
select throws_ok(
  $$ select public.admin_remove_member('00000000-0000-0000-0000-000000020101', 'leaving') $$,
  '22023', 'There must always be at least one owner', 'the last owner cannot be removed');

select ok(
  (select count(*) from halal_mode_private.admin_audit_log
   where actor_id = '00000000-0000-0000-0000-000000020101'
     and action in ('mail.daily_limit', 'referral.link_base', 'flag.set', 'team.add')) = 4,
  'every change is in the audit log'
);
select ok(
  (select bool_and(detail ? 'reason') from halal_mode_private.admin_audit_log
   where actor_id = '00000000-0000-0000-0000-000000020101'),
  'each with its reason'
);

select * from finish();
rollback;
