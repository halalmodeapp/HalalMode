-- Admin panel: trust & safety (review queue, suspicious accounts, member
-- lookup and account actions), subscriptions, and system health. Same rules
-- as the other admin RPCs: admin list + two-factor to read; owner + a code
-- from the last 15 minutes + an activity-log row to change anything.

-- ---------------------------------------------------------------- review queue
alter table halal_mode_private.moderation_queue
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid;

-- Items the automatic check flagged for a person. Bio text is shown so it can
-- be judged; photos are named only (their files stay private).
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
      'still_on_profile', case when q.kind = 'bio' then p.bio = q.ref else q.ref = any(coalesce(p.photos, '{}')) end,
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
revoke all on function public.admin_review_queue(integer) from public, anon;
grant execute on function public.admin_review_queue(integer) to authenticated;

create or replace function public.admin_mark_reviewed(p_id bigint, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_reason text;
  v_user uuid;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  update halal_mode_private.moderation_queue
  set reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_id and decision = 'review' and reviewed_at is null
  returning user_id into v_user;
  if v_user is null then
    raise exception 'That item is not waiting for review' using errcode = 'P0001';
  end if;
  perform halal_mode_private.admin_audit('review.done', jsonb_build_object(
    'item', p_id, 'member', left(v_user::text, 8), 'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;
revoke all on function public.admin_mark_reviewed(bigint, text) from public, anon;
grant execute on function public.admin_mark_reviewed(bigint, text) to authenticated;

-- ---------------------------------------------------------------- suspicious accounts
-- Members with at least one warning sign, and which signs. These are signs
-- for a person to look at, never automatic decisions.
create or replace function public.admin_suspicious_members(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
begin
  perform halal_mode_private.require_admin(false);
  return (
    with signs as (
      select r.subject_id as user_id, 'reported_by_several' as sign
      from public.reports r group by r.subject_id having count(distinct r.reporter_id) >= 2
      union all
      select r.subject_id, 'reported_as_fake'
      from public.reports r where r.reason ~* '(fake|scam|spam|bot|catfish)' group by r.subject_id
      union all
      select q.user_id, 'content_removed'
      from halal_mode_private.moderation_queue q
      where q.decision = 'remove' and q.decided_at > now() - interval '30 days' group by q.user_id
      union all
      select q.user_id, 'contact_details_in_bio'
      from halal_mode_private.moderation_queue q
      where q.reason ilike 'Looks like contact details%' and q.decided_at > now() - interval '30 days' group by q.user_id
      union all
      -- Picking nearly everyone, many times, is how spam accounts behave.
      select s.viewer_id, 'picks_almost_everyone'
      from public.introduction_selections s
      where s.decided_at > now() - interval '7 days' and s.decision in ('kept', 'released')
      group by s.viewer_id
      having count(*) >= 20 and count(*) filter (where s.decision = 'kept') >= 0.9 * count(*)
    ), grouped as (
      select user_id, array_agg(distinct sign order by sign) as signs from signs group by user_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', g.user_id, 'ref', left(g.user_id::text, 8), 'first_name', p.first_name,
      'city', p.city, 'joined_at', p.created_at, 'paused', p.is_paused,
      'banned', coalesce(u.banned_until > now(), false),
      'reports', (select count(*) from public.reports x where x.subject_id = g.user_id),
      'signs', to_jsonb(g.signs)
    ) order by cardinality(g.signs) desc, p.created_at desc), '[]'::jsonb)
    from (select * from grouped limit greatest(1, least(coalesce(p_limit, 50), 200))) g
    join public.profiles p on p.id = g.user_id
    left join auth.users u on u.id = g.user_id
    where not exists (select 1 from halal_mode_private.demo_members d where d.user_id = g.user_id)
  );
end;
$function$;
revoke all on function public.admin_suspicious_members(integer) from public, anon;
grant execute on function public.admin_suspicious_members(integer) to authenticated;

-- ---------------------------------------------------------------- member lookup
-- Find one member by exact email, member reference (first 8 characters of
-- their id) or full id. No partial-name search, on purpose.
create or replace function public.admin_find_member(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_q text := lower(btrim(coalesce(p_query, '')));
begin
  perform halal_mode_private.require_admin(false);
  if length(v_q) < 8 then
    raise exception 'Type a full email address or a member reference (8 characters)' using errcode = '22023';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', u.id, 'ref', left(u.id::text, 8), 'email', u.email,
      'first_name', p.first_name, 'city', p.city, 'country', p.country, 'gender', p.gender,
      'joined_at', coalesce(p.created_at, u.created_at), 'last_sign_in', u.last_sign_in_at,
      'has_profile', p.id is not null,
      'ready', case when p.id is not null then public.profile_is_ready_for_matching(p.id) else false end,
      'paused', coalesce(p.is_paused, false),
      'banned_until', u.banned_until,
      'tier', p.tier,
      'verification', (select v.state from halal_mode_private.member_verifications v where v.user_id = u.id),
      'reports_about', (select count(*) from public.reports r where r.subject_id = u.id),
      'reports_open', (select count(*) from public.reports r where r.subject_id = u.id and r.resolved_at is null),
      'reports_made', (select count(*) from public.reports r where r.reporter_id = u.id),
      'matches', (select count(*) from public.connections c where u.id in (c.user_a, c.user_b))
    )), '[]'::jsonb)
    from (
      select * from auth.users x
      where lower(x.email) = v_q
         or (v_q ~ '^[0-9a-f]{8}$' and left(x.id::text, 8) = v_q)
         or (v_q ~ '^[0-9a-f-]{36}$' and x.id::text = v_q)
      limit 10
    ) u
    left join public.profiles p on p.id = u.id
  );
end;
$function$;
revoke all on function public.admin_find_member(text) from public, anon;
grant execute on function public.admin_find_member(text) to authenticated;

-- ---------------------------------------------------------------- account actions
-- Same two-step shape as report actions: the admin's own session authorizes,
-- the report-action worker changes sign-in access with the service key, and
-- this service function applies the rest and logs it in one transaction.
create or replace function public.admin_authorize_member_action(p_user_id uuid, p_action text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_reason text;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  if p_action not in ('suspend', 'ban', 'unban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'No such member' using errcode = 'P0002';
  end if;
  if p_user_id = auth.uid() or exists (select 1 from halal_mode_private.admin_members where user_id = p_user_id) then
    raise exception 'Admins cannot be suspended or banned here. Remove them from the team first.' using errcode = '22023';
  end if;
  return jsonb_build_object('actor', auth.uid(), 'reason', v_reason);
end;
$function$;
revoke all on function public.admin_authorize_member_action(uuid, text, text) from public, anon;
grant execute on function public.admin_authorize_member_action(uuid, text, text) to authenticated;

create or replace function public.apply_admin_member_action_service(
  p_user_id uuid, p_action text, p_actor uuid, p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Member action requires service role' using errcode = '42501';
  end if;
  if not exists (select 1 from halal_mode_private.admin_members where user_id = p_actor and role = 'owner') then
    raise exception 'Only an owner can act on accounts' using errcode = '42501';
  end if;
  if p_action not in ('suspend', 'ban', 'unban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  -- Hidden while suspended or banned; shown again when unbanned.
  update public.profiles set is_paused = (p_action <> 'unban') where id = p_user_id;
  insert into halal_mode_private.admin_audit_log (actor_id, action, detail)
  values (p_actor, 'member.' || p_action, jsonb_build_object(
    'member', left(p_user_id::text, 8), 'reason', halal_mode_private.admin_reason(p_reason)));
  return jsonb_build_object('action', p_action, 'member', left(p_user_id::text, 8));
end;
$function$;
revoke all on function public.apply_admin_member_action_service(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.apply_admin_member_action_service(uuid, text, uuid, text) to service_role;

-- ---------------------------------------------------------------- subscriptions
create or replace function public.admin_subscriptions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
begin
  perform halal_mode_private.require_admin(false);
  return (
    select jsonb_build_object(
      'active', count(*) filter (where e.state = 'active'),
      'payment_problem', count(*) filter (where e.state = 'grace'),
      'ended', count(*) filter (where e.state = 'expired'),
      'revoked', count(*) filter (where e.state = 'revoked'),
      'ending_7d', count(*) filter (where e.state in ('active', 'grace') and e.expires_at between now() and now() + interval '7 days'),
      'changed_30d', count(*) filter (where e.updated_at > now() - interval '30 days'),
      'by_source', (
        select coalesce(jsonb_object_agg(src, n), '{}'::jsonb)
        from (
          select coalesce(x.provider, 'unknown') as src, count(*) as n
          from halal_mode_private.member_entitlements x
          where x.state in ('active', 'grace') group by 1
        ) t
      )
    )
    from halal_mode_private.member_entitlements e
  );
end;
$function$;
revoke all on function public.admin_subscriptions() from public, anon;
grant execute on function public.admin_subscriptions() to authenticated;

-- ---------------------------------------------------------------- system health
-- Read from what Postgres itself records: the scheduler's run log, the
-- replies the workers sent back (pg_net), and the outboxes. Error text is
-- shortened and never includes member content.
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
        'failed_7d', count(*) filter (where r.error is not null),
        'last_error', (select left(x.error, 160) from halal_mode_private.matching_runs x where x.error is not null order by x.started_at desc limit 1)
      )
      from halal_mode_private.matching_runs r where r.started_at > now() - interval '7 days'
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
revoke all on function public.admin_system_health() from public, anon;
grant execute on function public.admin_system_health() to authenticated;
