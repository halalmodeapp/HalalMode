begin;
set local search_path = public, extensions, halal_mode_private;
select plan(9);

select ok(
  has_function_privilege('authenticated', 'public.my_referral_progress()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.my_referral_progress()', 'EXECUTE'),
  'only signed-in members can ask for their own progress'
);

-- A confirmed member with a link and one counted friend.
select public.join_waitlist_now('pgtap.inapp@gmail.com', 'London', '25-29', 'en', null);
select public.join_waitlist_now('pgtap.inapp.friend@gmail.com', 'Leeds', '30-34', 'en', null);
update halal_mode_private.waitlist
set verified_at = now(), referral_code = 'HMINAPP001'
where email = 'pgtap.inapp@gmail.com';
insert into halal_mode_private.waitlist_referrals (referrer_id, referred_id, verified_at)
select r.id, f.id, now()
from halal_mode_private.waitlist r, halal_mode_private.waitlist f
where r.email = 'pgtap.inapp@gmail.com' and f.email = 'pgtap.inapp.friend@gmail.com';

-- On the waitlist but not confirmed there yet.
select public.join_waitlist_now('pgtap.inapp.pending@gmail.com', 'Bristol', '25-29', 'en', null);

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000019501', 'PgTap.InApp@gmail.com', now()),
  ('00000000-0000-0000-0000-000000019502', 'pgtap.inapp.pending@gmail.com', now()),
  ('00000000-0000-0000-0000-000000019503', 'pgtap.inapp.nobody@gmail.com', now()),
  ('00000000-0000-0000-0000-000000019504', 'pgtap.inapp.friend@gmail.com', null);

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019501","role":"authenticated"}', true);
select is(public.my_referral_progress()->>'state', 'verified',
  'a confirmed member sees their progress');
select is(public.my_referral_progress()->>'referral_url', 'https://halalmo.de/?ref=HMINAPP001',
  'with their own link, matched whatever the case of the account email');
select is(public.my_referral_progress()->>'referral_count', '1',
  'and their counted friends');
select ok(public.my_referral_progress()::text not like '%@%',
  'the reply never includes an email address');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019502","role":"authenticated"}', true);
select is(public.my_referral_progress(), '{"state": "unconfirmed"}'::jsonb,
  'a waitlist place not yet confirmed has no link');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019503","role":"authenticated"}', true);
select is(public.my_referral_progress(), '{"state": "not_on_waitlist"}'::jsonb,
  'an address with no waitlist place says so');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019504","role":"authenticated"}', true);
select is(public.my_referral_progress(), '{"state": "unconfirmed"}'::jsonb,
  'an account email that is not confirmed is not looked up');

select set_config('request.jwt.claims', '', true);
select throws_ok($$ select public.my_referral_progress() $$, '42501', null,
  'a caller who is not signed in is refused');

select * from finish();
rollback;
