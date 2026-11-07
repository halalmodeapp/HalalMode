begin;
set local search_path = public, extensions, halal_mode_private;
select plan(9);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000232' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.nobody() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.waiting(a int, b int) returns boolean language sql as $$
  select exists (select 1 from mutual_connection_queue
                 where user_a = least(pg_temp.member(a), pg_temp.member(b)) and user_b = greatest(pg_temp.member(a), pg_temp.member(b)));
$$;
insert into auth.users (id, email, email_confirmed_at)
select pg_temp.member(n), 'rules-' || n || '@example.test', now() from generate_series(1, 6) n;
insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude,
                      bio, photos, onboarding_complete, marital_status, sensitive_consent_at)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01', case when n % 2 = 0 then 'female' else 'male' end::gender,
       'London', 'United Kingdom', 51.5, -0.1, repeat('a', 50), array[pg_temp.member(n)::text || '/p.jpg'],
       true, 'never_married', now() from generate_series(1, 6) n;
insert into private_preferences (user_id, matching_preferences_completed_at, preferred_countries)
select pg_temp.member(n), now(), array['United Kingdom'] from generate_series(1, 6) n;
insert into member_legal_consent_history (user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 6) n cross join legal_document_registry d where d.is_current;

-- M8. A waiting match opens only while both could be matched, and a block ends it at once.
insert into mutual_connection_queue (user_a, user_b) values (pg_temp.member(1), pg_temp.member(2));
update profiles set bio = 'too short' where id = pg_temp.member(2);
select halal_mode_private.promote_waiting_connections(array[pg_temp.member(1), pg_temp.member(2)]);
select ok(not exists (select 1 from connections where user_a = pg_temp.member(1) and user_b = pg_temp.member(2)),
  'a profile that is no longer ready does not open a waiting match');
select ok(pg_temp.waiting(1, 2), 'it keeps waiting');
update profiles set bio = repeat('a', 50) where id = pg_temp.member(2);
select halal_mode_private.promote_waiting_connections(array[pg_temp.member(1), pg_temp.member(2)]);
select ok(exists (select 1 from connections where user_a = pg_temp.member(1) and user_b = pg_temp.member(2)),
  'once ready again it opens');
insert into mutual_connection_queue (user_a, user_b) values (pg_temp.member(3), pg_temp.member(4));
insert into blocks (blocker_id, blocked_id) values (pg_temp.member(4), pg_temp.member(3));
select ok(not pg_temp.waiting(3, 4), 'a block ends a waiting match at once');

-- C6. Opening twice is the same as opening once.
update connections set stage = 'recap' where user_a = pg_temp.member(1) and user_b = pg_temp.member(2);
create function pg_temp.c12() returns uuid language sql as $$
  select id from connections where user_a = pg_temp.member(1) and user_b = pg_temp.member(2);
$$;
select pg_temp.act_as(1);
select lives_ok($$select open_connection(pg_temp.c12())$$, 'the first open works');
select lives_ok($$select open_connection(pg_temp.c12())$$, 'a retried open after success also works');
select pg_temp.act_as(5);
select throws_ok($$select open_connection(pg_temp.c12())$$, 'P0001', 'Connection cannot be opened', 'someone else still cannot open it');

-- C4 and C3. Closing takes the member locks first, and the installed close leaves a farewell.
select ok(position('pg_advisory_xact_lock' in pg_get_functiondef('halal_mode_private.close_connection_after_legal_consent(uuid)'::regprocedure))
  < position('update connections' in pg_get_functiondef('halal_mode_private.close_connection_after_legal_consent(uuid)'::regprocedure)),
  'close locks the members before it touches the connection');
select pg_temp.act_as(1);
select close_connection(pg_temp.c12());
select is((select reason from connection_farewells where connection_id = pg_temp.c12()), 'generic', 'the installed close leaves a kind farewell');

select * from finish();
rollback;
