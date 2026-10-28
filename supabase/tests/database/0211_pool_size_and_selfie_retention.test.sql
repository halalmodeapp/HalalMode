begin;
set local search_path = public, extensions, halal_mode_private;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000021101', 'pool-man@example.test'),
  ('00000000-0000-0000-0000-000000021102', 'pool-woman@example.test'),
  ('00000000-0000-0000-0000-000000021103', 'pool-married@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude, onboarding_complete, marital_status)
values
  ('00000000-0000-0000-0000-000000021101', 'Man', 'Man', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true, 'never_married'),
  ('00000000-0000-0000-0000-000000021102', 'Woman', 'Woman', '1992-01-01', 'female', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true, 'divorced'),
  ('00000000-0000-0000-0000-000000021103', 'Married', 'Married', '1988-01-01', 'male', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true, 'married');
insert into private_preferences (user_id, own_height_cm)
values ('00000000-0000-0000-0000-000000021101', 180), ('00000000-0000-0000-0000-000000021102', 165), ('00000000-0000-0000-0000-000000021103', 178);

-- ---------------------------------------------------------------- the hard rules, one direction at a time
select ok(member_accepts('00000000-0000-0000-0000-000000021101', '00000000-0000-0000-0000-000000021102'),
  'a man accepts a divorced woman by default');
select ok(member_accepts('00000000-0000-0000-0000-000000021102', '00000000-0000-0000-0000-000000021101'),
  'and she accepts a never-married man');
select ok(not member_accepts('00000000-0000-0000-0000-000000021102', '00000000-0000-0000-0000-000000021103'),
  'a woman does not accept a currently married man until she opts in');
update private_preferences set accepted_marital_statuses = array['never_married', 'divorced', 'widowed', 'married']
where user_id = '00000000-0000-0000-0000-000000021102';
select ok(member_accepts('00000000-0000-0000-0000-000000021102', '00000000-0000-0000-0000-000000021103'),
  'she accepts him once she opts in');
update private_preferences set min_height_cm = 185, max_height_cm = 200, must_have = '{"height": true}'::jsonb
where user_id = '00000000-0000-0000-0000-000000021102';
select ok(not member_accepts('00000000-0000-0000-0000-000000021102', '00000000-0000-0000-0000-000000021101'),
  'a height Must have rules out someone outside the range');

-- ---------------------------------------------------------------- the number the app shows
select is(pool_size_for('00000000-0000-0000-0000-000000021101'), 0,
  'someone whose profile is not complete is never counted');
select ok(pg_get_functiondef('public.get_my_pool_size()'::regprocedure) like '%pool_size_for%',
  'the member call reads the pool size for the signed-in member');

-- ---------------------------------------------------------------- selfies are deleted once checked
insert into member_selfies (user_id, path, status, decided_at)
values ('00000000-0000-0000-0000-000000021101', '00000000-0000-0000-0000-000000021101/a.jpg', 'verified', now() - interval '31 days');
insert into selfie_files (path, user_id, purge_after)
values ('00000000-0000-0000-0000-000000021101/a.jpg', '00000000-0000-0000-0000-000000021101', now() - interval '1 day');
select is(verified_selfie_path_service('00000000-0000-0000-0000-000000021101'),
  '00000000-0000-0000-0000-000000021101/a.jpg', 'a verified selfie that still exists is used to compare photos');
select ok(selfies_to_purge_service(10) @> to_jsonb('00000000-0000-0000-0000-000000021101/a.jpg'::text),
  'a selfie past its deadline is due for deletion');
select mark_selfie_purged_service('00000000-0000-0000-0000-000000021101/a.jpg');
select is(verified_selfie_path_service('00000000-0000-0000-0000-000000021101'), null,
  'once deleted it is no longer used, and the status is kept');

select * from finish();
rollback;
