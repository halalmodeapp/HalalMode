begin;

set local search_path = public, extensions;
select plan(4);

select ok(
  has_function_privilege('authenticated', 'public.get_my_profile_readiness()', 'EXECUTE'),
  'a member can read only their readiness status'
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000351', 'readiness@example.test');
-- Everything readiness asks for since 0173/0175 (bio 50+ since 0183; dress
-- is asked of women only since 0184).
insert into profiles (
  id, name, first_name, birth_date, gender, city, country, bio, photos, onboarding_complete,
  languages_spoken, education, has_children, family_goals_answered_at, religious_dress,
  ethnicities, heritage_countries
) values
  ('00000000-0000-0000-0000-000000000351', 'Ready Member', 'Ready', '1990-01-01', 'female', 'Madinah', 'Saudi Arabia', repeat('a', 60), array['member/photo.jpg'], true,
   array['Arabic'], 'Bachelors', 'no', now(), 'hijab', array['arab'], array['SA']);
insert into private_preferences (user_id, matching_preferences_completed_at, own_height_cm, own_build) values
  ('00000000-0000-0000-0000-000000000351', now(), 165, 'Average');
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000351","role":"authenticated"}', true);
end $$;

select is((select (get_my_profile_readiness()->>'ready')::boolean), true, 'complete profile is ready');
-- Photo-path changes are intentionally allowed only through the media RPC.
-- This fixture simulates its approved transaction scope instead of making a
-- raw profile update that production clients cannot perform.
do $$ begin
  perform set_config('app.profile_media_rpc', 'true', true);
end $$;
update profiles set photos = '{}', bio = '' where id = '00000000-0000-0000-0000-000000000351';
select is((select (get_my_profile_readiness()->>'ready')::boolean), false, 'missing profile fields make readiness false');
select is((select get_my_profile_readiness()->'missing'), '["bio", "photo"]'::jsonb, 'the server returns only the missing guidance fields');

select * from finish();
rollback;
