begin;
set local search_path = public, extensions, halal_mode_private;
select plan(74);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000226' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.terms() returns text language sql as $$
  select version from legal_document_registry where document_type = 'terms' and is_current;
$$;
create function pg_temp.privacy() returns text language sql as $$
  select version from legal_document_registry where document_type = 'privacy' and is_current;
$$;
insert into auth.users (id, email, email_confirmed_at, created_at)
select pg_temp.member(n), 'accounts-' || n || '@example.test', now(), now() from generate_series(1, 18) n;
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude,
                      bio, photos, onboarding_complete, marital_status)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01', 'male', 'London', 'United Kingdom', 51.5, -0.1,
       repeat('a', 50), array[pg_temp.member(n)::text || '/photo.jpg'], true, 'never_married'
from generate_series(1, 16) n;
insert into private_preferences (user_id, matching_preferences_completed_at)
select pg_temp.member(n), now() from generate_series(1, 16) n;

-- Every provider and grace state obeys the same deadline, without waiting for cron.
insert into member_entitlements (user_id, tier, state, provider, expires_at) values
  (pg_temp.member(1), 'premium', 'active', 'app_store', now() - interval '1 second'),
  (pg_temp.member(2), 'premium', 'grace', 'play_store', now()),
  (pg_temp.member(3), 'premium', 'active', 'comp', now() - interval '1 second'),
  (pg_temp.member(4), 'premium', 'active', 'launch_reward', now() - interval '1 second'),
  (pg_temp.member(5), 'premium', 'grace', 'future_provider', now() + interval '1 day'),
  (pg_temp.member(6), 'premium', 'active', 'app_store', null),
  (pg_temp.member(7), 'free', 'revoked', 'app_store', null);
select is(effective_membership_tier(pg_temp.member(1))::text, 'free', 'expired App Store is free');
select is(effective_membership_tier(pg_temp.member(2))::text, 'free', 'grace ends at its deadline');
select is(effective_membership_tier(pg_temp.member(3))::text, 'free', 'expired comp is free');
select is(effective_membership_tier(pg_temp.member(4))::text, 'free', 'expired reward is free');
select is(effective_membership_tier(pg_temp.member(5))::text, 'premium', 'a future provider shares active grace');
select is(effective_membership_tier(pg_temp.member(6))::text, 'premium', 'an indefinite grant remains active');
select is(effective_membership_tier(pg_temp.member(7))::text, 'free', 'revocation is authoritative');
update profiles set tier = 'premium' where id in (pg_temp.member(1), pg_temp.member(8));
select pg_temp.act_as(1);
select is(get_my_membership_entitlement()->>'tier', 'free', 'the reader ignores a stale expired profile');
select is(get_my_membership_entitlement()->>'state', 'expired', 'the reader reports expiry');
select pg_temp.act_as(8);
select is(get_my_membership_entitlement()->>'tier', 'free', 'there is no profile fallback');
select ok(not halal_cards_is_premium(pg_temp.member(1)), 'Cards cannot use stale Premium');
select ok(not (get_my_photo_coach()->>'premium')::boolean, 'photo advice cannot use profile-only Premium');
select ok(not (select is_premium from member_matching_facts where id = pg_temp.member(1)), 'matching filters use live expiry');
select throws_ok($$select set_my_premium_preferences('{}')$$, '42501', 'Premium filters need Halal Mode Premium', 'stale profiles cannot save Premium filters');
select set_config('request.jwt.claims', '', true);
select ok(reconcile_membership_entitlements() >= 2, 'reconciliation repairs stale projections');
select is((select tier::text from profiles where id = pg_temp.member(8)), 'free', 'the old-client projection is repaired');
select is((select tier::text from profiles where id = pg_temp.member(5)), 'premium', 'insertion projects an active entitlement');
delete from member_entitlements where user_id = pg_temp.member(5);
select is((select tier::text from profiles where id = pg_temp.member(5)), 'free', 'deletion projects free immediately');
insert into member_entitlements (user_id, tier, state, provider, expires_at)
values (pg_temp.member(17), 'premium', 'active', 'comp', now() + interval '1 day');
insert into profiles (id, name, first_name, birth_date, gender) values (pg_temp.member(17), 'New', 'New', '1995-01-01', 'male');
select is((select tier::text from profiles where id = pg_temp.member(17)), 'premium', 'a pre-profile grant is inherited');
select ok(grant_launch_reward(pg_temp.member(1), 1), 'an expired purchase no longer blocks an earned reward');
select is((select provider from member_entitlements where user_id = pg_temp.member(1)), 'launch_reward', 'the earned reward becomes the authority');
select ok(not grant_launch_reward(pg_temp.member(1), 1), 'reward retries do not add more months');
select ok(not grant_launch_reward(pg_temp.member(6), 1), 'an active purchase still defers rewards');

-- Test Premium never replaces other providers, and the switch is live authorization.
insert into release_flag_members (key, user_id) values ('tester_tools', pg_temp.member(6)), ('tester_tools', pg_temp.member(9));
update release_flags set enabled = true, rollout_percentage = 100 where key = 'tester_premium_switch';
select pg_temp.act_as(6);
select lives_ok($$select set_my_test_premium(true)$$, 'enabling the tester switch preserves a purchase');
select is((select provider from member_entitlements where user_id = pg_temp.member(6)), 'app_store', 'the purchase provider survives');
select set_my_test_premium(false);
select is(effective_membership_tier(pg_temp.member(6))::text, 'premium', 'turning test Premium off keeps a purchase');
select pg_temp.act_as(9);
select set_my_test_premium(true);
select is(effective_membership_tier(pg_temp.member(9))::text, 'premium', 'an authorized tester can enable Premium');
select set_config('request.jwt.claims', '', true);
update release_flags set enabled = false where key = 'tester_premium_switch';
select is(effective_membership_tier(pg_temp.member(9))::text, 'free', 'disabling the flag ends tester access without cron');

-- Acceptance binds the displayed versions and the separate sensitive-data choice in one commit.
select pg_temp.act_as(10);
select throws_ok($$select accept_legal_documents('unseen', pg_temp.privacy(), true)$$,
  '22023', 'Current legal documents must be accepted', 'unseen terms cannot be accepted');
select is((select count(*)::int from member_legal_consent_history where user_id = pg_temp.member(10)), 0, 'failed acceptance records no document');
select ok((select sensitive_consent_at is null from profiles where id = pg_temp.member(10)), 'failed acceptance records no sensitive consent');
select is(accept_legal_documents(pg_temp.terms(), pg_temp.privacy(), true)->>'required', 'false', 'displayed versions and explicit consent commit together');
select is((select count(*)::int from member_legal_consent_history where user_id = pg_temp.member(10)), 2, 'both versions are recorded');
select is(accept_legal_documents(pg_temp.terms(), pg_temp.privacy(), true)->>'required', 'false', 'acceptance is idempotent');
select pg_temp.act_as(11);
select lives_ok($$select accept_current_legal_documents()$$, 'an installed client keeps its no-argument RPC');
select ok((select sensitive_consent_at is null from profiles where id = pg_temp.member(11)), 'the legacy call does not invent explicit consent');

-- A failed follow-up rolls profile creation back, and a lost success can be retried.
select pg_temp.act_as(18);
select throws_ok($$select complete_onboarding_account('New Member', 'New', '1995-01-01', 'male', 'London', 'United Kingdom',
  51.5, -0.1, pg_temp.terms(), pg_temp.privacy(), 'invalid', true)$$, '22023', 'Choose a marital status', 'a failed declaration aborts onboarding');
select ok(not exists (select 1 from profiles where id = pg_temp.member(18)), 'no partially completed account remains');
select lives_ok($$select complete_onboarding_account('New Member', 'New', '1995-01-01', 'male', 'London', 'United Kingdom',
  51.5, -0.1, pg_temp.terms(), pg_temp.privacy(), 'never_married', true)$$, 'atomic onboarding succeeds');
select lives_ok($$select complete_onboarding_account('New Member', 'New', '1995-01-01', 'male', 'London', 'United Kingdom',
  51.5, -0.1, pg_temp.terms(), pg_temp.privacy(), 'never_married', true)$$, 'a lost onboarding response can be retried');
select ok(member_has_current_legal_consents(pg_temp.member(18)), 'the finished account has current consent');
select is((select count(*)::int from marital_status_log where user_id = pg_temp.member(18)), 1, 'retry does not duplicate marital history');

-- Account codes and referral conversions are durable without a progress read.
select set_config('request.jwt.claims', '', true);
select is(member_referral_code(pg_temp.member(12)), member_referral_code(pg_temp.member(12)), 'repeated account-code creation reuses its code');
select pg_temp.act_as(13);
select throws_ok($$select claim_referral_code_for_member(member_referral_code(pg_temp.member(12)), pg_temp.member(14))$$,
  '42501', 'The account changed', 'a retained invitation cannot be claimed by a replacement account');
select is(claim_referral_code(member_referral_code(pg_temp.member(12)))->>'state', 'claimed', 'the first referral claim succeeds');
select is(claim_referral_code(member_referral_code(pg_temp.member(14)))->>'state', 'already', 'a second referrer cannot claim the same account');
select ok((select counted_at is not null from member_referrals where referred_user_id = pg_temp.member(13)), 'ready app-only referrals count at insertion');
select set_config('request.jwt.claims', '', true);
update profiles set bio = '' where id = pg_temp.member(15);
insert into member_referrals (referred_user_id, code) values (pg_temp.member(15), member_referral_code(pg_temp.member(12)));
select ok((select counted_at is null from member_referrals where referred_user_id = pg_temp.member(15)), 'an incomplete referral waits');
update profiles set bio = repeat('a', 50) where id = pg_temp.member(15);
select ok((select counted_at is not null from member_referrals where referred_user_id = pg_temp.member(15)), 'becoming ready counts without a progress read');
update profiles set bio = '' where id = pg_temp.member(15);
select ok((select counted_at is not null from member_referrals where referred_user_id = pg_temp.member(15)), 'later edits keep earned credit');

-- Public intake never identifies an early reservation; repeat intake preserves it privately.
insert into waitlist (email, city, age_range, joined_rank) values
  ('pgtap.accounts.reserved@gmail.com', 'London', '30-34', 9999),
  ('pgtap.accounts.late@gmail.com', 'London', '30-34', 10001);
select is(join_waitlist_now('pgtap.accounts.reserved@gmail.com', 'London', '30-34')->>'eligible', 'false', 'an early inbox gets the same public availability as everyone');
select is(join_waitlist_now('pgtap.accounts.late@gmail.com', 'London', '30-34')->>'eligible', 'false', 'a later place gets the same public availability');
select is((select joined_rank from waitlist where email = 'pgtap.accounts.reserved@gmail.com'), 9999, 'repeat intake preserves the private early reservation');
select is(join_waitlist_now('pgtap.accounts.new@gmail.com', 'London', '30-34'),
  join_waitlist_now('pgtap.accounts.reserved@gmail.com', 'London', '30-34'), 'new and existing inboxes receive identical public replies');

-- Expired or detached claims cannot spend quota after a reservation is reused.
insert into photo_coach_usage (user_id, first_look_at) values (pg_temp.member(16), now());
insert into photo_coach_reviews (user_id, photo_path, counted, claim_token, claimed_at)
values (pg_temp.member(16), pg_temp.member(16)::text || '/photo.jpg', true, pg_temp.member(16), now() - interval '3 minutes');
select ok(not photo_coach_save_fenced_service(pg_temp.member(16), pg_temp.member(16)::text || '/photo.jpg', pg_temp.member(16), '{}', 'test'), 'a stale save reports that no advice was saved');
select photo_coach_save_service(pg_temp.member(16), pg_temp.member(16)::text || '/photo.jpg', pg_temp.member(16), '{}', 'test');
select is((select free_looks_used from photo_coach_usage where user_id = pg_temp.member(16)), 0, 'an expired claim costs nothing');
update photo_coach_reviews set claimed_at = now() where user_id = pg_temp.member(16);
update profiles set photos = '{}' where id = pg_temp.member(16);
select photo_coach_save_service(pg_temp.member(16), pg_temp.member(16)::text || '/photo.jpg', pg_temp.member(16), '{}', 'test');
select is((select free_looks_used from photo_coach_usage where user_id = pg_temp.member(16)), 0, 'a detached photo costs nothing');
update profiles set photos = array[pg_temp.member(16)::text || '/photo.jpg'] where id = pg_temp.member(16);
select photo_coach_save_service(pg_temp.member(16), pg_temp.member(16)::text || '/photo.jpg', pg_temp.member(16), '{}', 'test');
select is((select free_looks_used from photo_coach_usage where user_id = pg_temp.member(16)), 1, 'a valid claim charges once');
select photo_coach_save_service(pg_temp.member(16), pg_temp.member(16)::text || '/photo.jpg', pg_temp.member(16), '{}', 'test');
select is((select free_looks_used from photo_coach_usage where user_id = pg_temp.member(16)), 1, 'a replay cannot charge twice');
select ok(not has_function_privilege('authenticated', 'halal_mode_private.effective_membership_tier(uuid)', 'execute'), 'members cannot inspect another entitlement');
select ok(not has_function_privilege('anon', 'public.accept_legal_documents(text,text,boolean)', 'execute'), 'anonymous callers cannot record consent');

-- A stale finalizer cannot release or renew a newer lease. Installed workers keep their RPC.
select set_config('request.jwt.claims', '', true);
update auth.users set banned_until = now() + interval '7 days' where id = pg_temp.member(11);
update profiles set is_paused = true where id = pg_temp.member(11);
select pg_temp.act_as(11);
select throws_ok($$select set_my_profile_paused(false)$$, '42501', 'A restricted account cannot be resumed', 'an active Auth restriction cannot be bypassed by resume');
select ok((select is_paused from profiles where id = pg_temp.member(11)), 'the restricted account stays paused');
select pg_temp.act_as(14);
select ok(account_media_upload_allowed(), 'a member can upload before requesting deletion');
-- The bare-Postgres shim omits platform table grants. Exercise RLS with INSERT allowed.
grant insert on storage.objects to authenticated;
set local role authenticated;
select lives_ok($$insert into storage.objects (bucket_id, name)
  values ('verification-selfies', pg_temp.member(14)::text || '/00000000-0000-0000-0000-000000022601.jpg')$$,
  'a member can insert a selfie before requesting deletion');
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into account_deletion_requests (user_id, requested_at) values
  (pg_temp.member(14), now() - interval '32 days'), (pg_temp.member(15), now() - interval '31 days');
select pg_temp.act_as(14);
select ok(not account_media_upload_allowed(), 'a pending deletion cannot create fresh media');
set local role authenticated;
select throws_ok($$insert into storage.objects (bucket_id, name)
  values ('verification-selfies', pg_temp.member(14)::text || '/00000000-0000-0000-0000-000000022602.jpg')$$,
  '42501', 'new row violates row-level security policy "account_deletion_stops_media_inserts" for table "objects"',
  'the deletion guard blocks an otherwise valid selfie insert');
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
create temporary table deletion_claim on commit drop as select * from claim_account_deletion_requests_fenced(1);
select ok((select claim_token is not null from deletion_claim), 'a new claim has ownership');
select is((select user_id from claim_account_deletion_requests(1)), pg_temp.member(15), 'an installed worker skips fenced claims');
select record_account_deletion_failure(pg_temp.member(14), 'late legacy failure');
select ok((select processing_started_at is not null from account_deletion_requests where user_id = pg_temp.member(14)), 'legacy failure cannot release fenced work');
select record_account_deletion_failure_fenced(pg_temp.member(14), 'wrong owner', gen_random_uuid());
select ok((select processing_started_at is not null from account_deletion_requests where user_id = pg_temp.member(14)), 'a different token cannot release work');
select ok(renew_account_deletion_claim_service(pg_temp.member(14), (select claim_token from deletion_claim)), 'the owner can renew its live lease');
update account_deletion_requests set processing_started_at = now() - interval '16 minutes' where user_id = pg_temp.member(14);
select ok(not renew_account_deletion_claim_service(pg_temp.member(14), (select claim_token from deletion_claim)), 'an expired owner cannot renew');
select ok((select claim_token <> (select claim_token from deletion_claim) from claim_account_deletion_requests_fenced(1)), 'reclaim rotates ownership');

select * from finish();
rollback;
