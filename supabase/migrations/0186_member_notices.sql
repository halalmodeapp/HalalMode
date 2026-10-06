-- Short fixed notices to members about moderation:
--   report_actioned — the reporter: we reviewed it and took action;
--   report_reviewed — the reporter: we reviewed it and found no rule broken;
--   photo_removed   — the owner: one of their photos was removed.
-- The app shows the wording; the row only says which notice. Nothing about
-- what happened to the other member is ever stored here or shown.

create table if not exists public.member_notices (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('report_actioned', 'report_reviewed', 'photo_removed')),
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create index if not exists member_notices_unseen_idx
  on public.member_notices (user_id) where seen_at is null;

alter table public.member_notices enable row level security;
revoke all on table public.member_notices from public, anon, authenticated;

-- A push for a notice says only "an update"; the app says the rest.
alter table halal_mode_private.notification_outbox
  drop constraint if exists notification_outbox_kind_check;
alter table halal_mode_private.notification_outbox
  add constraint notification_outbox_kind_check
  check (kind in ('round_ready', 'mutual_match', 'new_message', 'notice'));

create or replace function halal_mode_private.add_member_notice(p_user_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_user_id is null then return; end if;
  insert into public.member_notices (user_id, kind) values (p_user_id, p_kind);
  perform halal_mode_private.enqueue_notification(p_user_id, 'notice');
end;
$function$;

revoke all on function halal_mode_private.add_member_notice(uuid, text) from public, anon, authenticated, service_role;

create or replace function public.get_my_notices()
returns table (id bigint, kind text, created_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select n.id, n.kind, n.created_at
  from public.member_notices n
  where n.user_id = auth.uid() and n.seen_at is null
  order by n.created_at;
$function$;

create or replace function public.mark_my_notices_seen(p_ids bigint[])
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.member_notices set seen_at = now()
  where user_id = auth.uid() and id = any(p_ids) and seen_at is null;
$function$;

revoke all on function public.get_my_notices() from public, anon;
revoke all on function public.mark_my_notices_seen(bigint[]) from public, anon;
grant execute on function public.get_my_notices() to authenticated;
grant execute on function public.mark_my_notices_seen(bigint[]) to authenticated;

-- The report buttons now tell the reporter, once per report.
create or replace function public.apply_report_action_service(p_report_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_subject uuid;
  v_reporter uuid;
  v_was_resolved boolean;
begin
  if p_action not in ('dismiss', 'suspend', 'ban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  select subject_id, reporter_id, resolved_at is not null
    into v_subject, v_reporter, v_was_resolved
    from public.reports where id = p_report_id;
  if v_subject is null then raise exception 'Report not found' using errcode = 'P0002'; end if;
  if p_action in ('suspend', 'ban') then
    update public.profiles set is_paused = true where id = v_subject;
  end if;
  update public.reports set resolved_at = coalesce(resolved_at, now()) where id = p_report_id;
  if not v_was_resolved then
    perform halal_mode_private.add_member_notice(
      v_reporter,
      case when p_action = 'dismiss' then 'report_reviewed' else 'report_actioned' end
    );
  end if;
  return jsonb_build_object('subject_id', v_subject, 'action', p_action);
end;
$function$;

-- A photo taken down by moderation tells its owner, so they can add another.
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
    perform halal_mode_private.add_member_notice(v.user_id, 'photo_removed');
  end if;
  if p_decision in ('remove', 'review') then
    insert into halal_mode_private.mail_outbox (kind, ref_id) values ('moderation', v.id::text);
  end if;
end;
$function$;
