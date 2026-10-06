-- Automatic moderation of photos and bios with Claude Haiku.
--
-- Each new photo and each changed bio is queued; the moderate function checks
-- it against the photo rules and community guidelines. A photo that clearly
-- breaks them is taken off the profile; anything doubtful, and any bio that
-- breaks them, is emailed to the operator through the same mail outbox. A
-- passing item costs nothing further. Nothing is held back while it waits:
-- most members are honest, and checks run within two minutes.

create table if not exists halal_mode_private.moderation_queue (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('photo', 'bio')),
  ref text not null,                 -- storage path, or the bio text
  created_at timestamptz not null default now(),
  claimed_until timestamptz,
  attempts smallint not null default 0,
  decided_at timestamptz,
  decision text check (decision in ('allow', 'remove', 'review')),
  reason text
);
create index if not exists moderation_queue_pending on halal_mode_private.moderation_queue (created_at)
  where decided_at is null;
alter table halal_mode_private.moderation_queue enable row level security;
revoke all on halal_mode_private.moderation_queue from public, anon, authenticated;

create or replace function halal_mode_private.queue_profile_moderation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into halal_mode_private.moderation_queue (user_id, kind, ref)
  select new.id, 'photo', p
  from unnest(coalesce(new.photos, '{}')) as p
  where tg_op = 'INSERT' or not (p = any(coalesce(old.photos, '{}')));

  if length(trim(coalesce(new.bio, ''))) > 0
     and (tg_op = 'INSERT' or new.bio is distinct from old.bio) then
    insert into halal_mode_private.moderation_queue (user_id, kind, ref) values (new.id, 'bio', new.bio);
  end if;
  return new;
end;
$function$;

drop trigger if exists profiles_moderation on public.profiles;
create trigger profiles_moderation after insert or update of photos, bio on public.profiles
  for each row execute function halal_mode_private.queue_profile_moderation();

-- The outbox learns a third kind of email.
alter table halal_mode_private.mail_outbox drop constraint if exists mail_outbox_kind_check;
alter table halal_mode_private.mail_outbox add constraint mail_outbox_kind_check
  check (kind in ('report', 'waitlist_welcome', 'moderation'));

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
    -- Skip a photo already removed or a bio already replaced.
    'current', case c.kind
      when 'photo' then c.ref = any(coalesce(p.photos, '{}'))
      else c.ref = p.bio end,
    'gender', p.gender
  )), '[]'::jsonb)
  from claimed c join public.profiles p on p.id = c.user_id;
$function$;

-- Records the decision; removes a failing photo; queues the operator email.
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

  if p_decision = 'remove' and v.kind = 'photo' then
    update public.profiles set photos = array_remove(photos, v.ref) where id = v.user_id;
  end if;
  if p_decision in ('remove', 'review') then
    insert into halal_mode_private.mail_outbox (kind, ref_id) values ('moderation', v.id::text);
  end if;
end;
$function$;

create or replace function public.release_moderation_service(p_id bigint)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update halal_mode_private.moderation_queue set claimed_until = null where id = p_id;
$function$;

-- For the operator email.
create or replace function public.moderation_item_service(p_id bigint)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object('id', q.id, 'user_id', q.user_id, 'kind', q.kind, 'ref', q.ref,
    'decision', q.decision, 'reason', q.reason, 'first_name', p.first_name)
  from halal_mode_private.moderation_queue q
  left join public.profiles p on p.id = q.user_id
  where q.id = p_id;
$function$;

-- The mail claim also returns moderation rows' details.
create or replace function public.claim_mail_service(p_limit int default 20)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_rows jsonb;
begin
  with picked as (
    select id from halal_mode_private.mail_outbox
    where sent_at is null and attempts < 6
      and (claimed_until is null or claimed_until < now())
    order by created_at
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  ), claimed as (
    update halal_mode_private.mail_outbox o
    set claimed_until = now() + interval '5 minutes', attempts = o.attempts + 1
    from picked where o.id = picked.id
    returning o.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'kind', c.kind, 'to', c.to_email, 'locale', c.locale,
    'moderation', case when c.kind = 'moderation' then public.moderation_item_service(c.ref_id::bigint) end,
    'report', case when c.kind = 'report' then (
      select jsonb_build_object(
        'id', r.id, 'reason', r.reason, 'detail', r.detail, 'created_at', r.created_at,
        'reporter_id', r.reporter_id, 'reporter_name', rp.first_name,
        'subject_id', r.subject_id, 'subject_name', sp.first_name,
        'subject_city', sp.city, 'subject_country', sp.country,
        'subject_paused', sp.is_paused,
        'subject_report_count', (select count(*) from public.reports x where x.subject_id = r.subject_id)
      )
      from public.reports r
      left join public.profiles rp on rp.id = r.reporter_id
      left join public.profiles sp on sp.id = r.subject_id
      where r.id::text = c.ref_id
    ) end
  )), '[]'::jsonb) into v_rows
  from claimed c;
  return v_rows;
end;
$function$;

revoke all on function public.claim_moderation_service(int) from public, anon, authenticated;
revoke all on function public.settle_moderation_service(bigint, text, text) from public, anon, authenticated;
revoke all on function public.release_moderation_service(bigint) from public, anon, authenticated;
revoke all on function public.moderation_item_service(bigint) from public, anon, authenticated;
grant execute on function public.claim_moderation_service(int) to service_role;
grant execute on function public.settle_moderation_service(bigint, text, text) to service_role;
grant execute on function public.release_moderation_service(bigint) to service_role;
grant execute on function public.moderation_item_service(bigint) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'halal-mode-moderate') then
    perform cron.unschedule('halal-mode-moderate');
  end if;
  perform cron.schedule(
    'halal-mode-moderate',
    '*/2 * * * *',
    $job$
      select net.http_post(
        url := 'https://ziboxxxiedcqfdgzqgjv.supabase.co/functions/v1/moderate',
        headers := jsonb_build_object(
          'x-mail-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'halal_mode_mail_worker' order by created_at desc limit 1),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      )
      where exists (select 1 from halal_mode_private.moderation_queue where decided_at is null and attempts < 4);
    $job$
  );
end;
$$;
