-- A fault found by running the real backend with 10,000 simulated members
-- (docs/BACKEND_SIMULATION.md), changed in place so nothing else is restated.

-- Line endings depend on the machine that pushed a migration, so anchors spanning
-- lines compare with them removed.
create function halal_mode_private.patch_function_any_newline(
  p_signature text, p_find text, p_replace text
) returns void language plpgsql as $$
declare
  v_def text := replace(pg_get_functiondef(p_signature::regprocedure), chr(13), '');
  v_find text := replace(p_find, chr(13), '');
begin
  if position(v_find in v_def) = 0 then
    raise exception 'patch: anchor not found in %: %', p_signature, p_find;
  end if;
  execute replace(v_def, v_find, replace(p_replace, chr(13), ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- Two members submitting at once could deadlock.
--
-- The "lock everyone in one order" loop runs after the selections are written,
-- but writing them fires a trigger that takes the same locks row by row, in no
-- order. Two sets sharing two people could then wait on each other, and one
-- member's submission failed. Taking the whole set's locks first, in order,
-- leaves the trigger and the later loop holding locks they already have.
-- ---------------------------------------------------------------------------

select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.submit_round_selections_after_legal_consent(uuid,uuid[])',
  'insert into introduction_selections (introduction_id, viewer_id, subject_id, decision, decided_at)',
  'for v_user in
    select distinct id from (
      select auth.uid() id
      union all
      select i.subject_id from introductions i where i.round_id = r.id
    ) members order by id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  end loop;

  insert into introduction_selections (introduction_id, viewer_id, subject_id, decision, decided_at)'
);
