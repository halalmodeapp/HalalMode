begin;
set local search_path = public, extensions, halal_mode_private;
select plan(14);

select ok(
  not has_function_privilege('anon', 'public.admin_review_queue(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_suspicious_members(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_find_member(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_subscriptions()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_system_health()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.apply_admin_member_action_service(uuid, text, uuid, text)', 'EXECUTE'),
  'trust & safety, subscriptions and system health are closed to signed-out callers'
);

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-000000020401', 'pgtap.ts.owner@example.test', now()),
  ('00000000-0000-0000-0000-000000020402', 'pgtap.ts.viewer@example.test', now()),
  ('00000000-0000-0000-0000-000000020403', 'pgtap.ts.a@example.test', now()),
  ('00000000-0000-0000-0000-000000020404', 'pgtap.ts.b@example.test', now()),
  ('00000000-0000-0000-0000-000000020405', 'pgtap.ts.suspect@example.test', now());
insert into halal_mode_private.admin_members (user_id, role, note) values
  ('00000000-0000-0000-0000-000000020401', 'owner', 'Owner'),
  ('00000000-0000-0000-0000-000000020402', 'viewer', 'Viewer');
insert into public.profiles (id, name, first_name, birth_date, gender, city, country, bio) values
  ('00000000-0000-0000-0000-000000020403', 'A Member', 'Amal', '1992-01-01', 'female', 'Leeds', 'United Kingdom', ''),
  ('00000000-0000-0000-0000-000000020404', 'B Member', 'Bushra', '1993-01-01', 'female', 'York', 'United Kingdom', ''),
  ('00000000-0000-0000-0000-000000020405', 'Suspect Member', 'Sam', '1990-01-01', 'male', 'Hull', 'United Kingdom', 'Message me on whatsapp');
insert into public.reports (reporter_id, subject_id, reason, detail) values
  ('00000000-0000-0000-0000-000000020403', '00000000-0000-0000-0000-000000020405', 'fake_profile', 'Not a real person'),
  ('00000000-0000-0000-0000-000000020404', '00000000-0000-0000-0000-000000020405', 'harassment', null);
insert into halal_mode_private.moderation_queue (user_id, kind, ref, decided_at, decision, reason) values
  ('00000000-0000-0000-0000-000000020405', 'bio', 'Message me on whatsapp', now(), 'review', 'Looks like contact details.');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020403","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.admin_find_member('pgtap.ts.suspect@example.test') $$, '42501', null, 'a member cannot look anyone up');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020402","role":"authenticated","aal":"aal2"}', true);
select is(jsonb_array_length(public.admin_review_queue(50)), 1, 'a viewer sees items flagged for review');
select is(public.admin_review_queue(50)->0->>'text', 'Message me on whatsapp', 'with the bio text to judge');
select ok(
  (select s->'signs' ?& array['reported_by_several', 'reported_as_fake', 'contact_details_in_bio']
   from jsonb_array_elements(public.admin_suspicious_members(50)) s
   where s->>'user_id' = '00000000-0000-0000-0000-000000020405'),
  'a suspicious account shows each warning sign'
);
select is(public.admin_find_member('PgTap.TS.Suspect@example.test')->0->>'first_name', 'Sam', 'members are found by exact email');
select throws_ok($$ select public.admin_find_member('sam') $$, '22023', null, 'but not by partial names');
select ok(public.admin_subscriptions() ?& array['active', 'payment_problem', 'ended', 'revoked'], 'subscription counts are readable');
select ok(public.admin_system_health() ?& array['jobs', 'workers', 'push', 'email', 'matching', 'moderation'], 'system health is readable');
select throws_ok(
  $$ select public.admin_authorize_member_action('00000000-0000-0000-0000-000000020405', 'ban', 'fake account') $$,
  '42501', 'Only an owner can change settings', 'a viewer cannot ban');

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '00000000-0000-0000-0000-000000020401', 'role', 'authenticated', 'aal', 'aal2',
  'amr', jsonb_build_array(jsonb_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 60))
)::text, true);
select throws_ok(
  $$ select public.admin_authorize_member_action('00000000-0000-0000-0000-000000020402', 'ban', 'testing') $$,
  '22023', null, 'admins cannot be banned from the panel');
select is(public.admin_authorize_member_action('00000000-0000-0000-0000-000000020405', 'ban', 'fake account')->>'reason',
  'fake account', 'an owner may ban a member');
select is(public.admin_mark_reviewed((select id from halal_mode_private.moderation_queue where user_id = '00000000-0000-0000-0000-000000020405'), 'contact details, warned')->>'changed',
  'true', 'and mark a flagged item as reviewed');

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(public.apply_admin_member_action_service('00000000-0000-0000-0000-000000020405', 'ban',
  '00000000-0000-0000-0000-000000020401', 'fake account')->>'action', 'ban', 'the ban is applied and logged by the worker');

select * from finish();
rollback;
