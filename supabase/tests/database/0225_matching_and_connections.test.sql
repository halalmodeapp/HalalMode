begin;
set local search_path = public, extensions, halal_mode_private;
select plan(59);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000225' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
insert into auth.users (id, email, email_confirmed_at)
select pg_temp.member(n), 'matching-' || n || '@example.test', now() from generate_series(1, 20) n;
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude,
                      bio, photos, onboarding_complete, marital_status, sensitive_consent_at)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01', case when n % 2 = 0 then 'female' else 'male' end::gender,
       'London', 'United Kingdom', 51.5, -0.1, repeat('a', 50), array[pg_temp.member(n)::text || '/p.jpg'],
       true, 'never_married', now() from generate_series(1, 20) n;
insert into private_preferences (user_id, matching_preferences_completed_at, preferred_countries)
select pg_temp.member(n), now(), array['United Kingdom'] from generate_series(1, 20) n;
insert into member_legal_consent_history (user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 20) n cross join legal_document_registry d where d.is_current;

select ok(matching_member_eligible(pg_temp.member(1)), 'the prior batch 50-character readiness rule is preserved');
select ok(league_pair_stands(pg_temp.member(1), pg_temp.member(2)), 'a ready reciprocal pair stands');
select ok(not league_pair_stands(pg_temp.member(1), pg_temp.member(3)), 'same-gender proposals fail closed');
select ok(not matching_member_eligible(gen_random_uuid()), 'a missing member fails closed');
select ok(not has_function_privilege('authenticated', 'halal_mode_private.matching_member_eligible(uuid)', 'EXECUTE'), 'the shared check is private');

-- Every live member prerequisite is also enforced after pool admission.
update profiles set bio = repeat('a', 49) where id = pg_temp.member(2);
select ok(not matching_member_eligible(pg_temp.member(2)), 'a removed ready bio stops matching');
select ok(not league_pair_stands(pg_temp.member(1), pg_temp.member(2)), 'the card check agrees with readiness');
select ok(not exists (select 1 from league_pool where id = pg_temp.member(2)), 'the pool agrees with readiness');
update profiles set bio = repeat('a', 50), photos = '{}' where id = pg_temp.member(2);
select ok(not league_pair_stands(pg_temp.member(1), pg_temp.member(2)), 'removing all photos invalidates the card');
update profiles set photos = array[pg_temp.member(2)::text || '/p.jpg'], onboarding_complete = false where id = pg_temp.member(2);
select ok(not matching_member_eligible(pg_temp.member(2)), 'onboarding is required');
update profiles set onboarding_complete = true where id = pg_temp.member(2);
-- An UPDATE marks preferences complete automatically; only an unsaved row stays incomplete.
delete from private_preferences where user_id = pg_temp.member(2);
insert into private_preferences (user_id, preferred_countries)
values (pg_temp.member(2), array['United Kingdom']);
select is((select matching_preferences_completed_at from private_preferences where user_id = pg_temp.member(2)),
  null::timestamptz, 'the unsaved-preferences fixture is actually incomplete');
select ok(not league_pair_stands(pg_temp.member(1), pg_temp.member(2)), 'saved preferences are required');
update private_preferences set matching_preferences_completed_at = now() where user_id = pg_temp.member(2);
update profiles set sensitive_consent_at = null where id = pg_temp.member(1);
select ok(not league_pair_stands(pg_temp.member(1), pg_temp.member(2)), 'both sides need current consent');
update profiles set sensitive_consent_at = now() where id = pg_temp.member(1);
insert into account_deletion_requests (user_id) values (pg_temp.member(2));
select ok(not league_pair_stands(pg_temp.member(1), pg_temp.member(2)), 'pending deletion invalidates a prepared card');
delete from account_deletion_requests where user_id = pg_temp.member(2);
update profiles set is_paused = true where id = pg_temp.member(2);
select ok(not league_pair_stands(pg_temp.member(1), pg_temp.member(2)), 'pause still stops matching');
update profiles set is_paused = false where id = pg_temp.member(2);

-- Passes affect acceptance, never card visibility. Both directions still bind.
insert into pair_exposure (user_low, user_high, cooldown_until)
values (pg_temp.member(1), pg_temp.member(2), now() + interval '30 days');
select ok(league_pair_stands(pg_temp.member(1), pg_temp.member(2)), 'a pass does not reveal itself through visibility');
select ok(league_pair_passed(pg_temp.member(1), pg_temp.member(2)), 'the same pass still stops a pick');
delete from pair_exposure where user_low = pg_temp.member(1);
update private_preferences set preferred_countries = array['Turkey'] where user_id = pg_temp.member(2);
select ok(not league_pair_stands(pg_temp.member(1), pg_temp.member(2)), 'the other member country rule binds too');
update private_preferences set preferred_countries = array['United Kingdom'] where user_id = pg_temp.member(2);

-- A worker cannot commit a proposal after preparation lost its ready profile.
update release_flags set enabled = true where key = 'league_matching';
insert into league_cycles (cycle_date, seed) values (current_date + 1, 225);
insert into league_jobs (cycle_date, wave, stratum, table_no, status, lease_token, lease_until)
values (current_date + 1, 0, 'matching-test', 0, 'leased', pg_temp.member(6), now() + interval '1 hour');
insert into league_seats (cycle_date, wave, stratum, table_no, user_id, seats)
select current_date + 1, 0, 'matching-test', 0, pg_temp.member(n), 5 from generate_series(1, 2) n;
insert into rounds (user_id, tier, opens_at, expires_at, cycle_date, seats)
select pg_temp.member(n), 'free', now() + interval '1 hour', now() + interval '25 hours', current_date + 1, 5
from generate_series(1, 2) n;
create function pg_temp.commit_pair() returns int language sql as $$
  select league_commit_edges_service(
    jsonb_build_object('cycleDate', current_date + 1, 'wave', 0, 'stratum', 'matching-test', 'tableNo', 0, 'token', pg_temp.member(6)),
    jsonb_build_array(jsonb_build_object('a', pg_temp.member(1), 'b', pg_temp.member(2), 'score', 0.5)));
$$;
update profiles set bio = repeat('a', 49) where id = pg_temp.member(2);
select is(pg_temp.commit_pair(), 0, 'commit rejects the now-incomplete profile');
select is((select sum(used)::int from league_seats where stratum = 'matching-test'), 0, 'a refused proposal spends no seats');
update profiles set bio = repeat('a', 50) where id = pg_temp.member(2);
select is(pg_temp.commit_pair(), 1, 'a restored ready proposal commits');
select is((select count(*)::int from introductions where viewer_id in (pg_temp.member(1), pg_temp.member(2))), 2, 'both reciprocal cards were written');
update rounds set opens_at = now() - interval '1 hour', expires_at = now() + interval '1 hour'
where user_id in (pg_temp.member(1), pg_temp.member(2));
select pg_temp.act_as(1);
select is(jsonb_array_length(get_current_round()->'introductions'), 1, 'an eligible committed card can be shown');
select set_config('request.jwt.claims', '', true);
update profiles set photos = '{}' where id = pg_temp.member(2);
select pg_temp.act_as(1);
select is(jsonb_array_length(get_current_round()->'introductions'), 0, 'show rechecks readiness after commit');
select lives_ok($$select submit_round_selections((select id from rounds where user_id = pg_temp.member(1)),
  array[(select id from introductions where viewer_id = pg_temp.member(1))])$$, 'a stale pick keeps the existing quiet refusal contract');
select ok(not exists (select 1 from introduction_selections where viewer_id = pg_temp.member(1) and decision = 'kept'), 'pick cannot accept the invalidated card');
select set_config('request.jwt.claims', '', true);

-- Returns use the same eligibility after their original yes was recorded.
insert into league_returns (recipient, sender, introduction_id, expires_at)
select pg_temp.member(1), pg_temp.member(2), id, now() + interval '7 days'
from introductions where viewer_id = pg_temp.member(2);
insert into rounds (user_id, tier, opens_at, expires_at, cycle_date, seats)
values (pg_temp.member(1), 'free', now() + interval '1 hour', now() + interval '25 hours', current_date + 2, 5);
select lives_ok($$select league_deliver_returns(current_date + 2)$$, 'return delivery tolerates a sender who is no longer ready');
select ok(not exists (select 1 from league_returns where recipient = pg_temp.member(1)), 'an invalid return is not delivered');

-- Like-back cannot bypass readiness, even while its existing teaser remains.
insert into halal_mode_private.member_entitlements (user_id, tier, state, provider)
values (pg_temp.member(5), 'premium', 'active', 'test_fixture');
insert into member_selfies (user_id, path, status) values (pg_temp.member(6), 'matching-selfie', 'verified');
insert into rounds (user_id, tier, opens_at, expires_at, submitted_at)
select pg_temp.member(n), 'free', now() - interval '2 days', now() - interval '1 day', now() - interval '1 day'
from unnest(array[5, 6]) n;
insert into introductions (round_id, viewer_id, subject_id)
select r.id, r.user_id, case when r.user_id = pg_temp.member(5) then pg_temp.member(6) else pg_temp.member(5) end
from rounds r where r.user_id in (pg_temp.member(5), pg_temp.member(6));
insert into introduction_selections (introduction_id, viewer_id, subject_id, decision)
select id, viewer_id, subject_id, 'kept' from introductions where viewer_id = pg_temp.member(6);
select is((select count(*)::int from liked_you_current(pg_temp.member(5))), 1, 'a ready like can appear in the tray');
update profiles set bio = repeat('a', 49) where id = pg_temp.member(6);
select pg_temp.act_as(5);
select throws_ok($$select like_back(pg_temp.member(6))$$, 'P0002', 'That like is no longer available', 'like-back rechecks the liker readiness under the locks');
select ok(not exists (select 1 from connections where user_a = pg_temp.member(5) and user_b = pg_temp.member(6)), 'a refused like-back creates no connection');
select is((select count(*)::int from liked_you_current(pg_temp.member(5))), 1, 'the refusal does not change teaser visibility');
select set_config('request.jwt.claims', '', true);

-- Retry the final question commitment and final answer after the stage moved on.
insert into connections (user_a, user_b) values (pg_temp.member(3), pg_temp.member(4));
select ok(not league_pair_stands(pg_temp.member(3), pg_temp.member(4)), 'a lifetime connection prevents a new introduction');
create function pg_temp.connection_id() returns uuid language sql as $$
  select id from connections where user_a = pg_temp.member(3) and user_b = pg_temp.member(4);
$$;
select pg_temp.act_as(3);
select lives_ok($$select submit_question_picks(pg_temp.connection_id(), array['q1', 'q2'])$$, 'first member chooses two questions');
select pg_temp.act_as(4);
select lives_ok($$select submit_question_picks(pg_temp.connection_id(), array['q1', 'q2'])$$, 'second member assembles the questions');
select is((select stage::text from connections where id = pg_temp.connection_id()), 'answering', 'both commitments advance once');
select lives_ok($$select submit_question_picks(pg_temp.connection_id(), array['q2', 'q1'])$$, 'a lost final commitment response can be retried');
select throws_ok($$select submit_question_picks(pg_temp.connection_id(), array['q1', 'q1'])$$, '22023', null, 'a duplicate retry is not the same commitment');
select throws_ok($$select submit_question_picks(pg_temp.connection_id(), array['q1', 'q3'])$$, '22023', null, 'a different retry cannot replace committed choices');
select is((select count(*)::int from connection_questions where connection_id = pg_temp.connection_id()), 2, 'retries never add questions');
select submit_answer(pg_temp.connection_id(), 'q1', 'A thoughtful answer.');
select submit_answer(pg_temp.connection_id(), 'q2', 'Another thoughtful answer.');
select pg_temp.act_as(3);
select is(submit_answer(pg_temp.connection_id(), 'q1', 'A thoughtful answer.')->>'theirAnswer', null, 'partial own answers still keep the partner sealed');
select lives_ok($$select submit_answer(pg_temp.connection_id(), 'q2', 'Another thoughtful answer.')$$, 'both finishing still advances normally');
select is((select stage::text from connections where id = pg_temp.connection_id()), 'recap', 'all answers advance to recap');
select lives_ok($$select submit_answer(pg_temp.connection_id(), 'q2', 'Another thoughtful answer.')$$, 'the final answer is safe to retry after recap');
select throws_ok($$select submit_answer(pg_temp.connection_id(), 'q2', 'A replacement answer.')$$, '42501', null, 'a changed answer is not an idempotent retry');
select is((select count(*)::int from question_answers where connection_id = pg_temp.connection_id()), 4, 'retry preserves exactly four immutable answers');
select open_connection(pg_temp.connection_id());
select lives_ok($$select submit_answer(pg_temp.connection_id(), 'q2', 'Another thoughtful answer.')$$, 'a retry also works after the conversation opened');
select is((select stage::text from connections where id = pg_temp.connection_id()), 'open', 'the retry cannot regress the stage');

-- Explicit contact consent is serialized and retains the original source and time.
select is(share_contact_details(pg_temp.connection_id())->>'mutual', 'false', 'the first contact consent stays private');
select pg_temp.act_as(4);
select is(share_contact_details(pg_temp.connection_id())->>'mutual', 'true', 'the second contact consent completes the exchange');
select is((select contact_shared_source from connections where id = pg_temp.connection_id()), 'explicit', 'explicit mutual consent records its source');
select set_config('request.jwt.claims', '', true);
update profiles set sensitive_consent_at = null where id = pg_temp.member(4);
select pg_temp.act_as(4);
select throws_ok($$select share_contact_details(pg_temp.connection_id())$$, '42501', null, 'contact consent requires current legal consent');
select ok(position('for update' in lower(pg_get_functiondef('public.share_contact_details(uuid)'::regprocedure))) > 0, 'contact consent takes the connection lock before checking the partner');

-- The connection trigger runs before the caller's rank is written. The wrapper must refresh it again.
select set_config('request.jwt.claims', '', true);
insert into rounds (user_id, tier, opens_at, expires_at, submitted_at)
select pg_temp.member(n), 'free', now() - interval '1 hour', now() + interval '1 hour',
       case when n = 8 then now() end from unnest(array[7, 8]) n;
insert into introductions (round_id, viewer_id, subject_id)
select r.id, r.user_id, case when r.user_id = pg_temp.member(7) then pg_temp.member(8) else pg_temp.member(7) end
from rounds r where r.user_id in (pg_temp.member(7), pg_temp.member(8));
update introductions i set reciprocal_id = twin.id from introductions twin
where i.viewer_id = twin.subject_id and i.subject_id = twin.viewer_id
  and i.viewer_id in (pg_temp.member(7), pg_temp.member(8));
insert into introduction_selections (introduction_id, viewer_id, subject_id, decision, rank)
select id, viewer_id, subject_id, 'kept', 1 from introductions where viewer_id = pg_temp.member(8);
select pg_temp.act_as(7);
select submit_round_selections_ranked_with_signals((select id from rounds where user_id = pg_temp.member(7)),
  array[(select id from introductions where viewer_id = pg_temp.member(7))], null);
select is((select components->>'mutual_first_choice' from matching_signal_estimates where user_id = pg_temp.member(7)),
  '0.6667', 'the caller estimate includes the new mutual first choice immediately');

-- Ten paused mutuals must not starve an eleventh mutual who can activate now.
select set_config('request.jwt.claims', '', true);
update profiles set is_paused = true where id in (select pg_temp.member(n) from generate_series(7, 16) n);
insert into mutual_connection_queue (user_a, user_b, matched_at)
select pg_temp.member(5), pg_temp.member(n), now() - interval '2 days' from generate_series(7, 16) n;
insert into mutual_connection_queue (user_a, user_b, matched_at)
values (pg_temp.member(5), pg_temp.member(18), now() - interval '1 day');
select is(promote_waiting_connections(array[pg_temp.member(5)]), 1, 'paused mutuals do not consume the oldest-ten candidate scan');
select ok(exists (select 1 from connections where user_a = pg_temp.member(5) and user_b = pg_temp.member(18)), 'the eligible eleventh mutual is promoted');
select is((select count(*)::int from mutual_connection_queue where user_a = pg_temp.member(5)), 10, 'paused earned mutuals still wait for their return');

-- The opt-in sample path must respect the same permanent bilateral hide.
insert into demo_members (user_id) values (pg_temp.member(20));
update profiles set is_paused = true where id = pg_temp.member(20);
insert into release_flag_members (key, user_id) values ('tester_tools', pg_temp.member(19)), ('demo_introductions', pg_temp.member(19));
insert into member_hides (hider_id, hidden_id) values (pg_temp.member(20), pg_temp.member(19));
select pg_temp.act_as(19);
select lives_ok($$select request_demo_round()$$, 'the sample generator still supports an opted-in tester');
select ok(not exists (select 1 from introductions where viewer_id = pg_temp.member(19) and subject_id = pg_temp.member(20)), 'a reverse hide also prevents spending a sample seat');

select * from finish();
rollback;
