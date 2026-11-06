begin;
set local search_path = public, extensions, halal_mode_private;
select plan(27);

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000221' || n)::uuid, 'leaving-' || n || '@example.test'
from unnest(array['01', '02']) n;

insert into profiles (id, name, first_name, birth_date, gender, city, country, photos, onboarding_complete, tier, sensitive_consent_at)
values
  ('00000000-0000-0000-0000-000000022101', 'Adam', 'Adam', '1995-01-01', 'male', 'London', 'United Kingdom',
   array['p/1.jpg', 'p/2.jpg'], true, 'free', now()),
  ('00000000-0000-0000-0000-000000022102', 'Sara', 'Sara', '1996-01-01', 'female', 'London', 'United Kingdom',
   array['p/3.jpg'], true, 'free', now());

insert into halal_mode_private.member_legal_consent_history (user_id, document_type, version, acceptance_context)
select p.id, d.document_type, d.version, 'onboarding'
from profiles p cross join halal_mode_private.legal_document_registry d
where d.is_current and p.id::text like '00000000-0000-0000-0000-0000000221%';

insert into connections (id, user_a, user_b) values
  ('00000000-0000-0000-0000-000000022110', '00000000-0000-0000-0000-000000022101', '00000000-0000-0000-0000-000000022102');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------- a kind word
select pg_temp.act_as('00000000-0000-0000-0000-000000022101');
select throws_ok(
  $$ select close_connection_with_farewell('00000000-0000-0000-0000-000000022110', 'because', null) $$,
  '22023', null, 'a reason has to be one of the kind ones'
);
select throws_ok(
  $$ select close_connection_with_farewell('00000000-0000-0000-0000-000000022110', 'other', '  ') $$,
  '22023', null, 'their own words cannot be empty'
);
select throws_ok(
  $$ select close_connection_with_farewell('00000000-0000-0000-0000-000000022110', 'other', 'call me on 07700 900123') $$,
  '22023', null, 'and cannot carry contact details'
);
select is((select closed_at is null from connections where id = '00000000-0000-0000-0000-000000022110'), true,
  'a refused note closes nothing');

select lives_ok(
  $$ select close_connection_with_farewell('00000000-0000-0000-0000-000000022110', 'timing', 'ignored unless they chose other') $$,
  'closing with a reason works'
);
select is((select closed_at is not null from connections where id = '00000000-0000-0000-0000-000000022110'), true,
  'the connection is closed');
select is((select message from halal_mode_private.connection_farewells where connection_id = '00000000-0000-0000-0000-000000022110'), null,
  'a quick reason keeps no free text');
select is(jsonb_array_length(get_my_farewells()), 0, 'the one who closed has no note');

select pg_temp.act_as('00000000-0000-0000-0000-000000022102');
select is(get_my_farewells() -> 0 ->> 'reason', 'timing', 'the other person is told why');
select is(get_my_farewells() -> 0 ->> 'name', 'Adam', 'and by whom');
select mark_farewell_seen('00000000-0000-0000-0000-000000022110');
select is(jsonb_array_length(get_my_farewells()), 0, 'a note read once is gone');

-- ---------------------------------------------------------------- Halal Bot
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
create function pg_temp.claim() returns text[] language sql as $$
  select array(select jsonb_array_elements_text(photo_coach_claim_service('00000000-0000-0000-0000-000000022101') -> 'photos'));
$$;
create function pg_temp.look(p_photo text) returns void language sql as $$
  select photo_coach_save_service('00000000-0000-0000-0000-000000022101', p_photo,
    (select claim_token from halal_mode_private.photo_coach_reviews
     where user_id = '00000000-0000-0000-0000-000000022101' and photo_path = p_photo),
    '{"summary":"good"}', 'm');
$$;
create function pg_temp.used() returns int language sql as $$
  select free_looks_used from halal_mode_private.photo_coach_usage where user_id = '00000000-0000-0000-0000-000000022101';
$$;
create function pg_temp.lapse() returns void language sql as $$
  update halal_mode_private.photo_coach_reviews set claimed_at = now() - interval '3 minutes'
  where user_id = '00000000-0000-0000-0000-000000022101' and advice is null;
$$;

select is(pg_temp.claim(), array['p/1.jpg', 'p/2.jpg'], 'the first look covers every photo');
select pg_temp.look('p/1.jpg');
select pg_temp.lapse();
select is(pg_temp.claim(), array['p/2.jpg'], 'a photo the first look missed can be tried again');
select pg_temp.look('p/2.jpg');
select is(pg_temp.used(), 0, 'and all of it uses up none of the free looks');

update profiles set photos = array['p/1.jpg', 'p/2.jpg', 'p/4.jpg'] where id = '00000000-0000-0000-0000-000000022101';
select is(pg_temp.claim(), array['p/4.jpg'], 'after that, only the new photo is looked at');
select is(pg_temp.used(), 0, 'and a look that has not finished costs nothing yet');
select lives_ok(
  $$ select photo_coach_save_service('00000000-0000-0000-0000-000000022101', 'p/4.jpg', gen_random_uuid(), '{"summary":"late"}', 'm') $$,
  'a worker whose claim has gone is ignored'
);
select is(pg_temp.used(), 0, 'and spends nothing');
select pg_temp.look('p/4.jpg');
select is(pg_temp.used(), 1, 'a finished look on a new photo uses one');

-- Two free looks left: swapping photos during a look cannot get more than two.
update profiles set photos = array['p/5.jpg', 'p/6.jpg', 'p/7.jpg'] where id = '00000000-0000-0000-0000-000000022101';
select is(pg_temp.claim(), array['p/5.jpg', 'p/6.jpg'], 'only the looks left can be claimed');
update profiles set photos = array['p/8.jpg', 'p/9.jpg'] where id = '00000000-0000-0000-0000-000000022101';
select is(pg_temp.claim(), '{}'::text[], 'and looks running hold theirs, however the photos change');

update halal_mode_private.photo_coach_usage set free_looks_used = 3 where user_id = '00000000-0000-0000-0000-000000022101';
select pg_temp.lapse();
select is(pg_temp.claim(), '{}'::text[], 'after three, a free member gets no more');
insert into halal_mode_private.member_entitlements (user_id, tier, state, provider)
values ('00000000-0000-0000-0000-000000022101', 'premium', 'active', 'test_fixture');
select is(pg_temp.claim(), array['p/8.jpg', 'p/9.jpg'], 'and Premium does');

-- ---------------------------------------------------------------- why they left
select pg_temp.act_as('00000000-0000-0000-0000-000000022102');
select record_exit_answer('married', 'Thank you');
select is((select reason from halal_mode_private.exit_answers limit 1), 'married', 'a reason for leaving is kept');
select record_exit_answer('other', 'And again');
select is((select count(*)::int from halal_mode_private.exit_answers), 1, 'and an account answers only once');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'halal_mode_private' and table_name = 'exit_answers'
      and column_name in ('user_id', 'name', 'email', 'member_id', 'created_at')
  ),
  'with nothing that says whose it was'
);
delete from halal_mode_private.exit_answer_marks;
select throws_ok($$ select record_exit_answer('because', null) $$, '23514', null, 'and only from the list');

select * from finish();
rollback;
