-- Notifications: one owner per phone, and a queue that cannot double-send.
-- (Red-team H8 and H9, 2026-10-03.)

-- ---------------------------------------------------------------------------
-- H8. A phone belongs to whoever registered it last.
--
-- The global (platform, token) uniqueness stays; registration now moves the
-- token to the new account instead of colliding with the old one, so A's
-- notifications stop the moment B signs in on that phone.
-- ---------------------------------------------------------------------------

create or replace function public.register_my_notification_device(p_token text, p_platform text, p_locale text default 'en')
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $$
declare
  v_token_hash text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_token is null or length(p_token) not between 20 and 400 then
    raise exception 'Notification token is invalid' using errcode = '22023';
  end if;
  if p_platform is null or p_platform not in ('ios', 'android') then
    raise exception 'Notification platform is invalid' using errcode = '22023';
  end if;

  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  delete from halal_mode_private.notification_devices
  where platform = p_platform and token_hash = v_token_hash and user_id <> auth.uid();

  insert into halal_mode_private.notification_devices
    (user_id, platform, token_hash, push_token, locale, notifications_enabled, last_seen_at)
  values (auth.uid(), p_platform, v_token_hash, p_token, coalesce(nullif(btrim(p_locale), ''), 'en'), true, now())
  on conflict (user_id, platform, token_hash) do update
    set push_token = excluded.push_token,
        locale = excluded.locale,
        notifications_enabled = true,
        last_seen_at = now();
end;
$$;

-- Signing out forgets this phone for this account, and only this phone.
create or replace function public.forget_my_notification_device(p_token text)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $$
begin
  if auth.uid() is null or p_token is null then return; end if;
  delete from halal_mode_private.notification_devices
  where user_id = auth.uid()
    and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
end;
$$;

revoke all on function public.forget_my_notification_device(text) from public, anon;
grant execute on function public.forget_my_notification_device(text) to authenticated;

-- ---------------------------------------------------------------------------
-- H9. Claims are leases; work that is stale is dropped, not sent late.
-- ---------------------------------------------------------------------------

alter table halal_mode_private.notification_outbox
  add column if not exists claimed_until timestamptz;

drop function if exists public.claim_notifications_service(integer);

create function public.claim_notifications_service(p_limit integer default 100)
returns table (id bigint, user_id uuid, kind text, payload jsonb, push_token text, platform text, locale text)
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Sending notifications requires service role' using errcode = '42501';
  end if;

  -- "Your set is ready" twelve hours late is noise, not news.
  update halal_mode_private.notification_outbox o
  set sent_at = now(), last_error = 'expired', claimed_until = null
  where o.sent_at is null and o.created_at < now() - interval '12 hours';

  return query
  with due as (
    select o.id
    from halal_mode_private.notification_outbox o
    where o.sent_at is null
      and o.send_after <= now()
      and o.attempts < 5
      and (o.claimed_until is null or o.claimed_until < now())
    order by o.send_after
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    for update skip locked
  ), claimed as (
    update halal_mode_private.notification_outbox o
    -- Held for five minutes: an overlapping run skips it, and a run that dies
    -- mid-send releases it for a retry rather than stranding it.
    set attempts = o.attempts + 1, claimed_until = now() + interval '5 minutes'
    from due where o.id = due.id
    returning o.id, o.user_id, o.kind, o.payload
  )
  select c.id, c.user_id, c.kind, c.payload, d.push_token, d.platform, d.locale
  from claimed c
  join halal_mode_private.notification_devices d
    on d.user_id = c.user_id and d.notifications_enabled and d.push_token is not null;
end;
$$;

revoke all on function public.claim_notifications_service(integer) from public, anon, authenticated;
grant execute on function public.claim_notifications_service(integer) to service_role;

drop function if exists public.settle_notifications_service(bigint[], jsonb);

/**
 * p_sent: outbox ids delivered to at least one device.
 * p_failed: [{id, error}] outbox ids that reached no device; retried with backoff.
 * p_dead_tokens: tokens the provider says are gone; only those devices stop.
 */
create function public.settle_notifications_service(
  p_sent bigint[],
  p_failed jsonb default '[]'::jsonb,
  p_dead_tokens text[] default '{}'::text[]
)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Settling notifications requires service role' using errcode = '42501';
  end if;

  if p_sent is not null and array_length(p_sent, 1) is not null then
    update halal_mode_private.notification_outbox
    set sent_at = now(), last_error = null, claimed_until = null
    where id = any(p_sent);
  end if;

  update halal_mode_private.notification_outbox o
  set last_error = left(f.error, 300),
      claimed_until = null,
      send_after = now() + make_interval(mins => 2 * o.attempts * o.attempts)
  from jsonb_to_recordset(coalesce(p_failed, '[]'::jsonb)) as f(id bigint, error text)
  where o.id = f.id and o.sent_at is null;

  -- Only the rejected token is retired; the member's other phones keep working.
  if p_dead_tokens is not null and array_length(p_dead_tokens, 1) is not null then
    update halal_mode_private.notification_devices d
    set push_token = null, notifications_enabled = false
    where d.push_token = any(p_dead_tokens);
  end if;
end;
$$;

revoke all on function public.settle_notifications_service(bigint[], jsonb, text[]) from public, anon, authenticated;
grant execute on function public.settle_notifications_service(bigint[], jsonb, text[]) to service_role;
