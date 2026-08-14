-- Let a member turn read receipts off.
--
-- Receipts have worked since 0006 and there has never been a way to decline
-- them. For a lot of people — and for a lot of women in particular — being
-- visibly seen-and-not-replied-to is a pressure they would rather not carry
-- while deciding whether they want to reply at all.
--
-- The rule is symmetric, which is what every messenger that gets this right
-- does: turning receipts off means you stop sending them AND you stop seeing
-- other people's. Anything else builds a one-way mirror, where the member who
-- opted out watches everybody who did not.
--
-- Enforced in the database, in both directions, rather than in the app. A
-- receipt withheld by a client is a receipt one modified client can take.
--
-- On by default. Nobody is opted out of something they never asked to leave,
-- and a missing row reads as "on" so no backfill is needed.

create table if not exists halal_mode_private.privacy_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  read_receipts boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table halal_mode_private.privacy_preferences enable row level security;
revoke all on table halal_mode_private.privacy_preferences from public, anon, authenticated;

create or replace function halal_mode_private.sends_read_receipts(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select coalesce(
    (select p.read_receipts from halal_mode_private.privacy_preferences p where p.user_id = p_user_id),
    true
  );
$$;

create or replace function public.get_my_privacy_preferences()
returns jsonb
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select jsonb_build_object(
    'readReceipts', halal_mode_private.sends_read_receipts(auth.uid())
  )
  where auth.uid() is not null;
$$;

create or replace function public.set_my_read_receipts(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if p_enabled is null then
    raise exception 'Choose on or off' using errcode = '22023';
  end if;

  insert into halal_mode_private.privacy_preferences (user_id, read_receipts)
  values (auth.uid(), p_enabled)
  on conflict (user_id) do update
    set read_receipts = excluded.read_receipts, updated_at = now();

  return jsonb_build_object('readReceipts', p_enabled);
end;
$$;

-- Stamping a message as read now depends on the reader being willing to say so.
create or replace function public.mark_connection_messages_read(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_other uuid;
begin
  select case when c.user_a = auth.uid() then c.user_b else c.user_a end
  into v_other
  from connections c
  where c.id = p_connection_id
    and c.closed_at is null
    and c.stage = 'open'
    and (c.user_a = auth.uid() or c.user_b = auth.uid());

  if v_other is null or exists (
    select 1 from blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = v_other)
       or (b.blocker_id = v_other and b.blocked_id = auth.uid())
  ) then
    raise exception 'Connection is not available' using errcode = '42501';
  end if;

  -- Not an error, and not a failure the member should see. They have read the
  -- messages; they simply have not agreed to broadcast that.
  if not halal_mode_private.sends_read_receipts(auth.uid()) then
    return;
  end if;

  update messages
  set read_at = now()
  where connection_id = p_connection_id
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

-- And reading a conversation hides other people's receipts from anybody who
-- withholds their own. Restated from 0027 with that one change.
create or replace function public.get_connection_messages(
  p_connection_id uuid,
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 50
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_other uuid;
  v_result jsonb;
  v_sees_receipts boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_limit < 1 or p_limit > 100 then
    raise exception 'Page size is invalid' using errcode = '22023';
  end if;
  if (p_before_at is null) <> (p_before_id is null) then
    raise exception 'Cursor is incomplete' using errcode = '22023';
  end if;

  select case when c.user_a = auth.uid() then c.user_b else c.user_a end
  into v_other
  from connections c
  where c.id = p_connection_id
    and c.closed_at is null
    and c.stage = 'open'
    and (c.user_a = auth.uid() or c.user_b = auth.uid());

  if v_other is null or exists (
    select 1 from blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = v_other)
       or (b.blocker_id = v_other and b.blocked_id = auth.uid())
  ) then
    raise exception 'Connection is not available' using errcode = '42501';
  end if;

  v_sees_receipts := halal_mode_private.sends_read_receipts(auth.uid());

  with ranked as (
    select m.*, row_number() over (order by m.created_at desc, m.id desc) as position
    from messages m
    where m.connection_id = p_connection_id
      and (p_before_at is null or (m.created_at, m.id) < (p_before_at, p_before_id))
    order by m.created_at desc, m.id desc
    limit p_limit + 1
  ), page as (
    select * from ranked where position <= p_limit
  ), oldest as (
    select created_at, id from page order by created_at asc, id asc limit 1
  )
  select jsonb_build_object(
    -- Every column is kept and only the receipt is blanked. Listing the
    -- columns instead would silently drop whichever one gets added next —
    -- voice notes and the idempotency key were both added after 0027.
    'messages', coalesce((
      select jsonb_agg(
        case
          when v_sees_receipts then to_jsonb(page) - 'position'
          else (to_jsonb(page) - 'position') || jsonb_build_object('read_at', null)
        end
        order by created_at asc, id asc)
      from page), '[]'::jsonb),
    'hasMore', exists (select 1 from ranked where position > p_limit),
    'nextCursor', case when exists (select 1 from ranked where position > p_limit)
      then (select jsonb_build_object('createdAt', created_at, 'id', id) from oldest)
      else null end
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_my_privacy_preferences() from public, anon;
revoke all on function public.set_my_read_receipts(boolean) from public, anon;
grant execute on function public.get_my_privacy_preferences() to authenticated;
grant execute on function public.set_my_read_receipts(boolean) to authenticated;
