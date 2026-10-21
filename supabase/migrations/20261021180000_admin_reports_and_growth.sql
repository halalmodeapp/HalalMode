-- Admin panel: read and act on member reports, and sign-up trends over any
-- range. Same rules as 20261021170000: admin list + two-factor to read;
-- owner + a code from the last 15 minutes + an audit row to change.

-- Reports, newest first. Admins need enough context to decide: what was
-- reported, about whom, by whom, and that person's history. No photos,
-- messages or contact details.
create or replace function public.admin_reports(p_status text default 'open', p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
begin
  perform halal_mode_private.require_admin(false);
  if p_status not in ('open', 'resolved', 'all') then
    raise exception 'Status must be open, resolved or all' using errcode = '22023';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'created_at', r.created_at,
      'resolved_at', r.resolved_at,
      'reason', r.reason,
      'detail', r.detail,
      'reporter', jsonb_build_object('first_name', rp.first_name, 'ref', left(r.reporter_id::text, 8)),
      'subject', jsonb_build_object(
        'first_name', sp.first_name,
        'ref', left(r.subject_id::text, 8),
        'city', sp.city,
        'country', sp.country,
        'paused', coalesce(sp.is_paused, false),
        'joined_at', sp.created_at,
        'reports_total', (select count(*) from public.reports x where x.subject_id = r.subject_id),
        'reports_open', (select count(*) from public.reports x where x.subject_id = r.subject_id and x.resolved_at is null)
      )
    ) order by r.created_at desc), '[]'::jsonb)
    from (
      select * from public.reports x
      where p_status = 'all'
         or (p_status = 'open' and x.resolved_at is null)
         or (p_status = 'resolved' and x.resolved_at is not null)
      order by x.created_at desc
      limit greatest(1, least(coalesce(p_limit, 50), 200))
    ) r
    left join public.profiles rp on rp.id = r.reporter_id
    left join public.profiles sp on sp.id = r.subject_id
  );
end;
$function$;
revoke all on function public.admin_reports(text, integer) from public, anon;
grant execute on function public.admin_reports(text, integer) to authenticated;

-- The report-action Edge Function calls this with the admin's own session
-- before it suspends, bans or dismisses. It is the authorization gate and
-- the audit record; the existing claim/apply functions then do the work.
create or replace function public.admin_authorize_report_action(p_report_id uuid, p_action text, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_reason text;
  v_subject uuid;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  if p_action not in ('dismiss', 'suspend', 'ban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  select subject_id into v_subject from public.reports where id = p_report_id and resolved_at is null;
  if v_subject is null then
    raise exception 'This report is already closed or does not exist' using errcode = 'P0001';
  end if;
  perform halal_mode_private.admin_audit('report.' || p_action, jsonb_build_object(
    'report', left(p_report_id::text, 8), 'member', left(v_subject::text, 8), 'reason', v_reason));
  return true;
end;
$function$;
revoke all on function public.admin_authorize_report_action(uuid, text, text) from public, anon;
grant execute on function public.admin_authorize_report_action(uuid, text, text) to authenticated;

-- Waitlist sign-ups and new app accounts per day, for 7 to 365 days.
create or replace function public.admin_signups(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_days integer := greatest(7, least(coalesce(p_days, 30), 365));
begin
  perform halal_mode_private.require_admin(false);
  return (
    with days as (
      select g::date as day
      from generate_series(date_trunc('day', now()) - make_interval(days => v_days - 1), date_trunc('day', now()), interval '1 day') g
    ), w as (
      select date_trunc('day', created_at)::date as day, count(*) as n
      from halal_mode_private.waitlist
      where created_at >= now() - make_interval(days => v_days)
      group by 1
    ), m as (
      select date_trunc('day', p.created_at)::date as day, count(*) as n
      from public.profiles p
      where p.created_at >= now() - make_interval(days => v_days)
        and not exists (select 1 from halal_mode_private.demo_members d where d.user_id = p.id)
      group by 1
    )
    select jsonb_build_object(
      'days', v_days,
      'before_waitlist', (select count(*) from halal_mode_private.waitlist where created_at < (select min(day) from days)),
      'before_members', (select count(*) from public.profiles where created_at < (select min(day) from days)),
      'rows', coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'waitlist', coalesce(w.n, 0), 'members', coalesce(m.n, 0)) order by d.day), '[]'::jsonb)
    )
    from days d left join w on w.day = d.day left join m on m.day = d.day
  );
end;
$function$;
revoke all on function public.admin_signups(integer) from public, anon;
grant execute on function public.admin_signups(integer) to authenticated;
