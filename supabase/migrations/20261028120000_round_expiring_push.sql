-- "Your set is about to expire": one push, about three hours before a round
-- closes, to a member who has not sent their choices. Waking hours only, and
-- at most once per round. It can be switched off like the other reminders.

alter table halal_mode_private.notification_outbox drop constraint if exists notification_outbox_kind_check;
alter table halal_mode_private.notification_outbox add constraint notification_outbox_kind_check
  check (kind in ('round_ready', 'mutual_match', 'new_message', 'notice', 'halal_cards',
                  'liked_you', 'waiting_on_you', 'quiet_match', 'photo_decision', 'recap_ready', 'round_expiring'));

alter table halal_mode_private.notification_muted_kinds drop constraint if exists notification_muted_kinds_kind_check;
alter table halal_mode_private.notification_muted_kinds add constraint notification_muted_kinds_kind_check
  check (kind in ('round_ready', 'mutual_match', 'new_message', 'halal_cards',
                  'liked_you', 'waiting_on_you', 'quiet_match', 'photo_decision', 'recap_ready', 'round_expiring'));

alter table halal_mode_private.retention_nudges drop constraint if exists retention_nudges_kind_check;
alter table halal_mode_private.retention_nudges add constraint retention_nudges_kind_check
  check (kind in ('liked_you', 'waiting_on_you', 'quiet_match', 'recap_ready', 'round_expiring'));

create or replace function public.set_my_notification_kind(p_kind text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  if auth.uid() is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('round_ready', 'mutual_match', 'new_message', 'halal_cards',
                                      'liked_you', 'waiting_on_you', 'quiet_match', 'photo_decision',
                                      'recap_ready', 'round_expiring') then
    raise exception 'That notification cannot be switched' using errcode = '22023';
  end if;
  if coalesce(p_enabled, true) then
    delete from halal_mode_private.notification_muted_kinds where user_id = auth.uid() and kind = p_kind;
  else
    insert into halal_mode_private.notification_muted_kinds (user_id, kind) values (auth.uid(), p_kind)
    on conflict do nothing;
    delete from halal_mode_private.notification_outbox where user_id = auth.uid() and kind = p_kind and sent_at is null;
  end if;
end;
$function$;

create or replace function halal_mode_private.queue_round_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  r record;
  v_queued integer := 0;
begin
  for r in
    select rd.id as round_id, rd.user_id
    from public.rounds rd
    join public.profiles m on m.id = rd.user_id
    where rd.submitted_at is null
      and rd.opens_at <= now()
      and rd.expires_at > now() + interval '1 hour'
      and rd.expires_at <= now() + interval '3 hours'
      and not m.is_paused
      and halal_mode_private.is_waking_hour(m.longitude)
      and exists (select 1 from public.introductions i where i.round_id = rd.id)
      and not exists (select 1 from halal_mode_private.retention_nudges n
                      where n.user_id = rd.user_id and n.kind = 'round_expiring' and n.ref = rd.id)
  loop
    perform halal_mode_private.enqueue_notification(r.user_id, 'round_expiring');
    insert into halal_mode_private.retention_nudges (user_id, kind, ref, sent_count, last_sent_at)
    values (r.user_id, 'round_expiring', r.round_id, 1, now())
    on conflict (user_id, kind, ref) do nothing;
    v_queued := v_queued + 1;
  end loop;
  return v_queued;
end;
$function$;
revoke all on function halal_mode_private.queue_round_expiry_reminders() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'halal-mode-round-expiry') then
    perform cron.unschedule('halal-mode-round-expiry');
  end if;
  perform cron.schedule('halal-mode-round-expiry', '42 * * * *', 'select halal_mode_private.queue_round_expiry_reminders()');
end;
$$;
