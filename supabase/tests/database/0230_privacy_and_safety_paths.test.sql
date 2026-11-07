begin;
set local search_path = public, extensions, halal_mode_private;
select plan(29);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000230' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.nobody() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;

insert into auth.users (id, email, email_confirmed_at)
select pg_temp.member(n), 'privacy-' || n || '@example.test', now() from generate_series(1, 8) n;
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude,
                      bio, photos, onboarding_complete, marital_status, sensitive_consent_at)
select pg_temp.member(n), 'Member', 'Member' || n, '1995-01-01', case when n % 2 = 0 then 'female' else 'male' end::gender,
       'London', 'United Kingdom', 51.5, -0.1, repeat('a', 50), array[pg_temp.member(n)::text || '/p.jpg'],
       true, 'never_married', now() from generate_series(1, 8) n;
insert into private_preferences (user_id, matching_preferences_completed_at, preferred_countries)
select pg_temp.member(n), now(), array['United Kingdom'] from generate_series(1, 8) n;
insert into member_legal_consent_history (user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 8) n cross join legal_document_registry d where d.is_current;

-- M1. A set owed answers stays closed through every reader, not only the state call.
insert into rounds (user_id, tier, opens_at, expires_at)
values (pg_temp.member(1), 'free', now() - interval '1 hour', now() + interval '1 hour');
insert into introductions (round_id, viewer_id, subject_id)
select id, pg_temp.member(1), pg_temp.member(2) from rounds where user_id = pg_temp.member(1);
insert into connections (user_a, user_b, stage) values (pg_temp.member(1), pg_temp.member(4), 'choosing_questions');
select pg_temp.act_as(1);
select is(jsonb_array_length(get_current_round()->'introductions'), 1, 'with nothing owed the set is readable');
select ok(can_read_profile_media(pg_temp.member(2)::text), 'and so are its photos');
insert into question_picks (connection_id, user_id, question_id)
select id, pg_temp.member(4), 'q1' from connections where user_a = pg_temp.member(1) and user_b = pg_temp.member(4);
select is(get_current_round_state()->>'status', 'answers_owed', 'the state call reports the debt');
select is(get_current_round(), null::jsonb, 'the direct reader returns nothing while answers are owed');
select ok(not can_read_current_introduction((select id from introductions where viewer_id = pg_temp.member(1))),
  'a card is not readable while answers are owed');
select ok(not can_read_profile_media(pg_temp.member(2)::text), 'nor are its photos');
select ok(can_read_profile_media(pg_temp.member(4)::text), 'the connection owed answers stays visible');
select pg_temp.nobody();
delete from question_picks where user_id = pg_temp.member(4);
select pg_temp.act_as(1);
select is(jsonb_array_length(get_current_round()->'introductions'), 1, 'answering reopens the same set');

-- C1. Someone who keeps receipts private sees none, even when a send is retried after a read.
insert into connections (user_a, user_b, stage) values (pg_temp.member(3), pg_temp.member(6), 'open');
create function pg_temp.chat() returns uuid language sql as $$
  select id from connections where user_a = pg_temp.member(3) and user_b = pg_temp.member(6);
$$;
select pg_temp.act_as(3);
select set_my_read_receipts(false);
select send_message(pg_temp.chat(), 'Salaam', 'request-000000000001');
select pg_temp.act_as(6);
select mark_connection_messages_read(pg_temp.chat());
select ok((select read_at is not null from messages where client_request_id = 'request-000000000001'), 'the reader shares receipts, so one is stored');
select pg_temp.act_as(3);
select is(send_message(pg_temp.chat(), 'Salaam', 'request-000000000001')->>'read_at', null, 'a replayed send hides the receipt');
select is(send_message(pg_temp.chat(), 'Salaam', 'request-000000000001')->>'body', 'Salaam', 'and still returns the same message');
select is(get_connection_messages(pg_temp.chat())->'messages'->0->>'read_at', null, 'history hides it as before');

-- The unread dot clears for someone who reads without sending receipts.
select pg_temp.act_as(6);
select send_message(pg_temp.chat(), 'Wa alaykum', 'request-000000000002');
select pg_temp.act_as(3);
select ok((get_connection(pg_temp.chat())->>'unread')::boolean, 'a new message is unread');
select mark_connection_messages_read(pg_temp.chat());
select ok(not (get_connection(pg_temp.chat())->>'unread')::boolean, 'reading clears the dot without a receipt');
select is((select read_at from messages where client_request_id = 'request-000000000002'), null::timestamptz, 'and sends no receipt');

-- A1. The people someone can block or report are listed before new terms are accepted.
select pg_temp.nobody();
update legal_document_registry set is_current = false where document_type = 'terms';
insert into legal_document_registry (document_type, version, title, effective_date, url, is_current)
values ('terms', '2099-01-01', 'Terms of Service', '2099-01-01', 'https://halalmo.de/terms', true);
select pg_temp.act_as(3);
select ok((get_my_legal_consent_status()->>'required')::boolean, 'new terms are waiting to be accepted');
select is(jsonb_array_length(get_my_safety_contacts()), 1, 'the open connection is listed without fresh consent');
select is(get_my_safety_contacts()->0->>'name', 'Member6', 'by first name');
select lives_ok($$select block_connection_member(pg_temp.chat())$$, 'and can be blocked without fresh consent');
select is(jsonb_array_length(get_my_safety_contacts()), 0, 'a blocked person leaves the list');

-- A2. Acceptance names what was shown.
select throws_ok($$select accept_legal_documents('1999-01-01', '1999-01-01', true)$$, '22023', null, 'acceptance of versions that were not current is refused');
select lives_ok($$select accept_legal_documents(
  (select version from legal_document_registry where document_type = 'terms' and is_current),
  (select version from legal_document_registry where document_type = 'privacy' and is_current), true)$$,
  'the displayed current versions are accepted');

-- A3. Religion and ethnicity need explicit consent at the write itself.
select pg_temp.nobody();
update profiles set sensitive_consent_at = null where id = pg_temp.member(5);
select pg_temp.act_as(5);
select throws_ok($$select set_my_sect('sunni', null)$$, '42501', null, 'a sect needs consent, through the normal call');
select throws_ok($$update private_preferences set preferred_ethnicities = array['arab'] where user_id = pg_temp.member(5)$$,
  '42501', null, 'so does an ethnicity preference');
select lives_ok($$update profiles set bio = repeat('b', 60) where id = pg_temp.member(5)$$, 'other fields are unaffected');

-- A4. A leaving answer is counted only when the account is erased.
select pg_temp.act_as(7);
select record_exit_answer('married', 'my email is someone@example.test');
select request_my_account_deletion();
select cancel_my_account_deletion();
select ok(not exists (select 1 from pending_exit_answers where user_id = pg_temp.member(7)), 'staying withdraws the answer');
select pg_temp.act_as(8);
select record_exit_answer('married', 'my email is someone@example.test');
select request_my_account_deletion();
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
delete from auth.users where id = pg_temp.member(8);
select is((select count(*)::int from exit_answers where reason = 'married' and note is null and week = date_trunc('week', now())::date), 1,
  'erasure counts the reason, keeping none of the typed words');
-- "Something else" keeps the member's own words, and they are counted with it on erasure.
select pg_temp.act_as(7);
select record_exit_answer('other', '  I moved abroad  ');
select is((select note from pending_exit_answers where user_id = pg_temp.member(7)), 'I moved abroad', 'words are kept with "other"');
select request_my_account_deletion();
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
delete from auth.users where id = pg_temp.member(7);
select is((select count(*)::int from exit_answers where reason = 'other' and note = 'I moved abroad'), 1,
  'and counted with the reason on erasure');

select * from finish();
rollback;
