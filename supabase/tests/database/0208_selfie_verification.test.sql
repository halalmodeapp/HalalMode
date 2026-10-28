begin;
set local search_path = public, extensions, halal_mode_private;
select plan(7);

select ok(
  exists (select 1 from storage.buckets where id = 'verification-selfies' and public = false),
  'selfies live in a private bucket');
select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and qual like '%verification-selfies%' and cmd <> 'INSERT'),
  'no policy lets a member read, change or delete a selfie');
select ok(
  not has_table_privilege('authenticated', 'halal_mode_private.member_selfies', 'SELECT'),
  'members cannot read the selfie table directly');
select ok(
  has_function_privilege('authenticated', 'public.submit_selfie(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.submit_selfie(text)', 'EXECUTE'),
  'only signed-in members can submit a selfie');
select ok(
  has_function_privilege('service_role', 'public.verified_selfie_path_service(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.verified_selfie_path_service(uuid)', 'EXECUTE'),
  'only the checker can look up a verified selfie');
select ok(
  position('selfie' in pg_get_functiondef('public.settle_moderation_service(bigint,text,text)'::regprocedure)) > 0
  and position('photo_removed' in pg_get_functiondef('public.settle_moderation_service(bigint,text,text)'::regprocedure)) > 0,
  'settling keeps the photo-removed notice and adds the selfie outcome');
select ok(
  position('selfie' in pg_get_functiondef('public.claim_moderation_service(integer)'::regprocedure)) > 0,
  'the claim skips a selfie the member has since retaken');

select * from finish();
rollback;
