-- Share live eligibility without making a pass visible through a disappearing card.
create or replace function halal_mode_private.matching_member_eligible(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select coalesce((
    select p.onboarding_complete and not p.is_paused
      and p.marital_status is not null
      and p.latitude is not null and p.longitude is not null
      and pp.matching_preferences_completed_at is not null
      and public.profile_is_ready_for_matching(p.id)
      and halal_mode_private.member_has_current_legal_consents(p.id)
      and not exists (select 1 from halal_mode_private.account_deletion_requests d
                      where d.user_id = p.id and d.processed_at is null)
    from public.profiles p
    join public.private_preferences pp on pp.user_id = p.id
    where p.id = p_member
  ), false);
$$;
revoke all on function halal_mode_private.matching_member_eligible(uuid) from public, anon, authenticated, service_role;

-- Commits already load facts once per person. Reuse those rows for the pair check.
create or replace function halal_mode_private.matching_pair_accepts(
  a halal_mode_private.member_matching_facts, b halal_mode_private.member_matching_facts
) returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select coalesce(a.id <> b.id and a.gender <> b.gender
    and halal_mode_private.accepts_row(a, b, null)
    and halal_mode_private.accepts_row(b, a, null), false)
    and not exists (select 1 from public.blocks x
                    where (x.blocker_id = a.id and x.blocked_id = b.id)
                       or (x.blocker_id = b.id and x.blocked_id = a.id))
    and not halal_mode_private.pair_is_hidden(a.id, b.id)
    and not exists (select 1 from public.connections c
                    where c.user_a = least(a.id, b.id) and c.user_b = greatest(a.id, b.id));
$$;
revoke all on function halal_mode_private.matching_pair_accepts(halal_mode_private.member_matching_facts, halal_mode_private.member_matching_facts) from public, anon, authenticated, service_role;

create or replace function halal_mode_private.league_pair_stands(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select halal_mode_private.matching_member_eligible(p_a)
    and halal_mode_private.matching_member_eligible(p_b)
    and coalesce((
      select halal_mode_private.matching_pair_accepts(a, b)
      from halal_mode_private.member_matching_facts a
      join halal_mode_private.member_matching_facts b on b.id = p_b
      where a.id = p_a
    ), false);
$function$;
alter function halal_mode_private.league_pair_stands(uuid, uuid) cost 10000;

-- Capacity and dormancy govern new sets, not the visibility of an opened card.
create or replace view halal_mode_private.league_pool as
select p.id, p.gender::text as gender, p.tier,
  lower(btrim(p.country)) as country_key, p.latitude, p.longitude, p.high_latitude_fajr_method
from public.profiles p
left join halal_mode_private.league_member_activity a on a.user_id = p.id
cross join halal_mode_private.league_config cfg
cross join lateral public.tier_limits(p.tier) l
where halal_mode_private.matching_member_eligible(p.id)
  and coalesce(a.last_seen_at, p.created_at) > now() - make_interval(days => cfg.dormant_after_days)
  and (select count(*) from public.connections c
       where c.closed_at is null and (c.user_a = p.id or c.user_b = p.id)) < l.open_connections;


create or replace function public.league_commit_edges_service(p_job jsonb, p_edges jsonb)
returns int
language plpgsql
security definer
set search_path = public, halal_mode_private
set statement_timeout = '30s'
set plan_cache_mode = force_custom_plan
set lock_timeout = '25s'
as $function$
declare
  v_cycle date := (p_job ->> 'cycleDate')::date;
  v_gap int;
  v_count int;
  v_user uuid;
  v_one_way boolean;
begin
  perform halal_mode_private.league_take_lease(p_job);
  select repeat_gap_days into v_gap from halal_mode_private.league_config;
  select j.one_way into v_one_way from halal_mode_private.league_jobs j
  where j.cycle_date = v_cycle and j.wave = (p_job ->> 'wave')::int
    and j.stratum = p_job ->> 'stratum' and j.table_no = (p_job ->> 'tableNo')::int;

  -- The same locks a block, a pause, a pick or a new connection takes, in one order. Whatever else
  -- happens to these people happens wholly before these checks or wholly after this commit.
  for v_user in
    select distinct id from (
      select (e ->> 'a')::uuid as id from jsonb_array_elements(p_edges) e
      union select (e ->> 'b')::uuid from jsonb_array_elements(p_edges) e
    ) members order by id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  end loop;

  -- Everyone once, then every pair from those rows, which is what makes checking 400 pairs quick.
  with proposed as (
    select e.a, e.b, e.score,
      row_number() over (partition by e.a) as seq_a,
      row_number() over (partition by e.b) as seq_b,
      row_number() over (partition by least(e.a, e.b), greatest(e.a, e.b)) as seq_pair
    from jsonb_to_recordset(p_edges) as e(a uuid, b uuid, score numeric)
  ), people as materialized (
    select f as facts, f.id, r.id as round_id, r.opens_at, r.seats,
      seat.seats - seat.used as seats_here,
      -- Out here, so it runs once for each person in the result and not for everyone scanned.
      halal_mode_private.matching_member_eligible(f.id) as consented,
      (select count(*) from public.introductions i where i.round_id = r.id) as holding
    from halal_mode_private.member_matching_facts f
    join public.profiles p on p.id = f.id
    join public.rounds r on r.user_id = f.id and r.cycle_date = v_cycle
    join halal_mode_private.league_seats seat
      on seat.user_id = f.id and seat.cycle_date = v_cycle
     and seat.wave = (p_job ->> 'wave')::int and seat.stratum = p_job ->> 'stratum'
     and seat.table_no = (p_job ->> 'tableNo')::int
    cross join lateral public.tier_limits(p.tier) l
    where f.id in (select a from proposed union select b from proposed)
      and (select count(*) from public.connections c
           where c.closed_at is null and (c.user_a = f.id or c.user_b = f.id)) < l.open_connections
      and not p.is_paused
      and r.submitted_at is null
      -- Nothing is added to a set someone has already started looking at.
      and r.opens_at > now()
  ), checked as (
    select pr.a, pr.b, pr.score, pa.round_id as round_a, pb.round_id as round_b,
           case when v_one_way then pa.opens_at else greatest(pa.opens_at, pb.opens_at) end as available_at,
           gen_random_uuid() as intro_a, gen_random_uuid() as intro_b
    from proposed pr
    join people pa on pa.id = pr.a
    join people pb on pb.id = pr.b
    where pa.consented and pb.consented
      and pr.seq_pair = 1
      and halal_mode_private.matching_pair_accepts(pa.facts, pb.facts)
      and pa.holding + pr.seq_a <= pa.seats
      and (v_one_way or pb.holding + pr.seq_b <= pb.seats)
      and pr.seq_a <= pa.seats_here
      and (v_one_way or pr.seq_b <= pb.seats_here)
      and not exists (
        select 1 from halal_mode_private.pair_exposure x
        where x.user_low = least(pr.a, pr.b) and x.user_high = greatest(pr.a, pr.b)
          and (x.retired_at is not null or x.cooldown_until > now()
               or x.last_shown_at > now() - make_interval(days => v_gap - 1))
      )
      and not exists (select 1 from halal_mode_private.league_returns x
                      where (x.recipient = pr.a and x.sender = pr.b)
                         or (x.recipient = pr.b and x.sender = pr.a))
      and not exists (select 1 from public.connections x
                      where x.user_a = least(pr.a, pr.b) and x.user_b = greatest(pr.a, pr.b))
      and not exists (select 1 from public.introduction_selections x
                      where x.decision = 'explicit_pass'
                        and ((x.viewer_id = pr.a and x.subject_id = pr.b)
                          or (x.viewer_id = pr.b and x.subject_id = pr.a)))
  ), written as (
    insert into public.introductions (id, round_id, viewer_id, subject_id, reciprocal_id, agreements)
    select intro_a, round_a, a, b, case when v_one_way then null else intro_b end, public.agreement_summary(a, b) from checked
    union all
    select intro_b, round_b, b, a, intro_a, public.agreement_summary(b, a) from checked where not v_one_way
    on conflict (round_id, subject_id) do nothing
    returning 1
  ), spent as (
    update halal_mode_private.league_seats seat
    set used = seat.used + x.n
    from (
      select id, count(*)::int as n from (select a as id from checked union all select b from checked where not v_one_way) y group by id
    ) x
    where seat.user_id = x.id and seat.cycle_date = v_cycle
      and seat.wave = (p_job ->> 'wave')::int and seat.stratum = p_job ->> 'stratum'
      and seat.table_no = (p_job ->> 'tableNo')::int
    returning 1
  ), remembered as (
    insert into halal_mode_private.pair_exposure as pe (
      user_low, user_high, times_shown, seen_by_low, seen_by_high,
      first_reciprocal_score, last_reciprocal_score, last_shown_at, last_round_id
    )
    select least(a, b), greatest(a, b), 1,
           case when not v_one_way or a < b then 1 else 0 end,
           case when not v_one_way or a > b then 1 else 0 end,
           score, score, available_at,
           case when a < b then round_a else round_b end
    from checked
    on conflict (user_low, user_high) do update set
      times_shown = pe.times_shown + 1,
      seen_by_low = pe.seen_by_low + excluded.seen_by_low,
      seen_by_high = pe.seen_by_high + excluded.seen_by_high,
      last_reciprocal_score = excluded.last_reciprocal_score,
      last_shown_at = excluded.last_shown_at,
      last_round_id = excluded.last_round_id
    returning 1
  )
  select (select count(*) from written) / case when v_one_way then 1 else 2 end into v_count;

  update halal_mode_private.league_jobs
  set edges = edges + v_count
  where cycle_date = v_cycle and wave = (p_job ->> 'wave')::int
    and stratum = p_job ->> 'stratum' and table_no = (p_job ->> 'tableNo')::int
    and lease_token = (p_job ->> 'token')::uuid;
  return v_count;
end;
$function$;


create or replace function halal_mode_private.league_deliver_returns(p_cycle date, p_after uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public, halal_mode_private
set plan_cache_mode = force_custom_plan
as $function$
declare
  v_people uuid[];
  v_user uuid;
begin
  select array_agg(x.recipient order by x.recipient) into v_people
  from (
    select distinct w.recipient from halal_mode_private.league_returns w
    where p_after is null or w.recipient > p_after
    order by w.recipient limit 100
  ) x;
  if v_people is null then return null; end if;

  -- Exactly these, so a yes arriving now waits for the next day rather than slipping past the locks.
  create temporary table league_batch on commit drop as
  select w.recipient, w.sender from halal_mode_private.league_returns w where w.recipient = any(v_people);

  for v_user in
    select distinct id from (
      select recipient as id from league_batch
      union all
      select sender from league_batch
    ) members order by id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  end loop;

  -- A card still theirs to answer stays where it is, so what they pick on it still counts.
  create temporary table league_ready on commit drop as
  with waiting as materialized (
    select w.recipient, w.sender, w.introduction_id, w.delivered_id, w.created_at, r.id as round_id, r.opens_at, r.seats
    from halal_mode_private.league_returns w
    join league_batch batch on batch.recipient = w.recipient and batch.sender = w.sender
    join public.rounds r on r.user_id = w.recipient and r.cycle_date = p_cycle
    where r.submitted_at is null and r.opens_at > now()
      and not exists (select 1 from public.introductions d
                      join public.rounds dr on dr.id = d.round_id
                      where d.id = w.delivered_id and dr.submitted_at is null and dr.expires_at >= now())
  ), people as materialized (
    select f as facts, f.id, p.is_paused, halal_mode_private.matching_member_eligible(f.id) as consented
    from halal_mode_private.member_matching_facts f
    join public.profiles p on p.id = f.id
    where f.id in (select recipient from waiting union select sender from waiting)
  )
  select w.*, gen_random_uuid() as card,
    coalesce(
      not a.is_paused and not b.is_paused and a.consented and b.consented
      and halal_mode_private.matching_pair_accepts(a.facts, b.facts),
      false) as stands
  from waiting w
  left join people a on a.id = w.recipient
  left join people b on b.id = w.sender;

  delete from halal_mode_private.league_returns ret
  using league_ready ready
  where ret.recipient = ready.recipient and ret.sender = ready.sender and not ready.stands;
  delete from league_ready where not stands;
  -- Only those who still stand compete for a place.
  delete from league_ready ready
  using (
    select recipient, sender, row_number() over (partition by recipient order by created_at, sender) as place
    from league_ready
  ) ranked
  where ranked.recipient = ready.recipient and ranked.sender = ready.sender and ranked.place > ready.seats;

  -- A pair with a yes waiting is never dealt, and this runs before any table, so these are the first
  -- cards in these sets and nothing can be in the way.
  insert into public.introductions (id, round_id, viewer_id, subject_id, reciprocal_id, agreements)
  select card, round_id, recipient, sender, introduction_id, public.agreement_summary(recipient, sender)
  from league_ready;

  update public.introductions i set reciprocal_id = null
  from league_ready ready where i.id = ready.delivered_id;
  update public.introductions i set reciprocal_id = ready.card
  from league_ready ready where i.id = ready.introduction_id;
  update halal_mode_private.league_returns ret set delivered_id = ready.card
  from league_ready ready where ret.recipient = ready.recipient and ret.sender = ready.sender;

  insert into halal_mode_private.pair_exposure as pe (
    user_low, user_high, times_shown, seen_by_low, seen_by_high, last_shown_at
  )
  select least(recipient, sender), greatest(recipient, sender), 1,
         case when recipient < sender then 1 else 0 end,
         case when recipient > sender then 1 else 0 end,
         opens_at
  from league_ready
  on conflict (user_low, user_high) do update set
    times_shown = pe.times_shown + 1,
    seen_by_low = pe.seen_by_low + excluded.seen_by_low,
    seen_by_high = pe.seen_by_high + excluded.seen_by_high,
    last_shown_at = excluded.last_shown_at;

  drop table league_ready;
  drop table league_batch;
  return v_people[cardinality(v_people)];
end;
$function$;


-- A lost response can be retried after the other member advanced the connection.
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
    and (user_a = auth.uid() or user_b = auth.uid())
  for update;
  if v_connection is null then
    raise exception 'Connection is not accepting question choices' using errcode = '42501';
  end if;

  if exists (
    select 1 from question_picks
    where connection_id = p_connection_id and user_id = auth.uid()
  ) then
    if (select count(*) from question_picks
        where connection_id = p_connection_id and user_id = auth.uid()) = 2
       and not exists (
         (select unnest(v_ids))
         except
         (select question_id from question_picks
          where connection_id = p_connection_id and user_id = auth.uid())
       ) and (select count(distinct id) from unnest(v_ids) selected(id)) = 2
       and cardinality(v_ids) = 2
       and array_position(v_ids, null) is null then
      return;
    end if;
    raise exception 'Question choices were already submitted' using errcode = '22023';
  end if;

  if v_connection.stage <> 'choosing_questions' then
    raise exception 'Connection is not accepting question choices' using errcode = '42501';
  end if;

  select count(*)::int, count(distinct id)::int
  into v_count, v_distinct_count
  from unnest(v_ids) selected(id);
  if v_count <> 2 or v_distinct_count <> 2
     or exists (select 1 from unnest(v_ids) selected(id) where id is null) then
    raise exception 'Choose exactly two different questions' using errcode = '22023';
  end if;
  if (select count(*) from question_catalog
      where active and id = any(v_ids)) <> 2 then
    raise exception 'One or more questions are unavailable' using errcode = '22023';
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


-- Retrying the same sealed answer does not change it or the release rule.
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


-- Serialize first consents so the second always observes the first.
create or replace function public.share_contact_details(p_connection_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_member uuid := auth.uid();
  v_other uuid;
  v_both boolean;
begin
  if v_member is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;

  perform halal_mode_private.require_current_legal_consents(v_member);

  select case when user_a = v_member then user_b else user_a end
  into v_other
  from public.connections
  where id = p_connection_id
    and closed_at is null
    and stage = 'open'
    and (user_a = v_member or user_b = v_member)
  for update;

  if v_other is null then
    raise exception 'Connection not found' using errcode = 'P0002';
  end if;

  insert into halal_mode_private.contact_share_consents (connection_id, user_id)
  values (p_connection_id, v_member)
  on conflict (connection_id, user_id) do nothing;

  select exists (
    select 1 from halal_mode_private.contact_share_consents
    where connection_id = p_connection_id and user_id = v_other
  ) into v_both;

  if v_both then
    update public.connections
    set contact_shared_at = coalesce(contact_shared_at, now()),
        contact_shared_source = coalesce(contact_shared_source, 'explicit')
    where id = p_connection_id;
  end if;

  -- The other member is never told that a request is pending. Learning someone
  -- asked and being able to decline silently are different things, and only the
  -- second is safe.
  return jsonb_build_object('mutual', coalesce(v_both, false));
end;
$$;


-- Mutual first-choice evidence changes for the submitting member as well.
create or replace function public.submit_round_selections_ranked_with_signals(
  p_round_id uuid,
  p_ordered_introduction_ids uuid[],
  p_engagement jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_ids uuid[] := coalesce(p_ordered_introduction_ids, '{}'::uuid[]);
  v_result jsonb;
  v_subjects uuid[];
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if exists (select 1 from halal_mode_private.owed_connection(auth.uid())) then
    raise exception 'Answer the questions you owe before continuing' using errcode = '22023';
  end if;

  v_result := public.submit_round_selections(p_round_id, v_ids);
  perform halal_mode_private.record_selection_ranks(auth.uid(), p_round_id, array(
    select chosen.id from unnest(v_ids) with ordinality as chosen(id, at)
    join public.introduction_selections s on s.introduction_id = chosen.id
    where s.decision = 'kept'
    order by chosen.at
  ));

  select coalesce(array_agg(distinct i.subject_id order by i.subject_id), '{}'::uuid[])
  into v_subjects
  from public.introductions i
  where i.round_id = p_round_id and i.viewer_id = auth.uid();

  if exists (
    select 1 from halal_mode_private.matching_signal_metric_config
    where enabled and metric_key in ('profile_attention', 'bio_attention', 'photo_attention')
  ) then
    perform halal_mode_private.record_matching_engagement(p_round_id, p_engagement);
  end if;
  if cardinality(v_subjects) > 0 then
    perform halal_mode_private.recompute_matching_signal_estimates(array(
      select distinct member_id from unnest(v_subjects || array[auth.uid()]) member_id order by member_id
    ));
  end if;
  return v_result;
end;
$function$;

-- Read the tray and tier under the same locks as the live pair check.
create or replace function public.like_back(p_liker_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_me uuid := auth.uid();
  v_cap_me integer;
  v_cap_them integer;
  v_count_me integer;
  v_count_them integer;
  v_intro uuid;
begin
  if v_me is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  perform halal_mode_private.require_current_legal_consents(v_me);
  perform pg_advisory_xact_lock(hashtextextended(least(v_me, p_liker_id)::text, 1919));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_me, p_liker_id)::text, 1919));
  if not exists (select 1 from public.profiles where id = v_me and tier = 'premium') then
    raise exception 'Liking back needs Halal Mode Premium' using errcode = '42501', hint = 'premium_required';
  end if;
  if not exists (select 1 from halal_mode_private.liked_you_current(v_me) l where l.liker_id = p_liker_id) then
    raise exception 'That like is no longer available' using errcode = 'P0002';
  end if;

  if not halal_mode_private.league_pair_stands(v_me, p_liker_id)
     or halal_mode_private.league_pair_passed(v_me, p_liker_id) then
    raise exception 'That like is no longer available' using errcode = 'P0002';
  end if;
  if exists (select 1 from halal_mode_private.owed_connections(v_me)) then
    raise exception 'Answer the questions you owe before continuing' using errcode = '22023';
  end if;

  -- My own interest, recorded like any other, on the card I was shown.
  select i.id into v_intro
  from public.introductions i
  where i.viewer_id = v_me and i.subject_id = p_liker_id
  order by i.created_at desc limit 1;
  if v_intro is not null then
    insert into public.introduction_selections (introduction_id, viewer_id, subject_id, decision)
    values (v_intro, v_me, p_liker_id, 'kept')
    on conflict (introduction_id) do update set decision = 'kept', decided_at = now();
  end if;

  select l.open_connections into v_cap_me from public.profiles p cross join lateral public.tier_limits(p.tier) l where p.id = v_me;
  select l.open_connections into v_cap_them from public.profiles p cross join lateral public.tier_limits(p.tier) l where p.id = p_liker_id;
  select count(*)::int into v_count_me from public.connections where closed_at is null and (user_a = v_me or user_b = v_me);
  select count(*)::int into v_count_them from public.connections where closed_at is null and (user_a = p_liker_id or user_b = p_liker_id);

  if v_count_me < v_cap_me and v_count_them < v_cap_them then
    insert into public.connections (user_a, user_b)
    values (least(v_me, p_liker_id), greatest(v_me, p_liker_id))
    on conflict (user_a, user_b) do nothing;
    return jsonb_build_object('status', 'matched');
  end if;
  insert into public.mutual_connection_queue (user_a, user_b)
  values (least(v_me, p_liker_id), greatest(v_me, p_liker_id))
  on conflict (user_a, user_b) do nothing;
  return jsonb_build_object('status', 'waiting');
end;
$function$;

-- Paused or full pairs wait without crowding out members who can promote now.
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
    where not exists (
      select 1 from profiles p
      where p.id in (q.user_a, q.user_b) and p.is_paused
    )
      and not exists (
        select 1 from halal_mode_private.account_deletion_requests d
        where d.user_id in (q.user_a, q.user_b) and d.processed_at is null
      )
      and not exists (
        select 1 from profiles p cross join lateral tier_limits(p.tier) l
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

-- Hidden sample members must not spend a seat that will be filtered at display.
create or replace function public.request_demo_round()
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_me uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_limit int;
  v_round uuid;
  v_expires timestamptz := now() + interval '24 hours';
  v_demo record;
  v_demo_round uuid;
  v_intro uuid;
  v_twin uuid;
  v_created int := 0;
begin
  if v_me is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if not halal_mode_private.release_flag_enabled_for('demo_introductions', v_me)
     or halal_mode_private.is_demo_member(v_me) then
    return jsonb_build_object('created', false, 'reason', 'off');
  end if;
  if not halal_mode_private.member_has_current_legal_consents(v_me)
     or not public.profile_is_ready_for_matching(v_me) then
    return jsonb_build_object('created', false, 'reason', 'not_ready');
  end if;

  -- One request at a time per member, so a double tap cannot make two sets.
  perform pg_advisory_xact_lock(hashtextextended(v_me::text, 4471));

  -- A sample set that expired unchosen is closed, so it does not hold the one
  -- open-round slot every member has. A real round is never touched.
  update public.rounds r set submitted_at = r.expires_at
  where r.user_id = v_me and r.submitted_at is null and r.expires_at <= now()
    and exists (select 1 from halal_mode_private.demo_rounds d where d.round_id = r.id);

  if exists (select 1 from public.rounds where user_id = v_me and submitted_at is null) then
    return jsonb_build_object('created', false, 'reason', 'has_round');
  end if;
  -- One set a day, like the real thing, so "come back tomorrow" can be tested too.
  if exists (
    select 1 from public.rounds r
    join halal_mode_private.demo_rounds d on d.round_id = r.id
    where r.user_id = v_me and r.created_at > now() - interval '20 hours'
  ) then
    return jsonb_build_object('created', false, 'reason', 'too_soon');
  end if;

  select * into v_profile from public.profiles where id = v_me;
  select introductions into v_limit from public.tier_limits(v_profile.tier);

  insert into public.rounds (user_id, tier, opens_at, expires_at)
  values (v_me, v_profile.tier, now(), v_expires)
  returning id into v_round;
  insert into halal_mode_private.demo_rounds (round_id) values (v_round);

  for v_demo in
    select d.user_id, p.tier
    from halal_mode_private.demo_members d
    join public.profiles p on p.id = d.user_id
    where p.gender is distinct from v_profile.gender
      and not halal_mode_private.pair_is_hidden(v_me, d.user_id)
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = v_me and b.blocked_id = d.user_id)
           or (b.blocker_id = d.user_id and b.blocked_id = v_me)
      )
      and not exists (
        select 1 from public.connections c
        where c.user_a = least(v_me, d.user_id) and c.user_b = greatest(v_me, d.user_id)
      )
    order by
      -- New faces first, then whoever has the most room for another match.
      (select count(*) from public.introductions i where i.viewer_id = v_me and i.subject_id = d.user_id),
      (select count(*) from public.connections c
        where c.closed_at is null and (c.user_a = d.user_id or c.user_b = d.user_id)),
      random()
    limit v_limit
  loop
    insert into public.rounds (user_id, tier, opens_at, expires_at, submitted_at)
    values (v_demo.user_id, v_demo.tier, now(), v_expires, now())
    returning id into v_demo_round;
    insert into halal_mode_private.demo_rounds (round_id) values (v_demo_round);

    insert into public.introductions (round_id, viewer_id, subject_id, agreements)
    values (v_round, v_me, v_demo.user_id, public.agreement_summary(v_me, v_demo.user_id))
    returning id into v_intro;
    insert into public.introductions (round_id, viewer_id, subject_id, agreements)
    values (v_demo_round, v_demo.user_id, v_me, public.agreement_summary(v_demo.user_id, v_me))
    returning id into v_twin;
    update public.introductions set reciprocal_id = v_twin where id = v_intro;
    update public.introductions set reciprocal_id = v_intro where id = v_twin;

    -- Most sample members choose the tester back, so the match can be seen;
    -- some do not, so not every choice matches. Decided per pair, so the same
    -- sample member always answers the same tester the same way.
    insert into public.introduction_selections (introduction_id, viewer_id, subject_id, decision, decided_at)
    values (
      v_twin, v_demo.user_id, v_me,
      case when ((hashtextextended(v_me::text || v_demo.user_id::text, 7) % 10) + 10) % 10 < 7
        then 'kept' else 'released' end::selection_decision,
      now()
    );
    v_created := v_created + 1;
  end loop;

  if v_created = 0 then
    delete from public.rounds where id = v_round;
    return jsonb_build_object('created', false, 'reason', 'no_sample_members');
  end if;

  return jsonb_build_object('created', true, 'introductions', v_created);
end;
$$;
