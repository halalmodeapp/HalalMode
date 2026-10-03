-- Three questions each instead of five. Overlap is kept, so a pair answers
-- between three (every question shared) and six (none shared); each question
-- remembers who chose it, so the app can say "Hafsa also chose this question".
--
-- The submitted checks read "at least three" so connections already part-way
-- through with five picks each still read as complete.

create or replace function halal_mode_private.submit_question_picks_after_legal_consent(
  p_connection_id uuid,
  p_question_ids text[]
) returns void
language plpgsql
security definer
set search_path = public as $$
declare
  v_connection connections%rowtype;
  v_ids text[] := coalesce(p_question_ids, '{}'::text[]);
  v_count integer;
  v_distinct_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_connection
  from connections
  where id = p_connection_id
    and closed_at is null
    and stage = 'choosing_questions'
    and (user_a = auth.uid() or user_b = auth.uid())
  for update;
  if v_connection is null then
    raise exception 'Connection is not accepting question choices' using errcode = '42501';
  end if;

  select count(*)::int, count(distinct id)::int
  into v_count, v_distinct_count
  from unnest(v_ids) selected(id);
  if v_count <> 3 or v_distinct_count <> 3
     or exists (select 1 from unnest(v_ids) selected(id) where id is null) then
    raise exception 'Choose exactly three different questions' using errcode = '22023';
  end if;
  if (select count(*) from question_catalog
      where active and id = any(v_ids)) <> 3 then
    raise exception 'One or more questions are unavailable' using errcode = '22023';
  end if;

  if exists (
    select 1 from question_picks
    where connection_id = p_connection_id and user_id = auth.uid()
  ) then
    if (select count(*) from question_picks
        where connection_id = p_connection_id and user_id = auth.uid()) = 3
       and not exists (
         (select unnest(v_ids))
         except
         (select question_id from question_picks
          where connection_id = p_connection_id and user_id = auth.uid())
       ) then
      return;
    end if;
    raise exception 'Question choices were already submitted' using errcode = '22023';
  end if;

  insert into question_picks (connection_id, user_id, question_id)
  select p_connection_id, auth.uid(), id from unnest(v_ids) selected(id);

  if (select count(distinct user_id) from question_picks
      where connection_id = p_connection_id
      group by connection_id) = 2 then
    insert into connection_questions (
      connection_id, question_id, catalog_version, picked_by_a, picked_by_b
    )
    select p_connection_id, qc.id, qc.catalog_version,
           bool_or(qp.user_id = v_connection.user_a),
           bool_or(qp.user_id = v_connection.user_b)
    from question_picks qp
    join question_catalog qc on qc.id = qp.question_id
    where qp.connection_id = p_connection_id
    group by qc.id, qc.catalog_version
    on conflict (connection_id, question_id) do nothing;

    update connections set stage = 'answering'
    where id = p_connection_id and stage = 'choosing_questions';
  end if;
end;
$$;

revoke all on function halal_mode_private.submit_question_picks_after_legal_consent(uuid, text[])
  from public, anon, authenticated;

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
      select count(*) >= 3 from question_picks qp
      where qp.connection_id = c.id and qp.user_id = auth.uid()
    ),
    'theirQuestionPicksSubmitted', (
      select count(*) >= 3 from question_picks qp
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

create or replace function halal_mode_private.demo_choose_questions()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_demo uuid := halal_mode_private.demo_member_in_connection(new.id);
begin
  if v_demo is null then return new; end if;
  insert into public.question_picks (connection_id, user_id, question_id)
  select new.id, v_demo, qc.id
  from public.question_catalog qc
  where qc.active
  order by hashtextextended(new.id::text || qc.id, 3)
  limit 3
  on conflict do nothing;
  return new;
end;
$$;
