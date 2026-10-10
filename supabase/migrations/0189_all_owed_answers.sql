-- Daily names everyone a member still owes answers to, not only the first:
-- "You still need to answer questions for Rukia and Salma." The first one
-- stays in 'owed' for the button; 'owedAll' lists them all, oldest first.

create or replace function halal_mode_private.owed_connections(p_member uuid)
returns table(connection_id uuid, other_first_name text, step text)
language sql
stable
security definer
set search_path to 'public', 'halal_mode_private'
as $function$
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
  order by c.created_at;
$function$;

revoke all on function halal_mode_private.owed_connections(uuid) from public, anon, authenticated;

create or replace function public.get_current_round_state()
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'halal_mode_private'
as $function$
declare
  v_all jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  select jsonb_agg(jsonb_build_object(
           'connectionId', o.connection_id,
           'name', o.other_first_name,
           'step', o.step))
    into v_all
    from halal_mode_private.owed_connections(auth.uid()) o;
  if v_all is not null then
    return jsonb_build_object(
      'status', 'answers_owed',
      'round', null,
      'owed', v_all -> 0,
      'owedAll', v_all
    );
  end if;
  return halal_mode_private.get_current_round_state_before_answer_gate();
end;
$function$;
