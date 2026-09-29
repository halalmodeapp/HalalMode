-- Sample people, so testers can use the app before there is anybody to meet.
--
-- With matching off and no real members, every tester finishes setup and then
-- sees "No suitable introductions today" for good. Nothing after that screen —
-- the cards, the gallery, choosing, the match, the questions, the chat — can be
-- tried at all. These are sample members that fill that gap, and only that gap.
--
-- Walled off from real matching three ways:
--
--   They are paused. Every round generator and the matcher's pool skip a paused
--   member, so no real process will ever introduce one to anybody. Nothing in
--   the matching code changes.
--
--   They are listed here, in demo_members, and every rule below acts only on a
--   connection or message involving somebody on that list.
--
--   Sample sets are handed out by request_demo_round, behind its own release
--   flag, and every round it creates is recorded in demo_rounds so all of it
--   can be told apart — and removed — later.
--
-- Everything else is the real path. A sample set is a real round with real
-- introductions and reciprocal twins, so choosing goes through
-- submit_round_selections and a mutual match creates a real connection. The
-- sample member then plays their part: they choose questions, answer them, and
-- reply to messages, so a tester is never left on "waiting for them".
--
-- Turn the flag off before launch. See DECISIONS.md.

create table if not exists halal_mode_private.demo_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists halal_mode_private.demo_rounds (
  round_id uuid primary key references public.rounds(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table halal_mode_private.demo_members enable row level security;
alter table halal_mode_private.demo_rounds enable row level security;
revoke all on table halal_mode_private.demo_members from public, anon, authenticated;
revoke all on table halal_mode_private.demo_rounds from public, anon, authenticated;

create or replace function halal_mode_private.is_demo_member(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select exists (select 1 from halal_mode_private.demo_members where user_id = p_user_id);
$$;

-- ---------------------------------------------------------------------------
-- Registration: service role only, and it pauses the member in the same step,
-- so there is no moment in which a sample member is listed but still matchable.
-- ---------------------------------------------------------------------------

create or replace function public.register_demo_member_service(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Not available' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Sample member has no profile yet' using errcode = 'P0002';
  end if;

  insert into halal_mode_private.demo_members (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  -- Premium for the connection allowance: many testers may match the same
  -- sample member, and a sample member at capacity would turn a tester's
  -- match into "waiting" for reasons that have nothing to do with the tester.
  update public.profiles set is_paused = true, tier = 'premium' where id = p_user_id;
end;
$$;

revoke all on function public.register_demo_member_service(uuid) from public, anon, authenticated;
grant execute on function public.register_demo_member_service(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- A sample set, on request.
-- ---------------------------------------------------------------------------

insert into halal_mode_private.release_flags (key, enabled, rollout_percentage)
values ('demo_introductions', true, 100)
on conflict (key) do update set enabled = true, rollout_percentage = 100, updated_at = now();

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

revoke all on function public.request_demo_round() from public, anon;
grant execute on function public.request_demo_round() to authenticated;

-- ---------------------------------------------------------------------------
-- Sample members play their part after a match.
-- ---------------------------------------------------------------------------

create or replace function halal_mode_private.demo_member_in_connection(p_connection_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select case
    when halal_mode_private.is_demo_member(c.user_a) then c.user_a
    when halal_mode_private.is_demo_member(c.user_b) then c.user_b
  end
  from public.connections c where c.id = p_connection_id;
$$;

-- Their five questions are chosen the moment the connection exists, so the
-- tester's five complete the pair and the conversation moves on.
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
  limit 5
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists demo_choose_questions on public.connections;
create trigger demo_choose_questions
  after insert on public.connections
  for each row execute function halal_mode_private.demo_choose_questions();

-- Written as a person would write them, two ways each, so two sample members
-- do not give a tester the same paragraph.
create or replace function halal_mode_private.demo_answer_text(p_question_id text, p_variant int)
returns text
language sql
immutable
as $$
  select case p_question_id || ':' || (p_variant % 2)::text
    when 'q1:0' then 'I would love us to pray together when we are both home, even if only one prayer a day to begin with. Habits stick better when they are shared rather than policed.'
    when 'q1:1' then 'Keeping the prayer mat somewhere visible and praying Maghrib together. Reminding each other gently is fine by me, as long as it never feels like keeping score.'
    when 'q2:0' then 'Honestly, a lot of ordinary evenings: cooking, working out how we like to spend weekends, and visiting both families without overdoing it.'
    when 'q2:1' then 'Learning each other''s routines. One night a week that is only ours, and Sundays kept for family.'
    when 'q3:0' then 'Whoever earns more should not mean whoever decides more. I would like one shared account for the household and a monthly check-in over tea.'
    when 'q3:1' then 'I think the provider role matters, and so does transparency. We look at it together every month so nothing becomes a surprise.'
    when 'q4:0' then 'I go quiet, then I want to talk it through. I would ask that we never go to sleep angry, even if the conversation has to wait until morning.'
    when 'q4:1' then 'Space first, ten minutes or so, then we come back to it. Raising voices is the one thing I really try never to do.'
    when 'q5:0' then 'Somewhere with a good masjid and a community, within an hour of at least one set of parents.'
    when 'q5:1' then 'I am open to moving, as long as we choose it together. Being near family matters, but so does the right place for us.'
    when 'q6:0' then 'Phones away at dinner, and one evening a week that no one else gets to claim.'
    when 'q6:1' then 'Protecting the weekend mornings. Work can have a lot, but not those.'
    when 'q7:0' then 'Very little. Happy occasions with close family, but no names, no location, nothing that invites comment.'
    when 'q7:1' then 'Private by default. If we share something we both agree to it first.'
    when 'q8:0' then 'We ask someone we both trust, and we give each other room where the scholars genuinely differ.'
    when 'q8:1' then 'I follow the opinions I grew up with, but I would rather learn together than insist.'
    when 'q9:0' then 'My parents never argued in front of us, which I value. What I would change is talking more openly about feelings.'
    when 'q9:1' then 'Their generosity with guests. I would not repeat how little they took time for themselves.'
    when 'q10:0' then 'Very honest. I think therapy is a strength, and I would want to know what you are carrying.'
    when 'q10:1' then 'I would share what matters early rather than late. Health is part of the amanah we give each other.'
    when 'q11:0' then 'A home that is paid for eventually, time for family, and enough to give sadaqah without thinking twice. I would never borrow on interest.'
    when 'q11:1' then 'Enough is when we stop comparing. No interest-based loans, and I would rather rent longer than compromise on that.'
    when 'q12:0' then 'We pray istikhara, speak to family, and choose the option that keeps us closest to each other and to Allah.'
    else 'We write the honest pros and cons, make istikhara, and decide together — not one of us deciding for both.'
  end;
$$;

create or replace function halal_mode_private.demo_answer_questions()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_demo uuid := halal_mode_private.demo_member_in_connection(new.connection_id);
begin
  if v_demo is null then return new; end if;
  insert into public.question_answers (connection_id, user_id, question_id, body)
  values (
    new.connection_id, v_demo, new.question_id,
    halal_mode_private.demo_answer_text(new.question_id, (((hashtextextended(v_demo::text, 5) % 2) + 2) % 2)::int)
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists demo_answer_questions on public.connection_questions;
create trigger demo_answer_questions
  after insert on public.connection_questions
  for each row execute function halal_mode_private.demo_answer_questions();

-- And they reply, so a conversation — and its notifications — can be tested.
create or replace function halal_mode_private.demo_reply_to_message()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_demo uuid;
  v_replies text[] := array[
    'Wa alaikum assalam! Thank you for your message, it is lovely to hear from you.',
    'That is a really thoughtful question. I think family and faith come first for me, and everything else builds on that.',
    'I enjoyed reading your answers, especially about how you handle disagreements.',
    'What does a good weekend look like for you?',
    'I agree completely. It matters to me that we can be honest with each other from the start.',
    'That made me smile. Tell me a little more about your work?',
    'JazakAllahu khayran for being so open. I feel the same way.',
    'This is a sample profile, so my replies are prepared in advance — but everything you send goes through the real app.'
  ];
  v_count int;
begin
  if halal_mode_private.is_demo_member(new.sender_id) then return new; end if;
  v_demo := halal_mode_private.demo_member_in_connection(new.connection_id);
  if v_demo is null or v_demo = new.sender_id then return new; end if;

  select count(*) into v_count from public.messages
  where connection_id = new.connection_id and sender_id = v_demo;

  insert into public.messages (connection_id, sender_id, body)
  values (new.connection_id, v_demo, v_replies[(v_count % array_length(v_replies, 1)) + 1]);
  return new;
end;
$$;

drop trigger if exists demo_reply_to_message on public.messages;
create trigger demo_reply_to_message
  after insert on public.messages
  for each row execute function halal_mode_private.demo_reply_to_message();
