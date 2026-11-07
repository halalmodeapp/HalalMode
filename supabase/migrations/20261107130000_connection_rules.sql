-- Connection rules made explicit. docs/INVARIANT_AUDIT.md, recommendation 3 (M8, C3, C4, C6).
-- Answers are already released to both at once (20261107090000), and the installed close call
-- already leaves a kind generic farewell.

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
-- M8. A waiting match opens only while both people could be matched at all: ready, consented,
-- not paused, not leaving. Until then it keeps waiting. An earned yes is not undone by a changed
-- preference, the same as an opened set. Block, hide and deletion end it at once.
-- ---------------------------------------------------------------------------
select halal_mode_private.patch_once('halal_mode_private.promote_waiting_connection_candidates(uuid[],jsonb)',
  '       and not exists (select 1 from profiles p where p.id in (v_pair.a, v_pair.b) and p.is_paused)',
  '       and not exists (select 1 from profiles p where p.id in (v_pair.a, v_pair.b) and p.is_paused)
       and halal_mode_private.matching_member_eligible(v_pair.a)
       and halal_mode_private.matching_member_eligible(v_pair.b)');

create function halal_mode_private.end_waiting_mutual_on_block()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from mutual_connection_queue where user_a = least(new.blocker_id, new.blocked_id)
    and user_b = greatest(new.blocker_id, new.blocked_id);
  return new;
end;
$$;
revoke all on function halal_mode_private.end_waiting_mutual_on_block() from public, anon, authenticated;
create trigger end_waiting_mutual_on_block after insert on public.blocks
for each row execute function halal_mode_private.end_waiting_mutual_on_block();

-- ---------------------------------------------------------------------------
-- C4. Closing takes both members' locks, in order, before touching the connection, the same order
-- block and deletion use, so the three can never wait on each other.
-- ---------------------------------------------------------------------------
create or replace function halal_mode_private.close_connection_after_legal_consent(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_a uuid;
  v_user_b uuid;
begin
  select user_a, user_b into v_user_a, v_user_b
  from connections
  where id = p_connection_id and closed_at is null and (user_a = auth.uid() or user_b = auth.uid());
  if v_user_a is null then
    raise exception 'Connection not found' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(least(v_user_a, v_user_b)::text, 1919));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_user_a, v_user_b)::text, 1919));

  update connections
  set closed_at = now(), stage = 'closed'
  where id = p_connection_id and closed_at is null;
  if not found then
    raise exception 'Connection not found' using errcode = 'P0002';
  end if;
  perform halal_mode_private.promote_waiting_connections(array[v_user_a, v_user_b]);
end;
$function$;

-- ---------------------------------------------------------------------------
-- C6. Opening a conversation that is already open succeeds, so a lost response can be retried.
-- ---------------------------------------------------------------------------
create or replace function halal_mode_private.open_connection_after_legal_consent(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  update connections
  set stage = 'open'
  where id = p_connection_id
    and closed_at is null
    and stage = 'recap'
    and (user_a = auth.uid() or user_b = auth.uid());
  if found then return; end if;
  if exists (select 1 from connections
             where id = p_connection_id and closed_at is null and stage = 'open'
               and (user_a = auth.uid() or user_b = auth.uid())) then
    return;
  end if;
  raise exception 'Connection cannot be opened';
end;
$function$;

drop function halal_mode_private.patch_once(text, text, text);
