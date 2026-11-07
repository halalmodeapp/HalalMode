begin;
set local search_path = public, extensions, halal_mode_private;
select plan(78);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000224' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.token(n int) returns uuid language sql immutable as $$
  select ('10000000-0000-0000-0000-0000000224' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.owner() returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(4), 'role', 'authenticated', 'aal', 'aal2',
    'amr', jsonb_build_array(jsonb_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 30)))::text, true);
$$;
insert into auth.users(id, email, email_confirmed_at)
select pg_temp.member(n), 'workers-' || n || '@example.test', now() from generate_series(1, 4) n;
insert into profiles(id, name, first_name, birth_date, gender, city, country, bio, photos, onboarding_complete, sensitive_consent_at)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01', 'male', 'London', 'United Kingdom', repeat('a', 50),
  array[pg_temp.member(n)::text || '/p.jpg'], true, now() from generate_series(1, 4) n;
insert into member_legal_consent_history(user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 4) n cross join legal_document_registry d where d.is_current;
insert into admin_members(user_id, role) values(pg_temp.member(4), 'owner');
delete from moderation_queue;
delete from mail_outbox;
delete from notification_outbox;
delete from matching_photo_analysis_queue;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- A reclaimed moderation row belongs only to its successor.
insert into moderation_queue(id, user_id, kind, ref) values(22401, pg_temp.member(1), 'bio', repeat('a', 50));
select claim_moderation_fenced_service(10, pg_temp.token(1));
select is((select claim_token from moderation_queue where id = 22401), pg_temp.token(1), 'moderation claim stores ownership');
update moderation_queue set claimed_until = now() - interval '1 minute' where id = 22401;
select claim_moderation_fenced_service(10, pg_temp.token(2));
select release_moderation_fenced_service(22401, pg_temp.token(1));
select ok((select claimed_until > now() from moderation_queue where id = 22401), 'old moderation release leaves successor lease');
select settle_moderation_fenced_service(22401, 'remove', 'stale result', pg_temp.token(1));
select is((select decision from moderation_queue where id = 22401), null, 'old moderation result is ignored');
select settle_moderation_service(22401, 'allow', 'legacy result');
select is((select decision from moderation_queue where id = 22401), null, 'legacy result cannot settle fenced moderation');
select settle_moderation_fenced_service(22401, 'allow', 'current result', pg_temp.token(2));
select is((select decision from moderation_queue where id = 22401), 'allow', 'current moderation result settles');
insert into moderation_queue(id, user_id, kind, ref) values(22402, pg_temp.member(1), 'bio', 'legacy');
select claim_moderation_service(10);
select settle_moderation_service(22402, 'allow', 'old worker');
select is((select decision from moderation_queue where id = 22402), 'allow', 'old moderation worker still works');

-- Exhausted selfies reach human review and start the existing review retention clock.
insert into member_selfies(user_id, path) values(pg_temp.member(1), pg_temp.member(1)::text || '/selfie.jpg');
insert into selfie_files(user_id, path) values(pg_temp.member(1), pg_temp.member(1)::text || '/selfie.jpg');
insert into moderation_queue(id, user_id, kind, ref, attempts, claimed_until, claim_token)
values(22403, pg_temp.member(1), 'selfie', pg_temp.member(1)::text || '/selfie.jpg', 4, now() - interval '1 minute', pg_temp.token(1));
select claim_moderation_fenced_service(10, pg_temp.token(2));
select is((select decision from moderation_queue where id = 22403), 'review', 'exhausted moderation is handed to a person');
select is((select status from member_selfies where user_id = pg_temp.member(1)), 'review', 'selfie verdict remains reviewable');
select is((select purge_after from selfie_files where user_id = pg_temp.member(1)), null::timestamptz, 'exhausted human review has no purge deadline');
select is((select count(*)::int from mail_outbox where kind = 'moderation' and ref_id = '22403'), 1, 'exhaustion queues one review email');
select claim_moderation_service(10);
select is((select count(*)::int from mail_outbox where ref_id = '22403'), 1, 'repeated sweeping does not duplicate review');
select pg_temp.owner();
select ok(exists(select 1 from jsonb_array_elements(admin_review_queue(200)) x where x->>'id' = '22403'), 'exhausted moderation is in the admin review list');
select admin_mark_reviewed(22403, 'Human checked the selfie', 'verified');
select is((select status from member_selfies where user_id = pg_temp.member(1)), 'verified', 'human verdict supersedes the fenced worker');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- Photo completion holds the queue row until storage and dequeue finish.
update matching_signal_metric_config set enabled = true where metric_key = 'luna_presentation';
insert into matching_photo_analysis_queue(photo_hash, owner_id, storage_path)
values(encode(digest(pg_temp.member(2)::text || '/p.jpg', 'sha256'), 'hex'), pg_temp.member(2), pg_temp.member(2)::text || '/p.jpg');
select claim_matching_photo_analysis_fenced_service(3, pg_temp.token(1));
update matching_photo_analysis_queue set claimed_until = now() - interval '1 minute';
select claim_matching_photo_analysis_fenced_service(3, pg_temp.token(2));
select release_matching_photo_analysis_fenced_service((select photo_hash from matching_photo_analysis_queue), pg_temp.token(1));
select ok((select claimed_until > now() from matching_photo_analysis_queue), 'old photo release preserves new lease');
select ok(not complete_matching_photo_analysis_fenced_service(
  (select photo_hash from matching_photo_analysis_queue), pg_temp.member(2), pg_temp.member(2)::text || '/p.jpg',
  '{"clarity":0.5,"lighting":0.5,"framing":0.5,"background_distraction":0.5}', 'model', '1', pg_temp.token(1)), 'old photo result is rejected');
select is((select count(*)::int from matching_photo_presentations where owner_id = pg_temp.member(2)), 0, 'stale photo result writes no features');
select ok(complete_matching_photo_analysis_fenced_service(
  (select photo_hash from matching_photo_analysis_queue), pg_temp.member(2), pg_temp.member(2)::text || '/p.jpg',
  '{"clarity":0.5,"lighting":0.5,"framing":0.5,"background_distraction":0.5}', 'model', '1', pg_temp.token(2)), 'current photo result is saved');
select is((select count(*)::int from matching_photo_analysis_queue), 0, 'only current photo completion dequeues');

insert into matching_photo_analysis_queue(photo_hash, owner_id, storage_path, attempts, claim_token)
values(encode(digest(pg_temp.member(1)::text || '/p.jpg', 'sha256'), 'hex'), pg_temp.member(1), pg_temp.member(1)::text || '/p.jpg', 5, pg_temp.token(1));
select queue_matching_photo_analysis_backfill_service(50);
select is((select attempts::int from matching_photo_analysis_queue where owner_id = pg_temp.member(1)), 0, 'confirmed backfill can retry exhausted photo analysis');
select ok((select claim_token is distinct from pg_temp.token(1) from matching_photo_analysis_queue where owner_id = pg_temp.member(1)), 'photo retry invalidates the exhausted claim');

-- Mail cannot reopen a sent row, reserve the same budget twice or switch provider.
delete from mail_outbox;
insert into mail_outbox(id, kind, ref_id) values(22410, 'report', 'not-a-report');
select claim_mail_fenced_service(1, 100, pg_temp.token(1), 'resend');
select is((select provider from mail_outbox where id = 22410), 'resend', 'mail pins its first provider');
update mail_outbox set claimed_until = now() - interval '1 minute' where id = 22410;
select is(jsonb_array_length(claim_mail_fenced_service(1, 100, pg_temp.token(2), 'ses')), 0, 'another provider cannot claim pinned mail');
select claim_mail_fenced_service(1, 100, pg_temp.token(2), 'resend');
select is((select provider from mail_outbox where id = 22410), 'resend', 'mail reclaim keeps the original provider');
select settle_mail_fenced_service(22410, false, 'old failure', pg_temp.token(1));
select is((select last_error from mail_outbox where id = 22410), null, 'old mail failure cannot back off a newer claim');
select settle_mail_service(22410, true);
select is((select sent_at from mail_outbox where id = 22410), null, 'legacy mail result cannot settle a fenced claim');
select settle_mail_fenced_service(22410, true, null, pg_temp.token(2));
select settle_mail_fenced_service(22410, false, 'late failure', pg_temp.token(2));
select ok((select sent_at is not null and last_error is null from mail_outbox where id = 22410), 'late mail failure never reopens delivered mail');
insert into mail_outbox(id, kind, ref_id) values(22411, 'report', 'legacy');
select claim_mail_service(1, 100);
select settle_mail_service(22411, true);
select ok((select sent_at is not null from mail_outbox where id = 22411), 'legacy mail still settles its own claim');
delete from mail_outbox;
insert into mail_outbox(kind, ref_id) select 'report', 'budget-' || n from generate_series(1, 15) n;
select is(jsonb_array_length(claim_mail_fenced_service(7, 11, pg_temp.token(1), 'resend')), 7, 'first claim reserves seven safety slots');
select is(jsonb_array_length(claim_mail_fenced_service(7, 11, pg_temp.token(2), 'resend')), 4, 'next claim sees the in-flight budget reservations');
select is(jsonb_array_length(claim_mail_service(7, 11)), 0, 'legacy claim shares the reserved budget');

-- Exhausted mail stays visible and can be explicitly retried by an owner.
insert into mail_outbox(id, kind, ref_id, attempts) values(22412, 'report', 'exhausted', 12);
select pg_temp.owner();
select ok((admin_system_health()->'email'->>'failed')::int >= 1, 'exhausted mail remains visible');
select ok(admin_retry_worker('mail', 22412, 'Fixed the provider configuration'), 'owner can retry exhausted mail');
select is((select attempts::int from mail_outbox where id = 22412), 0, 'explicit mail retry resets attempts');
select ok((select claim_token is not null from mail_outbox where id = 22412), 'retry invalidates legacy and fenced ownership');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- Push success, failure and dead-device effects all require ownership.
insert into notification_devices(user_id, token_hash, push_token, platform, locale, notifications_enabled)
values(pg_temp.member(1), 'workers-token', 'ExponentPushToken[workers]', 'ios', 'en', true);
insert into notification_outbox(user_id, kind) values(pg_temp.member(1), 'new_message');
create temp table push_id as select id from notification_outbox;
select claim_notifications_fenced_service(10, pg_temp.token(1));
update notification_outbox set claimed_until = now() - interval '1 minute';
select claim_notifications_fenced_service(10, pg_temp.token(2));
select settle_notifications_fenced_service(array[(select id from push_id)], '[]', array['ExponentPushToken[workers]'], pg_temp.token(1));
select is((select sent_at from notification_outbox), null, 'old push success cannot settle a successor');
select ok((select notifications_enabled from notification_devices where push_token = 'ExponentPushToken[workers]'), 'old push result cannot retire a device');
select settle_notifications_fenced_service(array[(select id from push_id)], '[]', '{}', pg_temp.token(2));
select ok((select sent_at is not null from notification_outbox), 'current push success settles');

-- Summary claims survive late deletion/update and recheck the relationship.
insert into connections(user_a, user_b, stage) values(pg_temp.member(1), pg_temp.member(2), 'recap');
create temp table summary_id as select id from connections where user_a = pg_temp.member(1) and user_b = pg_temp.member(2);
select is(claim_connection_summary_service((select id from summary_id), pg_temp.member(1), 'en', pg_temp.token(1)), pg_temp.token(1), 'summary claim is acquired');
select is(claim_connection_summary_service((select id from summary_id), pg_temp.member(1), 'en', pg_temp.token(2)), null, 'fresh summary cannot be reclaimed');
select set_config('app.summary_claim_token', pg_temp.token(1)::text, true);
update connection_summaries set created_at = now() - interval '3 minutes';
select is(claim_connection_summary_service((select id from summary_id), pg_temp.member(1), 'en', pg_temp.token(2)), pg_temp.token(2), 'stale summary can be reclaimed');
select ok(not settle_connection_summary_service((select id from summary_id), pg_temp.member(1), 'en', null, pg_temp.token(1)), 'old summary cannot delete successor');
select ok(not settle_connection_summary_service((select id from summary_id), pg_temp.member(1), 'en', 'old text', pg_temp.token(1)), 'old summary cannot replace successor');
select set_config('app.summary_claim_token', '', true);
select throws_ok($$delete from connection_summaries$$, '40001', 'Summary claim changed', 'old Edge direct deletion is fenced');
select ok(settle_connection_summary_service((select id from summary_id), pg_temp.member(1), 'en', 'new text', pg_temp.token(2)), 'current summary is saved');
select is((select body from connection_summaries), 'new text', 'summary preserves successor text');
select claim_connection_summary_service((select id from summary_id), pg_temp.member(1), 'ar', pg_temp.token(1));
update connections set closed_at = now(), stage = 'closed' where id = (select id from summary_id);
select ok(not settle_connection_summary_service((select id from summary_id), pg_temp.member(1), 'ar', 'private text', pg_temp.token(1)), 'summary completion rechecks the relationship');
select ok(not exists(select 1 from connection_summaries where language = 'ar'), 'disallowed summary claim is discarded');
select set_config('app.summary_claim_token', '', true);
select lives_ok($$delete from connections where id = (select id from summary_id)$$, 'erasure can cascade a fenced summary');

-- The current legal consent is also required when a provider result returns.
insert into connections(user_a, user_b, stage) values(pg_temp.member(1), pg_temp.member(2), 'recap');
update summary_id set id = (select id from connections where user_a = pg_temp.member(1) and user_b = pg_temp.member(2));
select claim_connection_summary_service((select id from summary_id), pg_temp.member(1), 'en', pg_temp.token(1));
delete from member_legal_consent_history where user_id = pg_temp.member(2);
select ok(not settle_connection_summary_service((select id from summary_id), pg_temp.member(1), 'en', 'no consent', pg_temp.token(1)), 'summary completion rechecks current consent');
insert into member_legal_consent_history(user_id, document_type, version, acceptance_context)
select pg_temp.member(2), document_type, version, 'onboarding' from legal_document_registry where is_current;

-- The Storage inventory survives a lost blur marker.
insert into storage.objects(bucket_id, name) values('profile-photos-blurred', pg_temp.member(3)::text || '/orphan.jpg');
select ok(blurs_to_remove_service(200) ? (pg_temp.member(3)::text || '/orphan.jpg'), 'unmarked detached blur is discoverable');

-- Reminder accounting distinguishes a new enqueue from mute/device/coalescing skips.
select ok(not try_enqueue_notification(pg_temp.member(3), 'quiet_match'), 'missing device does not spend a reminder');
insert into notification_muted_kinds(user_id, kind) values(pg_temp.member(1), 'quiet_match');
select ok(not try_enqueue_notification(pg_temp.member(1), 'quiet_match'), 'muted kind does not spend a reminder');
select ok(try_enqueue_notification(pg_temp.member(1), 'waiting_on_you'), 'a new reminder enters the outbox');
select ok(not try_enqueue_notification(pg_temp.member(1), 'waiting_on_you'), 'an existing pending reminder coalesces');

-- The reminder caller respects enqueue rejection too.
update profiles set longitude = (12 - extract(hour from now() at time zone 'utc')) * 15 where id = pg_temp.member(1);
insert into retention_nudges(user_id, kind, ref, first_seen)
values(pg_temp.member(1), 'recap_ready', (select id from summary_id), now() - interval '2 days');
insert into notification_muted_kinds(user_id, kind) values(pg_temp.member(1), 'recap_ready');
select queue_recap_reminders();
select is((select sent_count from retention_nudges where user_id = pg_temp.member(1) and kind = 'recap_ready'), 0, 'muted recap reminder keeps its budget');
delete from notification_muted_kinds where user_id = pg_temp.member(1) and kind = 'recap_ready';
select queue_recap_reminders();
select is((select sent_count from retention_nudges where user_id = pg_temp.member(1) and kind = 'recap_ready'), 0, 'queued recap reminder keeps its budget until delivery');

-- A report/member action has one owner and one fixed restriction deadline.
select claim_admin_action_service(pg_temp.member(3), 'suspend', pg_temp.member(4), 'reviewed account', null, pg_temp.token(1));
select throws_ok($$select claim_admin_action_service(pg_temp.member(3), 'suspend', pg_temp.member(4), 'same action', null, pg_temp.token(2))$$,
  'P0001', 'Another account action is already in progress', 'same-action overlap does not share ownership');
create temp table deadline as select ban_until from admin_action_jobs where user_id = pg_temp.member(3);
update admin_action_jobs set claimed_at = now() - interval '11 minutes' where user_id = pg_temp.member(3);
select throws_ok($$select claim_admin_action_service(pg_temp.member(3), 'unban', pg_temp.member(4), 'different action', null, pg_temp.token(2))$$,
  'P0001', 'Another account action is already in progress', 'expiry cannot replace an unfinished Auth action');
select claim_admin_action_service(pg_temp.member(3), 'suspend', pg_temp.member(4), 'retry same action', null, pg_temp.token(2));
select is((select ban_until from admin_action_jobs where user_id = pg_temp.member(3)), (select ban_until from deadline), 'reclaim preserves the original restriction deadline');
select throws_ok($$select complete_admin_action_service(pg_temp.member(3), pg_temp.token(1))$$, '40001', 'Account action claim changed', 'old admin worker cannot complete a successor');
select is(complete_admin_action_service(pg_temp.member(3), pg_temp.token(2))->>'action', 'suspend', 'current admin worker completes');
select ok((select completed_at is not null from admin_action_jobs where user_id = pg_temp.member(3)), 'completed account intent remains recorded');
select throws_ok($$select complete_admin_action_service(pg_temp.member(3), pg_temp.token(2))$$, '40001', 'Account action claim changed', 'completion cannot duplicate the audit');
insert into reports(id, reporter_id, subject_id, reason) values(pg_temp.token(9), pg_temp.member(1), pg_temp.member(2), 'harassment');
select claim_report_action_service(pg_temp.token(9), 'dismiss');
select throws_ok($$select claim_report_action_service(pg_temp.token(9), 'dismiss')$$,
  'P0001', 'Another report action is already in progress', 'legacy same-action callers do not share a report claim');
update report_action_claims set claimed_at = now() - interval '11 minutes' where report_id = pg_temp.token(9);
select throws_ok($$select claim_report_action_service(pg_temp.token(9), 'ban')$$,
  'P0001', 'Another report action is already in progress', 'expired report claim cannot change intent after an unknown Auth outcome');
select claim_admin_action_service(pg_temp.member(2), 'dismiss', pg_temp.member(4), 'reviewed report', pg_temp.token(9), pg_temp.token(1));
select release_report_action_service(pg_temp.token(9), 'dismiss');
select ok(exists(select 1 from report_action_claims where report_id = pg_temp.token(9)), 'legacy release cannot remove a journaled report claim');
select is(complete_admin_action_service(pg_temp.member(2), pg_temp.token(1))->>'action', 'dismiss', 'current report worker resolves through the audited path');
select ok((select resolved_at is not null from reports where id = pg_temp.token(9)), 'report resolution is durable');

-- Re-running the watcher does not duplicate its history-based alert.
delete from marital_status_log where user_id = pg_temp.member(3);
insert into marital_status_log(user_id, status, previous_status, changed_at) values
  (pg_temp.member(3), 'married', null, now() - interval '9 days'),
  (pg_temp.member(3), 'never_married', 'married', now() - interval '2 days');
select is(check_marital_status_changes(), 1, 'watcher records a qualifying switch');
select is(check_marital_status_changes(), 0, 'watcher does not duplicate the recorded switch');
-- Sealing a partial league day keeps both the actual set and its failed-table record.
insert into league_cycles(cycle_date, seed) values(current_date + 10, 224);
insert into league_jobs(cycle_date, wave, stratum, table_no, status, attempts, last_error)
values(current_date + 10, 0, 'workers-test', 1, 'failed', 4, 'worker timeout');
insert into rounds(id, user_id, tier, opens_at, expires_at, cycle_date, seats)
values(pg_temp.token(8), pg_temp.member(1), 'free', now() + interval '1 hour', now() + interval '1 day', current_date + 10, 5);
insert into introductions(round_id, viewer_id, subject_id) values(pg_temp.token(8), pg_temp.member(1), pg_temp.member(2));
select league_seal(current_date + 10);
select is((select failed_jobs from league_cycles where cycle_date = current_date + 10), 1, 'sealed league records failed tables');
select is((select count(*)::int from introductions where round_id = pg_temp.token(8)), 1, 'sealing preserves the partial set');
select is((select last_error from league_cycles where cycle_date = current_date + 10), 'worker timeout', 'sealed failure retains its diagnostic');
select pg_temp.owner();
select ok(admin_system_health() ? 'photo_analysis', 'exhausted photo work is visible in system health');
select ok(admin_system_health() ? 'account_actions', 'unfinished Auth work is visible in system health');
select ok(position('failed_jobs' in pg_get_functiondef('halal_mode_private.league_seal(date)'::regprocedure)) > 0, 'league sealing keeps failure counts from the earlier batch');
select ok(not has_function_privilege('authenticated', 'public.claim_admin_action_service(uuid,text,uuid,text,uuid,uuid)', 'execute'), 'action claims are service only');
select ok(not has_function_privilege('authenticated', 'public.settle_mail_fenced_service(bigint,boolean,text,uuid)', 'execute'), 'mail settlement is service only');

select * from finish();
rollback;
