-- Answers stay sealed until you have answered all of yours (2026-10-02).
--
-- Each answer used to be revealed the moment both members had answered that
-- one question. Seeing someone's first answers while still writing your own
-- invites tailoring the rest to match. Now nothing of theirs is shown until
-- every question in the connection has your answer.

create or replace function halal_mode_private.get_connection_after_legal_consent(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c connections%rowtype;
  other_profile profiles%rowtype;
  questions jsonb;
  v_mine_done boolean;
begin
  select * into c
  from connections
  where id = p_id
    and closed_at is null
    and (user_a = auth.uid() or user_b = auth.uid());
  if c is null then raise exception 'Connection not found' using errcode = 'P0002'; end if;

  select * into other_profile
  from profiles
  where id = case when c.user_a = auth.uid() then c.user_b else c.user_a end;

  -- Their answers stay sealed until this member has answered every question,
  -- so nobody can shape their remaining answers around what they have read.
  v_mine_done := (select count(*) from connection_questions cq where cq.connection_id = c.id) > 0
    and (select count(*) from question_answers qa where qa.connection_id = c.id and qa.user_id = auth.uid())
      >= (select count(*) from connection_questions cq where cq.connection_id = c.id);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'questionId', picked.question_id,
        'origin', case
          when picked.picked_by_me and picked.picked_by_them then 'both'
          when picked.picked_by_me then 'me'
          else 'them'
        end,
        'myAnswer', coalesce(own_answer.body, ''),
        'mySubmittedAt', own_answer.submitted_at,
        -- Released only where this member has answered too, which is the same
        -- condition submit_answer already applies. Without it the reveal lived
        -- only in that one response and vanished on the next read.
        'theirAnswer', case
          when v_mine_done and own_answer.body is not null and their_answer.body is not null
            then their_answer.body
        end,
        'theirSubmittedAt', case
          when v_mine_done and own_answer.body is not null and their_answer.body is not null
            then their_answer.submitted_at
        end
      ) order by picked.question_id
    ),
    '[]'::jsonb
  ) into questions
  from (
    select qp.question_id,
           bool_or(qp.user_id = auth.uid()) as picked_by_me,
           bool_or(qp.user_id <> auth.uid()) as picked_by_them
    from question_picks qp
    where qp.connection_id = c.id
    group by qp.question_id
  ) picked
  left join question_answers own_answer
    on own_answer.connection_id = c.id
   and own_answer.question_id = picked.question_id
   and own_answer.user_id = auth.uid()
  left join question_answers their_answer
    on their_answer.connection_id = c.id
   and their_answer.question_id = picked.question_id
   and their_answer.user_id <> auth.uid();

  return jsonb_build_object(
    'id', c.id,
    'createdAt', c.created_at,
    'stage', c.stage,
    'profile', safe_member_profile(other_profile),
    'myQuestionPicksSubmitted', (
      select count(*) = 5 from question_picks qp
      where qp.connection_id = c.id and qp.user_id = auth.uid()
    ),
    'theirQuestionPicksSubmitted', (
      select count(*) = 5 from question_picks qp
      where qp.connection_id = c.id and qp.user_id <> auth.uid()
    ),
    'questions', questions,
    'recap', c.recap,
    'compatibilityBreakdown', build_connection_compatibility_breakdown(c.id),
    'lastMessage', (
      select coalesce(m.body, 'Voice note') from messages m
      where m.connection_id = c.id order by m.created_at desc limit 1
    ),
    'lastMessageAt', (
      select m.created_at from messages m
      where m.connection_id = c.id order by m.created_at desc limit 1
    ),
    'unread', exists (
      select 1 from messages m
      where m.connection_id = c.id
        and m.sender_id <> auth.uid()
        and m.read_at is null
    )
  );
end;
$function$;

create or replace function halal_mode_private.submit_answer_after_legal_consent(p_connection_id uuid, p_question_id text, p_answer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_other_id uuid;
  v_their_answer text;
  v_my_answer text;
  v_my_submitted_at timestamptz;
  v_origin text;
  v_mine_done boolean;
begin
  select case when user_a = auth.uid() then user_b else user_a end
  into v_other_id
  from connections
  where id = p_connection_id
    and closed_at is null
    and stage = 'answering'
    and (user_a = auth.uid() or user_b = auth.uid());
  if v_other_id is null then
    raise exception 'Connection is not ready for answers' using errcode = '42501';
  end if;
  if p_answer is null or length(trim(p_answer)) not between 10 and 2000 then
    raise exception 'Answer must be between 10 and 2000 characters' using errcode = '22023';
  end if;
  if not exists (
    select 1 from connection_questions
    where connection_id = p_connection_id and question_id = p_question_id
  ) then
    raise exception 'Question is not in this connection' using errcode = '22023';
  end if;

  insert into question_answers (connection_id, user_id, question_id, body)
  values (p_connection_id, auth.uid(), p_question_id, trim(p_answer))
  on conflict (connection_id, user_id, question_id) do nothing;

  select body, submitted_at into v_my_answer, v_my_submitted_at
  from question_answers
  where connection_id = p_connection_id
    and user_id = auth.uid() and question_id = p_question_id;
  select body into v_their_answer
  from question_answers
  where connection_id = p_connection_id
    and user_id = v_other_id and question_id = p_question_id;

  select case
    when picked_by_a and picked_by_b then 'both'
    when (picked_by_a and auth.uid() = c.user_a) or (picked_by_b and auth.uid() = c.user_b) then 'me'
    else 'them'
  end into v_origin
  from connection_questions cq
  join connections c on c.id = cq.connection_id
  where cq.connection_id = p_connection_id and cq.question_id = p_question_id;

  -- Sealed until every one of this member's answers is in.
  v_mine_done := (select count(*) from question_answers qa where qa.connection_id = p_connection_id and qa.user_id = auth.uid())
    >= (select count(*) from connection_questions cq where cq.connection_id = p_connection_id);
  if not v_mine_done then v_their_answer := null; end if;

  perform refresh_connection_stage_after_answer(p_connection_id);
  return jsonb_build_object(
    'questionId', p_question_id,
    'origin', v_origin,
    'myAnswer', v_my_answer,
    'theirAnswer', v_their_answer,
    'mySubmittedAt', v_my_submitted_at
  );
end;
$function$;
