begin;
set local search_path = public, extensions, halal_mode_private;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000021201', 'liker@example.test'),
  ('00000000-0000-0000-0000-000000021202', 'liked@example.test'),
  ('00000000-0000-0000-0000-000000021203', 'blocked-liker@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude, bio, photos, onboarding_complete, marital_status, sensitive_consent_at)
values
  ('00000000-0000-0000-0000-000000021201', 'Liker Person', 'Liker', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, repeat('a', 90), array['21201/a.jpg'], true, 'never_married', now()),
  ('00000000-0000-0000-0000-000000021202', 'Liked Person', 'Liked', '1992-01-01', 'female', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, repeat('b', 90), array['21202/a.jpg'], true, 'never_married', now()),
  ('00000000-0000-0000-0000-000000021203', 'Blocked Person', 'Blocked', '1991-01-01', 'male', 'Madinah', 'Saudi Arabia', 24.4672, 39.6024, repeat('c', 90), array['21203/a.jpg'], true, 'never_married', now());
insert into private_preferences (user_id) select id from profiles where id::text like '00000000-0000-0000-0000-0000000212%';
insert into halal_mode_private.member_legal_consent_history (user_id, document_type, version, acceptance_context)
select p.id, d.document_type, d.version, 'onboarding'
from profiles p cross join halal_mode_private.legal_document_registry d
where d.is_current and p.id::text like '00000000-0000-0000-0000-0000000212%';
-- Only verified members' likes count.
insert into halal_mode_private.member_selfies (user_id, path, status, decided_at) values
  ('00000000-0000-0000-0000-000000021201', '21201/s.jpg', 'verified', now()),
  ('00000000-0000-0000-0000-000000021203', '21203/s.jpg', 'verified', now());

-- Closed rounds in which the two men and the woman were introduced to each other.
insert into rounds (id, user_id, tier, opens_at, expires_at, submitted_at) values
  ('00000000-0000-0000-0000-0000000212a1', '00000000-0000-0000-0000-000000021201', 'free', now() - interval '2 days', now() - interval '1 day', now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000212a2', '00000000-0000-0000-0000-000000021202', 'free', now() - interval '2 days', now() - interval '1 day', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000212a3', '00000000-0000-0000-0000-000000021203', 'free', now() - interval '2 days', now() - interval '1 day', now() - interval '2 days');
insert into introductions (id, round_id, viewer_id, subject_id) values
  ('00000000-0000-0000-0000-0000000212b1', '00000000-0000-0000-0000-0000000212a1', '00000000-0000-0000-0000-000000021201', '00000000-0000-0000-0000-000000021202'),
  ('00000000-0000-0000-0000-0000000212b2', '00000000-0000-0000-0000-0000000212a2', '00000000-0000-0000-0000-000000021202', '00000000-0000-0000-0000-000000021201'),
  ('00000000-0000-0000-0000-0000000212b3', '00000000-0000-0000-0000-0000000212a3', '00000000-0000-0000-0000-000000021203', '00000000-0000-0000-0000-000000021202'),
  ('00000000-0000-0000-0000-0000000212b4', '00000000-0000-0000-0000-0000000212a2', '00000000-0000-0000-0000-000000021202', '00000000-0000-0000-0000-000000021203');
-- Both men chose her; she chose neither.
insert into introduction_selections (introduction_id, viewer_id, subject_id, decision) values
  ('00000000-0000-0000-0000-0000000212b1', '00000000-0000-0000-0000-000000021201', '00000000-0000-0000-0000-000000021202', 'kept'),
  ('00000000-0000-0000-0000-0000000212b3', '00000000-0000-0000-0000-000000021203', '00000000-0000-0000-0000-000000021202', 'kept');

-- ---------------------------------------------------------------- who counts
select is((select count(*)::int from liked_you_current('00000000-0000-0000-0000-000000021202')), 2,
  'two people who chose her, and whom she did not choose, are in her tray');
select is((select count(*)::int from liked_you_current('00000000-0000-0000-0000-000000021201')), 0,
  'the person who liked is never shown that they were seen');
insert into blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-000000021202', '00000000-0000-0000-0000-000000021203');
select is((select count(*)::int from liked_you_current('00000000-0000-0000-0000-000000021202')), 1, 'a blocked member never appears');
delete from blocks;
update halal_mode_private.member_selfies set status = 'pending' where user_id = '00000000-0000-0000-0000-000000021203';
select is((select count(*)::int from liked_you_current('00000000-0000-0000-0000-000000021202')), 1, 'a like from an unverified member does not count');

-- ---------------------------------------------------------------- what a free member sees
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000021202","role":"authenticated"}', true);
select ok(
  (get_my_liked_you() -> 0) ? 'bio' and not ((get_my_liked_you() -> 0) ? 'name') and not ((get_my_liked_you() -> 0) ? 'photos')
  and (get_my_liked_you() -> 0 ->> 'unlocked') = 'false',
  'a free member gets the bio and the facts, no name and no real photo');
select throws_ok($$select like_back('00000000-0000-0000-0000-000000021201')$$, '42501', null,
  'liking back needs Premium');

-- ---------------------------------------------------------------- what a Premium member sees and does
select set_config('request.jwt.claims', '', true);
update profiles set tier = 'premium' where id = '00000000-0000-0000-0000-000000021202';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000021202","role":"authenticated"}', true);
select ok((get_my_liked_you() -> 0 ->> 'unlocked') = 'true' and ((get_my_liked_you() -> 0) ? 'photos'),
  'a Premium member sees them in full');
select ok(halal_mode_private.premium_sees_liker('00000000-0000-0000-0000-000000021202', '00000000-0000-0000-0000-000000021201'),
  'and may read their photos');
select is((like_back('00000000-0000-0000-0000-000000021201') ->> 'status'), 'matched', 'liking back starts a connection');
select is((select count(*)::int from liked_you_current('00000000-0000-0000-0000-000000021202')), 0, 'once matched they leave the tray');
select throws_ok($$select like_back('00000000-0000-0000-0000-000000021201')$$, 'P0002', null, 'a like cannot be used twice');

select * from finish();
rollback;
