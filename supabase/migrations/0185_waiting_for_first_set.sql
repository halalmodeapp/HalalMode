-- "No suitable introductions" only when matching actually ran for this member
-- and found nobody. A member matching has not reached yet (just finished their
-- profile, say) is waiting for their first set, which is not a disappointment
-- and should not read as one.
do $$
declare
  v_def text;
  v_anchor constant text := $a$  return jsonb_build_object('status', 'no_suitable_introductions', 'round', null);$a$;
begin
  select pg_get_functiondef('halal_mode_private.get_current_round_state_before_answer_gate'::regproc) into v_def;
  if position(v_anchor in v_def) = 0 then
    raise exception 'round state: final return not found';
  end if;
  if position('waiting_for_first_set' in v_def) = 0 then
    v_def := replace(v_def, v_anchor,
      $r$  if v_outcome is null then
    return jsonb_build_object('status', 'waiting_for_first_set', 'round', null);
  end if;
$r$ || v_anchor);
    execute v_def;
  end if;
end;
$$;
