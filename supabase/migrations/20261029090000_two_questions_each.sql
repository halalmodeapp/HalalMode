-- Two questions each instead of three. If both pick the same two, the pair
-- answers two; if they share none, four. Each question still remembers who
-- chose it.
--
-- The three functions that knew the number are changed by replacing the number
-- in their current definitions, so nothing else in them is restated. The
-- "submitted" checks read "at least two", so a connection that already holds
-- three picks each still reads as complete.

do $$
declare
  v_def text;
  v_new text;
begin
  -- Picking: exactly two different, active questions.
  v_def := pg_get_functiondef('halal_mode_private.submit_question_picks_after_legal_consent(uuid,text[])'::regprocedure);
  v_new := replace(v_def, 'v_count <> 3 or v_distinct_count <> 3', 'v_count <> 2 or v_distinct_count <> 2');
  v_new := replace(v_new, 'Choose exactly three different questions', 'Choose exactly two different questions');
  v_new := replace(v_new, 'and id = any(v_ids)) <> 3 then', 'and id = any(v_ids)) <> 2 then');
  v_new := replace(v_new, 'and user_id = auth.uid()) = 3', 'and user_id = auth.uid()) = 2');
  if v_new = v_def or position('<> 3' in v_new) > 0 then
    raise exception 'submit_question_picks_after_legal_consent was not patched as expected';
  end if;
  execute v_new;

  -- Reading a connection: a member's picks are in once there are two.
  v_def := pg_get_functiondef('halal_mode_private.get_connection_after_legal_consent(uuid)'::regprocedure);
  v_new := replace(v_def, 'select count(*) >= 3 from question_picks qp', 'select count(*) >= 2 from question_picks qp');
  if v_new = v_def then
    raise exception 'get_connection_after_legal_consent was not patched as expected';
  end if;
  execute v_new;

  -- Sample members choose two as well.
  v_def := pg_get_functiondef('halal_mode_private.demo_choose_questions()'::regprocedure);
  v_new := replace(v_def, 'limit 3', 'limit 2');
  if v_new = v_def then
    raise exception 'demo_choose_questions was not patched as expected';
  end if;
  execute v_new;
end;
$$;
