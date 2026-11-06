begin;
set local search_path = public, extensions, halal_mode_private;
select plan(29);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000227' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.connection() returns uuid language sql immutable as $$
  select '00000000-0000-0000-0000-00000002270c'::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.holds_lock(seed int) returns boolean language sql as $$
  select exists (select 1 from pg_locks where pid = pg_backend_pid() and locktype = 'advisory' and granted
    and classid::bigint = ((hashtextextended(pg_temp.connection()::text, seed) >> 32) & 4294967295)
    and objid::bigint = (hashtextextended(pg_temp.connection()::text, seed) & 4294967295));
$$;

insert into auth.users (id, email)
select pg_temp.member(n), 'cards-batch-' || n || '@example.test' from generate_series(1, 4) n;
insert into profiles (id, name, first_name, birth_date, gender, onboarding_complete, sensitive_consent_at)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01',
  case when n = 1 then 'female' else 'male' end::gender, true, now() from generate_series(1, 4) n;
insert into member_entitlements (user_id, tier, state, provider)
values (pg_temp.member(1), 'premium', 'active', 'test_fixture');
insert into member_legal_consent_history (user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 4) n cross join legal_document_registry d where d.is_current;
insert into connections (id, user_a, user_b, stage)
values (pg_temp.connection(), pg_temp.member(1), pg_temp.member(2), 'open');

select pg_temp.act_as(1);
create temporary table saved (id uuid);
insert into saved select (start_halal_cards_session(pg_temp.connection(), 'quiz-batch', '{"kind":"quiz","cursor":0}')->>'id')::uuid;
select ok(pg_temp.holds_lock(2270), 'start holds the connection limit lock until transaction end');
select pg_temp.act_as(2);
select respond_halal_cards_invite((select id from saved), true, 'both');
select submit_halal_cards_answer((select id from saved), 'q:first', '{"self":0}', 'host');
select is((select awaiting from halal_cards_sessions where id = (select id from saved)), 'host', 'first answer leaves the other seat owing');
select is(get_halal_cards_session((select id from saved))->'answers'->'q:first'->'mine', '{"self":0}'::jsonb, 'own answer is visible');
select pg_temp.act_as(1);
select is(get_halal_cards_session((select id from saved))->'answers'->'q:first', '{"theirReady":true}'::jsonb, 'partner answer stays sealed');
-- Both clients may have computed a single remaining seat before seeing either answer.
select submit_halal_cards_answer((select id from saved), 'q:first', '{"self":1}', 'guest');
select is((select awaiting from halal_cards_sessions where id = (select id from saved)), null, 'second answer overrides stale client attention');
select is((select version from halal_cards_sessions where id = (select id from saved)), 4, 'each new answer fences stale state writes');
select ok(not (get_halal_cards_attention() ? pg_temp.connection()::text), 'host has no answer debt after both answers');
select pg_temp.act_as(2);
select ok(not (get_halal_cards_attention() ? pg_temp.connection()::text), 'guest has no answer debt after both answers');
select throws_ok(format($$select advance_halal_cards_session(%L, 2, '{"kind":"quiz","cursor":1}', false)$$, (select id from saved)),
  '40001', 'This session has moved on', 'an advance computed before the answers is stale');
select advance_halal_cards_session((select id from saved), 4, '{"kind":"quiz","cursor":1}', false, 'both');
select submit_halal_cards_answer((select id from saved), 'q:first', '{"self":9}', null);
select is((select awaiting from halal_cards_sessions where id = (select id from saved)), 'both', 'old answer retry cannot erase next-card attention');
select is((select version from halal_cards_sessions where id = (select id from saved)), 5, 'immutable retry does not change version');
select is(get_halal_cards_session((select id from saved))->'answers'->'q:first'->'mine', '{"self":0}'::jsonb, 'immutable retry cannot replace the answer');

-- Full reads must return expiry without needing a hub/list visit first.
update halal_cards_sessions set status = 'invited', created_at = now() - interval '8 days' where id = (select id from saved);
select is(get_halal_cards_session((select id from saved))->>'status', 'expired', 'direct session read expires an old invitation');
select is((select status from halal_cards_sessions where id = (select id from saved)), 'expired', 'expiry is persisted');
select throws_ok(format($$select respond_halal_cards_invite(%L, true)$$, (select id from saved)),
  '55000', 'This invitation is no longer open', 'expired invitation cannot be accepted');
select pg_temp.act_as(1);
insert into halal_cards_sessions (connection_id, activity_id, host_id, state)
select pg_temp.connection(), 'limit-' || n, pg_temp.member(1), '{"kind":"lab","cursor":0}' from generate_series(1, 12) n;
select throws_ok($$select start_halal_cards_session(pg_temp.connection(), 'limit-extra', '{"kind":"lab","cursor":0}')$$,
  '54000', 'Too many unfinished Halal Cards', 'a thirteenth unfinished session is refused');
update halal_cards_sessions set created_at = now() - interval '8 days' where activity_id = 'limit-1';
select lives_ok($$select start_halal_cards_session(pg_temp.connection(), 'limit-extra', '{"kind":"lab","cursor":0}')$$, 'start expires an old slot before counting');

-- Proposal/restore use the same lock, and duplicates may agree at the cap.
create temporary table journal (id uuid);
insert into journal select propose_halal_cards_guide_entry(pg_temp.connection(), 'Listen before answering.', null);
select ok(pg_temp.holds_lock(2271), 'proposal holds the journal lock until transaction end');
insert into halal_cards_guide (connection_id, body, proposed_by)
select pg_temp.connection(), 'Practice kindness ' || repeat('x', n), pg_temp.member(1) from generate_series(1, 199) n;
select pg_temp.act_as(2);
select is(propose_halal_cards_guide_entry(pg_temp.connection(), '  LISTEN BEFORE ANSWERING.  ', null), (select id from journal), 'duplicate proposal agrees even at the cap');
select ok((select agreed_at is not null from halal_cards_guide where id = (select id from journal)), 'other member agreed to the existing entry');
select throws_ok($$select propose_halal_cards_guide_entry(pg_temp.connection(), 'A new promise.', null)$$,
  '54000', 'The journal is full', 'new proposal cannot exceed the cap');
select remove_halal_cards_guide_entry((select id from journal));
select propose_halal_cards_guide_entry(pg_temp.connection(), 'A replacement promise.', null);
select throws_ok(format($$select restore_halal_cards_guide_entry(%L)$$, (select id from journal)),
  '54000', 'The journal is full', 'restore cannot exceed the cap');
select remove_halal_cards_guide_entry((select id from halal_cards_guide where body = 'A replacement promise.'));
select lives_ok(format($$select restore_halal_cards_guide_entry(%L)$$, (select id from journal)), 'restore works once a slot is free');
select is((select count(*)::int from halal_cards_guide where connection_id = pg_temp.connection() and removed_at is null), 200, 'restoration stops at exactly 200 entries');
select remove_halal_cards_guide_entry((select id from journal));
select propose_halal_cards_guide_entry(pg_temp.connection(), 'Listen before answering.', null);
select throws_ok(format($$select restore_halal_cards_guide_entry(%L)$$, (select id from journal)),
  '23505', 'This entry is already in the journal', 'restore cannot duplicate a replacement with the same words');
select pg_temp.act_as(3);
select throws_ok(format($$select get_halal_cards_session(%L)$$, (select id from saved)),
  'P0002', 'Connection not found', 'outsider cannot use the new expiry path');

-- Reset clears only sample queue rows, preserving real waits and safety controls.
select set_config('request.jwt.claims', '', true);
insert into demo_members (user_id) values (pg_temp.member(3));
update release_flags set enabled = true where key = 'tester_tools';
insert into release_flag_members (key, user_id) values ('tester_tools', pg_temp.member(1))
on conflict (key, user_id) do nothing;
insert into mutual_connection_queue (user_a, user_b) values (pg_temp.member(1), pg_temp.member(3)), (pg_temp.member(1), pg_temp.member(4));
select pg_temp.act_as(1);
select reset_my_sample_flow();
select ok(not exists (select 1 from mutual_connection_queue where user_a = pg_temp.member(1) and user_b = pg_temp.member(3)), 'reset removes a waiting sample mutual');
select ok(exists (select 1 from mutual_connection_queue where user_a = pg_temp.member(1) and user_b = pg_temp.member(4)), 'reset preserves a real waiting mutual');
select ok(exists (select 1 from connections where id = pg_temp.connection()), 'reset preserves the real connection');

select * from finish();
rollback;
