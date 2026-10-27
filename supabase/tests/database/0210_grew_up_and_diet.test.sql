begin;
set local search_path = public, extensions, halal_mode_private;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000021001', 'diet-viewer@example.test'),
  ('00000000-0000-0000-0000-000000021002', 'diet-halal@example.test'),
  ('00000000-0000-0000-0000-000000021003', 'diet-vegan@example.test'),
  ('00000000-0000-0000-0000-000000021004', 'diet-blank@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude, onboarding_complete, tier)
values
  ('00000000-0000-0000-0000-000000021001', 'Viewer', 'Viewer', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true, 'premium'),
  ('00000000-0000-0000-0000-000000021002', 'Halal', 'Halal', '1991-01-01', 'female', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true, 'free'),
  ('00000000-0000-0000-0000-000000021003', 'Vegan', 'Vegan', '1991-01-01', 'female', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true, 'free'),
  ('00000000-0000-0000-0000-000000021004', 'Blank', 'Blank', '1991-01-01', 'female', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true, 'free');
insert into private_preferences (user_id)
select id from profiles where id::text like '00000000-0000-0000-0000-0000000210%';

-- ---------------------------------------------------------------- the member's own answers
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000021002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select set_my_lifestyle(array['PK', 'GB'], array['halal_only', 'vegetarian'])$$,
  'a member can say where they grew up and their diet');
select throws_ok($$select set_my_lifestyle(array['PK', 'GB', 'US'], '{}')$$, '22023', null, 'no more than two countries');
select throws_ok($$select set_my_lifestyle('{}', array['halal_only', 'sometimes_non_halal'])$$, '22023', null,
  'halal only and sometimes non-halal cannot both be chosen');
select throws_ok($$select set_my_lifestyle('{}', array['carnivore'])$$, '22023', null, 'an unknown diet is refused');
select lives_ok($$select set_my_lifestyle('{}', array['sometimes_non_halal', 'pescatarian', 'vegan'])$$,
  'every other combination is allowed');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000021003","role":"authenticated"}', true);
select lives_ok($$select set_my_lifestyle(array['EG'], array['vegan'])$$, 'a second member answers too');
reset role;

-- ---------------------------------------------------------------- what others see
select is(
  (select safe_member_profile(p) -> 'grewUpCountries' from profiles p where p.id = '00000000-0000-0000-0000-000000021003'),
  '["EG"]'::jsonb, 'where they grew up is on the profile others see');
select is(
  (select safe_member_profile(p) -> 'diet' from profiles p where p.id = '00000000-0000-0000-0000-000000021003'),
  '["vegan"]'::jsonb, 'their diet is on the profile others see');

-- ---------------------------------------------------------------- the Premium filters
update private_preferences
set preferred_diet = array['vegan'], preferred_grew_up_countries = array['EG'],
    premium_must_have = '{"diet": true, "grew_up": true}'::jsonb
where user_id = '00000000-0000-0000-0000-000000021001';
select ok(premium_filters_allow('00000000-0000-0000-0000-000000021001', '00000000-0000-0000-0000-000000021003'),
  'someone who shares the diet and the country is allowed');
select ok(not premium_filters_allow('00000000-0000-0000-0000-000000021001', '00000000-0000-0000-0000-000000021002'),
  'someone with a different diet is ruled out when the filter is a must-have');
select ok(premium_filters_allow('00000000-0000-0000-0000-000000021001', '00000000-0000-0000-0000-000000021004'),
  'someone who has not answered is never held against them');
update private_preferences set premium_must_have = '{}'::jsonb where user_id = '00000000-0000-0000-0000-000000021001';
select ok(premium_filters_allow('00000000-0000-0000-0000-000000021001', '00000000-0000-0000-0000-000000021002'),
  'without Must have, the filter rules nobody out');

select * from finish();
rollback;
