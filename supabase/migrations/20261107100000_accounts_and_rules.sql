-- Keep causes private; is_paused remains the projection used by installed apps.
create table halal_mode_private.member_pause_causes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  self_paused boolean not null default false,
  restriction text check (restriction in ('suspend', 'ban')),
  suspension_until timestamptz
);
alter table halal_mode_private.member_pause_causes enable row level security;
revoke all on halal_mode_private.member_pause_causes from public, anon, authenticated;

insert into halal_mode_private.member_pause_causes(user_id, self_paused, restriction, suspension_until)
select p.id,
  p.is_paused and not coalesce(u.banned_until > now(), false)
    and coalesce(j.action not in ('suspend', 'ban'), true)
    and not exists (select 1 from halal_mode_private.account_deletion_requests d where d.user_id = p.id),
  case when j.action in ('suspend', 'ban') then j.action
    when u.banned_until > now() then case when u.banned_until > now() + interval '10 years' then 'ban' else 'suspend' end end,
  case when j.action = 'suspend' then j.ban_until
    when u.banned_until <= now() + interval '10 years' then u.banned_until end
from public.profiles p join auth.users u on u.id = p.id
left join halal_mode_private.admin_action_jobs j on j.user_id = p.id;

create or replace function halal_mode_private.project_member_pause(p_user uuid)
returns void language plpgsql security definer set search_path = public, halal_mode_private as $$
declare v_control text := current_setting('app.account_control_rpc', true);
begin
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles p set is_paused = (
    c.self_paused or c.restriction = 'ban'
    or (c.restriction = 'suspend' and c.suspension_until > now())
    or exists (select 1 from account_deletion_requests d where d.user_id = p.id and d.processed_at is null)
  ) is true
  from member_pause_causes c where p.id = p_user and c.user_id = p.id;
  perform set_config('app.account_control_rpc', coalesce(v_control, ''), true);
end;
$$;

create or replace function halal_mode_private.set_member_restriction(p_user uuid, p_action text)
returns void language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 1919));
  if p_action = 'unban' and exists (select 1 from account_deletion_requests where user_id = p_user and processed_at is null) then
    raise exception 'An account pending deletion cannot be resumed' using errcode = '22023';
  end if;
  insert into member_pause_causes(user_id, self_paused)
  select id, is_paused from profiles where id = p_user on conflict do nothing;
  update member_pause_causes set
    restriction = case when p_action = 'unban' then null else p_action end,
    suspension_until = case when p_action = 'suspend' then coalesce(
      (select ban_until from admin_action_jobs where user_id = p_user and completed_at is null),
      (select banned_until from auth.users where id = p_user), now() + interval '7 days') end
  where user_id = p_user;
  perform project_member_pause(p_user);
end;
$$;

create or replace function public.set_my_profile_paused(p_paused boolean)
returns void language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1919));
  if not p_paused and exists (select 1 from account_deletion_requests where user_id = auth.uid() and processed_at is null) then
    raise exception 'An account pending deletion cannot be resumed' using errcode = '22023';
  end if;
  if not p_paused and (exists (select 1 from member_pause_causes where user_id = auth.uid()
    and (restriction = 'ban' or (restriction = 'suspend' and suspension_until > now())))
    or exists (select 1 from auth.users where id = auth.uid() and banned_until > now())) then
    raise exception 'A restricted account cannot be resumed' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'Profile not found'; end if;
  insert into member_pause_causes(user_id, self_paused) values(auth.uid(), p_paused)
  on conflict(user_id) do update set self_paused = excluded.self_paused;
  perform project_member_pause(auth.uid());
end;
$$;

create or replace function halal_mode_private.expire_member_suspensions()
returns integer language plpgsql security definer set search_path = public, halal_mode_private as $$
declare r record; v_count integer := 0;
begin
  for r in select user_id from member_pause_causes where restriction = 'suspend' and suspension_until <= now() loop
    perform pg_advisory_xact_lock(hashtextextended(r.user_id::text, 1919));
    update member_pause_causes set restriction = null, suspension_until = null
    where user_id = r.user_id and restriction = 'suspend' and suspension_until <= now();
    if found then
      perform project_member_pause(r.user_id);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function halal_mode_private.project_member_pause(uuid),
  halal_mode_private.set_member_restriction(uuid,text), halal_mode_private.expire_member_suspensions()
  from public, anon, authenticated, service_role;
select cron.schedule('halal-mode-suspension-expiry', '* * * * *', 'select halal_mode_private.expire_member_suspensions()');
select halal_mode_private.expire_member_suspensions();

create or replace function public.get_my_account_deletion()
returns jsonb language sql stable security definer set search_path = public, halal_mode_private as $$
  select coalesce((select jsonb_build_object('pending', true, 'recoverable',
    requested_at > now() - interval '30 days' and processing_started_at is null and claim_token is null)
    from account_deletion_requests where user_id = auth.uid() and processed_at is null), '{"pending":false}'::jsonb);
$$;

create or replace function public.cancel_my_account_deletion()
returns void language plpgsql security definer set search_path = public, halal_mode_private as $$
declare v_request account_deletion_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1919));
  select * into v_request from account_deletion_requests where user_id = auth.uid() for update;
  if not found then return; end if;
  -- A worker can only claim after the hold. Never race an erasure already started.
  if v_request.processed_at is not null or v_request.requested_at <= clock_timestamp() - interval '30 days'
     or v_request.processing_started_at is not null or v_request.claim_token is not null then
    raise exception 'The recovery period has ended' using errcode = '22023';
  end if;
  delete from account_deletion_requests where user_id = auth.uid();
  insert into member_pause_causes(user_id, self_paused) values(auth.uid(), true)
  on conflict(user_id) do update set self_paused = true;
  perform project_member_pause(auth.uid());
  insert into audit_events(actor_id, subject_id, event_type) values(auth.uid(), auth.uid(), 'account_deletion_cancelled');
end;
$$;
revoke all on function public.get_my_account_deletion(), public.cancel_my_account_deletion() from public, anon;
grant execute on function public.get_my_account_deletion(), public.cancel_my_account_deletion() to authenticated;

-- Deleting a sender removes their identity, not the kind word left for the recipient.
alter table halal_mode_private.connection_farewells drop constraint connection_farewells_connection_id_fkey;
alter table halal_mode_private.connection_farewells drop constraint connection_farewells_from_user_fkey;
alter table halal_mode_private.connection_farewells alter column from_user drop not null;
alter table halal_mode_private.connection_farewells add foreign key(from_user) references public.profiles(id) on delete set null;

-- Successful settlement is the only place that spends a reminder budget.
create or replace function halal_mode_private.try_enqueue_reminder(p_user uuid, p_kind text, p_ref uuid)
returns boolean language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  return try_enqueue_notification(p_user, p_kind, jsonb_build_object('reminderRef', p_ref,
    'reminderRefs', case when p_kind = 'liked_you' then
      (select coalesce(jsonb_agg(l.liker_id), '[]'::jsonb) from liked_you_current(p_user) l)
      else jsonb_build_array(p_ref) end));
end;
$$;
revoke all on function halal_mode_private.try_enqueue_reminder(uuid,text,uuid) from public, anon, authenticated, service_role;

create or replace function halal_mode_private.count_delivered_reminder()
returns trigger language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  if old.sent_at is null and new.sent_at is not null and new.last_error is null then
    update retention_nudges n set sent_count = sent_count + 1, last_sent_at = new.sent_at
    where n.user_id = new.user_id and n.kind = new.kind
      and n.ref::text in (select jsonb_array_elements_text(coalesce(new.payload->'reminderRefs', '[]'::jsonb)));
  end if;
  return null;
end;
$$;
revoke all on function halal_mode_private.count_delivered_reminder() from public, anon, authenticated, service_role;
create trigger count_delivered_reminder after update on halal_mode_private.notification_outbox
for each row execute function halal_mode_private.count_delivered_reminder();


-- Account recovery and the founder rules of 7 November 2026.




create or replace function public.settle_moderation_fenced_service(p_id bigint, p_decision text, p_reason text, p_claim_token uuid default null)
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
    and claim_token is not distinct from p_claim_token
  returning * into v;
  if v.id is null then return; end if;

  if v.kind = 'photo' and p_decision = 'remove' then
    update public.profiles set photos = array_remove(photos, v.ref) where id = v.user_id;
    perform halal_mode_private.add_member_notice(v.user_id, 'photo_removed');
  end if;

  if v.kind = 'selfie' then
    update halal_mode_private.selfie_files
    set purge_after = case when p_decision = 'review' then null
      when p_decision = 'remove' then now() + interval '1 day' else now() + interval '30 days' end
    where path = v.ref and purged_at is null;
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
      and not exists (select 1 from halal_mode_private.moderation_queue q
                      where q.kind = 'selfie' and q.ref = f.path and q.decision = 'review' and q.reviewed_at is null)
    union
    select o.name from storage.objects o
    where o.bucket_id = 'verification-selfies' and o.created_at < now() - interval '2 days'
      and not exists (select 1 from halal_mode_private.selfie_files f where f.path = o.name)
    limit greatest(1, least(p_limit, 200))
  ) due(path);
$function$;

create or replace function public.get_my_farewells()
returns jsonb
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'connectionId', f.connection_id,
    'name', p.first_name,
    'reason', f.reason,
    'message', f.message
  ) order by f.created_at), '[]'::jsonb)
  from halal_mode_private.connection_farewells f
  left join public.profiles p on p.id = f.from_user
  where f.to_user = auth.uid() and f.seen_at is null
    and not exists (select 1 from public.blocks b
                    where (b.blocker_id = f.to_user and b.blocked_id = f.from_user)
                       or (b.blocker_id = f.from_user and b.blocked_id = f.to_user))
    and not exists (select 1 from halal_mode_private.member_hides h
                    where (h.hider_id = f.to_user and h.hidden_id = f.from_user)
                       or (h.hider_id = f.from_user and h.hidden_id = f.to_user))
;
$function$;

create or replace function public.admin_remove_member(p_user_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_before text;
  v_note text;
  v_reason text;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('admin-team', 0));
  delete from halal_mode_private.admin_members where user_id = p_user_id
  returning role, note into v_before, v_note;
  if v_before is null then
    raise exception 'Not an admin' using errcode = '22023';
  end if;
  perform halal_mode_private.admin_require_an_owner_remains();
  delete from halal_mode_private.release_flag_members
  where user_id = p_user_id and key in ('tester_tools', 'demo_introductions', 'tester_premium_switch');
  delete from halal_mode_private.member_entitlements where user_id = p_user_id and provider = 'tester';
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles set tier = halal_mode_private.effective_membership_tier(p_user_id) where id = p_user_id;
  perform halal_mode_private.admin_audit('team.remove', jsonb_build_object(
    'member', left(p_user_id::text, 8), 'name', v_note, 'role', v_before, 'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;

create or replace function public.respond_halal_cards_invite(p_session_id uuid, p_accept boolean, p_awaiting text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_session halal_mode_private.halal_cards_sessions;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  v_session := halal_mode_private.halal_cards_session_for_update(p_session_id);
  if v_session.host_id = auth.uid() then
    raise exception 'Only the invited member can answer an invitation' using errcode = '42501';
  end if;
  if v_session.status <> 'invited' or v_session.created_at < now() - interval '7 days' then
    raise exception 'This invitation is no longer open' using errcode = '55000';
  end if;
  if p_accept and not halal_mode_private.halal_cards_unlocked(v_session.connection_id) then
    raise exception 'Halal Cards needs Premium for this connection' using errcode = '42501';
  end if;
  update halal_mode_private.halal_cards_sessions
     set status = case when p_accept then 'active' else 'declined' end,
         awaiting = case when p_accept then p_awaiting end,
         responded_at = now(), updated_at = now(), version = version + 1
   where id = p_session_id
  returning * into v_session;
  return halal_mode_private.halal_cards_session_json(v_session);
end;
$$;

create or replace function halal_mode_private.queue_retention_notifications()
returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  r record;
  v_queued integer := 0;
begin
  perform pg_advisory_xact_lock(224, 3);
  -- Someone liked you: one push a day at most, however many.
  for r in
    select m.id as member_id
    from public.profiles m
    where m.onboarding_complete and not m.is_paused and halal_mode_private.is_waking_hour(m.longitude)
      and exists (
        select 1 from halal_mode_private.liked_you_current(m.id) l
        where not exists (select 1 from halal_mode_private.retention_nudges n
                          where n.user_id = m.id and n.kind = 'liked_you' and n.ref = l.liker_id and n.sent_count > 0))
      and not exists (select 1 from halal_mode_private.retention_nudges n2
                      where n2.user_id = m.id and n2.kind = 'liked_you' and n2.last_sent_at > now() - interval '20 hours')
  loop
    if not halal_mode_private.try_enqueue_reminder(r.member_id, 'liked_you', null) then continue; end if;
    insert into halal_mode_private.retention_nudges (user_id, kind, ref, sent_count, last_sent_at)
    select r.member_id, 'liked_you', l.liker_id, 0, null
    from halal_mode_private.liked_you_current(r.member_id) l
    on conflict (user_id, kind, ref) do nothing;
    v_queued := v_queued + 1;
  end loop;

  -- Waiting on you: someone has done their part and you have not. A nudge after
  -- a day, and one more two days later, then no more.
  insert into halal_mode_private.retention_nudges (user_id, kind, ref)
  select m.id, 'waiting_on_you', oc.connection_id
  from public.profiles m
  cross join lateral halal_mode_private.owed_connections(m.id) oc
  where m.onboarding_complete
    and m.id in (
      select user_a from public.connections where closed_at is null and stage in ('choosing_questions', 'answering')
      union select user_b from public.connections where closed_at is null and stage in ('choosing_questions', 'answering'))
  on conflict (user_id, kind, ref) do nothing;
  delete from halal_mode_private.retention_nudges n
  where n.kind = 'waiting_on_you'
    and not exists (select 1 from halal_mode_private.owed_connections(n.user_id) oc where oc.connection_id = n.ref);
  for r in
    select n.user_id, n.ref
    from halal_mode_private.retention_nudges n
    join public.profiles m on m.id = n.user_id
    where n.kind = 'waiting_on_you' and n.sent_count < 2 and halal_mode_private.is_waking_hour(m.longitude)
      and ((n.sent_count = 0 and n.first_seen <= now() - interval '24 hours')
        or (n.sent_count = 1 and n.last_sent_at <= now() - interval '48 hours'))
  loop
    if not halal_mode_private.try_enqueue_reminder(r.user_id, 'waiting_on_you', r.ref) then continue; end if;

    v_queued := v_queued + 1;
  end loop;

  -- Quiet match: an open conversation with two days of silence, the bot offers
  -- an opener. At most three nudges per member per conversation, five days apart.
  insert into halal_mode_private.retention_nudges (user_id, kind, ref)
  select u.user_id, 'quiet_match', c.id
  from public.connections c
  cross join lateral (values (c.user_a), (c.user_b)) as u(user_id)
  where c.closed_at is null and c.stage = 'open'
  on conflict (user_id, kind, ref) do nothing;
  delete from halal_mode_private.retention_nudges n
  where n.kind = 'quiet_match'
    and not exists (select 1 from public.connections c where c.id = n.ref and c.closed_at is null and c.stage = 'open');
  for r in
    select n.user_id, n.ref
    from halal_mode_private.retention_nudges n
    join public.profiles m on m.id = n.user_id
    where n.kind = 'quiet_match' and n.sent_count < 3 and halal_mode_private.is_waking_hour(m.longitude)
      and greatest(n.first_seen, coalesce((select max(x.created_at) from public.messages x where x.connection_id = n.ref), n.first_seen))
            <= now() - interval '48 hours'
      and (n.last_sent_at is null or n.last_sent_at <= now() - interval '5 days')
  loop
    if not halal_mode_private.try_enqueue_reminder(r.user_id, 'quiet_match', r.ref) then continue; end if;

    v_queued := v_queued + 1;
  end loop;

  return v_queued;
end;
$function$;

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
  perform pg_advisory_xact_lock(224, 3);
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
    if not halal_mode_private.try_enqueue_reminder(r.user_id, 'recap_ready', r.ref) then continue; end if;

    v_queued := v_queued + 1;
  end loop;
  return v_queued;
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
  perform pg_advisory_xact_lock(224, 3);
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
                      where n.user_id = rd.user_id and n.kind = 'round_expiring' and n.ref = rd.id and n.sent_count > 0)
  loop
    if not halal_mode_private.try_enqueue_reminder(r.user_id, 'round_expiring', r.round_id) then continue; end if;
    insert into halal_mode_private.retention_nudges (user_id, kind, ref, sent_count, last_sent_at)
    values (r.user_id, 'round_expiring', r.round_id, 0, null)
    on conflict (user_id, kind, ref) do nothing;
    v_queued := v_queued + 1;
  end loop;
  return v_queued;
end;
$function$;

create or replace function public.apply_admin_member_action_service(
  p_user_id uuid, p_action text, p_actor uuid, p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Member action requires service role' using errcode = '42501';
  end if;
  if not exists (select 1 from halal_mode_private.admin_members where user_id = p_actor and role = 'owner') then
    raise exception 'Only an owner can act on accounts' using errcode = '42501';
  end if;
  if p_action not in ('suspend', 'ban', 'unban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  if exists (select 1 from halal_mode_private.admin_action_jobs j
    where j.user_id = p_user_id and j.completed_at is null
      and j.claim_token::text is distinct from nullif(current_setting('app.admin_action_token', true), '')) then
    raise exception 'Another account action is already in progress' using errcode = 'P0001';
  end if;
  -- Hidden while suspended or banned; shown again when unbanned.
  perform halal_mode_private.set_member_restriction(p_user_id, p_action);
  insert into halal_mode_private.admin_audit_log (actor_id, action, detail)
  values (p_actor, 'member.' || p_action, jsonb_build_object(
    'member', left(p_user_id::text, 8), 'reason', halal_mode_private.admin_reason(p_reason)));
  return jsonb_build_object('action', p_action, 'member', left(p_user_id::text, 8));
end;
$function$;

create or replace function public.apply_report_action_service(p_report_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_subject uuid;
  v_reporter uuid;
begin
  if p_action not in ('dismiss', 'suspend', 'ban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;

  select subject_id, reporter_id
    into v_subject, v_reporter
    from public.reports
    where id = p_report_id
      and resolved_at is null
    for update;
  if not found then
    if exists (select 1 from public.reports where id = p_report_id) then
      raise exception 'Report already resolved' using errcode = 'P0001';
    end if;
    raise exception 'Report not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from halal_mode_private.admin_action_jobs j
    where j.user_id = v_subject and j.completed_at is null
      and j.claim_token::text is distinct from nullif(current_setting('app.admin_action_token', true), '')) then
    raise exception 'Another account action is already in progress' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from halal_mode_private.report_action_claims c
    where c.report_id = p_report_id and c.action = p_action
  ) then
    raise exception 'Report action was not claimed' using errcode = '42501';
  end if;

  if p_action in ('suspend', 'ban') then
    perform halal_mode_private.set_member_restriction(v_subject, p_action);
  end if;
  update public.reports set resolved_at = now() where id = p_report_id;
  delete from halal_mode_private.report_action_claims where report_id = p_report_id;
  perform halal_mode_private.add_member_notice(
    v_reporter,
    case when p_action = 'dismiss' then 'report_reviewed' else 'report_actioned' end
  );
  return jsonb_build_object('subject_id', v_subject, 'action', p_action);
end;
$function$;

alter table halal_mode_private.connection_farewells drop constraint connection_farewells_reason_check;
alter table halal_mode_private.connection_farewells add check (reason in ('fit','goals','timing','family','spark','someone','step_back','other','generic'));
create or replace function public.close_connection_with_farewell(p_connection_id uuid, p_reason text, p_message text default null)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_other uuid;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  if coalesce(p_reason, '') not in ('fit', 'goals', 'timing', 'family', 'spark', 'someone', 'step_back', 'other', 'generic') then
    raise exception 'Choose a reason' using errcode = '22023';
  end if;
  if p_reason = 'other' and v_message is null then
    raise exception 'Write a few words' using errcode = '22023';
  end if;
  if char_length(v_message) > 300 then
    raise exception 'Keep it under 300 characters' using errcode = '22023';
  end if;
  if v_message is not null and halal_mode_private.message_contains_contact(v_message) then
    raise exception 'A closing note cannot include contact details' using errcode = '22023';
  end if;

  select case when c.user_a = auth.uid() then c.user_b else c.user_a end into v_other
  from public.connections c
  where c.id = p_connection_id and c.closed_at is null and auth.uid() in (c.user_a, c.user_b);

  perform halal_mode_private.close_connection_after_legal_consent(p_connection_id);

  insert into halal_mode_private.connection_farewells (connection_id, from_user, to_user, reason, message)
  values (p_connection_id, auth.uid(), v_other, p_reason, case when p_reason = 'other' then v_message end);
end;
$function$;

create or replace function public.close_connection(p_connection_id uuid)
returns void language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  perform public.close_connection_with_farewell(p_connection_id, 'generic');
end;
$$;

-- Repair review deadlines created before this rule; erased files cannot be restored.
update halal_mode_private.selfie_files f set purge_after = null
where purged_at is null and exists (
  select 1 from halal_mode_private.moderation_queue q where q.kind = 'selfie' and q.ref = f.path
    and q.decision = 'review' and q.reviewed_at is null);

create or replace function public.admin_mark_reviewed(p_id bigint, p_reason text, p_verdict text default null)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_reason text;
  v_user uuid;
  v halal_mode_private.moderation_queue%rowtype;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  select * into v from halal_mode_private.moderation_queue
  where id = p_id and decision = 'review' and reviewed_at is null
  for update;
  if v.id is null then
    raise exception 'That item is not waiting for review' using errcode = 'P0001';
  end if;
  if v.kind = 'selfie' then
    if p_verdict is null or p_verdict not in ('verified', 'rejected') then
      raise exception 'Choose verified or rejected for this selfie' using errcode = '22023';
    end if;
    -- Reuse settlement so retention, notices and photo rechecks stay identical. A selfie since
    -- replaced has nothing left to decide, so it is only marked reviewed.
    if exists (select 1 from halal_mode_private.member_selfies s where s.user_id = v.user_id and s.path = v.ref) then
      update halal_mode_private.moderation_queue set decided_at = null, claim_token = null where id = p_id;
      perform public.settle_moderation_service(p_id, case p_verdict when 'verified' then 'allow' else 'remove' end, v_reason);
    end if;
  end if;
  update halal_mode_private.moderation_queue set reviewed_at = now(), reviewed_by = auth.uid() where id = p_id;
  if v.kind = 'selfie' then
    update halal_mode_private.selfie_files set purge_after = now() + interval '30 days'
    where path = v.ref and purged_at is null;
  end if;
  v_user := v.user_id;
  perform halal_mode_private.admin_audit('review.done', jsonb_build_object(
    'item', p_id, 'verdict', p_verdict, 'member', left(v_user::text, 8), 'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;
