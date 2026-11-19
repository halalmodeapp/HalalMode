begin;
set local search_path = public, extensions, halal_mode_private;
select plan(10);

create function pg_temp.owner_id() returns uuid language sql immutable as $$
  select '00000000-0000-0000-0000-000000023801'::uuid
$$;
insert into auth.users(id,email) values (pg_temp.owner_id(),'wingman@example.test');
insert into profiles(id,name,first_name,birth_date,gender,photos)
values (pg_temp.owner_id(),'Member','Member','1995-01-01','female',array['a.jpg','b.jpg']);
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.owner_id(),'role','authenticated')::text,true);
select is(get_my_photo_coach()->>'freeLooksLeft','3','a free member starts with three sessions');
create temp table attempt as select photo_coach_claim_service(pg_temp.owner_id()) as claim;
select is(jsonb_array_length((select claim->'photos' from attempt)),2,'one session includes both new photos');
select is(photo_coach_claim_service(pg_temp.owner_id())->>'reason','in_progress','simultaneous taps share a single active session');
select photo_coach_finish_service(pg_temp.owner_id(),(select (claim->>'token')::uuid from attempt));
select is(get_my_photo_coach()->>'freeLooksLeft','3','a failed session spends no allowance');
update attempt set claim=photo_coach_claim_service(pg_temp.owner_id());
select photo_coach_save_fenced_service(pg_temp.owner_id(),'a.jpg',(select (claim->>'token')::uuid from attempt),'{"summary":"Light"}','test');
select photo_coach_save_fenced_service(pg_temp.owner_id(),'b.jpg',(select (claim->>'token')::uuid from attempt),'{"summary":"Light"}','test');
select is(get_my_photo_coach()->>'freeLooksLeft','2','saving two reviews consumes just one session');
select is(photo_coach_claim_service(pg_temp.owner_id())->>'reason','up_to_date','unchanged photos cannot consume another session');
select photo_coach_finish_service(pg_temp.owner_id(),(select (claim->>'token')::uuid from attempt));

select set_config('app.profile_media_rpc','true',true);
update profiles set photos=array['a.jpg','b.jpg','c.jpg'] where id=pg_temp.owner_id();
update attempt set claim=photo_coach_claim_service(pg_temp.owner_id());
select is((select claim->'photos' from attempt),'["c.jpg"]'::jsonb,'reanalysis includes only the new photo');
select photo_coach_save_fenced_service(pg_temp.owner_id(),'c.jpg',(select (claim->>'token')::uuid from attempt),'{"summary":"Light"}','test');
select photo_coach_finish_service(pg_temp.owner_id(),(select (claim->>'token')::uuid from attempt));
update profiles set photos=array['a.jpg','b.jpg','d.jpg'] where id=pg_temp.owner_id();
update attempt set claim=photo_coach_claim_service(pg_temp.owner_id());
select photo_coach_save_fenced_service(pg_temp.owner_id(),'d.jpg',(select (claim->>'token')::uuid from attempt),'{"summary":"Light"}','test');
select photo_coach_finish_service(pg_temp.owner_id(),(select (claim->>'token')::uuid from attempt));
update profiles set photos=array['a.jpg','b.jpg','e.jpg'] where id=pg_temp.owner_id();
select is(photo_coach_claim_service(pg_temp.owner_id())->>'reason','premium_required','a fourth free analysis requires Premium');
insert into member_entitlements(user_id,tier,state,provider) values(pg_temp.owner_id(),'premium','active','test');
update attempt set claim=photo_coach_claim_service(pg_temp.owner_id());
select is((select claim->'photos' from attempt),'["e.jpg"]'::jsonb,'Premium can continue after the free limit');
select photo_coach_finish_service(pg_temp.owner_id(),(select (claim->>'token')::uuid from attempt));
insert into photo_coach_runs(user_id,free_session,finished_at)
select pg_temp.owner_id(),false,now() from generate_series(1,100);
select is(photo_coach_claim_service(pg_temp.owner_id())->>'reason','fair_use','burst protection also applies to Premium');
select * from finish();
rollback;
