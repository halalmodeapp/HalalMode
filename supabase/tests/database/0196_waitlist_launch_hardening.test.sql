begin;
set local search_path = public, extensions, halal_mode_private;
select plan(12);

-- The old app join endpoint is closed; the website's stays open.
select ok(
  to_regprocedure('public.request_waitlist_verification(text,text,text,text,text)') is null
  and has_function_privilege('anon', 'public.join_waitlist_now(text,text,text,text,text,text)', 'EXECUTE'),
  'only one public way to join the waitlist'
);

-- The reply does not depend on whether the address is already listed.
select is(
  public.join_waitlist_now('pgtap.hard.first@gmail.com', 'London', '25-29', 'en', null),
  '{"state": "joined", "eligible": true}'::jsonb,
  'a new early member is told places are open'
);
select is(
  public.join_waitlist_now('pgtap.hard.first@gmail.com', 'London', '25-29', 'en', null),
  public.join_waitlist_now('pgtap.hard.second@gmail.com', 'Leeds', '30-34', 'en', null),
  'an existing address gets the same reply as a new one'
);
update halal_mode_private.waitlist set joined_rank = joined_rank + 20000 where email = 'pgtap.hard.second@gmail.com';
select is(
  public.join_waitlist_now('pgtap.hard.first@gmail.com', 'London', '25-29', 'en', null)->>'eligible',
  'false',
  'once early places are gone, an early member''s address says the same as anyone''s'
);
update halal_mode_private.waitlist set joined_rank = joined_rank - 20000 where email = 'pgtap.hard.second@gmail.com';

-- No per-network limit (20261021090000): a campus, mosque or office Wi-Fi is
-- many people, and every one of them joins at once.
select set_config('request.headers', '{"cf-connecting-ip": "203.0.113.7"}', true);
select lives_ok(
  $$ select public.join_waitlist_now('pgtap.hard.net' || n || '@gmail.com', 'Bristol', '25-29', 'en', null)
     from generate_series(1, 150) n $$,
  'a hundred and fifty sign-ups from one network are all accepted'
);
select is(
  (select count(*)::integer from halal_mode_private.waitlist
   where email like 'pgtap.hard.net%@gmail.com' and joined_rank is not null),
  150, 'each with a place in line straight away'
);
select ok(to_regclass('halal_mode_private.waitlist_intake_sources') is null,
  'and no record of anyone''s network is kept');
select set_config('request.headers', '', true);

-- Asking for the link again resends the same link while it is valid.
update halal_mode_private.waitlist
set verified_at = now(), referral_code = 'HMHARDEN01',
    verification_token_hash = encode(extensions.digest(repeat('c', 64), 'sha256'), 'hex'),
    verification_token_ciphertext = 'kept',
    verification_token_expires_at = now() + interval '20 days',
    verification_sent_at = now() - interval '2 hours'
where email = 'pgtap.hard.first@gmail.com';
select public.request_referral_link('pgtap.hard.first@gmail.com', 'en');
select is(
  (select verification_token_hash from halal_mode_private.waitlist where email = 'pgtap.hard.first@gmail.com'),
  encode(extensions.digest(repeat('c', 64), 'sha256'), 'hex'),
  'a still-valid link is not replaced, so the earlier email keeps working'
);
select is(
  (select count(*)::integer from halal_mode_private.mail_outbox o
   join halal_mode_private.waitlist w on w.id::text = o.ref_id
   where w.email = 'pgtap.hard.first@gmail.com' and o.kind = 'waitlist_verification'),
  1, 'it is emailed again'
);
select public.request_referral_link('pgtap.hard.first@gmail.com', 'en');
select is(
  (select count(*)::integer from halal_mode_private.mail_outbox o
   join halal_mode_private.waitlist w on w.id::text = o.ref_id
   where w.email = 'pgtap.hard.first@gmail.com' and o.kind = 'waitlist_verification'),
  1, 'but not twice within the hour'
);

-- A friend who joins the waitlist and the app with the same code counts once.
insert into halal_mode_private.waitlist_referrals (referrer_id, referred_id, verified_at)
select r.id, f.id, now()
from halal_mode_private.waitlist r, halal_mode_private.waitlist f
where r.email = 'pgtap.hard.first@gmail.com' and f.email = 'pgtap.hard.second@gmail.com';
insert into auth.users (id, email, email_confirmed_at, created_at)
values ('00000000-0000-0000-0000-000000019601', 'pgtap.hard.second@gmail.com', now(), now());
insert into halal_mode_private.member_referrals (referred_user_id, code, counted_at)
values ('00000000-0000-0000-0000-000000019601', 'HMHARDEN01', now());
select is(
  halal_mode_private.referral_progress('HMHARDEN01')->>'referral_count', '1',
  'the same friend through the waitlist and the app counts once'
);

-- A failed send waits before the next try.
insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale, attempts)
values ('waitlist_welcome', 'pgtap-backoff', 'pgtap.hard.mail@gmail.com', 'en', 3);
select public.settle_mail_service(
  (select id from halal_mode_private.mail_outbox where ref_id = 'pgtap-backoff'), false, '500 server error');
select ok(
  (select claimed_until > now() + interval '7 minutes' from halal_mode_private.mail_outbox where ref_id = 'pgtap-backoff'),
  'a failed send backs off instead of retrying at once'
);

select * from finish();
rollback;
