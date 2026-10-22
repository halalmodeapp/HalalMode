begin;
set local search_path = public, extensions, halal_mode_private;
select plan(17);

-- ---------------------------------------------------------------- the country header
select set_config('request.headers', '{"cf-ipcountry":"gb"}', true);
select is(halal_mode_private.request_country_code(), 'GB', 'the gateway country is read and upper-cased');
select set_config('request.headers', '{"cf-ipcountry":"XX"}', true);
select is(halal_mode_private.request_country_code(), null, 'an unknown country is not recorded');
select set_config('request.headers', '{"cf-ipcountry":"T1"}', true);
select is(halal_mode_private.request_country_code(), null, 'Tor is not recorded');
select set_config('request.headers', '{"cf-ipcountry":"United Kingdom"}', true);
select is(halal_mode_private.request_country_code(), null, 'anything but two letters is not recorded');
select set_config('request.headers', '', true);
select is(halal_mode_private.request_country_code(), null, 'a request without the header records nothing');

-- ---------------------------------------------------------------- joining
select set_config('request.headers', '{"cf-ipcountry":"GB"}', true);
select public.join_waitlist_now('pgtap.origin.one@gmail.com', 'London', '25-29', 'en', null, 'Reddit/Paid/Wave1');
select is(
  (select country_code || ' ' || source from halal_mode_private.waitlist where email = 'pgtap.origin.one@gmail.com'),
  'GB reddit/paid/wave1', 'a sign-up keeps its country and a tidied source');

select public.join_waitlist_now('pgtap.origin.two@gmail.com', 'Leeds', '30-34', 'en', null, 'drop table; --');
select is(
  (select source from halal_mode_private.waitlist where email = 'pgtap.origin.two@gmail.com'),
  null, 'a source that is not a plain label is dropped, and the person still joins');
select is(
  (select country_code from halal_mode_private.waitlist where email = 'pgtap.origin.two@gmail.com'),
  'GB', 'whatever the source, the country is still recorded');

-- First touch only: a second sign-up from elsewhere changes nothing.
select set_config('request.headers', '{"cf-ipcountry":"US"}', true);
select public.join_waitlist_now('pgtap.origin.one@gmail.com', 'London', '25-29', 'en', null, 'other/source');
select is(
  (select country_code || ' ' || source from halal_mode_private.waitlist where email = 'pgtap.origin.one@gmail.com'),
  'GB reddit/paid/wave1', 'the first country and source stand');

-- A page still sending five arguments keeps working.
select lives_ok(
  $$ select public.join_waitlist_now('pgtap.origin.three@gmail.com', 'Leeds', '25-29', 'en', null) $$,
  'five arguments still join');
select is(
  (select country_code from halal_mode_private.waitlist where email = 'pgtap.origin.three@gmail.com'),
  'US', 'and still record the country');

select hasnt_function('public', 'join_waitlist_now', array['text', 'text', 'text', 'text', 'text'],
  'the five-argument version is gone, so a call can never be ambiguous');
select ok(
  has_function_privilege('anon', 'public.join_waitlist_now(text, text, text, text, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_waitlist_origins()', 'EXECUTE'),
  'anyone can join, but only a signed-in admin can read the totals');

-- ---------------------------------------------------------------- the admin totals
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000020601', 'pgtap.origin.admin@example.test'),
  ('00000000-0000-0000-0000-000000020602', 'pgtap.origin.member@example.test');
insert into halal_mode_private.admin_members (user_id, role, note) values
  ('00000000-0000-0000-0000-000000020601', 'viewer', null);

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020602","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.admin_waitlist_origins() $$, '42501', 'This account is not an administrator',
  'a member cannot read the totals');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020601","role":"authenticated","aal":"aal2"}', true);
select ok(
  (select (c->>'count')::integer >= 2 from jsonb_array_elements(public.admin_waitlist_origins()->'countries') c where c->>'country_code' = 'GB')
  and (select (s->>'count')::integer >= 1 from jsonb_array_elements(public.admin_waitlist_origins()->'sources') s where s->>'source' = 'reddit/paid/wave1'),
  'an admin sees sign-ups grouped by country and by source');
select ok(public.admin_waitlist_origins()::text not like '%@%', 'the totals never include an email address');

select * from finish();
rollback;
