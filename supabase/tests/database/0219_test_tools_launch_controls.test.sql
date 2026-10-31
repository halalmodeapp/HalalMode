begin;
set local search_path = public, extensions, halal_mode_private;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000021901', 'owner-219@example.test'),
  ('00000000-0000-0000-0000-000000021902', 'tester-219@example.test'),
  ('00000000-0000-0000-0000-000000021903', 'a-219@example.test'),
  ('00000000-0000-0000-0000-000000021904', 'b-219@example.test'),
  ('00000000-0000-0000-0000-000000021905', 'c-219@example.test'),
  ('00000000-0000-0000-0000-000000021906', 'd-219@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, onboarding_complete)
select id, 'P', 'P', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', true from auth.users where email like '%-219@example.test';
insert into halal_mode_private.admin_members (user_id, role) values ('00000000-0000-0000-0000-000000021901', 'owner');
insert into halal_mode_private.release_flag_members (key, user_id)
values ('tester_tools', '00000000-0000-0000-0000-000000021902');

-- A tester can switch their own Premium on while the flag is on...
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000021902","role":"authenticated"}', true);
select lives_ok($$select set_my_test_premium(true)$$, 'a tester can switch their own Premium on while the switch is on');
select ok((get_my_sample_members() ->> 'premiumSwitch')::boolean, 'and the app is told the switch exists');

-- ...and not once it is turned off (the launch switch).
select set_config('request.jwt.claims', '', true);
update halal_mode_private.release_flags set enabled = false where key = 'tester_premium_switch';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000021902","role":"authenticated"}', true);
select throws_ok($$select set_my_test_premium(true)$$, '42501', null, 'with the switch off a tester can no longer give themselves Premium');
select ok(not (get_my_sample_members() ->> 'premiumSwitch')::boolean, 'and the app is told to hide it');

-- Adding test accounts stops at three besides the owners.
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000021901', 'role', 'authenticated', 'aal', 'aal2',
    'amr', jsonb_build_array(
      jsonb_build_object('method', 'oauth', 'timestamp', extract(epoch from now())::bigint - 3600),
      jsonb_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 30))
  )::text, true);
$$;
select pg_temp.as_owner();
select admin_set_test_account('a-219@example.test', true, 'second tester');
select admin_set_test_account('b-219@example.test', true, 'third tester');
select throws_ok($$select admin_set_test_account('d-219@example.test', true, 'one too many')$$, '22023', null,
  'a fourth account besides the existing tester and the owners is refused');
select lives_ok($$select admin_set_test_account('a-219@example.test', true, 'already on the team')$$,
  'but an account already on the team can be switched on again');

select * from finish();
rollback;
