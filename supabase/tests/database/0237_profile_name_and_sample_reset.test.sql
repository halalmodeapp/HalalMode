begin;
set local search_path = public, extensions, halal_mode_private;
select plan(10);

create function pg_temp.member(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000237' || lpad(n::text, 2, '0'))::uuid;
$$;
insert into auth.users(id,email)
select pg_temp.member(n), 'you-' || n || '@example.test' from generate_series(1,2) n;
insert into profiles(id,name,first_name,birth_date,gender,city,country,latitude,longitude,bio,photos,
                     onboarding_complete,marital_status,sensitive_consent_at)
select pg_temp.member(n),'Member','Member','1995-01-01',case when n=1 then 'male' else 'female' end::gender,
       'London','United Kingdom',51.5,-0.1,repeat('a',50),array['test/photo.jpg'],true,'never_married',now()
from generate_series(1,2) n;
insert into private_preferences(user_id,own_build,matching_preferences_completed_at)
values(pg_temp.member(1),'Average',now());
insert into member_legal_consent_history(user_id,document_type,version,acceptance_context)
select pg_temp.member(1),d.document_type,d.version,'onboarding' from legal_document_registry d where d.is_current;
insert into demo_members(user_id) values(pg_temp.member(2));
update release_flags set enabled=true where key in ('tester_tools','demo_introductions');
insert into release_flag_members(key,user_id) values('tester_tools',pg_temp.member(1)),('demo_introductions',pg_temp.member(1))
on conflict do nothing;
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.member(1),'role','authenticated')::text,true);

select is(my_display_name_available_at(),null::timestamptz,'signup does not start a cooldown');
select lives_ok($$select update_my_profile('{"name":"New Name","first_name":"New Name"}')$$,'owner can change name');
select ok(my_display_name_available_at() > now() + interval '89 days','owner sees the next date');
select throws_ok($$select update_my_profile('{"name":"Next Name","first_name":"Next Name"}')$$,
  '22023','Display name cooldown','a second name change inside three months fails');
select lives_ok($$select update_my_profile('{"name":"New Name","first_name":"New Name","bio":"An updated bio about family and interests."}')$$,
  'an unchanged name does not prevent saving another field');
select public.update_my_profile(jsonb_build_object('bio',repeat('a',50)));
select ok(claim_profile_completion_message(),'the completion message is claimed once');
select ok(not claim_profile_completion_message(),'the next device cannot claim it again');

select lives_ok($$select restart_my_sample_round()$$,'tester can generate sample cards');
create temp table old_demo as select r.id from rounds r join demo_rounds d on d.round_id=r.id where r.user_id=auth.uid();
select lives_ok($$select restart_my_sample_round()$$,'tester can repeat the sample flow immediately');
select ok(exists(select 1 from rounds r join demo_rounds d on d.round_id=r.id
  join introductions i on i.round_id=r.id where r.user_id=auth.uid() and r.id not in(select id from old_demo)),
  'the restart opens a fresh sample round with cards');
select * from finish();
rollback;
