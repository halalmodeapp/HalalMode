-- Keep account controls, earned matches and moderation outcomes consistent.

create or replace function public.profile_is_ready_for_matching(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    nullif(trim(p.first_name), '') is not null
    and nullif(trim(p.city), '') is not null
    and nullif(trim(p.country), '') is not null
    and length(trim(p.bio)) >= 50
    and cardinality(p.photos) >= 1,
    false
  )
  from profiles p where p.id = p_user_id;
$function$;

create or replace function public.get_my_profile_readiness()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'ready', profile_is_ready_for_matching(auth.uid()),
    'missing', to_jsonb(array_remove(array[
      case when nullif(trim(p.first_name), '') is null then 'name' end,
      case when nullif(trim(p.city), '') is null or nullif(trim(p.country), '') is null then 'location' end,
      case when length(trim(p.bio)) < 50 then 'bio' end,
      case when cardinality(p.photos) < 1 then 'photo' end
    ], null)),
    'recommended', to_jsonb(array_remove(array[
      case when cardinality(p.languages_spoken) < 1 then 'languages' end,
      case when nullif(trim(p.education), '') is null then 'education' end,
      case when p.has_children is null then 'has_children' end,
      case when p.family_goals_answered_at is null then 'children_when' end,
      case when p.gender = 'female' and p.religious_dress is null then 'dress' end,
      case when cardinality(p.ethnicities) < 1 then 'ethnicity' end,
      case when cardinality(p.heritage_countries) < 1 then 'heritage' end,
      case when pp.own_height_cm is null then 'height' end,
      case when nullif(trim(pp.own_build), '') is null then 'body_type' end,
      case when pp.matching_preferences_completed_at is null then 'preferences' end
    ], null))
  )
  from profiles p
  left join private_preferences pp on pp.user_id = p.id
  where p.id = auth.uid();
$function$;

-- Keep the promotion scan fixed while deletion closes the connections that free room.
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
revoke all on function halal_mode_private.waiting_connection_candidates(uuid[]) from public, anon, authenticated, service_role;

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
    if exists (
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

    select l.open_connections into v_cap_a
    from profiles p cross join lateral tier_limits(p.tier) l
    where p.id = v_pair.a;
    select l.open_connections into v_cap_b
    from profiles p cross join lateral tier_limits(p.tier) l
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

revoke all on function halal_mode_private.promote_waiting_connection_candidates(uuid[], jsonb) from public, anon, authenticated, service_role;

create or replace function halal_mode_private.promote_waiting_connections(p_member_ids uuid[])
returns integer
language sql
security definer
set search_path = public as $$
  select halal_mode_private.promote_waiting_connection_candidates(
    p_member_ids, halal_mode_private.waiting_connection_candidates(p_member_ids));
$$;

-- Lock all changed profiles and their queued pairs together, before any connection writes.
-- A row trigger would already hold one member lock before asking for lower UUIDs.
drop trigger matching_member_lock_profiles on public.profiles;
create trigger matching_member_lock_profiles before insert or delete on public.profiles
for each row execute function halal_mode_private.lock_matching_member_mutation('id');

create or replace function halal_mode_private.matching_profiles_changed()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_user uuid;
  v_promote uuid[];
  v_candidates jsonb;
begin
  select array_agg(n.id order by n.id) filter (where (o.is_paused and not n.is_paused)
           or (o.tier <> 'premium' and n.tier = 'premium'))
  into v_promote
  from new_profiles n join old_profiles o on o.id = n.id;
  if exists (select 1 from new_profiles n join old_profiles o on o.id = n.id
             join halal_mode_private.account_deletion_requests d on d.user_id = n.id
             where o.is_paused and not n.is_paused and d.processed_at is null) then
    raise exception 'An account pending deletion cannot be resumed' using errcode = '22023';
  end if;
  -- Any edit to a profile takes the same lock as a pick or a commit, so each sees it wholly before or after.
  for v_user in select id from new_profiles order by id loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  end loop;
  if v_promote is null then return null; end if;
  v_candidates := halal_mode_private.waiting_connection_candidates(v_promote);
  perform halal_mode_private.promote_waiting_connection_candidates(v_promote, v_candidates);
  return null;
end;
$$;
revoke all on function halal_mode_private.matching_profiles_changed() from public, anon, authenticated, service_role;
create trigger matching_profiles_changed after update on public.profiles
referencing old table as old_profiles new table as new_profiles
for each statement execute function halal_mode_private.matching_profiles_changed();

create or replace function set_my_profile_paused(p_paused boolean)
returns void
language plpgsql
security definer
set search_path = public as $$
begin
  if not p_paused and exists (
    select 1 from halal_mode_private.account_deletion_requests
    where user_id = auth.uid() and processed_at is null
  ) then
    raise exception 'An account pending deletion cannot be resumed' using errcode = '22023';
  end if;
  perform set_config('app.account_control_rpc', 'true', true);
  update profiles
  set is_paused = p_paused, updated_at = now()
  where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;
end;
$$;

create or replace function request_my_account_deletion()
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_members uuid[];
  v_candidates jsonb;
  v_user uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select array_agg(distinct id order by id) into v_members from (
    select auth.uid() as id
    union
    select case when c.user_a = auth.uid() then c.user_b else c.user_a end
    from connections c where c.closed_at is null and auth.uid() in (c.user_a, c.user_b)
  ) members;
  v_candidates := halal_mode_private.waiting_connection_candidates(v_members);
  for v_user in
    select id from unnest(v_members) id
    union
    select a from jsonb_to_recordset(v_candidates) pair(a uuid, b uuid)
    union
    select b from jsonb_to_recordset(v_candidates) pair(a uuid, b uuid)
    order by id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  end loop;
  -- A submit may have added a connection while these locks were being acquired.
  if exists (select 1 from connections c where c.closed_at is null and auth.uid() in (c.user_a, c.user_b)
             and not (c.user_a = any(v_members) and c.user_b = any(v_members))) then
    raise exception 'Connections changed; please retry deletion' using errcode = '40001';
  end if;
  -- Pausing a member is normally server-controlled. Account deletion is a
  -- reviewed account-control action, so it uses the same scoped bypass as the
  -- explicit pause RPC rather than weakening the profile guard.
  perform set_config('app.account_control_rpc', 'true', true);
  update profiles set is_paused = true, updated_at = now() where id = auth.uid();
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  update connections
  set closed_at = coalesce(closed_at, now()), stage = 'closed'
  where closed_at is null and (user_a = auth.uid() or user_b = auth.uid());
  insert into account_deletion_requests (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;
  perform halal_mode_private.promote_waiting_connection_candidates(v_members, v_candidates);
  insert into audit_events (actor_id, subject_id, event_type)
  values (auth.uid(), auth.uid(), 'account_deletion_requested');
end;
$$;

create or replace view halal_mode_private.league_pool as
select
  p.id,
  p.gender::text as gender,
  p.tier,
  lower(btrim(p.country)) as country_key,
  p.latitude,
  p.longitude,
  p.high_latitude_fajr_method
from public.profiles p
join public.private_preferences pp on pp.user_id = p.id
left join halal_mode_private.league_member_activity a on a.user_id = p.id
cross join halal_mode_private.league_config cfg
cross join lateral public.tier_limits(p.tier) l
where p.onboarding_complete
  and not p.is_paused
  and not exists (select 1 from halal_mode_private.account_deletion_requests d
                  where d.user_id = p.id and d.processed_at is null)
  and p.marital_status is not null
  and p.latitude is not null and p.longitude is not null
  and pp.matching_preferences_completed_at is not null
  and coalesce(a.last_seen_at, p.created_at) > now() - make_interval(days => cfg.dormant_after_days)
  and public.profile_is_ready_for_matching(p.id)
  and halal_mode_private.member_has_current_legal_consents(p.id)
  and (select count(*) from public.connections c
       where c.closed_at is null and (c.user_a = p.id or c.user_b = p.id)) < l.open_connections;

create or replace function halal_mode_private.expire_comp_premium()
returns integer
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
declare
  v_ended integer;
  v_users uuid[];
begin
  perform set_config('app.account_control_rpc', 'true', true);
  with ended as (
    delete from halal_mode_private.member_entitlements
    where provider = 'comp' and expires_at <= now()
    returning user_id
  )
  select array_agg(user_id) into v_users from ended;
  -- A separate statement sees the entitlement deletion.
  update public.profiles p set tier = 'free'
  where p.id = any(v_users)
    and not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = p.id);
  get diagnostics v_ended = row_count;
  return v_ended;
end;
$function$;

-- Repair only former comp recipients without any remaining entitlement.
create or replace function halal_mode_private.repair_orphaned_comp_premium()
returns integer
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog as $$
declare
  v_repaired integer;
begin
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles p set tier = 'free'
  where p.tier = 'premium'
    and exists (select 1 from halal_mode_private.premium_grants g where g.user_id = p.id)
    and not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = p.id)
    and not halal_mode_private.release_flag_enabled_for('tester_tools', p.id)
    and not exists (select 1 from halal_mode_private.release_flag_members m where m.user_id = p.id and m.key = 'tester_tools')
    and not exists (select 1 from auth.users u where u.id = p.id and lower(u.email) like '%@halalmodetest.com');
  get diagnostics v_repaired = row_count;
  return v_repaired;
end;
$$;
revoke all on function halal_mode_private.repair_orphaned_comp_premium() from public, anon, authenticated, service_role;
select halal_mode_private.repair_orphaned_comp_premium();

drop function public.admin_mark_reviewed(bigint, text);
create or replace function public.admin_mark_reviewed(p_id bigint, p_reason text, p_verdict text default null)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_reason text;
  v_user uuid;
  v halal_mode_private.moderation_queue%rowtype;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  select * into v from halal_mode_private.moderation_queue
  where id = p_id and decision = 'review' and reviewed_at is null
  for update;
  if v.id is null then
    raise exception 'That item is not waiting for review' using errcode = 'P0001';
  end if;
  if v.kind = 'selfie' then
    if p_verdict is null or p_verdict not in ('verified', 'rejected') then
      raise exception 'Choose verified or rejected for this selfie' using errcode = '22023';
    end if;
    -- Reuse settlement so retention, notices and photo rechecks stay identical. A selfie since
    -- replaced has nothing left to decide, so it is only marked reviewed.
    if exists (select 1 from halal_mode_private.member_selfies s where s.user_id = v.user_id and s.path = v.ref) then
      update halal_mode_private.moderation_queue set decided_at = null where id = p_id;
      perform public.settle_moderation_service(p_id, case p_verdict when 'verified' then 'allow' else 'remove' end, v_reason);
    end if;
  end if;
  update halal_mode_private.moderation_queue set reviewed_at = now(), reviewed_by = auth.uid() where id = p_id;
  v_user := v.user_id;
  perform halal_mode_private.admin_audit('review.done', jsonb_build_object(
    'item', p_id, 'verdict', p_verdict, 'member', left(v_user::text, 8), 'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;

revoke all on function public.admin_mark_reviewed(bigint, text, text) from public, anon;
grant execute on function public.admin_mark_reviewed(bigint, text, text) to authenticated;

create or replace function public.admin_review_queue(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
begin
  perform halal_mode_private.require_admin(false);
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'kind', q.kind, 'reason', q.reason, 'flagged_at', q.decided_at,
      'text', case when q.kind = 'bio' then left(q.ref, 600) end,
      'still_on_profile', case when q.kind = 'bio' then p.bio = q.ref when q.kind = 'selfie' then exists (select 1 from halal_mode_private.member_selfies s where s.user_id = q.user_id and s.path = q.ref) else q.ref = any(coalesce(p.photos, '{}')) end,
      'member', jsonb_build_object('user_id', q.user_id, 'first_name', p.first_name, 'ref', left(q.user_id::text, 8))
    ) order by q.decided_at desc), '[]'::jsonb)
    from (
      select * from halal_mode_private.moderation_queue x
      where x.decision = 'review' and x.reviewed_at is null
      order by x.decided_at desc
      limit greatest(1, least(coalesce(p_limit, 50), 200))
    ) q
    join public.profiles p on p.id = q.user_id
  );
end;
$function$;

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
  if not exists (select 1 from public.profiles where id = v_me and tier = 'premium') then
    raise exception 'Liking back needs Halal Mode Premium' using errcode = '42501', hint = 'premium_required';
  end if;
  if not exists (select 1 from halal_mode_private.liked_you_current(v_me) l where l.liker_id = p_liker_id) then
    raise exception 'That like is no longer available' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(least(v_me, p_liker_id)::text, 1919));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_me, p_liker_id)::text, 1919));
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

-- The latest seal already counts failed tables and keeps partial sets.
create or replace function halal_mode_private.league_seal(p_cycle date)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v record;
begin
  for v in
    select r.user_id, r.opens_at, count(i.id)::int as introductions
    from public.rounds r
    join public.introductions i on i.round_id = r.id
    where r.cycle_date = p_cycle and r.submitted_at is null
    group by r.id
  loop
    perform halal_mode_private.enqueue_notification(
      v.user_id, 'round_ready', jsonb_build_object('count', v.introductions),
      greatest(v.opens_at - now(), interval '0')
    );
  end loop;
  update halal_mode_private.league_cycles c
  set phase = 'sealed',
      sealed_at = now(),
      eligible = (select count(*) from public.rounds r where r.cycle_date = p_cycle),
      rounds_created = (select count(*) from public.rounds r where r.cycle_date = p_cycle
                        and exists (select 1 from public.introductions i where i.round_id = r.id)),
      pairs = (select coalesce(sum(j.edges), 0) from halal_mode_private.league_jobs j where j.cycle_date = p_cycle),
      failed_jobs = (select count(*) from halal_mode_private.league_jobs j where j.cycle_date = p_cycle and j.status = 'failed'),
      last_error = (select left(max(j.last_error), 160) from halal_mode_private.league_jobs j where j.cycle_date = p_cycle)
  where c.cycle_date = p_cycle;
  -- Who sat where is only useful until the day is done, and the record above is all that is kept.
  delete from halal_mode_private.league_jobs where cycle_date < p_cycle;
  delete from halal_mode_private.league_cycles where cycle_date < p_cycle - 180;
end;
$function$;

create or replace function public.admin_system_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_jobs jsonb := '[]'::jsonb;
  v_replies jsonb := '{}'::jsonb;
begin
  perform halal_mode_private.require_admin(false);

  if to_regclass('cron.job_run_details') is not null then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object(
        'job', j.jobname, 'schedule', j.schedule, 'active', j.active,
        'runs_24h', (select count(*) from cron.job_run_details d where d.jobid = j.jobid and d.start_time > now() - interval '24 hours'),
        'failed_24h', (select count(*) from cron.job_run_details d where d.jobid = j.jobid and d.start_time > now() - interval '24 hours' and d.status = 'failed'),
        'last_run', (select max(d.start_time) from cron.job_run_details d where d.jobid = j.jobid),
        'last_error', (select left(d.return_message, 160) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'failed' order by d.start_time desc limit 1)
      ) order by j.jobname), '[]'::jsonb)
      from cron.job j
    $q$ into v_jobs;
  end if;

  if to_regclass('net._http_response') is not null then
    execute $q$
      select jsonb_build_object(
        'total_24h', count(*),
        'ok_24h', count(*) filter (where r.status_code between 200 and 299),
        'failed_24h', count(*) filter (where r.status_code is null or r.status_code >= 400 or r.timed_out),
        'recent_failures', coalesce((
          select jsonb_agg(jsonb_build_object('at', f.created, 'status', f.status_code, 'timed_out', f.timed_out, 'message', left(coalesce(f.error_msg, f.content), 160)) order by f.created desc)
          from (
            select * from net._http_response x
            where x.created > now() - interval '24 hours' and (x.status_code is null or x.status_code >= 400 or x.timed_out)
            order by x.created desc limit 5
          ) f
        ), '[]'::jsonb)
      )
      from net._http_response r where r.created > now() - interval '24 hours'
    $q$ into v_replies;
  end if;

  return jsonb_build_object(
    'jobs', v_jobs,
    'workers', v_replies,
    'push', (
      select jsonb_build_object(
        'sent_24h', count(*) filter (where o.sent_at > now() - interval '24 hours'),
        'waiting', count(*) filter (where o.sent_at is null and o.attempts < 5),
        'failed', count(*) filter (where o.sent_at is null and o.attempts >= 5),
        'failed_24h', count(*) filter (where o.sent_at is null and o.attempts >= 5 and o.created_at > now() - interval '24 hours'),
        'last_error', (select left(x.last_error, 160) from halal_mode_private.notification_outbox x where x.last_error is not null order by x.created_at desc limit 1)
      )
      from halal_mode_private.notification_outbox o
    ),
    'email', (
      select jsonb_build_object(
        'sent_24h', count(*) filter (where m.sent_at > now() - interval '24 hours'),
        'waiting', count(*) filter (where m.sent_at is null and m.attempts < 12),
        'failed', count(*) filter (where m.sent_at is null and m.attempts >= 12),
        'last_error', (select left(x.last_error, 160) from halal_mode_private.mail_outbox x where x.last_error is not null order by x.created_at desc limit 1)
      )
      from halal_mode_private.mail_outbox m
    ),
    'matching', (
      select jsonb_build_object(
        'runs_7d', count(*),
        'failed_7d', count(*) filter (where coalesce(r.failed_jobs, 0) > 0),
        'failed_tables_7d', coalesce(sum(r.failed_jobs), 0),
        'last_error', (select x.last_error from halal_mode_private.league_cycles x where x.last_error is not null order by x.started_at desc limit 1),
        'recent_failed_tables', coalesce((
          select jsonb_agg(jsonb_build_object('cycle_date', f.cycle_date, 'failed_jobs', f.failed_jobs,
            'last_error', f.last_error) order by f.cycle_date desc)
          from (select * from halal_mode_private.league_cycles x
                where x.started_at > now() - interval '7 days' and x.failed_jobs > 0
                order by x.cycle_date desc limit 7) f
        ), '[]'::jsonb)
      )
      from halal_mode_private.league_cycles r where r.started_at > now() - interval '7 days'
    ),
    'moderation', (
      select jsonb_build_object(
        'waiting', count(*) filter (where q.decided_at is null and q.attempts < 4),
        'stuck', count(*) filter (where q.decided_at is null and q.attempts >= 4)
      )
      from halal_mode_private.moderation_queue q
    )
  );
end;
$function$;
