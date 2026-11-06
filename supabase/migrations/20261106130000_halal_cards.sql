-- Serialize Cards limits and derive sealed-answer attention under the session lock.

create or replace function public.start_halal_cards_session(
  p_connection_id uuid,
  p_activity_id text,
  p_state jsonb,
  p_content_version integer default 1
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_session halal_mode_private.halal_cards_sessions;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  perform halal_mode_private.halal_cards_partner(p_connection_id);
  -- Count and insert together, even when the activities differ.
  perform pg_advisory_xact_lock(hashtextextended(p_connection_id::text, 2270));
  perform halal_mode_private.halal_cards_expire_invites(p_connection_id);

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

  insert into halal_mode_private.halal_cards_sessions (connection_id, activity_id, host_id, state, content_version)
  values (p_connection_id, p_activity_id, auth.uid(), p_state, coalesce(p_content_version, 1))
  returning * into v_session;

  return halal_mode_private.halal_cards_session_json(v_session);
end;
$$;

create or replace function public.get_halal_cards_session(p_session_id uuid)
returns jsonb
language plpgsql
volatile
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
  perform halal_mode_private.halal_cards_expire_invites(v_session.connection_id);
  select * into v_session from halal_mode_private.halal_cards_sessions where id = p_session_id;
  return halal_mode_private.halal_cards_session_json(v_session);
end;
$$;

create or replace function public.submit_halal_cards_answer(p_session_id uuid, p_key text, p_answer jsonb, p_awaiting text default null)
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
  -- An immutable retry must not rewrite attention for a later step.
  if not found then
    return halal_mode_private.halal_cards_session_json(v_session);
  end if;
  update halal_mode_private.halal_cards_sessions
     set updated_at = now(), version = version + 1,
         awaiting = case when exists (
           select 1 from halal_mode_private.halal_cards_answers a
           where a.session_id = p_session_id and a.answer_key = p_key and a.user_id <> auth.uid()
         ) then null when v_session.host_id = auth.uid() then 'guest' else 'host' end
   where id = p_session_id
  returning * into v_session;
  return halal_mode_private.halal_cards_session_json(v_session);
end;
$$;

create or replace function public.propose_halal_cards_guide_entry(p_connection_id uuid, p_body text, p_source text)
returns uuid
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_id uuid;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  perform halal_mode_private.halal_cards_partner(p_connection_id);
  -- Proposal and restore share this lock, including their cap and duplicate checks.
  perform pg_advisory_xact_lock(hashtextextended(p_connection_id::text, 2271));
  if not halal_mode_private.halal_cards_unlocked(p_connection_id) then
    raise exception 'Halal Cards needs Premium for this connection' using errcode = '42501';
  end if;
  -- The same rule as answers: the Journal is not a way to pass on numbers,
  -- emails or handles.
  if halal_mode_private.message_contains_contact(p_body) then
    raise exception 'Journal entries cannot include contact details' using errcode = '22023';
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
  if (select count(*) from halal_mode_private.halal_cards_guide g
      where g.connection_id = p_connection_id and g.removed_at is null) >= 200 then
    raise exception 'The journal is full' using errcode = '54000';
  end if;
  insert into halal_mode_private.halal_cards_guide (connection_id, body, source, proposed_by)
  values (p_connection_id, btrim(p_body), nullif(btrim(p_source), ''), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.restore_halal_cards_guide_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_connection uuid;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  select g.connection_id into v_connection from halal_mode_private.halal_cards_guide g
  where g.id = p_entry_id and g.removed_at is not null;
  if v_connection is null then
    raise exception 'Entry not found' using errcode = 'P0002';
  end if;
  perform halal_mode_private.halal_cards_partner(v_connection);
  perform pg_advisory_xact_lock(hashtextextended(v_connection::text, 2271));
  -- Recheck after waiting: a second restore is harmless.
  if not exists (select 1 from halal_mode_private.halal_cards_guide
                 where id = p_entry_id and removed_at is not null) then return; end if;
  if exists (
    select 1 from halal_mode_private.halal_cards_guide g
    join halal_mode_private.halal_cards_guide removed on removed.id = p_entry_id
    where g.connection_id = v_connection and g.removed_at is null
      and lower(btrim(g.body)) = lower(btrim(removed.body))
  ) then
    raise exception 'This entry is already in the journal' using errcode = '23505';
  end if;
  if (select count(*) from halal_mode_private.halal_cards_guide g
      where g.connection_id = v_connection and g.removed_at is null) >= 200 then
    raise exception 'The journal is full' using errcode = '54000';
  end if;
  update halal_mode_private.halal_cards_guide
     set removed_at = null, removed_by = null
   where id = p_entry_id;
end;
$$;

create or replace function public.reset_my_sample_flow()
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_me uuid := auth.uid();
  v_rounds int;
  v_connections int;
begin
  if v_me is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if not halal_mode_private.release_flag_enabled_for('tester_tools', v_me) then
    raise exception 'Reset is for testers only' using errcode = '42501';
  end if;

  -- Clear waiting sample matches before deleting connections can promote them.
  delete from public.mutual_connection_queue q
  where (q.user_a = v_me and halal_mode_private.is_demo_member(q.user_b))
     or (q.user_b = v_me and halal_mode_private.is_demo_member(q.user_a));

  delete from public.connections c
  where (c.user_a = v_me and halal_mode_private.is_demo_member(c.user_b))
     or (c.user_b = v_me and halal_mode_private.is_demo_member(c.user_a));
  get diagnostics v_connections = row_count;

  -- My sample rounds, and the sample members' mirror rounds that point at me.
  delete from public.rounds r
  where exists (select 1 from halal_mode_private.demo_rounds d where d.round_id = r.id)
    and (
      r.user_id = v_me
      or exists (
        select 1 from public.introductions i
        where i.round_id = r.id and i.subject_id = v_me
      )
    );
  get diagnostics v_rounds = row_count;

  delete from halal_mode_private.pair_exposure e
  where (e.user_low = v_me and halal_mode_private.is_demo_member(e.user_high))
     or (e.user_high = v_me and halal_mode_private.is_demo_member(e.user_low));

  return jsonb_build_object('rounds', v_rounds, 'connections', v_connections);
end;
$$;
