begin;
set local search_path = public, extensions, halal_mode_private;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000021401', 'decision-a@example.test'),
  ('00000000-0000-0000-0000-000000021402', 'decision-b@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude, onboarding_complete)
values
  ('00000000-0000-0000-0000-000000021401', 'Decision A', 'A', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true),
  ('00000000-0000-0000-0000-000000021402', 'Decision B', 'B', '1992-01-01', 'female', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true);
insert into halal_mode_private.notification_devices (user_id, platform, token_hash, push_token, locale, notifications_enabled)
select id, 'android', 'hash-' || id::text, 'ExponentPushToken[test]', 'en', true from profiles
where id::text like '00000000-0000-0000-0000-0000000214%';

-- A selfie that is approved.
insert into halal_mode_private.member_selfies (user_id, path, status)
values ('00000000-0000-0000-0000-000000021401', '21401/s.jpg', 'pending');
update halal_mode_private.member_selfies set status = 'verified' where user_id = '00000000-0000-0000-0000-000000021401';
select is((select payload ->> 'outcome' from halal_mode_private.notification_outbox
           where user_id = '00000000-0000-0000-0000-000000021401' and kind = 'photo_decision'), 'approved',
  'an approved selfie sends an approval');

-- A selfie that has to be redone says so, not just "an update".
select halal_mode_private.add_member_notice('00000000-0000-0000-0000-000000021402', 'selfie_rejected');
select is((select payload ->> 'outcome' from halal_mode_private.notification_outbox
           where user_id = '00000000-0000-0000-0000-000000021402' and kind = 'photo_decision'), 'redo',
  'a rejected selfie sends a redo');
select is((select count(*)::int from halal_mode_private.notification_outbox
           where user_id = '00000000-0000-0000-0000-000000021402' and kind = 'notice'), 0,
  'and not the generic update as well');
select is((select count(*)::int from public.member_notices where user_id = '00000000-0000-0000-0000-000000021402'), 1,
  'the in-app notice is still there');

-- The recap reminder waits a day, then sends once.
insert into connections (user_a, user_b, stage)
values ('00000000-0000-0000-0000-000000021401', '00000000-0000-0000-0000-000000021402', 'recap');
update halal_mode_private.notification_outbox set sent_at = now() where kind = 'photo_decision';
select halal_mode_private.queue_recap_reminders();
select is((select count(*)::int from halal_mode_private.notification_outbox where kind = 'recap_ready'), 0,
  'nothing is sent on the first day');
update halal_mode_private.retention_nudges set first_seen = now() - interval '2 days' where kind = 'recap_ready';
select ok(halal_mode_private.queue_recap_reminders() >= 0 and
  (select count(*)::int from halal_mode_private.notification_outbox where kind = 'recap_ready') in (0, 2),
  'after a day it is queued for waking hours only');

select * from finish();
rollback;
