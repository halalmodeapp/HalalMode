begin;
set local search_path = public, extensions, halal_mode_private;
select plan(21);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000235' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
insert into auth.users (id, email, email_confirmed_at)
select pg_temp.member(n), 'flow-' || n || '@example.test', now() from generate_series(1, 6) n;
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude,
                      bio, photos, onboarding_complete, marital_status, sensitive_consent_at)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01', case when n % 2 = 0 then 'female' else 'male' end::gender,
       'London', 'United Kingdom', 51.5, -0.1, repeat('a', 50), array[pg_temp.member(n)::text || '/p.jpg'],
       true, 'never_married', now() from generate_series(1, 6) n;
insert into private_preferences (user_id, own_build, matching_preferences_completed_at, preferred_countries)
select pg_temp.member(n), 'Average', now(), array['United Kingdom'] from generate_series(1, 6) n;
insert into member_legal_consent_history (user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 6) n cross join legal_document_registry d where d.is_current;

insert into mutual_connection_queue (user_a, user_b)
values (pg_temp.member(1), pg_temp.member(2)), (pg_temp.member(3), pg_temp.member(4));
update profiles set bio = 'too short' where id = pg_temp.member(2);
update profiles set sensitive_consent_at = null where id = pg_temp.member(4);
select is(recheck_waiting_connections(), 0, 'incomplete profiles and missing consent still hold the mutual');
update profiles set bio = repeat('a', 50) where id = pg_temp.member(2);
select pg_temp.act_as(4);
select accept_legal_documents(null, null, true);
select set_config('request.jwt.claims', '', true);
select is(recheck_waiting_connections(), 2, 'the scheduled path promotes both newly eligible pairs');
select is(recheck_waiting_connections(), 0, 'the next scheduled pass does not recreate connections');
select ok(exists (select 1 from cron.job where jobname = 'halal-mode-recheck-waiting-connections'),
  'the recheck runs without a member action');

insert into member_entitlements (user_id, tier, state, provider)
values (pg_temp.member(5), 'premium', 'active', 'test');
update private_preferences
set preferred_education = array['bachelors'], premium_must_have = '{"education":true}'
where user_id = pg_temp.member(5);
update profiles set education = 'prefer_not_to_say' where id = pg_temp.member(6);
select ok(premium_filters_allow(pg_temp.member(5), pg_temp.member(6)), 'live Premium filter treats a decline as blank');
select ok((select accepts_row(a, b, null) from member_matching_facts a cross join member_matching_facts b
  where a.id = pg_temp.member(5) and b.id = pg_temp.member(6)), 'allocator accepts the same decline');
update profiles set education = 'high_school' where id = pg_temp.member(6);
select ok(not premium_filters_allow(pg_temp.member(5), pg_temp.member(6)), 'an explicitly different answer still fails');
select ok(not (select accepts_row(a, b, null) from member_matching_facts a cross join member_matching_facts b
  where a.id = pg_temp.member(5) and b.id = pg_temp.member(6)), 'allocator still rejects the explicit mismatch');
update private_preferences
set preferred_occupations = array['software_engineer'], premium_must_have = '{"occupations":true}'
where user_id = pg_temp.member(5);
update profiles set occupation = 'prefer_not_to_say' where id = pg_temp.member(6);
select ok(premium_filters_allow(pg_temp.member(5), pg_temp.member(6)), 'live career filter also treats a decline as blank');
select ok((select accepts_row(a, b, null) from member_matching_facts a cross join member_matching_facts b
  where a.id = pg_temp.member(5) and b.id = pg_temp.member(6)), 'allocator accepts the same career decline');
update profiles set occupation = 'student' where id = pg_temp.member(6);
select ok(not premium_filters_allow(pg_temp.member(5), pg_temp.member(6)), 'a different career still fails the hard filter');
select ok(not (select accepts_row(a, b, null) from member_matching_facts a cross join member_matching_facts b
  where a.id = pg_temp.member(5) and b.id = pg_temp.member(6)), 'allocator still rejects a different career');

select pg_temp.act_as(5);
select record_exit_answer('married', null);
select is(exit_survey_totals(current_date)->>'married', '1', 'the answer counts before a deletion request');
insert into admin_members (user_id, role) values (pg_temp.member(1), 'owner');
select set_config('request.jwt.claims',
  jsonb_build_object('sub', pg_temp.member(1), 'role', 'authenticated', 'aal', 'aal2')::text, true);
select is(admin_match_stats(30)->'leaving'->>'married', '1', 'the actual dashboard counts the submitted answer');
select pg_temp.act_as(5);
select record_exit_answer('married', null);
select is(exit_survey_totals(current_date)->>'married', '1', 'resubmitting does not count twice');
select request_my_account_deletion();
select cancel_my_account_deletion();
select is(exit_survey_totals(current_date)->>'married', null, 'keeping the account withdraws the answer');
select pg_temp.act_as(6);
select record_exit_answer('other', 'A fixture note');
select is(exit_survey_totals(current_date)->>'other', '1', 'the tally includes a submitted other response');
select request_my_account_deletion();
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
delete from auth.users where id = pg_temp.member(6);
select is(exit_survey_totals(current_date)->>'other', '1', 'erasure moves the response without doubling the tally');
select is((select note from exit_answers where reason = 'other'), 'A fixture note', 'the established other-note rule still applies');

-- The original survey wrote an anonymous answer and left a mark while the
-- member still had an account. A later staged answer must not double it.
insert into exit_answer_marks (user_id) values (pg_temp.member(5));
insert into exit_answers (reason, stayed, ever_connected, week)
values ('engaged', 'under_a_month', false, date_trunc('week', now())::date);
select pg_temp.act_as(5);
select record_exit_answer('engaged', null);
select is(exit_survey_totals(current_date)->>'engaged', '1', 'a previously counted member adds no staged duplicate');
select request_my_account_deletion();
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
delete from auth.users where id = pg_temp.member(5);
select is(exit_survey_totals(current_date)->>'engaged', '1', 'erasure does not duplicate an answer from the original survey');

select * from finish();
rollback;
