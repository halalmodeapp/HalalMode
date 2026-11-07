begin;
set local search_path = public, extensions, halal_mode_private;
select plan(64);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000229' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.service() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"service_role"}', true);
$$;
create function pg_temp.owner() returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(12), 'role', 'authenticated', 'aal', 'aal2',
    'amr', jsonb_build_array(jsonb_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 30)))::text, true);
$$;
create function pg_temp.connection(a int, b int) returns uuid language sql as $$
  insert into connections(user_a, user_b, stage)
  values(least(pg_temp.member(a), pg_temp.member(b)), greatest(pg_temp.member(a), pg_temp.member(b)), 'open') returning id;
$$;

insert into auth.users(id, email, email_confirmed_at)
select pg_temp.member(n), 'rules-' || n || '@example.test', now() from generate_series(1,12) n;
insert into profiles(id, name, first_name, birth_date, gender, onboarding_complete, sensitive_consent_at, marital_status)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01', case when n = 2 then 'female' else 'male' end::gender,
  true, now(), 'never_married' from generate_series(1,12) n;
insert into member_legal_consent_history(user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1,12) n cross join legal_document_registry d where d.is_current;
insert into admin_members(user_id, role) values(pg_temp.member(12), 'owner');

-- Cancel during the hold, keeping only what the deletion request has not erased.
create temp table leaving_connection as select pg_temp.connection(1,2) id;
select pg_temp.act_as(1);
select is(get_my_account_deletion()->>'pending', 'false', 'there is initially no deletion');
select request_my_account_deletion();
select is(get_my_account_deletion()->>'recoverable', 'true', 'a fresh request offers recovery');
select lives_ok($$select cancel_my_account_deletion()$$, 'the member cancels during the hold');
select is(get_my_account_deletion()->>'pending', 'false', 'cancellation removes the pending request');
select ok((select is_paused from profiles where id = pg_temp.member(1)), 'a returning member stays paused');
select is((select stage::text from connections where id = (select id from leaving_connection)), 'closed', 'closed conversations do not return');
select is((select count(*)::int from audit_events where actor_id = pg_temp.member(1) and event_type = 'account_deletion_cancelled'), 1, 'cancellation is audited');
select cancel_my_account_deletion();
select is((select count(*)::int from audit_events where actor_id = pg_temp.member(1) and event_type = 'account_deletion_cancelled'), 1, 'a retry does not add an event');
select pg_temp.service();
select ok(not renew_account_deletion_claim_service(pg_temp.member(1), gen_random_uuid()), 'a cancelled request cannot renew an erasure lease');
select ok(not exists(select 1 from claim_account_deletion_requests_fenced(100) where user_id = pg_temp.member(1)), 'the fenced finalizer cannot claim a cancellation');
select ok(not exists(select 1 from claim_account_deletion_requests(100) where user_id = pg_temp.member(1)), 'the installed finalizer cannot claim a cancellation');
select pg_temp.act_as(1);
select lives_ok($$select set_my_profile_paused(false)$$, 'the returning member explicitly resumes');
select ok(not (select is_paused from profiles where id = pg_temp.member(1)), 'resume releases the voluntary pause');
select request_my_account_deletion();
update account_deletion_requests set requested_at = now() - interval '31 days' where user_id = pg_temp.member(1);
select throws_ok($$select cancel_my_account_deletion()$$, '22023', 'The recovery period has ended', 'recovery ends after the hold');
select pg_temp.service();
create temp table deletion_claim as select * from claim_account_deletion_requests_fenced(100) where user_id = pg_temp.member(1);
select pg_temp.act_as(1);
select throws_ok($$select cancel_my_account_deletion()$$, '22023', 'The recovery period has ended', 'a claimed erasure cannot be cancelled');

-- A consent withdrawal uses this same deletion request and its recovery window.
select pg_temp.act_as(2);
select record_exit_answer('privacy');
create function pg_temp.fail_deletion() returns trigger language plpgsql as $$
begin raise exception 'Deletion failed for this test'; end;
$$;
create trigger fail_deletion before insert on account_deletion_requests for each row execute function pg_temp.fail_deletion();
select throws_ok($$select request_my_account_deletion()$$, 'P0001', 'Deletion failed for this test', 'a deletion failure does not undo the leaving answer');
drop trigger fail_deletion on account_deletion_requests;
select is((select count(*)::int from exit_answers where reason = 'privacy'), 1, 'the anonymous answer counts independently');
select request_my_account_deletion();
select is(get_my_account_deletion()->>'recoverable', 'true', 'privacy departure has the same hold');
select cancel_my_account_deletion();

-- Suspension expiry and lifting bans preserve voluntary pauses.
select pg_temp.act_as(9);
select set_my_profile_paused(true);
select pg_temp.act_as(10);
select set_my_profile_paused(false);
select pg_temp.service();
select apply_admin_member_action_service(pg_temp.member(9), 'suspend', pg_temp.member(12), 'reviewed account');
select apply_admin_member_action_service(pg_temp.member(10), 'suspend', pg_temp.member(12), 'reviewed account');
select ok((select is_paused from profiles where id = pg_temp.member(10)), 'suspension projects to the old pause flag');
select pg_temp.act_as(10);
select throws_ok($$select set_my_profile_paused(false)$$, '42501', 'A restricted account cannot be resumed', 'a member cannot undo a live suspension');
select pg_temp.service();
update member_pause_causes set suspension_until = now() - interval '1 second' where user_id in (pg_temp.member(9), pg_temp.member(10));
select is(expire_member_suspensions(), 2, 'both timed suspensions expire');
select ok((select is_paused from profiles where id = pg_temp.member(9)), 'a self-paused member stays paused');
select ok(not (select is_paused from profiles where id = pg_temp.member(10)), 'another member returns automatically');
select is(expire_member_suspensions(), 0, 'expiry is repeatable');
select apply_admin_member_action_service(pg_temp.member(10), 'ban', pg_temp.member(12), 'reviewed account');
select is(expire_member_suspensions(), 0, 'a ban is never timed out');
select ok((select is_paused from profiles where id = pg_temp.member(10)), 'the ban stays projected');
select apply_admin_member_action_service(pg_temp.member(10), 'unban', pg_temp.member(12), 'reviewed account');
select ok(not (select is_paused from profiles where id = pg_temp.member(10)), 'an admin lifts the ban');
select apply_admin_member_action_service(pg_temp.member(9), 'ban', pg_temp.member(12), 'reviewed account');
select apply_admin_member_action_service(pg_temp.member(9), 'unban', pg_temp.member(12), 'reviewed account');
select ok((select is_paused from profiles where id = pg_temp.member(9)), 'lifting a ban also preserves voluntary pause');

-- Play already underway survives Premium; a new start or an unaccepted invite does not.
create temp table cards_connection as select pg_temp.connection(3,4) id;
insert into member_entitlements(user_id,tier,state,provider) values(pg_temp.member(3),'premium','active','test_fixture');
select pg_temp.act_as(3);
create temp table active_game as select (start_halal_cards_session((select id from cards_connection), 'game-a', '{}')->>'id')::uuid id;
create temp table invite as select (start_halal_cards_session((select id from cards_connection), 'game-b', '{}')->>'id')::uuid id;
select pg_temp.act_as(4);
select respond_halal_cards_invite((select id from active_game),true);
delete from member_entitlements where user_id = pg_temp.member(3);
select lives_ok($$select submit_halal_cards_answer((select id from active_game),'q:first','"yes"')$$, 'an answer in play survives Premium ending');
select lives_ok($$select advance_halal_cards_session((select id from active_game), (select version from halal_cards_sessions where id = (select id from active_game)), '{}', true)$$, 'the game can be finished');
select throws_ok($$select start_halal_cards_session((select id from cards_connection),'game-c','{}')$$, '42501', 'Halal Cards needs Premium for this connection', 'no new game after Premium ends');
select throws_ok($$select respond_halal_cards_invite((select id from invite),true)$$, '42501', 'Halal Cards needs Premium for this connection', 'an unstarted invite cannot start after lapse');
select pg_temp.act_as(3);
select throws_ok($$select start_halal_cards_session((select id from cards_connection),'game-d','{}')$$, '42501', 'Halal Cards needs Premium for this connection', 'the former subscriber cannot start either');

-- Old closes get a generic note. Both custom and generic notes survive sender deletion.
create temp table farewell_connection as select pg_temp.connection(5,6) id;
select pg_temp.service();
delete from member_legal_consent_history where user_id = pg_temp.member(5);
select pg_temp.act_as(5);
select throws_ok($$select close_connection((select id from farewell_connection))$$,
  '42501', 'Current legal documents must be accepted', 'the installed close RPC requires current consent');
select ok((select closed_at is null from connections where id = (select id from farewell_connection))
  and not exists(select 1 from connection_farewells where connection_id = (select id from farewell_connection)),
  'a refused close changes neither the connection nor the farewell');
select pg_temp.service();
insert into member_legal_consent_history(user_id, document_type, version, acceptance_context)
select pg_temp.member(5), document_type, version, 'reacceptance' from legal_document_registry where is_current;
select pg_temp.act_as(5);
select lives_ok($$select close_connection((select id from farewell_connection))$$, 'the installed close RPC still works');
select pg_temp.act_as(6);
select is(get_my_farewells()->0->>'reason', 'generic', 'the recipient receives a generic kind note');
-- Erasure runs as the finalizer, not as the recipient reading a farewell.
select pg_temp.service();
delete from auth.users where id = pg_temp.member(5);
select pg_temp.act_as(6);
select is(jsonb_array_length(get_my_farewells()), 1, 'the note survives cascading account and connection deletion');
select is(get_my_farewells()->0->>'name', null, 'the erased sender has no name');
select mark_farewell_seen((select id from farewell_connection));
select is(jsonb_array_length(get_my_farewells()), 0, 'an anonymous note can still be dismissed');
create temp table custom_farewell as select pg_temp.connection(7,8) id;
select pg_temp.act_as(7);
select close_connection_with_farewell((select id from custom_farewell),'other','Wishing you well');
select pg_temp.service();
delete from auth.users where id = pg_temp.member(7);
select pg_temp.act_as(8);
select is(get_my_farewells()->0->>'message', 'Wishing you well', 'the farewell text also survives');

-- Review evidence waits for a human decision, including a replaced selfie.
insert into member_selfies(user_id,path,status) values(pg_temp.member(8),pg_temp.member(8)::text || '/review.jpg','review');
insert into selfie_files(user_id,path,purge_after) select user_id,path,now()-interval '40 days' from member_selfies where user_id=pg_temp.member(8);
insert into moderation_queue(user_id,kind,ref,decision,decided_at)
select user_id,'selfie',path,'review',now()-interval '40 days' from member_selfies where user_id=pg_temp.member(8);
select ok(not (selfies_to_purge_service(200) ? (pg_temp.member(8)::text || '/review.jpg')), 'overdue evidence is held for unresolved human review');
select pg_temp.owner();
select admin_mark_reviewed((select id from moderation_queue where user_id=pg_temp.member(8) and kind='selfie'),'reviewed evidence','rejected');
select is((select purge_after from selfie_files where user_id=pg_temp.member(8)), now()+interval '30 days', 'a human decision starts 30 days of retention');
update selfie_files set purge_after=now()-interval '1 second' where user_id=pg_temp.member(8);
select ok(selfies_to_purge_service(200) ? (pg_temp.member(8)::text || '/review.jpg'), 'decided evidence becomes due');

-- Every transition between available declarations remains legal and logged.
select pg_temp.act_as(8);
select lives_ok($$select set_my_marital_status('married')$$, 'never married may become married');
select lives_ok($$select set_my_marital_status('divorced')$$, 'married may become divorced');
select lives_ok($$select set_my_marital_status('widowed')$$, 'divorced may become widowed');
select lives_ok($$select set_my_marital_status('never_married')$$, 'a declaration can return to never married');
select lives_ok($test$do $body$
declare a text; b text;
begin
  foreach a in array array['never_married','divorced','widowed','married'] loop
    foreach b in array array['never_married','divorced','widowed','married'] loop
      perform set_my_marital_status(a);
      perform set_my_marital_status(b);
    end loop;
  end loop;
end;
$body$;$test$, 'all transitions between available marital statuses are allowed');
delete from marital_status_log where user_id=pg_temp.member(8);
insert into marital_status_log(user_id,status,previous_status,changed_at) values
 (pg_temp.member(8),'married',null,now()-interval '9 days'),
 (pg_temp.member(8),'never_married','married',now()-interval '2 days');
select is(check_marital_status_changes(), 1, 'the suspicious-change alert is kept');

-- Only a successful provider settlement spends a budget, exactly once.
insert into notification_devices(user_id,platform,token_hash,push_token,notifications_enabled)
values(pg_temp.member(8),'ios','rules-token-hash','ExponentPushToken[rules]',true);
insert into retention_nudges(user_id,kind,ref) values(pg_temp.member(8),'quiet_match',(select id from cards_connection));
select ok(try_enqueue_reminder(pg_temp.member(8),'quiet_match',(select id from cards_connection)), 'a reminder queues');
select is((select sent_count from retention_nudges where user_id=pg_temp.member(8)), 0, 'queuing consumes no budget');
select pg_temp.service();
select settle_notifications_service(null, (select jsonb_build_array(jsonb_build_object('id',id,'error','provider failed')) from notification_outbox where user_id=pg_temp.member(8) and kind='quiet_match'));
select is((select sent_count from retention_nudges where user_id=pg_temp.member(8)), 0, 'provider failure consumes no budget');
select settle_notifications_service((select array_agg(id) from notification_outbox where user_id=pg_temp.member(8) and kind='quiet_match'));
select is((select sent_count from retention_nudges where user_id=pg_temp.member(8)), 1, 'successful delivery consumes one');
select settle_notifications_service((select array_agg(id) from notification_outbox where user_id=pg_temp.member(8) and kind='quiet_match'));
select is((select sent_count from retention_nudges where user_id=pg_temp.member(8)), 1, 'settlement retry cannot count twice');
select ok(try_enqueue_reminder(pg_temp.member(8),'quiet_match',(select id from cards_connection)), 'a later reminder can queue');
update notification_outbox set sent_at=now(),last_error='expired' where user_id=pg_temp.member(8) and sent_at is null;
select is((select sent_count from retention_nudges where user_id=pg_temp.member(8)), 1, 'expired outbox work consumes no budget');

-- Removing an admin removes all tester access and only tester Premium.
insert into admin_members(user_id,role) values(pg_temp.member(11),'viewer');
insert into release_flag_members(key,user_id) values('tester_premium_switch',pg_temp.member(11)) on conflict do nothing;
insert into member_entitlements(user_id,tier,state,provider) values(pg_temp.member(11),'premium','active','tester');
select pg_temp.owner();
select lives_ok($$select admin_remove_member(pg_temp.member(11),'reviewed team change')$$, 'an owner removes an admin');
select ok(not exists(select 1 from release_flag_members where user_id=pg_temp.member(11) and key in ('tester_tools','demo_introductions','tester_premium_switch')), 'tester memberships are removed');
select ok(not exists(select 1 from member_entitlements where user_id=pg_temp.member(11) and provider='tester'), 'tester Premium is removed');
select is((select tier::text from profiles where id=pg_temp.member(11)), 'free', 'old clients see the demotion');
insert into admin_members(user_id,role) values(pg_temp.member(11),'viewer');
insert into member_entitlements(user_id,tier,state,provider) values(pg_temp.member(11),'premium','active','app_store');
select admin_remove_member(pg_temp.member(11),'reviewed team change');
select is((select tier::text from profiles where id=pg_temp.member(11)), 'premium', 'a real subscription survives admin removal');
select ok(not has_function_privilege('anon','public.cancel_my_account_deletion()','execute'), 'cancellation is signed-in only');
select ok(not has_function_privilege('authenticated','halal_mode_private.expire_member_suspensions()','execute'), 'members cannot run expiry jobs');

select * from finish();
rollback;
