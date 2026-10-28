-- Selfies are kept only as long as they are needed.
--
-- A selfie is biometric data. Once it has been checked, the verdict is what
-- matters, so the picture is deleted: a verified (or doubtful) selfie after
-- 30 days, a rejected one after a day, a replaced one at once, and an upload
-- that was never submitted after two days. The `moderate` function does the
-- deleting (a database cannot remove a stored file), and the account-deletion
-- job removes every selfie of an erased member.
--
-- After the picture is gone a member keeps their verified status, but new
-- photos are no longer compared with it (they are still checked for screens
-- and prints).

create table if not exists halal_mode_private.selfie_files (
  path text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  purge_after timestamptz,
  purged_at timestamptz
);
create index if not exists selfie_files_due on halal_mode_private.selfie_files (purge_after) where purged_at is null;
alter table halal_mode_private.selfie_files enable row level security;
revoke all on halal_mode_private.selfie_files from public, anon, authenticated;

-- Selfies already on file are registered, with the same deadlines.
insert into halal_mode_private.selfie_files (path, user_id, purge_after)
select s.path, s.user_id,
       case when s.decided_at is null then null
            when s.status = 'rejected' then s.decided_at + interval '1 day'
            else s.decided_at + interval '30 days' end
from halal_mode_private.member_selfies s
on conflict (path) do nothing;

-- Submitting registers the file and retires the one it replaces.
do $$
declare
  v_def text;
  v_anchor constant text := $a$  insert into halal_mode_private.member_selfies (user_id, path, status, reason, submitted_at, decided_at)$a$;
begin
  select pg_get_functiondef('public.submit_selfie(text)'::regprocedure) into v_def;
  if position(v_anchor in v_def) = 0 then raise exception 'submit_selfie: anchor not found'; end if;
  v_def := replace(v_def, v_anchor, $r$  update halal_mode_private.selfie_files set purge_after = now()
  where purged_at is null
    and path = (select path from halal_mode_private.member_selfies where user_id = v_user);
  insert into halal_mode_private.selfie_files (path, user_id) values (p_path, v_user) on conflict (path) do nothing;
$r$ || v_anchor);
  execute v_def;
end;
$$;

-- A decision starts the clock.
do $$
declare
  v_def text;
  v_anchor constant text := $a$  if v.kind = 'selfie' then
$a$;
begin
  select pg_get_functiondef('public.settle_moderation_service(bigint,text,text)'::regprocedure) into v_def;
  if position(v_anchor in v_def) = 0 then raise exception 'settle_moderation_service: anchor not found'; end if;
  v_def := replace(v_def, v_anchor, v_anchor || $r$    update halal_mode_private.selfie_files
    set purge_after = now() + case p_decision when 'remove' then interval '1 day' else interval '30 days' end
    where path = v.ref and purged_at is null;
$r$);
  execute v_def;
end;
$$;

-- Photos are compared only with a selfie that still exists.
create or replace function public.verified_selfie_path_service(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select s.path
  from halal_mode_private.member_selfies s
  join halal_mode_private.selfie_files f on f.path = s.path
  where s.user_id = p_user_id and s.status = 'verified' and f.purged_at is null;
$function$;

-- What the deleting job should remove now: files past their deadline, and
-- uploads nobody submitted.
create or replace function public.selfies_to_purge_service(p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(path), '[]'::jsonb) from (
    select f.path from halal_mode_private.selfie_files f
    where f.purged_at is null and f.purge_after is not null and f.purge_after <= now()
    union
    select o.name from storage.objects o
    where o.bucket_id = 'verification-selfies' and o.created_at < now() - interval '2 days'
      and not exists (select 1 from halal_mode_private.selfie_files f where f.path = o.name)
    limit greatest(1, least(p_limit, 200))
  ) due(path);
$function$;

create or replace function public.mark_selfie_purged_service(p_path text)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update halal_mode_private.selfie_files set purged_at = now() where path = p_path;
$function$;

revoke all on function public.selfies_to_purge_service(integer) from public, anon, authenticated;
revoke all on function public.mark_selfie_purged_service(text) from public, anon, authenticated;
grant execute on function public.selfies_to_purge_service(integer) to service_role;
grant execute on function public.mark_selfie_purged_service(text) to service_role;

-- A daily run of the moderation function, so the deleting happens even when
-- nothing is waiting in the queue.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'halal-mode-selfie-retention') then
    perform cron.unschedule('halal-mode-selfie-retention');
  end if;
  perform cron.schedule(
    'halal-mode-selfie-retention',
    '40 3 * * *',
    $job$
      select net.http_post(
        url := 'https://lfuuywsmydruvqkqwvzw.supabase.co/functions/v1/moderate',
        headers := jsonb_build_object(
          'x-mail-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'halal_mode_mail_worker' order by created_at desc limit 1),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
    $job$
  );
end;
$$;
