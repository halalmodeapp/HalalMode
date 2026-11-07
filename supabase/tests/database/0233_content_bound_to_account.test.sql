begin;
set local search_path = public, extensions, halal_mode_private;
select plan(10);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000233' || lpad(n::text, 2, '0'))::uuid;
$$;
create function pg_temp.act_as(n int) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.member(n), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.service() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"service_role"}', true);
$$;
insert into auth.users (id, email, email_confirmed_at)
select pg_temp.member(n), 'content-' || n || '@example.test', now() from generate_series(1, 3) n;
insert into profiles (id, name, first_name, birth_date, gender, onboarding_complete, marital_status, sensitive_consent_at)
select pg_temp.member(n), 'Member', 'Member', '1995-01-01', case when n % 2 = 0 then 'female' else 'male' end::gender,
       true, 'never_married', now() from generate_series(1, 3) n;
insert into member_legal_consent_history (user_id, document_type, version, acceptance_context)
select pg_temp.member(n), d.document_type, d.version, 'onboarding'
from generate_series(1, 3) n cross join legal_document_registry d where d.is_current;

-- C7. A message is sent only by the account that wrote it.
insert into connections (user_a, user_b, stage) values (pg_temp.member(1), pg_temp.member(2), 'open');
create function pg_temp.chat() returns uuid language sql as $$
  select id from connections where user_a = pg_temp.member(1) and user_b = pg_temp.member(2);
$$;
select pg_temp.act_as(2);
select throws_ok($$select send_message(pg_temp.chat(), 'Written by the other account', 'request-000000000233', pg_temp.member(1))$$,
  '42501', 'This message belongs to another account', 'a draft written by another account is refused');
select lives_ok($$select send_message(pg_temp.chat(), 'Salaam', 'request-000000000234', pg_temp.member(2))$$, 'the writer sends it');
select lives_ok($$select send_message(pg_temp.chat(), 'From an installed app', 'request-000000000235')$$, 'an installed app sends without naming itself');

-- A5. Approval names the exact revision that was checked.
create function pg_temp.photo(n int, k int) returns text language sql immutable as $$
  select pg_temp.member(n)::text || '/00000000-0000-0000-0000-00000000000' || k || '.jpg';
$$;
insert into storage.objects (bucket_id, name, metadata, version, created_at)
values ('profile-photos', pg_temp.photo(1, 1), '{"mimetype":"image/jpeg","size":100}', 'revision-a', now()),
       ('profile-photos', pg_temp.photo(1, 2), '{"mimetype":"image/jpeg","size":100}', 'revision-b', now() - interval '3 days');
select pg_temp.service();
select is(get_profile_media_object_version_service('profile-photos', pg_temp.photo(1, 1)), 'revision-a', 'the worker can read the revision');
select throws_ok($$select record_profile_media_validation_service('profile-photos', pg_temp.photo(1, 1), 'photo', 'image/jpeg', 100, 'revision-old')$$,
  '40001', null, 'a file swapped during the check is not approved');
select throws_ok($$select record_profile_media_validation_service('profile-photos', pg_temp.photo(1, 1), 'photo', 'image/jpeg', 99, 'revision-a')$$,
  '40001', null, 'nor is one whose size differs from the bytes checked');
select lives_ok($$select record_profile_media_validation_service('profile-photos', pg_temp.photo(1, 1), 'photo', 'image/jpeg', 100, 'revision-a')$$,
  'the checked revision is approved');

-- An attached file cannot be deleted by the member, so a profile never points at nothing.
select pg_temp.act_as(1);
select attach_profile_photo(pg_temp.photo(1, 1));
select throws_ok($$delete from storage.objects where name = pg_temp.photo(1, 1)$$, '42501', 'This file is attached to a profile',
  'an attached photo cannot be deleted');

-- A8. Old files that nothing uses are found for cleanup, and nothing in use is.
select pg_temp.service();
select is((select array_agg(name) from list_abandoned_profile_media_service(100) where name like pg_temp.member(1)::text || '%'),
  array[pg_temp.photo(1, 2)], 'only the old unattached upload is listed');
select pg_temp.act_as(3);
select throws_ok($$select * from list_abandoned_profile_media_service(1)$$,
  '42501', null, 'members cannot list it');

select * from finish();
rollback;
