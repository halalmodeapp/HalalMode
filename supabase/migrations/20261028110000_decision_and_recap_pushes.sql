-- Two more pushes.
--   photo_decision: a selfie was approved, or a selfie or photo has to be redone.
--   recap_ready:    both of you have answered, the recap is waiting to be read.
-- Both can be switched off on their own, like the other reminders.

alter table halal_mode_private.notification_outbox drop constraint if exists notification_outbox_kind_check;
alter table halal_mode_private.notification_outbox add constraint notification_outbox_kind_check
  check (kind in ('round_ready', 'mutual_match', 'new_message', 'notice', 'halal_cards',
                  'liked_you', 'waiting_on_you', 'quiet_match', 'photo_decision', 'recap_ready'));

alter table halal_mode_private.notification_muted_kinds drop constraint if exists notification_muted_kinds_kind_check;
alter table halal_mode_private.notification_muted_kinds add constraint notification_muted_kinds_kind_check
  check (kind in ('round_ready', 'mutual_match', 'new_message', 'halal_cards',
                  'liked_you', 'waiting_on_you', 'quiet_match', 'photo_decision', 'recap_ready'));

create or replace function public.set_my_notification_kind(p_kind text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  if auth.uid() is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('round_ready', 'mutual_match', 'new_message', 'halal_cards',
                                      'liked_you', 'waiting_on_you', 'quiet_match', 'photo_decision', 'recap_ready') then
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

alter table halal_mode_private.retention_nudges drop constraint if exists retention_nudges_kind_check;
alter table halal_mode_private.retention_nudges add constraint retention_nudges_kind_check
  check (kind in ('liked_you', 'waiting_on_you', 'quiet_match', 'recap_ready'));

-- A removed photo or a rejected selfie used to send the generic "an update"
-- push. It now says what happened (redo); the in-app notice is unchanged.
create or replace function halal_mode_private.add_member_notice(p_user_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_user_id is null then return; end if;
  insert into public.member_notices (user_id, kind) values (p_user_id, p_kind);
  if p_kind in ('selfie_rejected', 'photo_removed') then
    perform halal_mode_private.enqueue_notification(
      p_user_id, 'photo_decision',
      jsonb_build_object('outcome', 'redo', 'what', case p_kind when 'selfie_rejected' then 'selfie' else 'photo' end));
  else
    perform halal_mode_private.enqueue_notification(p_user_id, 'notice');
  end if;
end;
$function$;

revoke all on function halal_mode_private.add_member_notice(uuid, text) from public, anon, authenticated, service_role;

-- A selfie that passes: tell them they are verified.
create or replace function halal_mode_private.notify_selfie_verified()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  if new.status = 'verified' and old.status is distinct from 'verified' then
    perform halal_mode_private.enqueue_notification(
      new.user_id, 'photo_decision', jsonb_build_object('outcome', 'approved', 'what', 'selfie'));
  end if;
  return new;
end;
$function$;

drop trigger if exists notify_selfie_verified on halal_mode_private.member_selfies;
create trigger notify_selfie_verified
  after update of status on halal_mode_private.member_selfies
  for each row execute function halal_mode_private.notify_selfie_verified();

-- Recap ready: a connection in the recap stage that neither of you has opened.
-- A nudge after a day, one more three days later, then no more.
create or replace function halal_mode_private.queue_recap_reminders()
returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  r record;
  v_queued integer := 0;
begin
  insert into halal_mode_private.retention_nudges (user_id, kind, ref)
  select u.user_id, 'recap_ready', c.id
  from public.connections c
  cross join lateral (values (c.user_a), (c.user_b)) as u(user_id)
  where c.closed_at is null and c.stage = 'recap'
  on conflict (user_id, kind, ref) do nothing;

  delete from halal_mode_private.retention_nudges n
  where n.kind = 'recap_ready'
    and not exists (select 1 from public.connections c where c.id = n.ref and c.closed_at is null and c.stage = 'recap');

  for r in
    select n.user_id, n.ref
    from halal_mode_private.retention_nudges n
    join public.profiles m on m.id = n.user_id
    where n.kind = 'recap_ready' and n.sent_count < 2 and halal_mode_private.is_waking_hour(m.longitude)
      and ((n.sent_count = 0 and n.first_seen <= now() - interval '24 hours')
        or (n.sent_count = 1 and n.last_sent_at <= now() - interval '72 hours'))
  loop
    perform halal_mode_private.enqueue_notification(r.user_id, 'recap_ready');
    update halal_mode_private.retention_nudges
    set sent_count = sent_count + 1, last_sent_at = now()
    where user_id = r.user_id and kind = 'recap_ready' and ref = r.ref;
    v_queued := v_queued + 1;
  end loop;
  return v_queued;
end;
$function$;
revoke all on function halal_mode_private.queue_recap_reminders() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'halal-mode-recap') then
    perform cron.unschedule('halal-mode-recap');
  end if;
  perform cron.schedule('halal-mode-recap', '27 * * * *', 'select halal_mode_private.queue_recap_reminders()');
end;
$$;
