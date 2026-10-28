-- Per-type notification switches.
--
-- Until now a member had one switch for every push. Now each kind of reminder
-- can be turned off on its own. Notices from us about safety or their account
-- ("notice") are not optional and have no switch.

create table if not exists halal_mode_private.notification_muted_kinds (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'round_ready', 'mutual_match', 'new_message', 'halal_cards',
    'liked_you', 'waiting_on_you', 'quiet_match'
  )),
  muted_at timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table halal_mode_private.notification_muted_kinds enable row level security;
revoke all on halal_mode_private.notification_muted_kinds from public, anon, authenticated;

-- Restated whole, with one new early exit: a muted kind is never queued.
create or replace function halal_mode_private.enqueue_notification(
  p_user_id uuid,
  p_kind text,
  p_payload jsonb default '{}'::jsonb,
  p_delay interval default interval '0'
) returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if p_user_id is null then return; end if;

  if exists (
    select 1 from halal_mode_private.notification_muted_kinds m
    where m.user_id = p_user_id and m.kind = p_kind
  ) then
    return;
  end if;

  -- No device, no consent, nothing to do.
  if not exists (
    select 1 from halal_mode_private.notification_devices d
    where d.user_id = p_user_id and d.notifications_enabled and d.push_token is not null
  ) then
    return;
  end if;

  if exists (
    select 1 from halal_mode_private.notification_outbox o
    where o.user_id = p_user_id and o.kind = p_kind and o.sent_at is null
  ) then
    return;
  end if;

  insert into halal_mode_private.notification_outbox (user_id, kind, payload, send_after)
  values (p_user_id, p_kind, coalesce(p_payload, '{}'::jsonb), now() + coalesce(p_delay, interval '0'));
exception when others then
  -- Queuing must never fail the event that caused it. A match is more
  -- important than telling someone about it.
  return;
end;
$$;

revoke all on function halal_mode_private.enqueue_notification(uuid, text, jsonb, interval)
  from public, anon, authenticated, service_role;

create or replace function public.get_my_muted_notification_kinds()
returns text[]
language plpgsql
stable
security definer
set search_path = public, halal_mode_private
as $function$
begin
  if auth.uid() is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  return coalesce((
    select array_agg(m.kind order by m.kind)
    from halal_mode_private.notification_muted_kinds m
    where m.user_id = auth.uid()
  ), '{}'::text[]);
end;
$function$;

create or replace function public.set_my_notification_kind(p_kind text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  if auth.uid() is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('round_ready', 'mutual_match', 'new_message', 'halal_cards',
                                      'liked_you', 'waiting_on_you', 'quiet_match') then
    raise exception 'That notification cannot be switched' using errcode = '22023';
  end if;
  if coalesce(p_enabled, true) then
    delete from halal_mode_private.notification_muted_kinds where user_id = auth.uid() and kind = p_kind;
  else
    insert into halal_mode_private.notification_muted_kinds (user_id, kind) values (auth.uid(), p_kind)
    on conflict do nothing;
    -- Whatever was already waiting to go out is dropped too.
    delete from halal_mode_private.notification_outbox where user_id = auth.uid() and kind = p_kind and sent_at is null;
  end if;
end;
$function$;

revoke all on function public.get_my_muted_notification_kinds() from public, anon;
revoke all on function public.set_my_notification_kind(text, boolean) from public, anon;
grant execute on function public.get_my_muted_notification_kinds() to authenticated;
grant execute on function public.set_my_notification_kind(text, boolean) to authenticated;
