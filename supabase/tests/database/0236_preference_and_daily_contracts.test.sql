begin;
set local search_path = public, extensions, halal_mode_private;
select plan(25);

create function pg_temp.id(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
$$;
insert into auth.users(id,email,email_confirmed_at)
select pg_temp.id(n), 'daily-' || n || '@example.test', now() from generate_series(1,6) n;
insert into profiles(id,name,first_name,birth_date,gender,city,country,latitude,longitude,bio,photos,
                     onboarding_complete,marital_status,sensitive_consent_at)
select pg_temp.id(n),'Member','Member','1995-01-01',case when n=1 then 'male' else 'female' end::gender,
       'London','United Kingdom',51.5,-0.1,repeat('a',50),array['test/photo.jpg'],true,'never_married',now()
from generate_series(1,6) n;
insert into private_preferences(user_id,matching_preferences_completed_at,own_build,preferred_countries)
select pg_temp.id(n), now(), case when n>1 then 'Average' end,array['United Kingdom'] from generate_series(1,6) n;
insert into member_legal_consent_history(user_id,document_type,version,acceptance_context)
select pg_temp.id(n), d.document_type,d.version,'onboarding'
from generate_series(1,6) n cross join legal_document_registry d where d.is_current;
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.id(1),'role','authenticated')::text,true);

select is(get_my_profile_readiness()->'missing','["body_type"]'::jsonb,'existing member sees exactly what is missing');
select ok(not exists(select 1 from league_pool where id=auth.uid()),'missing build keeps a member outside the pool');
select public.update_my_private_preferences('{"own_build":"Average","own_weight_kg":85}');
select is((select own_weight_kg from private_preferences where user_id=auth.uid()),null::integer,'installed client cannot collect weight');
select ok(not (get_my_private_preferences() ? 'own_weight_kg'),'weight omitted from the read payload');
select ok(exists(select 1 from league_pool where id=auth.uid()),'supplying a build opens eligibility');

select public.update_my_private_preferences('{"own_build":""}');
select ok(not profile_is_ready_for_matching(auth.uid()),'clearing the last declaration removes readiness');
select public.update_my_private_preferences('{"own_build":"Average"}');
create temp table original as select edit_revision,max_distance_km from private_preferences where user_id=auth.uid();
select throws_ok($$select save_my_matching_preferences((select edit_revision from original),
  '{"max_distance_km":20}', '{}', array['unknown-tradition'], null)$$,
  '22023', null, 'invalid sect detail aborts the save');
select ok((select (p.edit_revision,p.max_distance_km)=(o.edit_revision,o.max_distance_km)
  from private_preferences p,original o where p.user_id=auth.uid()),'both base edit and revision rolled back');
select throws_ok($$select save_my_matching_preferences((select edit_revision from original),
  '{"max_distance_km":20}', '{}', '{}', '{"languages":["English"]}')$$,
  '42501',null,'a Free account cannot commit a Premium edit');
select throws_ok($$select save_my_matching_preferences((select edit_revision from original),
  '{"max_distance_km":20}','{}','{}',null,array['married'])$$,
  '22023',null,'invalid marital filter also rolls back the batch');
select isnt(save_my_matching_preferences((select edit_revision from original),'{"max_distance_km":20}',
  '{}','{}',null,array['widowed']),(select edit_revision from original),'successful save returns a new revision');
select is(get_my_private_preferences()->'accepted_marital_statuses','["widowed"]'::jsonb,'marital preferences share the same commit');
select throws_ok($$select save_my_matching_preferences((select edit_revision from original),
  '{"max_distance_km":50}','{}','{}',null)$$,'40001',null,'a stale second device cannot overwrite');
select is((select max_distance_km from private_preferences where user_id=auth.uid()),20,'winning edit survives');

select set_my_marital_preferences(array['never_married']);

create function pg_temp.deal(n int) returns void language plpgsql as $$
begin
  insert into rounds(id,user_id,tier,opens_at,expires_at) values(pg_temp.id(n),auth.uid(),'free',now()-interval '1 minute',now()+interval '1 day');
  insert into introductions(id,round_id,viewer_id,subject_id)
  select pg_temp.id(n*10+x),pg_temp.id(n),auth.uid(),pg_temp.id(x) from generate_series(2,6) x;
end;
$$;
create function pg_temp.send(n int, picks int, first_seconds int, second_seconds int) returns jsonb language sql as $$
  select submit_round_selections_ranked_with_signals(pg_temp.id(n),
    array(select pg_temp.id(n*10+x) from generate_series(2,picks+1) x),
    jsonb_build_array(jsonb_build_object('introductionId',pg_temp.id(n*10+5),'profileSeconds',first_seconds),
                      jsonb_build_object('introductionId',pg_temp.id(n*10+6),'profileSeconds',second_seconds)))
$$;
select pg_temp.deal(100);
select soft_select_introduction(pg_temp.id(1005));
select pg_temp.send(100,0,20,5);
select pg_temp.deal(101);
select pg_temp.send(101,2,20,5);
select pg_temp.deal(102);
select pg_temp.send(102,3,20,20);
select pg_temp.deal(105);
select pg_temp.send(105,3,15,10);
select pg_temp.deal(103);
select pg_temp.send(103,3,0,0);
select is((select count(*) from introduction_selections where decision='soft_select'),0::bigint,
  'no soft signal for unused picks, tied or adjacent bins, or no foreground reading');
select pg_temp.deal(104);
create temp table acknowledged as select pg_temp.send(104,3,20,5) as result;
select is(pg_temp.send(104,3,20,5),(select result from acknowledged),'lost response can be replayed');
select is(pg_temp.send(104,3,20,5),(select result from acknowledged),'third delivery acknowledges the same choices');
select is((select decision::text from introduction_selections where introduction_id=pg_temp.id(1045)),
  'soft_select','unique meaningful unchosen reading becomes a private soft select');
select is((select soft_select_count::int from pair_exposure where user_low=pg_temp.id(1) and user_high=pg_temp.id(5)),
  1,'three submissions increment the counter once');
select throws_ok($$select pg_temp.send(104,2,20,5)$$,'22023',null,'retry cannot replace accepted choices');

insert into member_entitlements(user_id,tier,state,provider) values(auth.uid(),'premium','active','test');
update profiles set education='high_school' where id<>auth.uid();
update private_preferences set premium_must_have='{"education":true}', preferred_education=array['bachelors'] where user_id=auth.uid();
insert into league_cycles(cycle_date,seed,phase) values(current_date,236,'sealed');
insert into rounds(id,user_id,tier,opens_at,expires_at,cycle_date,seats)
values(pg_temp.id(200),auth.uid(),'premium',now()-interval '1 minute',now()+interval '1 day',current_date,10);
select is(league_thin_note(pg_temp.id(200),auth.uid(),7)->>'criterion','education','seven of ten still checks Premium criteria');
select set_config('request.jwt.claims','',true);
update profiles set is_paused=true where id<>pg_temp.id(1);
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.id(1),'role','authenticated')::text,true);
select is(league_thin_note(pg_temp.id(200),auth.uid(),7),null::jsonb,'loosening a filter cannot help when no eligible people remain');
insert into league_jobs(cycle_date,wave,stratum,table_no,status) values(current_date,0,'failed',0,'failed');
insert into league_seats(cycle_date,wave,stratum,table_no,user_id,seats) values(current_date,0,'failed',0,auth.uid(),10);
select is(league_thin_note(pg_temp.id(200),auth.uid(),7),'{"incomplete":true}'::jsonb,'partial failure is explained with cards retained');
select is(league_thin_note(pg_temp.id(200),auth.uid(),0),'{"incomplete":true}'::jsonb,'empty failed set also avoids filter blame');
select is(league_thin_note(pg_temp.id(200),auth.uid(),10),null::jsonb,'a full Premium set has no short-set notice');
select * from finish();
rollback;
