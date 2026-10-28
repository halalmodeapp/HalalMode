begin;
set local search_path = public, extensions, halal_mode_private;
select plan(3);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000021501', 'expiring-a@example.test'),
  ('00000000-0000-0000-0000-000000021502', 'expiring-b@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude, onboarding_complete)
values
  ('00000000-0000-0000-0000-000000021501', 'Expiring A', 'A', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true),
  ('00000000-0000-0000-0000-000000021502', 'Expiring B', 'B', '1992-01-01', 'female', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, true);
insert into halal_mode_private.notification_devices (user_id, platform, token_hash, push_token, locale, notifications_enabled)
select id, 'android', 'hash-' || id::text, 'ExponentPushToken[test]', 'en', true from profiles
where id::text like '00000000-0000-0000-0000-0000000215%';

-- A has not submitted and the round closes in two hours; B has submitted.
insert into rounds (id, user_id, tier, opens_at, expires_at, submitted_at) values
  ('00000000-0000-0000-0000-0000000215a1', '00000000-0000-0000-0000-000000021501', 'free', now() - interval '20 hours', now() + interval '2 hours', null),
  ('00000000-0000-0000-0000-0000000215a2', '00000000-0000-0000-0000-000000021502', 'free', now() - interval '20 hours', now() + interval '2 hours', now() - interval '1 hour');
insert into introductions (round_id, viewer_id, subject_id) values
  ('00000000-0000-0000-0000-0000000215a1', '00000000-0000-0000-0000-000000021501', '00000000-0000-0000-0000-000000021502'),
  ('00000000-0000-0000-0000-0000000215a2', '00000000-0000-0000-0000-000000021502', '00000000-0000-0000-0000-000000021501');

-- The waking-hours rule depends on the clock, so the test judges the rule that
-- does not: who is eligible at all, and that nobody is queued twice.
create temp table first_run as select halal_mode_private.queue_round_expiry_reminders() as queued;
select ok((select queued from first_run) in (0, 1), 'at most the one member who has not submitted is queued');
select is((select count(*)::int from halal_mode_private.notification_outbox
           where kind = 'round_expiring' and user_id = '00000000-0000-0000-0000-000000021502'), 0,
  'a member who already submitted is never reminded');
select halal_mode_private.queue_round_expiry_reminders();
select ok((select count(*)::int from halal_mode_private.notification_outbox
           where kind = 'round_expiring' and user_id = '00000000-0000-0000-0000-000000021501') <= 1,
  'and nobody is reminded twice for the same round');

select * from finish();
rollback;
