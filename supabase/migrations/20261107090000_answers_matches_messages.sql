-- Both members finish before answers are released. Earned mutuals do not expire.

create or replace function halal_mode_private.answers_complete(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from connection_questions where connection_id = p_id)
    and not exists (
      select 1 from connections c join connection_questions q on q.connection_id = c.id
      cross join lateral unnest(array[c.user_a, c.user_b]) member_id
      where c.id = p_id and not exists (
        select 1 from question_answers a where a.connection_id = c.id
          and a.question_id = q.question_id and a.user_id = member_id));
$$;
revoke all on function halal_mode_private.answers_complete(uuid) from public, anon, authenticated;


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

  -- Neither member can read early and tailor their remaining answers.
  v_mine_done := halal_mode_private.answers_complete(c.id);

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
        -- The same completion rule applies to reads and submission responses.
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
      select count(*) >= 2 from question_picks qp
      where qp.connection_id = c.id and qp.user_id = auth.uid()
    ),
    'theirQuestionPicksSubmitted', (
      select count(*) >= 2 from question_picks qp
      where qp.connection_id = c.id and qp.user_id <> auth.uid()
    ),
    'questions', questions,
    'recap', case when v_mine_done then c.recap else '[]'::jsonb end,
    'compatibilityBreakdown', case when v_mine_done then build_connection_compatibility_breakdown(c.id) else '[]'::jsonb end,
    'lastMessage', (
      select coalesce(m.body, 'Voice note') from messages m
      where m.connection_id = c.id order by m.created_at desc limit 1
    ),
    'lastMessageDeleted', (
      select m.deleted_at is not null from messages m
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
    and (stage = 'answering' or (stage in ('recap', 'open') and exists (
      select 1 from question_answers qa
      where qa.connection_id = p_connection_id and qa.user_id = auth.uid()
        and qa.question_id = p_question_id and qa.body = trim(p_answer)
    )))
    and (user_a = auth.uid() or user_b = auth.uid())
  for update;
  if v_other_id is null then
    raise exception 'Connection is not ready for answers' using errcode = '42501';
  end if;
  if p_answer is null or length(trim(p_answer)) not between 10 and 2000 then
    raise exception 'Answer must be between 10 and 2000 characters' using errcode = '22023';
  end if;
  if halal_mode_private.message_contains_contact(p_answer) then
    raise exception 'Answers cannot include contact details' using errcode = '22023';
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

  v_mine_done := halal_mode_private.answers_complete(p_connection_id);
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

create or replace function halal_mode_private.get_connection_recap_after_legal_consent(p_connection_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public as $$
declare result jsonb;
begin
  select recap into result from connections
  where id = p_connection_id
    and closed_at is null
    and stage in ('recap', 'open')
    and halal_mode_private.answers_complete(p_connection_id)
    and (user_a = auth.uid() or user_b = auth.uid());
  if result is null then raise exception 'Recap is not available'; end if;
  return result;
end;
$$;

create or replace function halal_mode_private.waiting_connection_candidates(p_member_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public as $$
  with supplied as (
    select distinct member_id
    from unnest(coalesce(p_member_ids, '{}'::uuid[])) member_id
    order by member_id
  ), ranked as (
    select q.user_a, q.user_b, q.matched_at, supplied.member_id,
           row_number() over (
             partition by supplied.member_id
             order by q.matched_at, q.user_a, q.user_b
           ) as member_rank
    from supplied
    join mutual_connection_queue q
      on supplied.member_id in (q.user_a, q.user_b)
    where not halal_mode_private.pair_is_hidden(q.user_a, q.user_b)
      and not exists (
      select 1 from profiles p
      where p.id in (q.user_a, q.user_b) and p.is_paused
    )
      and not exists (
        select 1 from halal_mode_private.account_deletion_requests d
        where d.user_id in (q.user_a, q.user_b) and d.processed_at is null
      )
      and not exists (
        select 1 from profiles p cross join lateral tier_limits(halal_mode_private.effective_membership_tier(p.id)) l
        where p.id in (q.user_a, q.user_b)
          -- Supplied members may be about to free a slot by closing or deleting.
          and not (p.id = any(coalesce(p_member_ids, '{}'::uuid[])))
          and (select count(*) from connections c
               where c.closed_at is null and p.id in (c.user_a, c.user_b)) >= l.open_connections
      )
      and not exists (
      select 1 from connections c where c.user_a = q.user_a and c.user_b = q.user_b
    )
      and not exists (
        select 1 from blocks b
        where (b.blocker_id = q.user_a and b.blocked_id = q.user_b)
           or (b.blocker_id = q.user_b and b.blocked_id = q.user_a)
      )
  ), fair_candidates as (
    select user_a, user_b, min(matched_at) as matched_at
    from ranked
    where member_rank <= 10
    group by user_a, user_b
    order by min(matched_at), user_a, user_b
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('a', q.user_a, 'b', q.user_b)
    order by q.matched_at, q.user_a, q.user_b
  ), '[]'::jsonb)
  from fair_candidates q;

$$;

create or replace function halal_mode_private.promote_waiting_connection_candidates(
  p_member_ids uuid[], p_candidates jsonb
) returns integer
language plpgsql
security definer
set search_path = public as $$
declare
  v_candidates jsonb := p_candidates;
  v_user uuid;
  v_pair record;
  v_cap_a int;
  v_cap_b int;
  v_count_a int;
  v_count_b int;
  v_promoted int := 0;
begin
  -- Remove a bounded batch of terminal rows for hygiene. Candidate selection
  -- also excludes all stale rows, so a backlog larger than this cleanup batch
  -- can never crowd out a real mutual.
  with supplied as (
    select distinct member_id
    from unnest(coalesce(p_member_ids, '{}'::uuid[])) member_id
    order by member_id
  ), stale as (
    select q.user_a, q.user_b
    from mutual_connection_queue q
    join supplied on supplied.member_id in (q.user_a, q.user_b)
    where (
        exists (select 1 from connections c where c.user_a = q.user_a and c.user_b = q.user_b)
        or exists (
          select 1 from blocks b
          where (b.blocker_id = q.user_a and b.blocked_id = q.user_b)
             or (b.blocker_id = q.user_b and b.blocked_id = q.user_a)
        )
      )
    order by q.matched_at, q.user_a, q.user_b
    limit 100
  )
  delete from mutual_connection_queue q
  using stale s
  where q.user_a = s.user_a and q.user_b = s.user_b;

  for v_user in
    select distinct candidate_id
    from jsonb_to_recordset(v_candidates) as candidate(a uuid, b uuid)
    cross join lateral unnest(array[candidate.a, candidate.b]) candidate_id
    union
    select member_id from unnest(coalesce(p_member_ids, '{}'::uuid[])) member_id
    order by candidate_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  end loop;

  for v_pair in
    select candidate.a, candidate.b
    from jsonb_to_recordset(v_candidates) as candidate(a uuid, b uuid)
  loop
    if halal_mode_private.pair_is_hidden(v_pair.a, v_pair.b) or exists (
      select 1 from blocks b
      where (b.blocker_id = v_pair.a and b.blocked_id = v_pair.b)
         or (b.blocker_id = v_pair.b and b.blocked_id = v_pair.a)
    ) or exists (
      select 1 from connections c where c.user_a = v_pair.a and c.user_b = v_pair.b
    ) then
      delete from mutual_connection_queue
      where user_a = v_pair.a and user_b = v_pair.b;
      continue;
    end if;

    -- A concurrent safety action may already have removed this candidate.
    if not exists (select 1 from mutual_connection_queue
                   where user_a = v_pair.a and user_b = v_pair.b) then continue; end if;

    select l.open_connections into v_cap_a
    from profiles p cross join lateral tier_limits(halal_mode_private.effective_membership_tier(p.id)) l
    where p.id = v_pair.a;
    select l.open_connections into v_cap_b
    from profiles p cross join lateral tier_limits(halal_mode_private.effective_membership_tier(p.id)) l
    where p.id = v_pair.b;
    select count(*)::int into v_count_a from connections
    where closed_at is null and (user_a = v_pair.a or user_b = v_pair.a);
    select count(*)::int into v_count_b from connections
    where closed_at is null and (user_a = v_pair.b or user_b = v_pair.b);

    if v_count_a < v_cap_a and v_count_b < v_cap_b
       and not exists (select 1 from profiles p where p.id in (v_pair.a, v_pair.b) and p.is_paused)
       and not exists (select 1 from halal_mode_private.account_deletion_requests d
                       where d.user_id in (v_pair.a, v_pair.b) and d.processed_at is null) then
      insert into connections (user_a, user_b)
      values (v_pair.a, v_pair.b)
      on conflict (user_a, user_b) do nothing;
      if found then v_promoted := v_promoted + 1; end if;
      delete from mutual_connection_queue
      where user_a = v_pair.a and user_b = v_pair.b;
    end if;
  end loop;

  return v_promoted;
end;
$$;

-- Safety actions permanently end a waiting mutual, even if deletion is later undone.
create or replace function halal_mode_private.end_waiting_mutual_on_hide()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from mutual_connection_queue where user_a = least(new.hider_id, new.hidden_id)
    and user_b = greatest(new.hider_id, new.hidden_id);
  return new;
end;
$$;
create trigger end_waiting_mutual_on_hide after insert on halal_mode_private.member_hides
for each row execute function halal_mode_private.end_waiting_mutual_on_hide();
create or replace function halal_mode_private.end_waiting_mutual_on_deletion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from mutual_connection_queue where new.user_id in (user_a, user_b);
  return new;
end;
$$;
create trigger end_waiting_mutual_on_deletion after insert on halal_mode_private.account_deletion_requests
for each row execute function halal_mode_private.end_waiting_mutual_on_deletion();
revoke all on function halal_mode_private.end_waiting_mutual_on_hide() from public, anon, authenticated;
revoke all on function halal_mode_private.end_waiting_mutual_on_deletion() from public, anon, authenticated;
-- Retire already terminal rows when this batch is applied.
delete from public.mutual_connection_queue q
where halal_mode_private.pair_is_hidden(q.user_a, q.user_b)
  or exists (select 1 from halal_mode_private.account_deletion_requests d
             where d.user_id in (q.user_a, q.user_b));

create or replace function public.get_my_waiting_matches()
returns jsonb language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', p.id, 'firstName', p.first_name,
    'blurredPhotos', coalesce((select jsonb_agg(b.path order by photo.ordinality)
      from unnest(p.photos) with ordinality photo(path, ordinality)
      join halal_mode_private.photo_blurs b on b.path = photo.path), '[]'::jsonb))
    order by q.matched_at, p.id)
  from mutual_connection_queue q join profiles p
    on p.id = case when q.user_a = auth.uid() then q.user_b else q.user_a end
  where auth.uid() in (q.user_a, q.user_b)
    and not halal_mode_private.pair_is_hidden(q.user_a, q.user_b)
    and not exists (select 1 from blocks b where
      (b.blocker_id = q.user_a and b.blocked_id = q.user_b) or
      (b.blocker_id = q.user_b and b.blocked_id = q.user_a))
    and not exists (select 1 from account_deletion_requests d where d.user_id in (q.user_a, q.user_b))
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.get_my_waiting_matches() from public, anon;
grant execute on function public.get_my_waiting_matches() to authenticated;


create or replace function halal_mode_private.can_read_blurred_media(p_subject_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null or p_subject_id is null then return false; end if;
  if p_subject_id = v_viewer::text then return true; end if;
  if p_subject_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  if exists (select 1 from public.mutual_connection_queue q
    where v_viewer in (q.user_a, q.user_b) and p_subject_id::uuid in (q.user_a, q.user_b)
      and not halal_mode_private.pair_is_hidden(q.user_a, q.user_b)
      and not exists (select 1 from public.blocks b where
        (b.blocker_id = q.user_a and b.blocked_id = q.user_b) or
        (b.blocker_id = q.user_b and b.blocked_id = q.user_a))
      and not exists (select 1 from account_deletion_requests d where d.user_id in (q.user_a, q.user_b)))
    then return true; end if;
  return exists (select 1 from halal_mode_private.liked_you_current(v_viewer) l where l.liker_id = p_subject_id::uuid);
end;
$function$;

-- Only the placeholder lives on the member-readable row. Original content is safety evidence.
create table halal_mode_private.message_settings (
  singleton boolean primary key default true check (singleton),
  delete_window interval not null default interval '15 minutes' check (delete_window >= interval '0')
);
insert into halal_mode_private.message_settings default values;
alter table public.messages add column deleted_at timestamptz;
create table halal_mode_private.deleted_message_evidence (
  message_id uuid primary key,
  connection_id uuid not null,
  sender_id uuid not null,
  recipient_id uuid not null,
  original jsonb not null,
  deleted_at timestamptz not null default now(),
  purge_after timestamptz not null default now() + interval '2 years'
);
alter table halal_mode_private.message_settings enable row level security;
alter table halal_mode_private.deleted_message_evidence enable row level security;
revoke all on halal_mode_private.message_settings, halal_mode_private.deleted_message_evidence from public, anon, authenticated;
grant select, update on halal_mode_private.message_settings to service_role;
grant select, delete on halal_mode_private.deleted_message_evidence to service_role;

create or replace function public.delete_message_for_everyone(p_message_id uuid)
returns void language plpgsql security definer set search_path = public, halal_mode_private as $$
declare
  m messages%rowtype;
  v_other uuid;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  -- Use the same lock order as send_message.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1818));
  select * into m from messages where id = p_message_id and sender_id = auth.uid();
  if m.id is null then raise exception 'Message is not available' using errcode = '42501'; end if;
  select case when user_a = auth.uid() then user_b else user_a end into v_other
  from connections where id = m.connection_id
    and auth.uid() in (user_a, user_b) for update;
  if v_other is null then
    raise exception 'Connection is not available' using errcode = '42501';
  end if;
  select * into m from messages where id = p_message_id for update;
  if m.deleted_at is not null then return; end if;
  if clock_timestamp() > m.created_at + coalesce((select delete_window from message_settings), interval '0') then
    raise exception 'Message deletion window has ended' using errcode = '22023';
  end if;
  insert into deleted_message_evidence (message_id, connection_id, sender_id, recipient_id, original)
    values (m.id, m.connection_id, m.sender_id, v_other, to_jsonb(m));
  -- English fallback is intentional for installed clients without the new localization key.
  update messages set body = 'Message deleted', voice_path = null, voice_duration_seconds = null,
    deleted_at = now() where id = m.id;
end;
$$;
revoke all on function public.delete_message_for_everyone(uuid) from public, anon;
grant execute on function public.delete_message_for_everyone(uuid) to authenticated;
select cron.schedule('halal-mode-deleted-message-evidence', '35 3 * * *',
  $$delete from halal_mode_private.deleted_message_evidence where purge_after < now()$$);


-- The phone asks the server which messages are still within the configured window.
create or replace function public.get_deletable_message_ids(p_connection_id uuid)
returns jsonb language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  if not exists (select 1 from connections c where c.id = p_connection_id
    and c.closed_at is null and c.stage = 'open' and auth.uid() in (c.user_a, c.user_b)
    and not exists (select 1 from blocks b where
      (b.blocker_id = c.user_a and b.blocked_id = c.user_b) or
      (b.blocker_id = c.user_b and b.blocked_id = c.user_a))) then
    raise exception 'Connection is not available' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(m.id), '[]'::jsonb) from messages m cross join message_settings s
    where m.connection_id = p_connection_id and m.sender_id = auth.uid() and m.deleted_at is null
      and clock_timestamp() <= m.created_at + s.delete_window);
end;
$$;
revoke all on function public.get_deletable_message_ids(uuid) from public, anon;
grant execute on function public.get_deletable_message_ids(uuid) to authenticated;

-- Poll tombstones for the messages already loaded, including expanded history.
create or replace function public.get_connection_message_deletions(p_connection_id uuid, p_message_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  if not exists (select 1 from connections c where c.id = p_connection_id
    and c.closed_at is null and c.stage = 'open' and auth.uid() in (c.user_a, c.user_b)
    and not exists (select 1 from blocks b where
      (b.blocker_id = c.user_a and b.blocked_id = c.user_b) or
      (b.blocker_id = c.user_b and b.blocked_id = c.user_a))) then
    raise exception 'Connection is not available' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'deletedAt', m.deleted_at)), '[]'::jsonb)
    from messages m where m.connection_id = p_connection_id and m.id = any(p_message_ids) and m.deleted_at is not null);
end;
$$;
revoke all on function public.get_connection_message_deletions(uuid, uuid[]) from public, anon;
grant execute on function public.get_connection_message_deletions(uuid, uuid[]) to authenticated;

-- Reports keep a service-only route to the original content after withdrawal or account deletion.
create or replace function public.get_report_deleted_messages_service(p_report_id uuid)
returns jsonb language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Safety evidence requires service role' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'messageId', e.message_id, 'connectionId', e.connection_id,
    'deletedAt', e.deleted_at, 'original', e.original) order by e.deleted_at), '[]'::jsonb)
    from deleted_message_evidence e join reports r on r.id = p_report_id
      and ((e.sender_id = r.subject_id and e.recipient_id = r.reporter_id)
        or (e.sender_id = r.reporter_id and e.recipient_id = r.subject_id))
    where e.purge_after > now());
end;
$$;
revoke all on function public.get_report_deleted_messages_service(uuid) from public, anon, authenticated;
grant execute on function public.get_report_deleted_messages_service(uuid) to service_role;
