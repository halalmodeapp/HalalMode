begin;
set local search_path = public, extensions, halal_mode_private;
select plan(16);

select ok(
  has_function_privilege('authenticated', 'public.my_referral_progress()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.my_referral_progress()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.claim_referral_code(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.claim_referral_code(text)', 'EXECUTE'),
  'only signed-in members can read their progress or say who invited them'
);

-- A confirmed waitlist member with one counted friend.
select public.join_waitlist_now('pgtap.inapp@gmail.com', 'London', '25-29', 'en', null);
select public.join_waitlist_now('pgtap.inapp.friend@gmail.com', 'Leeds', '30-34', 'en', null);
update halal_mode_private.waitlist
set verified_at = now(), referral_code = 'HMINAPP001'
where email = 'pgtap.inapp@gmail.com';
insert into halal_mode_private.waitlist_referrals (referrer_id, referred_id, verified_at)
select r.id, f.id, now()
from halal_mode_private.waitlist r, halal_mode_private.waitlist f
where r.email = 'pgtap.inapp@gmail.com' and f.email = 'pgtap.inapp.friend@gmail.com';

-- On the waitlist but never confirmed there.
select public.join_waitlist_now('pgtap.inapp.pending@gmail.com', 'Bristol', '25-29', 'en', null);

insert into auth.users (id, email, email_confirmed_at, created_at) values
  ('00000000-0000-0000-0000-000000019501', 'PgTap.InApp@gmail.com', now(), now()),
  ('00000000-0000-0000-0000-000000019502', 'pgtap.inapp.pending@gmail.com', now(), now()),
  ('00000000-0000-0000-0000-000000019503', 'pgtap.inapp.nobody@gmail.com', now(), now()),
  ('00000000-0000-0000-0000-000000019504', 'pgtap.inapp.unconfirmed@gmail.com', null, now()),
  ('00000000-0000-0000-0000-000000019505', 'pgtap.inapp.old@gmail.com', now(), now() - interval '40 days');

select ok(exists (select 1 from halal_mode_private.referral_codes where code = 'HMINAPP001'),
  'a waitlist code is registered as that person''s one code');

-- A waitlist member signed in to the app keeps their waitlist link.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019501","role":"authenticated"}', true);
select is(public.my_referral_progress()->>'referral_url', 'https://halalmo.de/?ref=HMINAPP001',
  'a member keeps their waitlist link, whatever the case of the account email');
select is(public.my_referral_progress()->>'referral_count', '1', 'with the friends who already counted');
select ok(public.my_referral_progress()::text not like '%@%', 'the reply never includes an email address');

-- A never-confirmed waitlist place is confirmed by the signed-in account.
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
  'a friend who joined through the app counts only once their profile is complete');
select is(public.claim_referral_code('HMINAPP001')->>'state', 'own', 'nobody can name themselves');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019505","role":"authenticated"}', true);
select is(public.claim_referral_code('HMINAPP001')->>'state', 'too_late', 'and only in their first 30 days');

select set_config('request.jwt.claims', '', true);
select throws_ok($$ select public.my_referral_progress() $$, '42501', null,
  'a caller who is not signed in is refused');

select * from finish();
rollback;
