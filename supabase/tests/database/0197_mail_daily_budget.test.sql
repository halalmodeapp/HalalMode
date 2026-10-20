begin;
set local search_path = public, extensions, halal_mode_private;
select plan(8);

select is((select daily_limit from halal_mode_private.mail_settings), 100,
  'the daily limit starts at the free plan''s 100');

-- Start from a quiet outbox: only this test's mail.
update halal_mode_private.mail_outbox set sent_at = now() - interval '2 days' where sent_at is null;
update halal_mode_private.mail_outbox set sent_at = now() - interval '2 days' where sent_at > now() - interval '24 hours';

-- 85 sent today, 20 waitlist emails and 3 safety reports waiting.
insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale, sent_at)
select 'waitlist_welcome', 'pgtap-sent-' || n, 'pgtap.sent' || n || '@gmail.com', 'en', now() - interval '1 hour'
from generate_series(1, 85) n;
insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
select 'waitlist_welcome', 'pgtap-wait-' || n, 'pgtap.wait' || n || '@gmail.com', 'en'
from generate_series(1, 20) n;
insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
select 'report', '99999990' || n, 'operator@example.test', 'en'
from generate_series(1, 3) n;

select is(jsonb_array_length(public.claim_mail_service(40)), 5,
  'with 15 left today: the 3 safety reports and 2 waitlist emails, keeping 10 spare');
select is(
  (select count(*)::integer from halal_mode_private.mail_outbox where ref_id like '9999999%' and attempts = 1),
  3, 'safety reports go first'
);

-- Mark those as sent: 90 today, so waitlist mail has no room left.
update halal_mode_private.mail_outbox set sent_at = now() where attempts = 1 and sent_at is null;
select is(jsonb_array_length(public.claim_mail_service(40)), 0,
  'waitlist mail waits once only the reserve for safety reports is left');
select is(
  (select count(*)::integer from halal_mode_private.mail_outbox where ref_id like 'pgtap-wait-%' and sent_at is null and attempts = 0),
  18, 'and nothing waiting is used up'
);

update halal_mode_private.mail_settings set daily_limit = null;
select is(jsonb_array_length(public.claim_mail_service(10)), 10,
  'with no limit, a full batch goes');

-- A quota refusal waits an hour and is not counted as a try.
update halal_mode_private.mail_outbox set attempts = 1 where ref_id in ('pgtap-wait-19', 'pgtap-wait-20');
select public.settle_mail_service(
  (select id from halal_mode_private.mail_outbox where ref_id = 'pgtap-wait-20'),
  false, '429 {"name":"daily_quota_exceeded"}');
select ok(
  (select attempts = 0 and claimed_until > now() + interval '50 minutes'
   from halal_mode_private.mail_outbox where ref_id = 'pgtap-wait-20'),
  'a quota refusal waits an hour without using an attempt'
);

-- An ordinary failure still counts and backs off.
select public.settle_mail_service(
  (select id from halal_mode_private.mail_outbox where ref_id = 'pgtap-wait-19'),
  false, '500 server error');
select ok(
  (select attempts = 1 and claimed_until > now() + interval '1 minute'
   from halal_mode_private.mail_outbox where ref_id = 'pgtap-wait-19'),
  'other failures still count as a try and back off'
);

select * from finish();
rollback;
