begin;

set local search_path = public, extensions;
select plan(11);

insert into auth.users (id, email) values (
  '00000000-0000-0000-0000-000000019101',
  'high-latitude-fajr@example.test'
);
insert into profiles (
  id, name, first_name, birth_date, gender, latitude, longitude
) values (
  '00000000-0000-0000-0000-000000019101',
  'Fajr Settings', 'Fajr', '1990-01-01', 'female', 55.95, -3.19
);

select is(
  (select high_latitude_fajr_method from profiles
   where id = '00000000-0000-0000-0000-000000019101'),
  'one_seventh',
  'existing and new profiles default to the simple one-seventh estimate'
);

select ok(
  has_function_privilege('authenticated', 'public.get_my_high_latitude_fajr_settings()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.set_my_high_latitude_fajr_method(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_my_high_latitude_fajr_settings()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.set_my_high_latitude_fajr_method(text)', 'EXECUTE')
  and not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'settings are changed through authenticated RPCs, not direct profile writes'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019101","role":"authenticated"}',
  true
);

select is(
  (select is_high_latitude from get_my_high_latitude_fajr_settings()),
  true,
  'the owner receives their high-latitude eligibility flag'
);

select is(
  (select latitude from get_my_high_latitude_fajr_settings()),
  55.95::double precision,
  'the owner receives their own saved latitude for the shared calculation'
);

select is(
  (select longitude from get_my_high_latitude_fajr_settings()),
  -3.19::double precision,
  'the owner receives their own saved longitude for the shared calculation'
);

select is(
  (select method from get_my_high_latitude_fajr_settings()),
  'one_seventh',
  'the owner can read their saved default method'
);

select lives_ok(
  $$ select set_my_high_latitude_fajr_method('reference_latitude_45') $$,
  'the owner can select the documented alternate method'
);

select is(
  (select high_latitude_fajr_method from profiles
   where id = '00000000-0000-0000-0000-000000019101'),
  'reference_latitude_45',
  'the selected method is persisted on the owner profile'
);

select throws_ok(
  $$ select set_my_high_latitude_fajr_method('unreviewed_method') $$,
  '22023',
  'Unsupported high-latitude Fajr method',
  'the setter rejects unsupported methods'
);

select ok(
  position(
    'high_latitude_fajr_method text' in pg_get_function_result(
      'public.members_awaiting_round_service()'::regprocedure
    )
  ) > 0
  and has_function_privilege('service_role', 'public.members_awaiting_round_service()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.members_awaiting_round_service()', 'EXECUTE'),
  'the service-only round scheduler receives the method without exposing its RPC'
);

select ok(
  position('nextFajrAt' in pg_get_functiondef('public.get_current_round_state()'::regprocedure)) > 0,
  'scheduled and completed states expose their authoritative Fajr instant'
);

select * from finish();
rollback;
