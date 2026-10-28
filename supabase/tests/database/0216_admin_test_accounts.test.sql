begin;
set local search_path = public, extensions, halal_mode_private;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000021601', 'owner-216@example.test'),
  ('00000000-0000-0000-0000-000000021602', 'tester-216@example.test'),
  ('00000000-0000-0000-0000-000000021603', 'member-216@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, onboarding_complete)
select id, 'P', 'P', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', true
from auth.users where email like '%-216@example.test';
insert into halal_mode_private.admin_members (user_id, role) values ('00000000-0000-0000-0000-000000021601', 'owner');

create function pg_temp.as_owner() returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000021601', 'role', 'authenticated', 'aal', 'aal2',
    'amr', jsonb_build_array(
      jsonb_build_object('method', 'oauth', 'timestamp', extract(epoch from now())::bigint - 3600),
      jsonb_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 30))
  )::text, true);
$$;

-- A member cannot manage test accounts.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000021603","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$select admin_list_test_accounts()$$, '42501', null, 'a member cannot list test accounts');
select throws_ok($$select admin_set_test_account('tester-216@example.test', true, 'because')$$, '42501', null, 'a member cannot add one');

-- An owner with a fresh code can, and must say why.
select pg_temp.as_owner();
select throws_ok($$select admin_set_test_account('tester-216@example.test', true, '')$$, '22023', null, 'a reason is required');
select lives_ok($$select admin_set_test_account('Tester-216@example.test', true, 'AI test account')$$, 'an owner adds a test account by email');
select ok((select (e ->> 'demo')::boolean from jsonb_array_elements(admin_list_test_accounts()) e where e ->> 'email' = 'tester-216@example.test'),
  'it has the tester tools and test mode on, which the list shows');
select throws_ok($$select admin_set_test_account('nobody-216@example.test', true, 'no such account')$$, 'P0002', null, 'an unknown email is refused');
select throws_ok($$select admin_remove_test_account('owner-216@example.test', 'not allowed')$$, '22023', null, 'an admin cannot lose the permission');

-- Switching it off is the same for an admin and a tester: the samples go, the permission stays.
select admin_set_test_account('tester-216@example.test', false, 'finished testing');
select admin_set_test_account('owner-216@example.test', false, 'finished testing');
select ok(not exists (select 1 from halal_mode_private.release_flag_members where key = 'demo_introductions' and user_id in
  ('00000000-0000-0000-0000-000000021602', '00000000-0000-0000-0000-000000021601'))
  and (select count(*) from halal_mode_private.release_flag_members where key = 'tester_tools' and user_id in
  ('00000000-0000-0000-0000-000000021602', '00000000-0000-0000-0000-000000021601')) = 2,
  'switching it off treats an admin and a tester alike');

select admin_remove_test_account('tester-216@example.test', 'no longer needed');
select ok(not exists (select 1 from halal_mode_private.release_flag_members where user_id = '00000000-0000-0000-0000-000000021602'),
  'removing a granted tester takes the permission away');

select * from finish();
rollback;
