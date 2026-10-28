-- Selfie verification.
--
-- During sign-up a member takes a selfie with the camera (never from the
-- gallery). Luna checks it was a live capture of one real person, and then
-- compares every profile photo against it, so the faces on Halal Mode are the
-- people behind them. A photo of a screen, a printed picture, a screenshot,
-- or a different person is caught by the same queue that already checks
-- photos and bios (moderation_queue), so the operator email, the review list
-- in the admin panel and the two-minute cron all apply unchanged.
--
-- The selfie lives in a private bucket nobody but the service can read. The
-- member can see only a status, never the file again.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-selfies', 'verification-selfies', false, 10485760, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Upload only, into the member's own folder. There is deliberately no select,
-- update or delete policy: a selfie cannot be read back or swapped in place.
drop policy if exists "selfie owner upload" on storage.objects;
create policy "selfie owner upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'verification-selfies'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name ~ (
    '^' || (select auth.uid()::text)
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  )
);

create table if not exists halal_mode_private.member_selfies (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  path text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'review', 'rejected')),
  reason text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table halal_mode_private.member_selfies enable row level security;
revoke all on halal_mode_private.member_selfies from public, anon, authenticated;

-- The queue learns a third kind of item, and members a fourth notice.
alter table halal_mode_private.moderation_queue drop constraint if exists moderation_queue_kind_check;
alter table halal_mode_private.moderation_queue add constraint moderation_queue_kind_check
  check (kind in ('photo', 'bio', 'selfie'));

alter table public.member_notices drop constraint if exists member_notices_kind_check;
alter table public.member_notices add constraint member_notices_kind_check
  check (kind in ('report_actioned', 'report_reviewed', 'photo_removed', 'selfie_rejected'));

-- A fresh upload path for the caller, so the app never invents one.
create or replace function public.create_selfie_path()
returns text
language sql
security definer
set search_path to 'public'
as $function$
  select auth.uid()::text || '/' || gen_random_uuid()::text || '.jpg' where auth.uid() is not null;
$function$;
revoke all on function public.create_selfie_path() from public, anon;
grant execute on function public.create_selfie_path() to authenticated;

-- Sends a taken selfie to be checked. Called once the profile exists.
create or replace function public.submit_selfie(p_path text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in first' using errcode = '28000'; end if;
  if p_path !~ ('^' || v_user::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$') then
    raise exception 'Invalid selfie path' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'verification-selfies' and name = p_path) then
    raise exception 'The selfie was not uploaded' using errcode = '22023';
  end if;
  -- A handful of tries a day is plenty; more is somebody probing the check.
  if (select count(*) from halal_mode_private.moderation_queue
      where user_id = v_user and kind = 'selfie' and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Too many selfie attempts today' using errcode = 'P0001';
  end if;

  insert into halal_mode_private.member_selfies (user_id, path, status, reason, submitted_at, decided_at)
  values (v_user, p_path, 'pending', null, now(), null)
  on conflict (user_id) do update
    set path = excluded.path, status = 'pending', reason = null,
        submitted_at = now(), decided_at = null;
  insert into halal_mode_private.moderation_queue (user_id, kind, ref) values (v_user, 'selfie', p_path);
  return 'pending';
end;
$function$;

-- What the member sees: a status and nothing else.
create or replace function public.my_selfie_status()
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((select status from halal_mode_private.member_selfies where user_id = auth.uid()), 'none');
$function$;

revoke all on function public.submit_selfie(text) from public, anon;
revoke all on function public.my_selfie_status() from public, anon;
grant execute on function public.submit_selfie(text) to authenticated;
grant execute on function public.my_selfie_status() to authenticated;

-- The checker needs the member's verified selfie to compare a photo with.
create or replace function public.verified_selfie_path_service(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select path from halal_mode_private.member_selfies where user_id = p_user_id and status = 'verified';
$function$;
revoke all on function public.verified_selfie_path_service(uuid) from public, anon, authenticated;
grant execute on function public.verified_selfie_path_service(uuid) to service_role;

create or replace function public.claim_moderation_service(p_limit int default 10)
returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
  with picked as (
    select id from halal_mode_private.moderation_queue
    where decided_at is null and attempts < 4
      and (claimed_until is null or claimed_until < now())
    order by created_at
    limit greatest(1, least(p_limit, 25))
    for update skip locked
  ), claimed as (
    update halal_mode_private.moderation_queue q
    set claimed_until = now() + interval '5 minutes', attempts = q.attempts + 1
    from picked where q.id = picked.id
    returning q.id, q.user_id, q.kind, q.ref
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'user_id', c.user_id, 'kind', c.kind, 'ref', c.ref,
    -- Skip a photo already removed, a bio already replaced, or a selfie
    -- the member has since retaken.
    'current', case c.kind
      when 'photo' then c.ref = any(coalesce(p.photos, '{}'))
      when 'selfie' then exists (
        select 1 from halal_mode_private.member_selfies s where s.user_id = c.user_id and s.path = c.ref)
      else c.ref = p.bio end,
    'gender', p.gender
  )), '[]'::jsonb)
  from claimed c join public.profiles p on p.id = c.user_id;
$function$;

create or replace function public.settle_moderation_service(p_id bigint, p_decision text, p_reason text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v halal_mode_private.moderation_queue%rowtype;
begin
  update halal_mode_private.moderation_queue
  set decided_at = now(), decision = p_decision, reason = left(p_reason, 500)
  where id = p_id and decided_at is null
  returning * into v;
  if v.id is null then return; end if;

  if v.kind = 'photo' and p_decision = 'remove' then
    update public.profiles set photos = array_remove(photos, v.ref) where id = v.user_id;
    perform halal_mode_private.add_member_notice(v.user_id, 'photo_removed');
  end if;

  if v.kind = 'selfie' then
    update halal_mode_private.member_selfies
    set status = case p_decision when 'allow' then 'verified' when 'remove' then 'rejected' else 'review' end,
        reason = left(p_reason, 500), decided_at = now()
    where user_id = v.user_id and path = v.ref;
    if p_decision = 'remove' then
      perform halal_mode_private.add_member_notice(v.user_id, 'selfie_rejected');
    elsif p_decision = 'allow' then
      -- Photos checked before there was a selfie to compare with are checked
      -- again, so every photo on the profile has met the selfie.
      insert into halal_mode_private.moderation_queue (user_id, kind, ref)
      select v.user_id, 'photo', ph from public.profiles pr, unnest(coalesce(pr.photos, '{}')) as ph
      where pr.id = v.user_id;
    end if;
  end if;

  if p_decision in ('remove', 'review') then
    insert into halal_mode_private.mail_outbox (kind, ref_id) values ('moderation', v.id::text);
  end if;
end;
$function$;

revoke all on function public.claim_moderation_service(int) from public, anon, authenticated;
revoke all on function public.settle_moderation_service(bigint, text, text) from public, anon, authenticated;
grant execute on function public.claim_moderation_service(int) to service_role;
grant execute on function public.settle_moderation_service(bigint, text, text) to service_role;
