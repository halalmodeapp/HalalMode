begin;
set local search_path = public, extensions, halal_mode_private;
select plan(11);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000234' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.service() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"service_role"}', true);
$$;
insert into auth.users (id, email, email_confirmed_at)
select pg_temp.member(n), 'workers-' || n || '@example.test', now() from generate_series(1, 5) n;
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude,
                      bio, photos, onboarding_complete, marital_status, sensitive_consent_at)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01', case when n % 2 = 0 then 'female' else 'male' end::gender,
       'London', 'United Kingdom', 51.5, -0.1, repeat('a', 50), array[pg_temp.member(n)::text || '/p.jpg'],
       true, 'never_married', now() from generate_series(1, 5) n;
insert into private_preferences (user_id, matching_preferences_completed_at, preferred_countries)
select pg_temp.member(n), now(), array['United Kingdom'] from generate_series(1, 5) n;
insert into member_legal_consent_history (user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 5) n cross join legal_document_registry d where d.is_current;
insert into admin_members (user_id, role) values (pg_temp.member(5), 'owner');

-- O7. A ban hides the member when it is claimed, before Auth or completion can fail.
select pg_temp.service();
select claim_admin_action_service(pg_temp.member(1), 'ban', pg_temp.member(5), 'reviewed account', null, gen_random_uuid());
select ok(not matching_member_eligible(pg_temp.member(1)), 'a claimed ban removes the member from matching at once');
select is((select restriction from member_pause_causes where user_id = pg_temp.member(1)), 'ban', 'and records why');
-- An unfinished action from before this change is put right by the reconciler.
insert into admin_action_jobs (user_id, action, actor_id, reason, claim_token, claimed_at)
values (pg_temp.member(3), 'suspend', pg_temp.member(5), 'reviewed account', gen_random_uuid(), now() - interval '1 hour');
select is(reconcile_unfinished_admin_actions(), 1, 'the reconciler finds the unfinished suspension');
select ok(not matching_member_eligible(pg_temp.member(3)), 'and hides that member too');
select ok(exists (select 1 from cron.job where jobname = 'halal-mode-admin-action-reconcile'), 'it runs on a schedule');

-- O5. Tickets are kept, and a receipt can retire a phone that has gone.
insert into notification_devices (user_id, platform, token_hash, push_token, notifications_enabled)
values (pg_temp.member(2), 'ios', 'hash-234', 'ExponentPushToken[gone]', true);
insert into notification_outbox (id, user_id, kind, payload, claim_token) overriding system value values (2340001, pg_temp.member(2), 'notice', '{}', null);
select settle_notifications_fenced_service(array[2340001::bigint], '[]', '{}', null,
  '[{"ticket":"ticket-234","id":2340001,"token":"ExponentPushToken[gone]"}]', '[{"id":2340001,"error":"timeout"}]');
select is((select last_error from notification_outbox where id = 2340001), 'ambiguous: timeout', 'an ambiguous send keeps its reason');
update push_tickets set created_at = now() - interval '20 minutes' where ticket_id = 'ticket-234';
select is((select array_agg(ticket_id) from claim_push_receipts_service(10)), array['ticket-234'], 'the ticket is due for its receipt');
select settle_push_receipts_service('[{"ticket":"ticket-234","status":"error","error":"DeviceNotRegistered"}]');
select is((select outcome from push_tickets where ticket_id = 'ticket-234'), 'error', 'the receipt is recorded');
select is((select push_token from notification_devices where token_hash = 'hash-234'), null, 'and the gone phone is retired');

-- O3. "Your set is ready" goes only if the set can really be opened.
insert into rounds (user_id, tier, opens_at, expires_at)
values (pg_temp.member(4), 'free', now() - interval '1 minute', now() + interval '23 hours');
insert into introductions (round_id, viewer_id, subject_id)
select id, pg_temp.member(4), pg_temp.member(3) from rounds where user_id = pg_temp.member(4);
insert into connections (user_a, user_b, stage) values (pg_temp.member(1), pg_temp.member(4), 'choosing_questions');
insert into question_picks (connection_id, user_id, question_id)
select id, pg_temp.member(1), 'q1' from connections where user_b = pg_temp.member(4);
select is(notification_still_true(pg_temp.member(4), 'round_ready', '{"count":5}'), null::jsonb, 'not while answers are owed');
delete from question_picks where user_id = pg_temp.member(1);
select is(notification_still_true(pg_temp.member(4), 'round_ready', '{"count":5}') ->> 'count', '1', 'and with the number of cards there now');

select * from finish();
rollback;
