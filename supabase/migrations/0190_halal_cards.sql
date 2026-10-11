-- Halal Cards: Relationship Lab, Quizzes and Adventures, played by the two
-- members of a connection.
--
-- What the server owns:
--   * Who may play. Only the two members of an open, unblocked connection.
--   * Premium. A Premium member unlocks Halal Cards for a connection by
--     starting its first session; from then on either member may start one,
--     and the invited member never needs to subscribe. The unlock lapses if the
--     member who made it stops being Premium (another Premium member of the
--     pair simply takes it over).
--   * The double blind. Private answers are written once and never changed,
--     and the other member's answer is returned only once the caller has
--     answered the same key — exactly the rule `submit_answer` keeps for the
--     icebreaker questions.
--   * Ordering. Every change to a session's shared state names the version it
--     was made from; a stale write is refused, so two phones resolving the same
--     moment cannot both apply it.
--
-- What it does not own: the content and the rules of each activity. Those are
-- client code (src/halalCards), and the shared state is stored as the client
-- wrote it. A modified client could skip a story ahead for its own couple —
-- it cannot read a sealed answer early, act in another connection, or unlock
-- Premium.

create table halal_mode_private.halal_cards_unlocks (
  connection_id uuid primary key references public.connections on delete cascade,
  unlocked_by   uuid not null references public.profiles on delete cascade,
  unlocked_at   timestamptz not null default now()
);

create table halal_mode_private.halal_cards_sessions (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections on delete cascade,
  activity_id   text not null check (activity_id ~ '^[a-z0-9-]{3,80}$'),
  host_id       uuid not null references public.profiles on delete cascade,
  status        text not null default 'invited'
                  check (status in ('invited', 'active', 'declined', 'cancelled', 'completed')),
  state         jsonb not null check (jsonb_typeof(state) = 'object' and pg_column_size(state) < 65536),
  version       integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  responded_at  timestamptz,
  completed_at  timestamptz
);

-- One open game of each activity per couple; finished ones can be replayed.
create unique index halal_cards_sessions_one_open_idx
  on halal_mode_private.halal_cards_sessions (connection_id, activity_id)
  where status in ('invited', 'active');
create index halal_cards_sessions_connection_idx
  on halal_mode_private.halal_cards_sessions (connection_id, updated_at desc);

create table halal_mode_private.halal_cards_answers (
  session_id uuid not null references halal_mode_private.halal_cards_sessions on delete cascade,
  answer_key text not null check (answer_key ~ '^[a-z]:[A-Za-z0-9:_-]{1,80}$'),
  user_id    uuid not null references public.profiles on delete cascade,
  answer     jsonb not null check (pg_column_size(answer) < 2048),
  created_at timestamptz not null default now(),
  primary key (session_id, answer_key, user_id)
);

comment on table halal_mode_private.halal_cards_answers is
  'Sealed answers. Never read directly: get_halal_cards_session returns the other member''s row for a key only once the caller''s own row for that key exists.';

create table halal_mode_private.halal_cards_guide (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections on delete cascade,
  body          text not null check (char_length(btrim(body)) between 3 and 280),
  source        text check (source is null or char_length(source) <= 120),
  proposed_by   uuid not null references public.profiles on delete cascade,
  agreed_at     timestamptz,
  removed_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index halal_cards_guide_connection_idx
  on halal_mode_private.halal_cards_guide (connection_id, created_at);

comment on table halal_mode_private.halal_cards_guide is
  'A couple''s shared Relationship Guide. An entry is part of the guide only once the member who did not propose it has agreed.';

revoke all on table halal_mode_private.halal_cards_unlocks,
  halal_mode_private.halal_cards_sessions,
  halal_mode_private.halal_cards_answers,
  halal_mode_private.halal_cards_guide
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Boundaries
-- ---------------------------------------------------------------------------

-- The other member of an open, unblocked connection the caller belongs to.
-- Everything else — a stranger's connection, a closed one, a block in either
-- direction — looks the same: not found.
create function halal_mode_private.halal_cards_partner(p_connection_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public, halal_mode_private as $$
declare
  v_partner uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  select case when c.user_a = auth.uid() then c.user_b else c.user_a end
    into v_partner
  from public.connections c
  where c.id = p_connection_id
    and auth.uid() in (c.user_a, c.user_b)
    and c.closed_at is null;
  if v_partner is null or exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = v_partner)
       or (b.blocker_id = v_partner and b.blocked_id = auth.uid())
  ) then
    raise exception 'Connection not found' using errcode = 'P0002';
  end if;
  return v_partner;
end;
$$;

create function halal_mode_private.halal_cards_is_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select exists (select 1 from public.profiles p where p.id = p_user_id and p.tier = 'premium')
$$;

-- Unlocked while the member who unlocked it is still Premium.
create function halal_mode_private.halal_cards_unlocked(p_connection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select exists (
    select 1 from halal_mode_private.halal_cards_unlocks u
    where u.connection_id = p_connection_id
      and halal_mode_private.halal_cards_is_premium(u.unlocked_by)
  )
$$;

-- A session the caller may act in, locked for update.
create function halal_mode_private.halal_cards_session_for_update(p_session_id uuid)
returns halal_mode_private.halal_cards_sessions
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_session halal_mode_private.halal_cards_sessions;
begin
  select * into v_session
  from halal_mode_private.halal_cards_sessions s
  where s.id = p_session_id
  for update;
  if v_session.id is null then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;
  perform halal_mode_private.halal_cards_partner(v_session.connection_id);
  return v_session;
end;
$$;

-- The session as the caller sees it: their seat, and sealed answers unsealed
-- only where they have answered too.
create function halal_mode_private.halal_cards_session_json(p_session halal_mode_private.halal_cards_sessions)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private as $$
declare
  v_answers jsonb;
begin
  select coalesce(jsonb_object_agg(k.answer_key, jsonb_strip_nulls(jsonb_build_object(
           'mine', m.answer,
           'theirs', case when m.answer is not null then t.answer end,
           'theirReady', t.answer is not null
         ))), '{}'::jsonb)
    into v_answers
  from (
    select distinct a.answer_key
    from halal_mode_private.halal_cards_answers a
    where a.session_id = p_session.id
  ) k
  left join halal_mode_private.halal_cards_answers m
    on m.session_id = p_session.id and m.answer_key = k.answer_key and m.user_id = auth.uid()
  left join halal_mode_private.halal_cards_answers t
    on t.session_id = p_session.id and t.answer_key = k.answer_key and t.user_id <> auth.uid();

  return jsonb_build_object(
    'id', p_session.id,
    'connectionId', p_session.connection_id,
    'activityId', p_session.activity_id,
    'hostId', p_session.host_id,
    'mySeat', case when p_session.host_id = auth.uid() then 'host' else 'guest' end,
    'status', p_session.status,
    'state', p_session.state,
    'version', p_session.version,
    'answers', v_answers,
    'createdAt', p_session.created_at,
    'updatedAt', p_session.updated_at
  );
end;
$$;

revoke all on function halal_mode_private.halal_cards_partner(uuid),
  halal_mode_private.halal_cards_is_premium(uuid),
  halal_mode_private.halal_cards_unlocked(uuid),
  halal_mode_private.halal_cards_session_for_update(uuid),
  halal_mode_private.halal_cards_session_json(halal_mode_private.halal_cards_sessions)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Access and sessions
-- ---------------------------------------------------------------------------

create function public.get_halal_cards_access(p_connection_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private as $$
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  perform halal_mode_private.halal_cards_partner(p_connection_id);
  return jsonb_build_object(
    'unlocked', halal_mode_private.halal_cards_unlocked(p_connection_id),
    'unlockedByMe', exists (
      select 1 from halal_mode_private.halal_cards_unlocks u
      where u.connection_id = p_connection_id and u.unlocked_by = auth.uid()
        and halal_mode_private.halal_cards_is_premium(auth.uid())
    )
  );
end;
$$;

create function public.start_halal_cards_session(
  p_connection_id uuid,
  p_activity_id text,
  p_state jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_session halal_mode_private.halal_cards_sessions;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  perform halal_mode_private.halal_cards_partner(p_connection_id);

  if not halal_mode_private.halal_cards_unlocked(p_connection_id) then
    if not halal_mode_private.halal_cards_is_premium(auth.uid()) then
      raise exception 'Halal Cards needs Premium for this connection' using errcode = '42501';
    end if;
    insert into halal_mode_private.halal_cards_unlocks (connection_id, unlocked_by)
    values (p_connection_id, auth.uid())
    on conflict (connection_id) do update
      set unlocked_by = excluded.unlocked_by, unlocked_at = now();
  end if;

  if (select count(*) from halal_mode_private.halal_cards_sessions s
      where s.connection_id = p_connection_id and s.status in ('invited', 'active')) >= 12 then
    raise exception 'Too many unfinished Halal Cards' using errcode = '54000';
  end if;

  if exists (select 1 from halal_mode_private.halal_cards_sessions s
             where s.connection_id = p_connection_id and s.activity_id = p_activity_id
               and s.status in ('invited', 'active')) then
    raise exception 'This activity is already open' using errcode = '23505';
  end if;

  insert into halal_mode_private.halal_cards_sessions (connection_id, activity_id, host_id, state)
  values (p_connection_id, p_activity_id, auth.uid(), p_state)
  returning * into v_session;

  return halal_mode_private.halal_cards_session_json(v_session);
end;
$$;

-- Unfinished and recent sessions for a connection, newest first. Answers are
-- included, sealed, so the chat can show whose turn it is.
create function public.get_halal_cards_sessions(p_connection_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private as $$
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  perform halal_mode_private.halal_cards_partner(p_connection_id);
  return coalesce((
    select jsonb_agg(halal_mode_private.halal_cards_session_json(s) order by s.updated_at desc)
    from (
      select * from halal_mode_private.halal_cards_sessions s
      where s.connection_id = p_connection_id
        and (s.status in ('invited', 'active') or s.updated_at > now() - interval '30 days')
      order by s.updated_at desc
      limit 40
    ) s
  ), '[]'::jsonb);
end;
$$;

create function public.get_halal_cards_session(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private as $$
declare
  v_session halal_mode_private.halal_cards_sessions;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  select * into v_session from halal_mode_private.halal_cards_sessions s where s.id = p_session_id;
  if v_session.id is null then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;
  perform halal_mode_private.halal_cards_partner(v_session.connection_id);
  return halal_mode_private.halal_cards_session_json(v_session);
end;
$$;

create function public.respond_halal_cards_invite(p_session_id uuid, p_accept boolean)
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
  if v_session.status <> 'invited' then
    raise exception 'This invitation is no longer open' using errcode = '55000';
  end if;
  update halal_mode_private.halal_cards_sessions
     set status = case when p_accept then 'active' else 'declined' end,
         responded_at = now(), updated_at = now(), version = version + 1
   where id = p_session_id
  returning * into v_session;
  return halal_mode_private.halal_cards_session_json(v_session);
end;
$$;

-- Either member may end an unfinished session; it stays in the history.
create function public.cancel_halal_cards_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_session halal_mode_private.halal_cards_sessions;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  v_session := halal_mode_private.halal_cards_session_for_update(p_session_id);
  if v_session.status not in ('invited', 'active') then
    return halal_mode_private.halal_cards_session_json(v_session);
  end if;
  update halal_mode_private.halal_cards_sessions
     set status = 'cancelled', updated_at = now(), version = version + 1
   where id = p_session_id
  returning * into v_session;
  return halal_mode_private.halal_cards_session_json(v_session);
end;
$$;

-- A sealed answer. Written once: changing it after seeing the other's would
-- make the whole reveal meaningless.
create function public.submit_halal_cards_answer(p_session_id uuid, p_key text, p_answer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_session halal_mode_private.halal_cards_sessions;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  v_session := halal_mode_private.halal_cards_session_for_update(p_session_id);
  if v_session.status <> 'active' then
    raise exception 'This session is not in play' using errcode = '55000';
  end if;
  insert into halal_mode_private.halal_cards_answers (session_id, answer_key, user_id, answer)
  values (p_session_id, p_key, auth.uid(), p_answer)
  on conflict (session_id, answer_key, user_id) do nothing;
  update halal_mode_private.halal_cards_sessions
     set updated_at = now()
   where id = p_session_id
  returning * into v_session;
  return halal_mode_private.halal_cards_session_json(v_session);
end;
$$;

-- Moves the shared state on. Refused unless it was computed from the current
-- version, which is what makes two phones resolving the same moment safe.
create function public.advance_halal_cards_session(
  p_session_id uuid,
  p_expected_version integer,
  p_state jsonb,
  p_completed boolean
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_session halal_mode_private.halal_cards_sessions;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  v_session := halal_mode_private.halal_cards_session_for_update(p_session_id);
  if v_session.status <> 'active' then
    raise exception 'This session is not in play' using errcode = '55000';
  end if;
  if v_session.version <> p_expected_version then
    raise exception 'This session has moved on' using errcode = '40001';
  end if;
  update halal_mode_private.halal_cards_sessions
     set state = p_state,
         version = version + 1,
         updated_at = now(),
         status = case when p_completed then 'completed' else status end,
         completed_at = case when p_completed then now() else completed_at end
   where id = p_session_id
  returning * into v_session;
  return halal_mode_private.halal_cards_session_json(v_session);
end;
$$;

-- ---------------------------------------------------------------------------
-- The Relationship Guide
-- ---------------------------------------------------------------------------

create function public.get_halal_cards_guide(p_connection_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private as $$
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  perform halal_mode_private.halal_cards_partner(p_connection_id);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id,
      'connectionId', g.connection_id,
      'text', g.body,
      'source', g.source,
      'proposedBySeat', case when g.proposed_by = auth.uid() then 'me' else 'them' end,
      'agreed', g.agreed_at is not null,
      'createdAt', g.created_at
    ) order by g.agreed_at nulls first, g.created_at)
    from halal_mode_private.halal_cards_guide g
    where g.connection_id = p_connection_id and g.removed_at is null
  ), '[]'::jsonb);
end;
$$;

create function public.propose_halal_cards_guide_entry(p_connection_id uuid, p_body text, p_source text)
returns uuid
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_id uuid;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  perform halal_mode_private.halal_cards_partner(p_connection_id);
  if (select count(*) from halal_mode_private.halal_cards_guide g
      where g.connection_id = p_connection_id and g.removed_at is null) >= 200 then
    raise exception 'The guide is full' using errcode = '54000';
  end if;
  -- The same words proposed twice are one entry; proposing an entry the other
  -- member already proposed counts as agreeing to it.
  select g.id into v_id
  from halal_mode_private.halal_cards_guide g
  where g.connection_id = p_connection_id and g.removed_at is null
    and lower(btrim(g.body)) = lower(btrim(p_body));
  if v_id is not null then
    update halal_mode_private.halal_cards_guide
       set agreed_at = coalesce(agreed_at, now())
     where id = v_id and proposed_by <> auth.uid();
    return v_id;
  end if;
  insert into halal_mode_private.halal_cards_guide (connection_id, body, source, proposed_by)
  values (p_connection_id, btrim(p_body), nullif(btrim(p_source), ''), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function public.agree_halal_cards_guide_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_entry halal_mode_private.halal_cards_guide;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  select * into v_entry from halal_mode_private.halal_cards_guide g
  where g.id = p_entry_id and g.removed_at is null for update;
  if v_entry.id is null then
    raise exception 'Entry not found' using errcode = 'P0002';
  end if;
  perform halal_mode_private.halal_cards_partner(v_entry.connection_id);
  if v_entry.proposed_by = auth.uid() then
    raise exception 'The other member agrees to an entry, not the one who suggested it' using errcode = '42501';
  end if;
  update halal_mode_private.halal_cards_guide set agreed_at = coalesce(agreed_at, now()) where id = p_entry_id;
end;
$$;

-- Either member may take an entry out; a guide is only what both still hold to.
create function public.remove_halal_cards_guide_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_connection uuid;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  select g.connection_id into v_connection from halal_mode_private.halal_cards_guide g
  where g.id = p_entry_id and g.removed_at is null;
  if v_connection is null then
    raise exception 'Entry not found' using errcode = 'P0002';
  end if;
  perform halal_mode_private.halal_cards_partner(v_connection);
  update halal_mode_private.halal_cards_guide set removed_at = now() where id = p_entry_id;
end;
$$;

revoke all on function public.get_halal_cards_access(uuid),
  public.start_halal_cards_session(uuid, text, jsonb),
  public.get_halal_cards_sessions(uuid),
  public.get_halal_cards_session(uuid),
  public.respond_halal_cards_invite(uuid, boolean),
  public.cancel_halal_cards_session(uuid),
  public.submit_halal_cards_answer(uuid, text, jsonb),
  public.advance_halal_cards_session(uuid, integer, jsonb, boolean),
  public.get_halal_cards_guide(uuid),
  public.propose_halal_cards_guide_entry(uuid, text, text),
  public.agree_halal_cards_guide_entry(uuid),
  public.remove_halal_cards_guide_entry(uuid)
  from public, anon;

grant execute on function public.get_halal_cards_access(uuid),
  public.start_halal_cards_session(uuid, text, jsonb),
  public.get_halal_cards_sessions(uuid),
  public.get_halal_cards_session(uuid),
  public.respond_halal_cards_invite(uuid, boolean),
  public.cancel_halal_cards_session(uuid),
  public.submit_halal_cards_answer(uuid, text, jsonb),
  public.advance_halal_cards_session(uuid, integer, jsonb, boolean),
  public.get_halal_cards_guide(uuid),
  public.propose_halal_cards_guide_entry(uuid, text, text),
  public.agree_halal_cards_guide_entry(uuid),
  public.remove_halal_cards_guide_entry(uuid)
  to authenticated;
