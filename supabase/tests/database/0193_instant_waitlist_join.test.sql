begin;
set local search_path = public, extensions, halal_mode_private;
select plan(14);

-- Throwaway addresses are refused, real ones accepted.
select ok(public.waitlist_email_plausible('ahmed.khan@gmail.com'), 'a real address is accepted');
select ok(public.waitlist_email_plausible('fatima@outlook.co.uk'), 'a country-code address is accepted');
select ok(not public.waitlist_email_plausible('blahblahblah@blahblahblah.blahblahblah'), 'a made-up ending is refused');
select ok(not public.waitlist_email_plausible('asdf@asdf.com'), 'a keyboard mash is refused');
select ok(not public.waitlist_email_plausible('someone@mailinator.com'), 'a disposable inbox is refused');
select ok(not public.waitlist_email_plausible('ali@gmial.com'), 'a mistyped provider is refused');

-- Joining is instant, takes the next place, and queues one thank-you email.
select is(
  public.join_waitlist_now('pgtap.join@gmail.com', 'London', '25-29', 'en', null)->>'state',
  'joined',
  'a new signup is saved at once'
);
select ok(
  (select joined_rank from halal_mode_private.waitlist where email = 'pgtap.join@gmail.com') is not null,
  'the signup has a place in line'
);
select is(
  (select count(*)::integer from halal_mode_private.mail_outbox o
   join halal_mode_private.waitlist w on w.id::text = o.ref_id
   where w.email = 'pgtap.join@gmail.com' and o.kind = 'waitlist_welcome'),
  1,
  'one thank-you email is queued'
);
select lives_ok(
  $$ select public.join_waitlist_now('pgtap.join@gmail.com', 'London', '25-29', 'en', null) $$,
  'a repeat signup is accepted quietly'
);
select is(
  (select count(*)::integer from halal_mode_private.mail_outbox o
   join halal_mode_private.waitlist w on w.id::text = o.ref_id
   where w.email = 'pgtap.join@gmail.com' and o.kind = 'waitlist_welcome'),
  1,
  'a repeat signup sends no second email'
);
select throws_ok(
  $$ select public.join_waitlist_now('asdf@asdf.com', 'London', '25-29', 'en', null) $$,
  '22023',
  null,
  'the database refuses junk addresses too'
);

-- Asking for a referral link answers the same whether or not the address is listed.
select is(
  public.request_referral_link('nobody.listed.here@gmail.com', 'en')->>'state',
  'sent',
  'an unlisted address gets the same reply'
);
select ok(
  has_function_privilege('anon', 'public.join_waitlist_now(text,text,text,text,text)', 'EXECUTE')
  and has_function_privilege('anon', 'public.request_referral_link(text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.verify_waitlist_token(text)', 'EXECUTE'),
  'anonymous callers can join and ask for a link, but cannot read verification state'
);

select * from finish();
rollback;
