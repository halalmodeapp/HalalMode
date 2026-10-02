-- Three product changes, approved 2026-10-02 (see DECISIONS.md).
--
-- 1. Interest limits: Free may send interest to up to 3 of a set, Premium to
--    up to all 10. Open-connection capacity is unchanged, so a mutual that
--    finds no free slot still waits in the queue exactly as before.
-- 2. Answer before matching again: a member someone is waiting on (they chose
--    questions, or answered them, and this member has not) is shown no set
--    until they catch up, and cannot submit one either.
-- 3. Saved answers: a member may keep their answer to a question so it is
--    filled in the next time that question comes up. Private to them.

-- 1. Limits ----------------------------------------------------------------

create or replace function public.tier_limits(p_tier membership_tier)
returns table (introductions int, keeps int, open_connections int)
language sql immutable as $$
  select case when p_tier = 'premium' then 10 else 5 end,
         case when p_tier = 'premium' then 10 else 3 end,
         case when p_tier = 'premium' then 10 else 5 end;
$$;
revoke all on function public.tier_limits(membership_tier) from public, anon, authenticated;

alter table public.introduction_selections
  drop constraint if exists introduction_selections_rank_check;
alter table public.introduction_selections
  add constraint introduction_selections_rank_check
  check (rank is null or rank between 1 and 10);

-- 2. Answer before matching again --------------------------------------------

/**
 * The oldest open connection where the other member has done their part of the
 * questions and this member has not. Null when nobody is waiting on them.
 */
create or replace function halal_mode_private.owed_connection(p_member uuid)
returns table (connection_id uuid, other_first_name text, step text)
language sql stable security definer
set search_path = public, halal_mode_private as $$
  select c.id,
         p.first_name,
         case when c.stage = 'choosing_questions' then 'questions' else 'answers' end
  from connections c
  join profiles p on p.id = case when c.user_a = p_member then c.user_b else c.user_a end
  where c.closed_at is null
    and (c.user_a = p_member or c.user_b = p_member)
    and (
      (c.stage = 'choosing_questions'
        and exists (select 1 from question_picks q where q.connection_id = c.id and q.user_id = p.id)
        and not exists (select 1 from question_picks q where q.connection_id = c.id and q.user_id = p_member))
      or
      (c.stage = 'answering'
        and (select count(*) from connection_questions cq where cq.connection_id = c.id) > 0
        and (select count(*) from question_answers a where a.connection_id = c.id and a.user_id = p.id)
            >= (select count(*) from connection_questions cq where cq.connection_id = c.id)
        and (select count(*) from question_answers a where a.connection_id = c.id and a.user_id = p_member)
            < (select count(*) from connection_questions cq where cq.connection_id = c.id))
    )
  order by c.created_at
  limit 1;
$$;
revoke all on function halal_mode_private.owed_connection(uuid) from public, anon, authenticated;

-- The reviewed round-state function is kept whole and wrapped, the same way
-- the legal-consent boundary was added.
alter function public.get_current_round_state() set schema halal_mode_private;
alter function halal_mode_private.get_current_round_state()
  rename to get_current_round_state_before_answer_gate;
revoke all on function halal_mode_private.get_current_round_state_before_answer_gate()
  from public, anon, authenticated;

create function public.get_current_round_state()
returns jsonb language plpgsql security definer
set search_path = public, halal_mode_private as $$
declare
  v_owed record;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  select * into v_owed from halal_mode_private.owed_connection(auth.uid());
  if v_owed.connection_id is not null then
    return jsonb_build_object(
      'status', 'answers_owed',
      'round', null,
      'owed', jsonb_build_object(
        'connectionId', v_owed.connection_id,
        'name', v_owed.other_first_name,
        'step', v_owed.step
      )
    );
  end if;
  return halal_mode_private.get_current_round_state_before_answer_gate();
end;
$$;
revoke all on function public.get_current_round_state() from public, anon;
grant execute on function public.get_current_round_state() to authenticated;

create or replace function public.submit_round_selections_ranked(
  p_round_id uuid,
  p_ordered_introduction_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_ids uuid[] := coalesce(p_ordered_introduction_ids, '{}'::uuid[]);
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if exists (select 1 from halal_mode_private.owed_connection(auth.uid())) then
    raise exception 'Answer the questions you owe before continuing' using errcode = '22023';
  end if;

  v_result := public.submit_round_selections(p_round_id, v_ids);
  perform halal_mode_private.record_selection_ranks(auth.uid(), p_round_id, v_ids);
  return v_result;
end;
$$;
revoke all on function public.submit_round_selections_ranked(uuid, uuid[]) from public, anon;
grant execute on function public.submit_round_selections_ranked(uuid, uuid[]) to authenticated;

-- 3. Saved answers ------------------------------------------------------------

create table if not exists halal_mode_private.saved_answers (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  body text not null check (length(trim(body)) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
revoke all on halal_mode_private.saved_answers from public, anon, authenticated;

create or replace function public.get_my_saved_answers()
returns jsonb language sql stable security definer
set search_path = public, halal_mode_private as $$
  select coalesce(jsonb_object_agg(question_id, body), '{}'::jsonb)
  from halal_mode_private.saved_answers
  where user_id = auth.uid();
$$;
revoke all on function public.get_my_saved_answers() from public, anon;
grant execute on function public.get_my_saved_answers() to authenticated;

create or replace function public.save_my_answer(p_question_id text, p_body text)
returns void language plpgsql security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if p_question_id is null or length(p_question_id) > 100
     or p_body is null or length(trim(p_body)) not between 1 and 2000 then
    raise exception 'Invalid answer' using errcode = '22023';
  end if;
  insert into halal_mode_private.saved_answers (user_id, question_id, body)
  values (auth.uid(), p_question_id, trim(p_body))
  on conflict (user_id, question_id) do update
    set body = excluded.body, updated_at = now();
end;
$$;
revoke all on function public.save_my_answer(text, text) from public, anon;
grant execute on function public.save_my_answer(text, text) to authenticated;

create or replace function public.forget_my_answer(p_question_id text)
returns void language sql security definer
set search_path = public, halal_mode_private as $$
  delete from halal_mode_private.saved_answers
  where user_id = auth.uid() and question_id = p_question_id;
$$;
revoke all on function public.forget_my_answer(text) from public, anon;
grant execute on function public.forget_my_answer(text) to authenticated;
