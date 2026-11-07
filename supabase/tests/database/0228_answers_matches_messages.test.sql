begin;
set local search_path = public, extensions, halal_mode_private;
select plan(70);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000228' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.connect(a int, b int) returns uuid language sql as $$
  insert into connections (user_a, user_b) values (least(pg_temp.member(a), pg_temp.member(b)), greatest(pg_temp.member(a), pg_temp.member(b))) returning id;
$$;
create function pg_temp.connection_id(a int, b int) returns uuid language sql as $$
  select id from connections where user_a = least(pg_temp.member(a), pg_temp.member(b)) and user_b = greatest(pg_temp.member(a), pg_temp.member(b));
$$;
create function pg_temp.queued(a int, b int) returns boolean language sql as $$
  select exists (select 1 from mutual_connection_queue where user_a = least(pg_temp.member(a), pg_temp.member(b)) and user_b = greatest(pg_temp.member(a), pg_temp.member(b)));
$$;
insert into auth.users (id, email, email_confirmed_at)
select pg_temp.member(n), 'batch7-' || n || '@example.test', now() from generate_series(1, 20) n;
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude,
                      bio, photos, onboarding_complete, marital_status, sensitive_consent_at)
select pg_temp.member(n), 'Private surname', 'First', '1995-01-01', case when n % 2 = 0 then 'female' else 'male' end::gender,
       'London', 'United Kingdom', 51.5, -0.1, repeat('a', 50), array[pg_temp.member(n)::text || '/p.jpg'],
       true, 'never_married', now() from generate_series(1, 20) n;
insert into private_preferences (user_id, matching_preferences_completed_at, preferred_countries)
select pg_temp.member(n), now(), array['United Kingdom'] from generate_series(1, 20) n;
insert into member_legal_consent_history (user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 20) n cross join legal_document_registry d where d.is_current;

-- A finished member cannot read even one partner answer before the last commitment.
select pg_temp.connect(1, 2);
select pg_temp.act_as(1);
select submit_question_picks(pg_temp.connection_id(1, 2), array['q1', 'q2']);
select pg_temp.act_as(2);
select submit_question_picks(pg_temp.connection_id(1, 2), array['q1', 'q2']);
select submit_answer(pg_temp.connection_id(1, 2), 'q1', 'We should speak kindly.');
select is(submit_answer(pg_temp.connection_id(1, 2), 'q2', 'We should listen carefully.')->>'theirAnswer', null, 'first finisher receives no partner answer');
select pg_temp.act_as(1);
select is(submit_answer(pg_temp.connection_id(1, 2), 'q1', 'I agree about kindness.')->>'theirAnswer', null, 'partial finisher receives no partner answer');
select pg_temp.act_as(2);
select ok(not exists (select 1 from jsonb_array_elements(get_connection(pg_temp.connection_id(1, 2))->'questions') q where q->>'theirAnswer' is not null), 'completed reader sees none of the partial partner answers');
select ok(not exists (select 1 from jsonb_array_elements(get_connection(pg_temp.connection_id(1, 2))->'questions') q where q->>'theirSubmittedAt' is not null), 'partner submission timestamps stay sealed too');
select is(get_connection(pg_temp.connection_id(1, 2))->'recap', '[]'::jsonb, 'recap stays sealed');
select is(get_connection(pg_temp.connection_id(1, 2))->'compatibilityBreakdown', '[]'::jsonb, 'recap comparison stays sealed');
select throws_ok($$select get_connection_recap(pg_temp.connection_id(1, 2))$$, 'P0001', 'Recap is not available', 'legacy recap RPC stays sealed');
select pg_temp.act_as(1);
select is(submit_answer(pg_temp.connection_id(1, 2), 'q2', 'I agree about listening.')->>'theirAnswer', 'We should listen carefully.', 'last commitment releases the submitted answer');
select is((select count(*)::int from jsonb_array_elements(get_connection(pg_temp.connection_id(1, 2))->'questions') q where q->>'theirAnswer' is not null), 2, 'last finisher sees every answer');
select pg_temp.act_as(2);
select is((select count(*)::int from jsonb_array_elements(get_connection(pg_temp.connection_id(1, 2))->'questions') q where q->>'theirAnswer' is not null), 2, 'first finisher sees every answer on the same completed state');
select lives_ok($$select get_connection_recap(pg_temp.connection_id(1, 2))$$, 'legacy recap works once both finish');
select lives_ok($$select submit_answer(pg_temp.connection_id(1, 2), 'q2', 'We should listen carefully.')$$, 'immutable retry remains valid after release');
select pg_temp.act_as(20);
select throws_ok($$select get_connection(pg_temp.connection_id(1, 2))$$, 'P0002', 'Connection not found', 'outsiders cannot read answers');
select ok(not has_table_privilege('authenticated', 'public.question_answers', 'SELECT'), 'raw answers remain private');

-- A very old earned match survives changed preferences and pause, with no expiry.
select set_config('request.jwt.claims', '', true);
select pg_temp.connect(3, n) from generate_series(5, 9) n;
insert into mutual_connection_queue (user_a, user_b, matched_at) values (pg_temp.member(3), pg_temp.member(4), now() - interval '400 days');
update private_preferences set preferred_countries = array['Japan'] where user_id = pg_temp.member(4);
update profiles set is_paused = true where id = pg_temp.member(4);
select is(promote_waiting_connections(array[pg_temp.member(3)]), 0, 'paused and full earned match waits');
select ok(pg_temp.queued(3, 4), 'preferences and time cannot discard an earned match');
insert into photo_blurs (path, user_id) select unnest(photos), id from profiles where id in (pg_temp.member(3), pg_temp.member(4));
select pg_temp.act_as(3);
select is(jsonb_array_length(get_my_waiting_matches()), 1, 'first member sees waiting match');
select is(get_my_waiting_matches()->0->>'firstName', 'First', 'first name is shown');
select is((select count(*)::int from jsonb_object_keys(get_my_waiting_matches()->0)), 3, 'only ID, first name and blurred paths are returned');
select ok(not (get_my_waiting_matches()->0 ? 'profile'), 'no full profile accompanies a waiting match');
select ok(can_read_blurred_media(pg_temp.member(4)::text), 'first member can sign blurred copies');
select ok(not can_read_profile_media(pg_temp.member(4)::text), 'waiting match grants no access to original photos');
select pg_temp.act_as(4);
select is(jsonb_array_length(get_my_waiting_matches()), 1, 'paused other member sees the same match');
select ok(can_read_blurred_media(pg_temp.member(3)::text), 'other member can sign blurred copies');
select pg_temp.act_as(20);
select is(get_my_waiting_matches(), '[]'::jsonb, 'outsider sees no match');
select ok(not can_read_blurred_media(pg_temp.member(3)::text), 'outsider cannot sign its blurred copies');
select set_config('request.jwt.claims', '', true);
update profiles set is_paused = false where id = pg_temp.member(4);
select ok(pg_temp.queued(3, 4), 'resuming still waits for capacity');
select pg_temp.act_as(3);
select close_connection(pg_temp.connection_id(3, 5));
select ok(not pg_temp.queued(3, 4), 'closing a conversation promotes the match');
select ok(pg_temp.connection_id(3, 4) is not null, 'preference mismatch does not prevent earned promotion');
select is(get_my_waiting_matches(), '[]'::jsonb, 'promoted match leaves waiting display');

-- Hide, block and deletion permanently remove the earned wait.
select set_config('request.jwt.claims', '', true);
insert into mutual_connection_queue (user_a, user_b) values
  (pg_temp.member(10), pg_temp.member(11)), (pg_temp.member(12), pg_temp.member(13)), (pg_temp.member(14), pg_temp.member(15));
insert into member_hides (hider_id, hidden_id) values (pg_temp.member(11), pg_temp.member(10));
select ok(not pg_temp.queued(10, 11), 'reverse-direction hide removes the queue row immediately');
select pg_temp.act_as(10);
select is(get_my_waiting_matches(), '[]'::jsonb, 'hidden match is no longer shown');
select set_config('request.jwt.claims', '', true);
insert into blocks (blocker_id, blocked_id) values (pg_temp.member(13), pg_temp.member(12));
select ok(not pg_temp.queued(12, 13), 'reverse-direction block removes waiting match');
delete from blocks where blocker_id = pg_temp.member(13);
select ok(not pg_temp.queued(12, 13), 'unblocking cannot revive the wait');
select pg_temp.act_as(15);
select request_my_account_deletion();
select ok(not pg_temp.queued(14, 15), 'account deletion ends the wait immediately');
select set_config('request.jwt.claims', '', true);
delete from account_deletion_requests where user_id = pg_temp.member(15);
select ok(not pg_temp.queued(14, 15), 'cancelling deletion cannot revive the wait');

-- Delete for everyone is owned, time-bounded, idempotent and retains private evidence.
select pg_temp.act_as(1);
select open_connection(pg_temp.connection_id(1, 2));
create temporary table sent as select send_message(pg_temp.connection_id(1, 2), 'Keep this for safety.', 'batch7_request_001') as result;
create function pg_temp.message_id() returns uuid language sql as $$ select (result->>'id')::uuid from sent; $$;
select ok(get_deletable_message_ids(pg_temp.connection_id(1, 2)) ? pg_temp.message_id()::text, 'sender is offered a delete action');
select pg_temp.act_as(2);
select ok(not (get_deletable_message_ids(pg_temp.connection_id(1, 2)) ? pg_temp.message_id()::text), 'recipient is never offered that action');
select throws_ok($$select delete_message_for_everyone(pg_temp.message_id())$$, '42501', 'Message is not available', 'recipient cannot delete for everyone');
select pg_temp.act_as(20);
select throws_ok($$select delete_message_for_everyone(pg_temp.message_id())$$, '42501', 'Message is not available', 'outsider cannot delete');
select pg_temp.act_as(1);
select lives_ok($$select delete_message_for_everyone(pg_temp.message_id())$$, 'sender deletes within the configured window');
select is((select body from messages where id = pg_temp.message_id()), 'Message deleted', 'old clients receive an explicit readable placeholder');
select ok((select deleted_at is not null from messages where id = pg_temp.message_id()), 'tombstone is explicit');
select is((select original->>'body' from deleted_message_evidence where message_id = pg_temp.message_id()), 'Keep this for safety.', 'original text survives privately for safety');
select ok(not has_table_privilege('authenticated', 'halal_mode_private.deleted_message_evidence', 'SELECT'), 'members cannot read retained evidence');
select ok(has_table_privilege('service_role', 'halal_mode_private.deleted_message_evidence', 'SELECT'), 'moderation service can read evidence');
select lives_ok($$select delete_message_for_everyone(pg_temp.message_id())$$, 'a lost deletion response can be retried');
select is((select count(*)::int from deleted_message_evidence where message_id = pg_temp.message_id()), 1, 'retry retains a single evidence row');
select is(send_message(pg_temp.connection_id(1, 2), 'Keep this for safety.', 'batch7_request_001')->>'body', 'Message deleted', 'old outbox retry cannot restore deleted text');
select is(get_connection_messages(pg_temp.connection_id(1, 2))->'messages'->0->>'body', 'Message deleted', 'sender reads the placeholder');
select is(get_connection(pg_temp.connection_id(1, 2))->>'lastMessageDeleted', 'true', 'connection preview marks the localized tombstone');
select pg_temp.act_as(2);
select is(get_connection_messages(pg_temp.connection_id(1, 2))->'messages'->0->>'body', 'Message deleted', 'recipient reads the placeholder');
select is(get_connection_message_deletions(pg_temp.connection_id(1, 2), array[pg_temp.message_id()])->0->>'id', pg_temp.message_id()::text, 'loaded history can refresh a tombstone outside the newest page');
select lives_ok($$select report_connection_member(pg_temp.connection_id(1, 2), 'harassment')$$, 'recipient can still report after deletion');
select pg_temp.act_as(1);
create temporary table expired as select send_message(pg_temp.connection_id(1, 2), 'This message is older.', 'batch7_request_002') as result;
select set_config('request.jwt.claims', '', true);
update messages set created_at = now() - interval '16 minutes' where id = (select (result->>'id')::uuid from expired);
select pg_temp.act_as(1);
select throws_ok($$select delete_message_for_everyone((select (result->>'id')::uuid from expired))$$, '22023', 'Message deletion window has ended', 'default fifteen-minute window is enforced server-side');
select set_config('request.jwt.claims', '', true);
update message_settings set delete_window = interval '20 minutes';
select pg_temp.act_as(1);
select lives_ok($$select delete_message_for_everyone((select (result->>'id')::uuid from expired))$$, 'changing the database setting changes the window without a client release');
select set_config('request.jwt.claims', '', true);
update message_settings set delete_window = interval '0';
select pg_temp.act_as(1);
create temporary table immediate as select send_message(pg_temp.connection_id(1, 2), 'A shorter configured window.', 'batch7_request_003') as result;
select ok(not (get_deletable_message_ids(pg_temp.connection_id(1, 2)) ? (select result->>'id' from immediate)), 'shortened setting also removes the offered delete action');
select throws_ok($$select delete_message_for_everyone((select (result->>'id')::uuid from immediate))$$, '22023', 'Message deletion window has ended', 'shortened setting is enforced by deletion too');
select ok(not has_table_privilege('authenticated', 'halal_mode_private.message_settings', 'UPDATE'), 'members cannot extend their own window');
select ok(not has_function_privilege('anon', 'public.delete_message_for_everyone(uuid)', 'EXECUTE'), 'anonymous deletion is forbidden');
select set_config('request.jwt.claims', '', true);
update message_settings set delete_window = interval '15 minutes';
insert into messages (connection_id, sender_id, voice_path, voice_duration_seconds)
values (pg_temp.connection_id(1, 2), pg_temp.member(1), 'private-voice-file', 5);
select pg_temp.act_as(1);
select lives_ok($$select delete_message_for_everyone((select id from messages where voice_path = 'private-voice-file'))$$, 'voice deletion is subject to the same rule');
-- Consent-history cascades require the existing service-role maintenance context.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select lives_ok($$delete from auth.users where id = pg_temp.member(1)$$, 'service-role account erasure completes with consent-history guards enabled');
select ok(not exists (select 1 from auth.users where id = pg_temp.member(1)), 'the Auth account was actually erased');
select ok(not exists (select 1 from member_legal_consent_history where user_id = pg_temp.member(1)), 'account erasure cascaded through consent history');
select is((select original->>'body' from deleted_message_evidence where message_id = pg_temp.message_id()), 'Keep this for safety.', 'safety evidence outlives account and connection deletion');
select ok(exists (select 1 from reports where reporter_id = pg_temp.member(2) and subject_id = pg_temp.member(1)), 'report also survives account deletion');

select ok(not has_function_privilege('authenticated', 'public.get_report_deleted_messages_service(uuid)', 'EXECUTE'), 'members cannot use the report evidence RPC');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is((select e->'original'->>'body' from jsonb_array_elements(get_report_deleted_messages_service((select id from reports where reporter_id = pg_temp.member(2) and subject_id = pg_temp.member(1)))) e where e->>'messageId' = pg_temp.message_id()::text),
  'Keep this for safety.', 'the report retains a service-only route to evidence after account deletion');

-- Closing or blocking does not remove the sender's remaining withdrawal window.
select set_config('request.jwt.claims', '', true);
select pg_temp.connect(17, 18);
insert into messages (connection_id, sender_id, body)
values (pg_temp.connection_id(17, 18), pg_temp.member(17), 'An owned message before closure.');
insert into blocks (blocker_id, blocked_id) values (pg_temp.member(18), pg_temp.member(17));
select pg_temp.act_as(17);
select lives_ok($$select delete_message_for_everyone((select id from messages where connection_id = pg_temp.connection_id(17, 18)))$$,
  'sender can still withdraw within the window after closure and a block');
select is((select body from messages where connection_id = pg_temp.connection_id(17, 18)), 'Message deleted', 'closed connection keeps the explicit tombstone too');

select * from finish();
rollback;
