begin;
set local search_path = public, extensions, halal_mode_private;
select plan(18);

select ok(
  has_function_privilege('authenticated', 'public.my_referral_progress()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.my_referral_progress()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.claim_referral_code(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.claim_referral_code(text)', 'EXECUTE'),
  'only signed-in members can read their progress or say who invited them'
);

-- A waitlist referral remains pending until the friend completes their profile.
select public.join_waitlist_now('pgtap.inapp@gmail.com', 'London', '25-29', 'en', null);
select public.join_waitlist_now('pgtap.inapp.friend@gmail.com', 'Leeds', '30-34', 'en', null);
update halal_mode_private.waitlist
set verified_at = now(), referral_code = 'HMINAPP001'
where email = 'pgtap.inapp@gmail.com';
update halal_mode_private.waitlist f
set referred_by_id = r.id
from halal_mode_private.waitlist r
where r.email = 'pgtap.inapp@gmail.com' and f.email = 'pgtap.inapp.friend@gmail.com';

-- On the waitlist but never confirmed there.
select public.join_waitlist_now('pgtap.inapp.pending@gmail.com', 'Bristol', '25-29', 'en', null);

insert into auth.users (id, email, email_confirmed_at, created_at) values
  ('00000000-0000-0000-0000-000000019501', 'PgTap.InApp@gmail.com', now(), now()),
  ('00000000-0000-0000-0000-000000019502', 'pgtap.inapp.pending@gmail.com', now(), now()),
  ('00000000-0000-0000-0000-000000019503', 'pgtap.inapp.nobody@gmail.com', now(), now()),
  ('00000000-0000-0000-0000-000000019504', 'pgtap.inapp.unconfirmed@gmail.com', null, now()),
  ('00000000-0000-0000-0000-000000019505', 'pgtap.inapp.old@gmail.com', now(), now() - interval '40 days'),
  ('00000000-0000-0000-0000-000000019506', 'pgtap.inapp.friend@gmail.com', now(), now());
select halal_mode_private.waitlist_confirm(
  (select id from halal_mode_private.waitlist where email = 'pgtap.inapp.friend@gmail.com'));

select ok(exists (select 1 from halal_mode_private.referral_codes where code = 'HMINAPP001'),
  'a waitlist code is registered as that person''s one code');

-- A waitlist member signed in to the app keeps their waitlist link.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019501","role":"authenticated"}', true);
select is(public.my_referral_progress()->>'referral_url', 'https://halalmo.de/?ref=HMINAPP001',
  'a member keeps their waitlist link, whatever the case of the account email');
select is(public.my_referral_progress()->>'referral_count', '0', 'a confirmed waitlist referral is not counted yet');
select ok(public.my_referral_progress()::text not like '%@%', 'the reply never includes an email address');

-- A never-confirmed waitlist place is confirmed by the signed-in account.
-- Completing the matching-ready profile is the qualifying milestone.
insert into public.profiles (
  id, name, first_name, birth_date, gender, city, country, bio, photos,
  languages_spoken, education, has_children, family_goals_answered_at,
  religious_dress, ethnicities, heritage_countries, onboarding_complete
) values (
  '00000000-0000-0000-0000-000000019506', 'Friend Member', 'Friend', '1994-01-01', 'female',
  'Leeds', 'United Kingdom', 'Still writing my bio.',
  array['profile/friend.jpg'], array['English'], 'University', 'no', now(),
  'hijab', array['arab'], array['GB'], true
);
insert into public.private_preferences (user_id, matching_preferences_completed_at)
values ('00000000-0000-0000-0000-000000019506', now());
select is(public.my_referral_progress()->>'referral_count', '0',
  'a profile whose bio is not written yet does not count');
-- The bio is the last step, so the referral must be noticed then.
update public.profiles
set bio = 'A thoughtful person who values family, faith and kindness, and who enjoys long walks, good food and quiet evenings.'
where id = '00000000-0000-0000-0000-000000019506';

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019502","role":"authenticated"}', true);
select is(public.my_referral_progress()->>'state', 'verified', 'a signed-in member never needs an email step');
select ok(
  (select verified_at is not null and referral_code is not null
   from halal_mode_private.waitlist where email = 'pgtap.inapp.pending@gmail.com'),
  'their confirmed account email confirms the waitlist place'
);

-- No waitlist place, or an unconfirmed account email: a new code all the same.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019503","role":"authenticated"}', true);
select ok(public.my_referral_progress()->>'referral_code' ~ '^HM[A-Z0-9]{8}$',
  'a member who never joined the waitlist gets a code of their own');
select is(public.my_referral_progress()->>'referral_code',
  (select code from halal_mode_private.referral_codes where user_id = '00000000-0000-0000-0000-000000019503'),
  'and keeps the same one');

-- Saying who invited you.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019504","role":"authenticated"}', true);
select is(public.claim_referral_code('hminapp001')->>'state', 'claimed', 'a new member can name who invited them');
select is(public.claim_referral_code('HMINAPP001')->>'state', 'already', 'only once');
select is(public.my_referral_progress()->>'referral_code' <> 'HMINAPP001', true,
  'an unconfirmed account email still gets its own code, never another person''s');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019501","role":"authenticated"}', true);
select is(public.my_referral_progress()->>'referral_count', '1',
  'a waitlist friend counts after completing their app profile');
select is(public.claim_referral_code('HMINAPP001')->>'state', 'own', 'nobody can name themselves');

update public.profiles
set bio = 'Not complete yet'
where id = '00000000-0000-0000-0000-000000019506';
select is(public.my_referral_progress()->>'referral_count', '1',
  'profile edits do not revoke a referral that already qualified');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019505","role":"authenticated"}', true);
select is(public.claim_referral_code('HMINAPP001')->>'state', 'too_late', 'and only in their first 30 days');

select set_config('request.jwt.claims', '', true);
select throws_ok($$ select public.my_referral_progress() $$, '42501', null,
  'a caller who is not signed in is refused');

select * from finish();
rollback;
