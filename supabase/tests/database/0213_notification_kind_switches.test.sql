begin;
set local search_path = public, extensions, halal_mode_private;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000021301', 'switches@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, onboarding_complete)
values ('00000000-0000-0000-0000-000000021301', 'Switch Person', 'Switch', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', true);
insert into halal_mode_private.notification_devices (user_id, platform, token_hash, push_token, locale, notifications_enabled)
values ('00000000-0000-0000-0000-000000021301', 'android', 'hash-21301', 'ExponentPushToken[test]', 'en', true);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000021301","role":"authenticated"}', true);

select is(get_my_muted_notification_kinds(), '{}'::text[], 'nothing is muted to begin with');

select halal_mode_private.enqueue_notification('00000000-0000-0000-0000-000000021301', 'waiting_on_you');
select is((select count(*)::int from halal_mode_private.notification_outbox
           where user_id = '00000000-0000-0000-0000-000000021301' and kind = 'waiting_on_you'), 1,
  'an unmuted kind is queued');

select set_my_notification_kind('waiting_on_you', false);
select is(get_my_muted_notification_kinds(), array['waiting_on_you'], 'the kind is muted');
select is((select count(*)::int from halal_mode_private.notification_outbox
           where user_id = '00000000-0000-0000-0000-000000021301' and kind = 'waiting_on_you'), 0,
  'and what was waiting to go out is dropped');

select halal_mode_private.enqueue_notification('00000000-0000-0000-0000-000000021301', 'waiting_on_you');
select halal_mode_private.enqueue_notification('00000000-0000-0000-0000-000000021301', 'new_message');
select is((select array_agg(kind order by kind) from halal_mode_private.notification_outbox
           where user_id = '00000000-0000-0000-0000-000000021301'), array['new_message'],
  'a muted kind is never queued; the others still are');

select throws_ok($$select set_my_notification_kind('notice', false)$$, '22023', null,
  'notices from us cannot be switched off');

select set_my_notification_kind('waiting_on_you', true);
select is(get_my_muted_notification_kinds(), '{}'::text[], 'turning it back on clears the mute');

select * from finish();
rollback;
