begin;
set local search_path = public, extensions, halal_mode_private;
select plan(12);

-- An address that is not on the waitlist gets one "join first" note a day.
select is(
  public.request_referral_link('not.yet.joined@gmail.com', 'en')->>'state', 'sent',
  'the reply for an unlisted address is unchanged'
);
select is(
  (select count(*)::integer from halal_mode_private.mail_outbox
   where kind = 'waitlist_not_joined' and to_email = 'not.yet.joined@gmail.com'),
  1, 'it is sent one join-first note'
);
select lives_ok(
  $$ select public.request_referral_link('not.yet.joined@gmail.com', 'en') $$,
  'asking again is accepted quietly'
);
select is(
  (select count(*)::integer from halal_mode_private.mail_outbox
   where kind = 'waitlist_not_joined' and to_email = 'not.yet.joined@gmail.com'),
  1, 'but no second note goes out the same day'
);
select ok(
  not exists (select 1 from halal_mode_private.waitlist_link_requests where email_hash like '%@%'),
  'only a hash of the address is kept'
);

-- Opening a link only reads; the Confirm button confirms.
select public.join_waitlist_now('pgtap.status@gmail.com', 'London', '25-29', 'en', null);
update halal_mode_private.waitlist
set verification_token_hash = encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex'),
    verification_token_expires_at = now() + interval '7 days'
where email = 'pgtap.status@gmail.com';

select is(
  public.waitlist_token_status(repeat('a', 64))->>'state', 'unconfirmed',
  'an unconfirmed link says so'
);
select ok(
  (select verified_at is null from halal_mode_private.waitlist where email = 'pgtap.status@gmail.com'),
  'opening the link confirms nothing'
);
select is(
  public.verify_waitlist_token(repeat('a', 64))->>'state', 'verified',
  'the Confirm button confirms'
);
select ok(
  (select verification_token_expires_at > now() + interval '29 days'
   from halal_mode_private.waitlist where email = 'pgtap.status@gmail.com'),
  'a confirmed link keeps working for 30 days'
);
select is(
  public.waitlist_token_status(repeat('a', 64))->>'referral_count', '0',
  'and then shows progress'
);
select throws_ok(
  $$ select public.waitlist_token_status(repeat('b', 64)) $$,
  '22023', null, 'an unknown link is refused'
);

select ok(
  has_function_privilege('anon', 'public.request_referral_link(text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.waitlist_token_status(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.verify_waitlist_token(text)', 'EXECUTE'),
  'anonymous callers can only ask for a link'
);

select * from finish();
rollback;
