begin;
set local search_path = public, extensions, halal_mode_private;
select plan(70);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000223' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.owner() returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', pg_temp.member(30), 'role', 'authenticated', 'aal', 'aal2',
    'amr', jsonb_build_array(jsonb_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 30))
  )::text, true);
$$;
create function pg_temp.connect(a int, b int) returns uuid language sql as $$
  insert into connections (user_a, user_b)
  values (least(pg_temp.member(a), pg_temp.member(b)), greatest(pg_temp.member(a), pg_temp.member(b))) returning id;
$$;
create function pg_temp.queued(a int, b int) returns void language sql as $$
  insert into mutual_connection_queue (user_a, user_b)
  values (least(pg_temp.member(a), pg_temp.member(b)), greatest(pg_temp.member(a), pg_temp.member(b)));
$$;
create function pg_temp.connected(a int, b int) returns boolean language sql as $$
  select exists (select 1 from connections where user_a = least(pg_temp.member(a), pg_temp.member(b))
                 and user_b = greatest(pg_temp.member(a), pg_temp.member(b)) and closed_at is null);
$$;

insert into auth.users (id, email, email_confirmed_at)
select pg_temp.member(n), 'state-' || n || case when n = 31 then '@halalmodetest.com' else '@example.test' end, now() from generate_series(1, 32) n;
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude,
                      bio, photos, onboarding_complete, marital_status, sensitive_consent_at)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01', case when n = 21 then 'female' else 'male' end::gender,
       'London', 'United Kingdom', 51.5, -0.1, repeat('a', 50), array[pg_temp.member(n)::text || '/p.jpg'],
       true, 'never_married', now()
from generate_series(1, 32) n;
insert into private_preferences (user_id, matching_preferences_completed_at, preferred_countries)
select pg_temp.member(n), now(), array['United Kingdom'] from generate_series(1, 32) n;
insert into member_legal_consent_history (user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 32) n cross join legal_document_registry d where d.is_current;
insert into admin_members (user_id, role) values (pg_temp.member(30), 'owner');

-- The member and referral conversion use the same 50-character rule.
select ok(profile_is_ready_for_matching(pg_temp.member(1)), 'a 50-character bio is ready');
select pg_temp.act_as(1);
select is(get_my_profile_readiness()->>'ready', 'true', 'the readiness response agrees');
select ok(not (get_my_profile_readiness()->'missing' ? 'bio'), '50 is not listed as missing');
update profiles set bio = repeat('a', 49) where id = pg_temp.member(1);
select ok(not profile_is_ready_for_matching(pg_temp.member(1)), '49 characters is too short');
select ok(get_my_profile_readiness()->'missing' ? 'bio', '49 is listed as missing');
insert into waitlist (email, city, age_range, referred_code)
values ('state-1@example.test', 'London', '30-34', 'state-machine-test');
select is((select referral_counted_at from waitlist where email = 'state-1@example.test'), null, 'the short bio is not a conversion');
update profiles set bio = repeat('a', 50) where id = pg_temp.member(1);
select ok((select referral_counted_at is not null from waitlist where email = 'state-1@example.test'), '50 also completes a referral');

-- Deletion frees a full member's slot for their oldest waiting mutual.
select set_config('request.jwt.claims', '', true);
select pg_temp.connect(1, 2);
select pg_temp.connect(2, n) from generate_series(4, 7) n;
select pg_temp.queued(2, 3);
select pg_temp.act_as(1);
select lives_ok($$select request_my_account_deletion()$$, 'deletion can be requested');
select ok(pg_temp.connected(2, 3), 'deletion promotes the member on the other side');
select ok(not pg_temp.connected(1, 2), 'deletion closes the old connection');
select throws_ok($$select set_my_profile_paused(false)$$, '22023', 'An account pending deletion cannot be resumed', 'deletion cannot be resumed in the app');
update account_deletion_requests set requested_at = now() - interval '12 days' where user_id = pg_temp.member(1);
select request_my_account_deletion();
select is((select requested_at from account_deletion_requests where user_id = pg_temp.member(1)), now() - interval '12 days', 'a repeat request keeps the first deadline');
select is((select count(*)::int from account_deletion_requests where user_id = pg_temp.member(1)), 1, 'a repeat request keeps one row');

-- Even an old unpaused row with a pending request is excluded independently of pause.
select set_config('request.jwt.claims', '', true);
insert into account_deletion_requests (user_id) values (pg_temp.member(8));
select ok(not (select is_paused from profiles where id = pg_temp.member(8)), 'the exclusion fixture is unpaused');
select ok(not exists (select 1 from league_pool where id = pg_temp.member(8)), 'pending deletion is outside the pool');
select ok(exists (select 1 from league_pool where id = pg_temp.member(9)), 'an otherwise identical member is in the pool');
select pg_temp.queued(8, 9);
select is(promote_waiting_connections(array[pg_temp.member(8)]), 0, 'pending deletion also cannot leave the mutual queue');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select throws_ok($$select apply_admin_member_action_service(pg_temp.member(1), 'unban', pg_temp.member(30), 'reviewed account')$$,
  '22023', 'An account pending deletion cannot be resumed', 'an admin cannot reinstate a pending deletion');
select ok(position('is_paused = false' in pg_get_functiondef('public.apply_report_action_service(uuid,text)'::regprocedure)) = 0,
  'the current report action has no reinstatement path');

-- Resuming and upgrades promote without a close or block.
select set_config('request.jwt.claims', '', true);
update profiles set is_paused = true where id = pg_temp.member(10);
select pg_temp.queued(9, 10);
select pg_temp.act_as(10);
select lives_ok($$select set_my_profile_paused(false)$$, 'resuming succeeds without deletion');
select ok(pg_temp.connected(9, 10), 'resuming promotes a waiting mutual');
select set_config('request.jwt.claims', '', true);
select pg_temp.connect(11, n) from generate_series(12, 16) n;
select pg_temp.queued(11, 17);
select is(promote_waiting_connections(array[pg_temp.member(11)]), 0, 'a full free member waits');
insert into halal_mode_private.member_entitlements (user_id, tier, state, provider)
values (pg_temp.member(11), 'premium', 'active', 'test_fixture');
select ok(pg_temp.connected(11, 17), 'an entitlement upgrade promotes through its profile projection');
select is((select count(*)::int from connections where closed_at is null and pg_temp.member(11) in (user_a, user_b)), 6, 'the upgrade uses the new capacity');
select ok(not exists (select 1 from mutual_connection_queue where user_a = pg_temp.member(11) and user_b = pg_temp.member(17)), 'the promoted pair leaves the queue');

-- A deleted comp entitlement is visible to demotion, and the count is repeatable.
select expire_comp_premium();
insert into member_entitlements (user_id, tier, state, provider, expires_at) values
  (pg_temp.member(18), 'premium', 'active', 'comp', now() - interval '1 day'),
  (pg_temp.member(19), 'premium', 'active', 'app_store', now() + interval '30 days');
update profiles set tier = 'premium' where id in (pg_temp.member(18), pg_temp.member(19));
select is(expire_comp_premium(), 1, 'comp expiry returns one demotion');
select is((select tier::text from profiles where id = pg_temp.member(18)), 'free', 'comp expiry demotes the profile');
select ok(not exists (select 1 from member_entitlements where user_id = pg_temp.member(18)), 'the expired comp entitlement is gone');
select is((select tier::text from profiles where id = pg_temp.member(19)), 'premium', 'a purchase stays Premium');
select is(expire_comp_premium(), 0, 'a retry returns zero');
select expire_launch_rewards();
insert into member_entitlements (user_id, tier, state, provider, expires_at)
values (pg_temp.member(20), 'premium', 'active', 'launch_reward', now() - interval '1 day');
update profiles set tier = 'premium' where id = pg_temp.member(20);
select is(expire_launch_rewards(), 1, 'launch expiry already returns the right count');
select is((select tier::text from profiles where id = pg_temp.member(20)), 'free', 'launch expiry also demotes');

-- Repair the old orphaned state without changing testers, purchases or unrelated Premium.
select set_config('request.jwt.claims', '', true);
insert into premium_grants (user_id, reason, starts_at, ends_at)
select pg_temp.member(n), 'expired grant', now() - interval '2 days', now() - interval '1 day'
from unnest(array[27, 28, 29, 31]) n;
insert into release_flag_members (key, user_id) values ('tester_tools', pg_temp.member(28));
insert into member_entitlements (user_id, tier, state, provider, expires_at)
values (pg_temp.member(29), 'premium', 'active', 'app_store', now() + interval '30 days');
update profiles set tier = 'premium' where id in (pg_temp.member(27), pg_temp.member(28), pg_temp.member(29), pg_temp.member(31), pg_temp.member(32));
select is(repair_orphaned_comp_premium(), 1, 'the repair finds the old comp orphan');
select is((select tier::text from profiles where id = pg_temp.member(27)), 'free', 'the old orphan is demoted');
select is((select tier::text from profiles where id = pg_temp.member(28)), 'premium', 'a tester cohort member is untouched');
select is((select tier::text from profiles where id = pg_temp.member(29)), 'premium', 'a former comp recipient with a purchase is untouched');
select is((select tier::text from profiles where id = pg_temp.member(31)), 'premium', 'a test-domain account is untouched');
select is((select tier::text from profiles where id = pg_temp.member(32)), 'premium', 'Premium with no comp history is untouched');
select is(repair_orphaned_comp_premium(), 0, 'the repair can safely be repeated');

-- A selfie requires an explicit human outcome, with the existing settlement effects.
insert into member_selfies (user_id, path, status) values
  (pg_temp.member(24), pg_temp.member(24)::text || '/selfie.jpg', 'review'),
  (pg_temp.member(25), pg_temp.member(25)::text || '/selfie.jpg', 'review');
insert into selfie_files (user_id, path)
select user_id, path from member_selfies where user_id in (pg_temp.member(24), pg_temp.member(25));
insert into moderation_queue (user_id, kind, ref, decision, decided_at)
select user_id, 'selfie', path, 'review', now() from member_selfies where user_id in (pg_temp.member(24), pg_temp.member(25));
create function pg_temp.selfie_item(n int) returns bigint language sql as $$
  select id from moderation_queue where user_id = pg_temp.member(n) and kind = 'selfie';
$$;
select pg_temp.owner();
select throws_ok($$select admin_mark_reviewed(pg_temp.selfie_item(24), 'checked by owner')$$,
  '22023', 'Choose verified or rejected for this selfie', 'a selfie without a verdict fails clearly');
select ok((select reviewed_at is null from moderation_queue where id = pg_temp.selfie_item(24)), 'missing verdict leaves the item waiting');
select throws_ok($$select admin_mark_reviewed(pg_temp.selfie_item(24), 'checked by owner', 'maybe')$$,
  '22023', null, 'an invalid verdict fails too');
select lives_ok($$select admin_mark_reviewed(pg_temp.selfie_item(24), 'checked by owner', 'verified')$$, 'an owner verifies the selfie');
select is((select status from member_selfies where user_id = pg_temp.member(24)), 'verified', 'verification leaves review');
select is((select purge_after from selfie_files where user_id = pg_temp.member(24)), now() + interval '30 days', 'verification retains the file for 30 days');
select ok(exists (select 1 from moderation_queue q join profiles p on p.id = q.user_id
                  where q.user_id = pg_temp.member(24) and q.kind = 'photo' and q.ref = any(p.photos) and q.decided_at is null), 'verification rechecks profile photos');
select lives_ok($$select admin_mark_reviewed(pg_temp.selfie_item(25), 'checked by owner', 'rejected')$$, 'an owner rejects the selfie');
select is((select status from member_selfies where user_id = pg_temp.member(25)), 'rejected', 'rejection leaves review');
select is((select purge_after from selfie_files where user_id = pg_temp.member(25)), now() + interval '1 day', 'rejection retains the file for one day');
select ok(exists (select 1 from member_notices where user_id = pg_temp.member(25) and kind = 'selfie_rejected'), 'rejection sends the member notice');
select ok((select reviewed_at is not null and reviewed_by = pg_temp.member(30) from moderation_queue where id = pg_temp.selfie_item(25)), 'the verdict records the reviewer');
insert into moderation_queue (user_id, kind, ref, decision, decided_at) values (pg_temp.member(26), 'bio', 'old bio', 'review', now());
select lives_ok($$select admin_mark_reviewed((select id from moderation_queue where user_id = pg_temp.member(26) and ref = 'old bio'), 'checked by owner')$$,
  'the old two-argument call still works for other items');
select ok(not has_function_privilege('anon', 'public.admin_mark_reviewed(bigint,text,text)', 'EXECUTE'), 'the new verdict is not public');

-- Like-back rechecks live standing and answer debt under the member locks.
select set_config('request.jwt.claims', '', true);
insert into halal_mode_private.member_entitlements (user_id, tier, state, provider)
values (pg_temp.member(21), 'premium', 'active', 'test_fixture');
insert into member_selfies (user_id, path, status) values (pg_temp.member(22), 'liker-selfie', 'verified');
insert into rounds (user_id, tier, opens_at, expires_at, submitted_at)
select pg_temp.member(n), 'free', now() - interval '2 days', now() - interval '1 day', now() - interval '1 day'
from unnest(array[21, 22]) n;
insert into introductions (round_id, viewer_id, subject_id)
select r.id, r.user_id, case when r.user_id = pg_temp.member(21) then pg_temp.member(22) else pg_temp.member(21) end
from rounds r where r.user_id in (pg_temp.member(21), pg_temp.member(22));
insert into introduction_selections (introduction_id, viewer_id, subject_id, decision)
select id, viewer_id, subject_id, 'kept' from introductions where viewer_id = pg_temp.member(22);
select is((select count(*)::int from liked_you_current(pg_temp.member(21))), 1, 'there is a usable like');
select ok(league_pair_stands(pg_temp.member(21), pg_temp.member(22)), 'the original pair stands');
update profiles set is_paused = true where id = pg_temp.member(21);
select pg_temp.act_as(21);
select throws_ok($$select like_back(pg_temp.member(22))$$, 'P0002', 'That like is no longer available', 'a caller who no longer stands cannot like back');
select ok(not exists (select 1 from introduction_selections where viewer_id = pg_temp.member(21)), 'a refused like records no choice');
select set_config('request.jwt.claims', '', true);
update profiles set is_paused = false where id = pg_temp.member(21);
select pg_temp.connect(21, 23);
insert into question_picks (connection_id, user_id, question_id)
select id, pg_temp.member(23), 'q1' from connections where user_a = pg_temp.member(21) and user_b = pg_temp.member(23);
select pg_temp.act_as(21);
select ok(exists (select 1 from owed_connections(pg_temp.member(21))), 'the caller owes a response');
select throws_ok($$select like_back(pg_temp.member(22))$$, '22023', 'Answer the questions you owe before continuing', 'answer debt blocks liking back');
select ok(not pg_temp.connected(21, 22), 'debt creates no connection');
select ok(not exists (select 1 from mutual_connection_queue where user_a = pg_temp.member(21) and user_b = pg_temp.member(22)), 'debt creates no queued match');
select is((select count(*)::int from liked_you_current(pg_temp.member(21))), 1, 'a refusal keeps the tray item');
delete from question_picks where user_id = pg_temp.member(23);
insert into pair_exposure (user_low, user_high, cooldown_until)
values (pg_temp.member(21), pg_temp.member(22), now() + interval '30 days');
select throws_ok($$select like_back(pg_temp.member(22))$$, 'P0002', 'That like is no longer available', 'the existing pass check still applies');
select is((select count(*)::int from liked_you_current(pg_temp.member(21))), 1, 'a pass does not disclose itself by hiding the like');
delete from pair_exposure where user_low = pg_temp.member(21) and user_high = pg_temp.member(22);
select is(like_back(pg_temp.member(22))->>'status', 'matched', 'a standing pair without debt can still match');

-- Failed tables do not hold up partial sets, but survive in the cycle's record.
select set_config('request.jwt.claims', '', true);
insert into league_cycles (cycle_date, seed, phase, makeup_wave, topup_wave)
select ((now() at time zone 'utc') - make_interval(mins => start_minute_utc))::date, 223, 'topup', makeup_waves, topup_waves
from league_config;
insert into league_jobs (cycle_date, wave, stratum, table_no, status, last_error)
select cycle_date, 50, 'state-test', n, case when n = 1 then 'failed' else 'done' end, case when n = 1 then 'test table failed' end
from league_cycles cross join generate_series(1, 2) n where seed = 223;
select lives_ok($$select league_advance()$$, 'a failed table does not block sealing');
select is((select phase from league_cycles where seed = 223), 'sealed', 'the partial day seals');
select is((select failed_jobs from league_cycles where seed = 223), 1, 'the sealed cycle records failed_jobs');
select pg_temp.owner();
select ok((admin_system_health()->'matching'->>'failed_tables_7d')::int >= 1, 'health reports recent failed tables');
select ok(exists (select 1 from jsonb_array_elements(admin_system_health()->'matching'->'recent_failed_tables') f
                  where f->>'last_error' = 'test table failed' and f->>'failed_jobs' = '1'), 'health keeps the failed cycle and error visible');

select * from finish();
rollback;
