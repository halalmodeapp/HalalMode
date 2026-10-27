begin;
set local search_path = public, extensions, halal_mode_private;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000020901', 'marital-man@example.test'),
  ('00000000-0000-0000-0000-000000020902', 'marital-woman@example.test'),
  ('00000000-0000-0000-0000-000000020903', 'marital-settled@example.test'),
  ('00000000-0000-0000-0000-000000020904', 'marital-flipper@example.test'),
  ('00000000-0000-0000-0000-000000020905', 'marital-recent@example.test'),
  ('00000000-0000-0000-0000-000000020906', 'marital-dipper@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude, onboarding_complete)
select ids.id, 'Member ' || right(ids.id::text, 2), 'M' || right(ids.id::text, 2), '1990-01-01',
       case when right(ids.id::text, 2) = '02' then 'female' else 'male' end::gender,
       'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true
from (values
  ('00000000-0000-0000-0000-000000020901'::uuid), ('00000000-0000-0000-0000-000000020902'::uuid),
  ('00000000-0000-0000-0000-000000020903'::uuid), ('00000000-0000-0000-0000-000000020904'::uuid),
  ('00000000-0000-0000-0000-000000020905'::uuid), ('00000000-0000-0000-0000-000000020906'::uuid)
) as ids(id);
insert into private_preferences (user_id)
select id from profiles where id::text like '00000000-0000-0000-0000-0000000209%';

-- ---------------------------------------------------------------- the member's own calls
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000020901","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select set_my_marital_status('married')$$, 'a man can declare that he is currently married');
select is((select get_my_marital_settings() ->> 'status'), 'married', 'the declared status reads back');
select throws_ok($$select set_my_marital_status('engaged')$$, '22023', null, 'an unknown status is refused');
select throws_ok($$select set_my_marital_preferences(array['married'])$$, '22023', null, 'a man cannot be open to a married man');
select throws_ok($$select set_my_marital_preferences('{}')$$, '22023', null, 'at least one status must be chosen');
select lives_ok($$select set_my_marital_preferences(array['never_married', 'divorced'])$$, 'a man can choose who he is open to');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000020902","role":"authenticated"}', true);
select throws_ok($$select set_my_marital_status('married')$$, '22023', null, 'a woman cannot declare currently married');
select lives_ok($$select set_my_marital_status('divorced')$$, 'a woman can declare divorced');
select is(
  (select get_my_marital_settings() -> 'accepted'),
  '["never_married", "divorced", "widowed"]'::jsonb,
  'by default a woman is not open to a married man until she chooses it');
select lives_ok($$select set_my_marital_preferences(array['never_married', 'married'])$$,
  'a woman can choose to be open to a man who is already married');
reset role;

-- ---------------------------------------------------------------- what others see
select is(
  (select safe_member_profile(p) ->> 'maritalStatus' from profiles p where p.id = '00000000-0000-0000-0000-000000020902'),
  'divorced',
  'the declared status is on the profile others see');
select ok(
  not (select safe_member_profile(p)::text like '%accepted%' or safe_member_profile(p)::text like '%open to%'
       from profiles p where p.id = '00000000-0000-0000-0000-000000020902'),
  'the preferences never appear on a profile');

-- ---------------------------------------------------------------- matching and reports use it
select ok(
  position('male.marital_status = any(female.accepted_marital_statuses)'
    in pg_get_functiondef('halal_mode_private.matching_shortlist_batch_edges(uuid,uuid[],uuid[],timestamptz,integer)'::regprocedure)) > 0
  and position('female.marital_status = any(male.accepted_marital_statuses)'
    in pg_get_functiondef('halal_mode_private.matching_shortlist_batch_edges(uuid,uuid[],uuid[],timestamptz,integer)'::regprocedure)) > 0,
  'matching requires each status to be one the other is open to');
select ok(
  position('marital_status_mismatch' in pg_get_functiondef('public.report_connection_member(uuid,text)'::regprocedure)) > 0
  and position('marital_status_mismatch' in pg_get_functiondef('public.report_introduction_member(uuid,text)'::regprocedure)) > 0,
  'both report paths accept the marital-status reason');

-- ---------------------------------------------------------------- the admin alert
-- 20903: married 5 days, switched 2 days ago and stayed: alert.
-- 20904: flipped back and forth: no alert.
-- 20905: switched only 3 hours ago: not yet.
-- 20906: was married for one day only (dipping a toe): no alert.
delete from marital_status_log;
insert into marital_status_log (user_id, status, previous_status, changed_at) values
  ('00000000-0000-0000-0000-000000020903', 'married', null, now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000020903', 'never_married', 'married', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000020904', 'married', null, now() - interval '12 days'),
  ('00000000-0000-0000-0000-000000020904', 'never_married', 'married', now() - interval '11 days'),
  ('00000000-0000-0000-0000-000000020904', 'married', 'never_married', now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000020904', 'never_married', 'married', now() - interval '5 days'),
  ('00000000-0000-0000-0000-000000020905', 'married', null, now() - interval '9 days'),
  ('00000000-0000-0000-0000-000000020905', 'never_married', 'married', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000020906', 'married', null, now() - interval '4 days'),
  ('00000000-0000-0000-0000-000000020906', 'never_married', 'married', now() - interval '3 days');
-- 20906's married spell above is 1 day (4d to 3d ago).
select is(check_marital_status_changes(), 1, 'only the settled switch is flagged');
select is(
  (select array_agg(user_id::text) from moderation_queue where kind = 'marital'),
  array['00000000-0000-0000-0000-000000020903'],
  'it is the member who settled as married, then switched and stayed');
select is(check_marital_status_changes(), 0, 'the same case is not flagged twice');

select * from finish();
rollback;
