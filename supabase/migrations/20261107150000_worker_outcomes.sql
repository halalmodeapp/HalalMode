-- Worker outcomes made observable and self-correcting. docs/INVARIANT_AUDIT.md, recommendation 5
-- (O3, O4, O5, O7, O8).

create function halal_mode_private.patch_once(p_signature text, p_find text, p_replace text)
returns void language plpgsql as $$
declare
  v_def text := replace(pg_get_functiondef(p_signature::regprocedure), chr(13), '');
  v_find text := replace(p_find, chr(13), '');
  v_count int := (length(v_def) - length(replace(v_def, v_find, ''))) / greatest(length(v_find), 1);
begin
  if v_count <> 1 then
    raise exception 'patch: anchor found % times in %: %', v_count, p_signature, p_find;
  end if;
  execute replace(v_def, v_find, replace(p_replace, chr(13), ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- O7. A suspension or ban takes the member out of matching the moment it is claimed, before Auth
-- is touched. If the Auth call or the completion then fails, they are already hidden, and the
-- reconciler below keeps any unfinished one hidden. Lifting a ban still waits for completion.
-- ---------------------------------------------------------------------------
select halal_mode_private.patch_once(
  'public.claim_admin_action_service(uuid,text,uuid,text,uuid,uuid)',
  '  return jsonb_build_object(''claim_token'', v.claim_token, ''subject_id'', v.user_id, ''ban_until'', v.ban_until);',
  '  if v.action in (''suspend'', ''ban'') then
    perform halal_mode_private.set_member_restriction(v.user_id, v.action);
  end if;
  return jsonb_build_object(''claim_token'', v.claim_token, ''subject_id'', v.user_id, ''ban_until'', v.ban_until);');

create function halal_mode_private.reconcile_unfinished_admin_actions()
returns int language plpgsql security definer
set search_path = public, halal_mode_private as $$
declare
  v record;
  v_count int := 0;
begin
  for v in
    select j.user_id, j.action from admin_action_jobs j
    left join member_pause_causes c on c.user_id = j.user_id
    where j.completed_at is null and j.action in ('suspend', 'ban')
      and c.restriction is distinct from j.action
    order by j.user_id
  loop
    perform set_member_restriction(v.user_id, v.action);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function halal_mode_private.reconcile_unfinished_admin_actions() from public, anon, authenticated;
select cron.schedule('halal-mode-admin-action-reconcile', '*/5 * * * *',
  'select halal_mode_private.reconcile_unfinished_admin_actions()');

-- ---------------------------------------------------------------------------
-- O8. Erasure is retried every hour rather than once a day, so a failure does not wait a day to
-- be tried again. The admin numbers show what is overdue or stuck, so nothing fails silently.
-- ---------------------------------------------------------------------------
select cron.alter_job(jobid, schedule := '20 * * * *') from cron.job where jobname = 'halal-mode-finalize-deletions';

create function halal_mode_private.patch_stats(p_find text, p_replace text)
returns void language plpgsql as $$
declare
  v_def text := replace(pg_get_functiondef('public.admin_match_stats(integer)'::regprocedure), chr(13), '');
begin
  if position(p_find in v_def) = 0 then raise exception 'patch: anchor not found: %', p_find; end if;
  execute replace(v_def, p_find, p_replace);
end;
$$;
select halal_mode_private.patch_stats(
  '''leaving'', (',
  '''overdue_deletions'', (select count(*) from halal_mode_private.account_deletion_requests d
        where d.processed_at is null and d.requested_at < now() - interval ''31 days''),
      ''unfinished_account_actions'', (select count(*) from halal_mode_private.admin_action_jobs j
        where j.completed_at is null and j.claimed_at < now() - interval ''10 minutes''),
      ''push_failures_today'', (select count(*) from halal_mode_private.push_tickets t
        where t.outcome = ''error'' and t.created_at > now() - interval ''1 day''),
      ''leaving'', ('
);
drop function halal_mode_private.patch_stats(text, text);

-- ---------------------------------------------------------------------------
-- O5. Expo's ticket says it took the push, not that a phone got it. Tickets are kept and their
-- receipts read later, so delivery is known, and a phone that has gone is retired. An ambiguous
-- send keeps its reason instead of being written off as plainly sent.
-- ---------------------------------------------------------------------------
create table halal_mode_private.push_tickets (
  ticket_id text primary key,
  outbox_id bigint not null,
  push_token text not null,
  created_at timestamptz not null default now(),
  checked_at timestamptz,
  outcome text check (outcome in ('ok', 'error')),
  error text
);
create index push_tickets_unchecked on halal_mode_private.push_tickets (created_at) where checked_at is null;
revoke all on halal_mode_private.push_tickets from public, anon, authenticated;

drop function public.settle_notifications_fenced_service(bigint[], jsonb, text[], uuid);
create function public.settle_notifications_fenced_service(
  p_sent bigint[], p_failed jsonb default '[]'::jsonb, p_dead_tokens text[] default '{}'::text[],
  p_claim_token uuid default null, p_tickets jsonb default '[]'::jsonb, p_ambiguous jsonb default '[]'::jsonb
) returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Settling notifications requires service role' using errcode = '42501';
  end if;

  if p_sent is not null and array_length(p_sent, 1) is not null then
    update halal_mode_private.notification_outbox o
    set sent_at = now(), claimed_until = null,
        last_error = (select left('ambiguous: ' || a.error, 300)
                      from jsonb_to_recordset(coalesce(p_ambiguous, '[]'::jsonb)) as a(id bigint, error text)
                      where a.id = o.id limit 1)
    where o.id = any(p_sent) and o.sent_at is null
      and o.claim_token is not distinct from p_claim_token;
  end if;

  insert into halal_mode_private.push_tickets (ticket_id, outbox_id, push_token)
  select t.ticket, t.id, t.token
  from jsonb_to_recordset(coalesce(p_tickets, '[]'::jsonb)) as t(ticket text, id bigint, token text)
  where t.ticket is not null and t.token is not null
  on conflict (ticket_id) do nothing;

  update halal_mode_private.notification_outbox o
  set last_error = left(f.error, 300),
      claimed_until = null,
      send_after = now() + make_interval(mins => 2 * o.attempts * o.attempts)
  from jsonb_to_recordset(coalesce(p_failed, '[]'::jsonb)) as f(id bigint, error text)
  where o.id = f.id and o.sent_at is null
    and o.claim_token is not distinct from p_claim_token;

  -- Only the rejected token is retired; the member's other phones keep working.
  if p_dead_tokens is not null and array_length(p_dead_tokens, 1) is not null then
    update halal_mode_private.notification_devices d
    set push_token = null, notifications_enabled = false
    where d.push_token = any(p_dead_tokens)
      and exists (select 1 from halal_mode_private.notification_outbox o
        where o.user_id = d.user_id and o.claim_token is not distinct from p_claim_token
          and (o.id = any(coalesce(p_sent, '{}'::bigint[]))
            or exists (select 1 from jsonb_to_recordset(coalesce(p_failed, '[]'::jsonb)) f(id bigint) where f.id = o.id)));
  end if;
end;
$function$;
revoke all on function public.settle_notifications_fenced_service(bigint[], jsonb, text[], uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.settle_notifications_fenced_service(bigint[], jsonb, text[], uuid, jsonb, jsonb) to service_role;

-- Receipts are ready about fifteen minutes after sending and kept by Expo for a day.
create function public.claim_push_receipts_service(p_limit int default 1000)
returns table (ticket_id text)
language plpgsql security definer
set search_path = public, halal_mode_private as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Reading receipts requires service role' using errcode = '42501';
  end if;
  return query
  select t.ticket_id from halal_mode_private.push_tickets t
  where t.checked_at is null and t.created_at < now() - interval '15 minutes'
    and t.created_at > now() - interval '23 hours'
  order by t.created_at
  limit least(greatest(p_limit, 1), 1000);
end;
$function$;
revoke all on function public.claim_push_receipts_service(int) from public, anon, authenticated;
grant execute on function public.claim_push_receipts_service(int) to service_role;

create function public.settle_push_receipts_service(p_receipts jsonb)
returns void
language plpgsql security definer
set search_path = public, halal_mode_private as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Reading receipts requires service role' using errcode = '42501';
  end if;
  update halal_mode_private.push_tickets t
  set checked_at = now(), outcome = r.status, error = left(r.error, 300)
  from jsonb_to_recordset(coalesce(p_receipts, '[]'::jsonb)) as r(ticket text, status text, error text)
  where t.ticket_id = r.ticket and r.status in ('ok', 'error');
  -- A phone that has gone only shows up in a receipt. Retire that one token.
  update halal_mode_private.notification_devices d
  set push_token = null, notifications_enabled = false
  from halal_mode_private.push_tickets t
  join jsonb_to_recordset(coalesce(p_receipts, '[]'::jsonb)) as r(ticket text, status text, error text) on r.ticket = t.ticket_id
  where r.error = 'DeviceNotRegistered' and d.push_token = t.push_token;
  delete from halal_mode_private.push_tickets where created_at < now() - interval '30 days';
end;
$function$;
revoke all on function public.settle_push_receipts_service(jsonb) from public, anon, authenticated;
grant execute on function public.settle_push_receipts_service(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- O3. A queued push is checked again when it is sent. "Your set is ready" goes only if the set can
-- really be opened, with the number of cards that are there now. A push about a conversation goes
-- only while that conversation is still open between them.
-- ---------------------------------------------------------------------------
create function halal_mode_private.notification_still_true(p_user uuid, p_kind text, p_payload jsonb)
returns jsonb language plpgsql stable security definer
set search_path = public, halal_mode_private as $$
declare
  v_count int;
begin
  if p_kind = 'round_ready' then
    if halal_mode_private.member_owes_answers(p_user) then return null; end if;
    select count(*)::int into v_count
    from public.rounds r
    join public.introductions i on i.round_id = r.id and i.viewer_id = p_user
    where r.user_id = p_user and r.submitted_at is null and r.expires_at > now()
      and r.opens_at <= now() + interval '5 minutes'
      and (r.cycle_date is null or halal_mode_private.league_card_stands(i.viewer_id, i.subject_id));
    if v_count = 0 then return null; end if;
    return coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('count', v_count);
  end if;
  if p_payload ? 'connectionId' and not exists (
    select 1 from public.connections c
    where c.id::text = p_payload ->> 'connectionId' and c.closed_at is null and p_user in (c.user_a, c.user_b)
      and not exists (select 1 from public.blocks b
                      where (b.blocker_id = c.user_a and b.blocked_id = c.user_b)
                         or (b.blocker_id = c.user_b and b.blocked_id = c.user_a))
  ) then
    return null;
  end if;
  return p_payload;
end;
$$;
revoke all on function halal_mode_private.notification_still_true(uuid, text, jsonb) from public, anon, authenticated;

select halal_mode_private.patch_once('public.claim_notifications_fenced_service(integer,uuid)',
  '  return query
  with due as (',
  '  -- Whatever is about to go out is checked against how things are now.
  update halal_mode_private.notification_outbox o
  set sent_at = now(), last_error = ''no longer true'', claimed_until = null
  where o.sent_at is null and o.send_after <= now() and o.attempts < 5
    and (o.claimed_until is null or o.claimed_until < now())
    and halal_mode_private.notification_still_true(o.user_id, o.kind, o.payload) is null;
  update halal_mode_private.notification_outbox o
  set payload = halal_mode_private.notification_still_true(o.user_id, o.kind, o.payload)
  where o.sent_at is null and o.send_after <= now() and o.attempts < 5 and o.kind = ''round_ready''
    and (o.claimed_until is null or o.claimed_until < now());

  return query
  with due as (');

drop function halal_mode_private.patch_once(text, text, text);
