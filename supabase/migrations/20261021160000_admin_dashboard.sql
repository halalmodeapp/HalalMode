-- The operator dashboard at halalmo.de/admin.
--
-- The page is a static file; it is not the security boundary. Every read and
-- write below checks, on the server, that the caller:
--   1. is signed in (a normal Supabase session, never the service-role key),
--   2. is listed in halal_mode_private.admin_members, and
--   3. completed multi-factor sign-in in this session (JWT aal = 'aal2').
-- Writes also require the 'owner' role and are recorded in an append-only
-- audit log in the same transaction. The dashboard shows aggregates only:
-- no member names, emails, photos or individual reception scores.

create table if not exists halal_mode_private.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'viewer')),
  added_at timestamptz not null default now(),
  note text check (note is null or length(note) <= 200)
);
alter table halal_mode_private.admin_members enable row level security;
revoke all on halal_mode_private.admin_members from public, anon, authenticated, service_role;

create table if not exists halal_mode_private.admin_audit_log (
  id bigserial primary key,
  actor_id uuid not null,
  action text not null check (length(action) between 1 and 80),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx
  on halal_mode_private.admin_audit_log (created_at desc);
alter table halal_mode_private.admin_audit_log enable row level security;
revoke all on halal_mode_private.admin_audit_log from public, anon, authenticated, service_role;

-- History is evidence: nobody, including the dashboard's own functions, may
-- rewrite or remove an audit row.
create or replace function halal_mode_private.admin_audit_log_is_append_only()
returns trigger
language plpgsql
as $function$
begin
  raise exception 'The admin audit log is append-only' using errcode = '42501';
end;
$function$;
drop trigger if exists admin_audit_log_append_only on halal_mode_private.admin_audit_log;
create trigger admin_audit_log_append_only
before update or delete on halal_mode_private.admin_audit_log
for each row execute function halal_mode_private.admin_audit_log_is_append_only();

-- Returns the caller's role, or refuses. p_write requires the owner role.
create or replace function halal_mode_private.require_admin(p_write boolean default false)
returns text
language plpgsql
stable
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to use the admin dashboard' using errcode = '42501';
  end if;
  select a.role into v_role from halal_mode_private.admin_members a where a.user_id = auth.uid();
  if v_role is null then
    raise exception 'This account is not an administrator' using errcode = '42501';
  end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'Complete two-factor sign-in to continue' using errcode = '42501';
  end if;
  if p_write and v_role <> 'owner' then
    raise exception 'Only an owner can change settings' using errcode = '42501';
  end if;
  return v_role;
end;
$function$;
revoke all on function halal_mode_private.require_admin(boolean) from public, anon, authenticated, service_role;

-- Lets the page decide which screen to show. A non-admin learns only "no".
create or replace function public.admin_session()
returns jsonb
language plpgsql
stable
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_role text;
begin
  if auth.uid() is null then
    return jsonb_build_object('admin', false);
  end if;
  select a.role into v_role from halal_mode_private.admin_members a where a.user_id = auth.uid();
  if v_role is null then
    return jsonb_build_object('admin', false);
  end if;
  return jsonb_build_object(
    'admin', true,
    'role', v_role,
    'mfa', coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );
end;
$function$;
revoke all on function public.admin_session() from public, anon;
grant execute on function public.admin_session() to authenticated;

create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_role text := halal_mode_private.require_admin(false);
  v_latest_live uuid;
  v_result jsonb;
begin
  select r.id into v_latest_live
  from halal_mode_private.matching_runs r
  where r.mode = 'live' and r.finished_at is not null and r.error is null
  order by r.started_at desc limit 1;

  select jsonb_build_object(
    'generated_at', now(),
    'role', v_role,

    'waitlist', (
      select jsonb_build_object(
        'total', count(*),
        'last_24h', count(*) filter (where w.created_at > now() - interval '24 hours'),
        'last_7d', count(*) filter (where w.created_at > now() - interval '7 days'),
        'first_10000_left', greatest(0, 10000 - coalesce(max(w.joined_rank), 0)),
        'daily', (
          select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'count', d.n) order by d.day), '[]'::jsonb)
          from (
            select g.day::date as day,
              (select count(*) from halal_mode_private.waitlist x
               where x.created_at >= g.day and x.created_at < g.day + interval '1 day') as n
            from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') g(day)
          ) d
        ),
        'top_cities', (
          select coalesce(jsonb_agg(jsonb_build_object('city', c.city, 'count', c.n) order by c.n desc, c.city), '[]'::jsonb)
          from (
            select initcap(btrim(x.city)) as city, count(*) as n
            from halal_mode_private.waitlist x
            group by initcap(btrim(x.city))
            order by n desc, city
            limit 10
          ) c
        ),
        'age_ranges', (
          select coalesce(jsonb_object_agg(a.age_range, a.n), '{}'::jsonb)
          from (select x.age_range, count(*) as n from halal_mode_private.waitlist x group by x.age_range) a
        )
      )
      from halal_mode_private.waitlist w
    ),

    'referrals', jsonb_build_object(
      'waitlist_attributed', (
        select count(*) from halal_mode_private.waitlist w
        where w.referred_by_id is not null or w.referred_code is not null
      ),
      'waitlist_counted', (
        select count(*) from halal_mode_private.waitlist w where w.referral_counted_at is not null
      ),
      'counted_last_7d', (
        select count(*) from halal_mode_private.waitlist w
        where w.referral_counted_at > now() - interval '7 days'
      ),
      'app_claimed', (select count(*) from halal_mode_private.member_referrals),
      'app_counted', (select count(*) from halal_mode_private.member_referrals m where m.counted_at is not null)
    ),

    'members', (
      select jsonb_build_object(
        'total', count(*),
        'joined_7d', count(*) filter (where p.created_at > now() - interval '7 days'),
        'onboarded', count(*) filter (where p.onboarding_complete),
        'ready_for_matching', count(*) filter (where public.profile_is_ready_for_matching(p.id)),
        'women', count(*) filter (where p.gender::text = 'female'),
        'men', count(*) filter (where p.gender::text = 'male'),
        'premium', count(*) filter (where p.tier::text = 'premium'),
        'launch_reward_active', (
          select count(*) from halal_mode_private.member_entitlements e
          where e.provider = 'launch_reward' and e.state in ('active', 'grace')
        )
      )
      from public.profiles p
      where not exists (select 1 from halal_mode_private.demo_members d where d.user_id = p.id)
    ),

    'connections', (
      select jsonb_build_object(
        'total', count(*),
        'last_7d', count(*) filter (where c.created_at > now() - interval '7 days'),
        'open', count(*) filter (where c.closed_at is null)
      )
      from public.connections c
    ),

    'safety', jsonb_build_object(
      'open_reports', (select count(*) from public.reports r where r.resolved_at is null),
      'reports_7d', (select count(*) from public.reports r where r.created_at > now() - interval '7 days'),
      'moderation_pending', (
        select count(*) from halal_mode_private.moderation_queue q where q.decided_at is null and q.attempts < 4
      ),
      'moderation_stuck', (
        select count(*) from halal_mode_private.moderation_queue q where q.decided_at is null and q.attempts >= 4
      ),
      'moderation_review', (
        select count(*) from halal_mode_private.moderation_queue q
        where q.decision = 'review' and q.decided_at > now() - interval '7 days'
      ),
      'moderation_removed_7d', (
        select count(*) from halal_mode_private.moderation_queue q
        where q.decision = 'remove' and q.decided_at > now() - interval '7 days'
      )
    ),

    'mail', jsonb_build_object(
      'pending', (select count(*) from halal_mode_private.mail_outbox m where m.sent_at is null and m.attempts < 12),
      'failing', (select count(*) from halal_mode_private.mail_outbox m where m.sent_at is null and m.attempts >= 12),
      'sent_24h', (select count(*) from halal_mode_private.mail_outbox m where m.sent_at > now() - interval '24 hours'),
      'daily_limit', (select s.daily_limit from halal_mode_private.mail_settings s limit 1),
      'oldest_pending_at', (select min(m.created_at) from halal_mode_private.mail_outbox m where m.sent_at is null and m.attempts < 12)
    ),

    'matching', jsonb_build_object(
      'runs', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'started_at', r.started_at,
          'finished_at', r.finished_at,
          'mode', r.mode,
          'algorithm', r.algorithm_version,
          'eligible', r.eligible_members,
          'pairs', r.pairs_created,
          'rounds', r.rounds_created,
          'failed', r.error is not null,
          'breaches', jsonb_array_length(r.threshold_breaches)
        ) order by r.started_at desc), '[]'::jsonb)
        from (select * from halal_mode_private.matching_runs order by started_at desc limit 10) r
      ),
      -- How evenly the latest live round spread opportunity. Long waits are
      -- the fairness rotation's job; they should stay rare at every score.
      'fairness', (
        select jsonb_build_object(
          'members', count(*),
          'waiting_3_plus_rounds', count(*) filter (where s.rounds_since_last_served >= 3),
          'avg_exposures', round(coalesce(avg(s.exposures_in_window), 0), 2),
          'low_score_waiting_3_plus', count(*) filter (
            where s.rounds_since_last_served >= 3 and s.reception_score < 0.4 and s.reception_confidence >= 0.3
          ),
          'low_score_members', count(*) filter (where s.reception_score < 0.4 and s.reception_confidence >= 0.3)
        )
        from halal_mode_private.matching_run_member_snapshots s
        where s.run_id = v_latest_live
      )
    ),

    'signals', jsonb_build_object(
      'config_version', (select st.version from halal_mode_private.matching_signal_config_state st where st.singleton),
      'config_updated_at', (select st.updated_at from halal_mode_private.matching_signal_config_state st where st.singleton),
      'metrics', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'key', c.metric_key, 'enabled', c.enabled, 'weight', c.weight, 'updated_at', c.updated_at
        ) order by c.metric_key), '[]'::jsonb)
        from halal_mode_private.matching_signal_metric_config c
      ),
      -- Distribution only. Ten score bands, split by how much evidence backs
      -- each estimate. No member is identified.
      'distribution', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'band', b.band, 'low', b.low_conf, 'medium', b.mid_conf, 'high', b.high_conf
        ) order by b.band), '[]'::jsonb)
        from (
          select g.band,
            count(e.user_id) filter (where e.confidence < 0.3) as low_conf,
            count(e.user_id) filter (where e.confidence >= 0.3 and e.confidence < 0.7) as mid_conf,
            count(e.user_id) filter (where e.confidence >= 0.7) as high_conf
          from generate_series(0, 9) g(band)
          left join halal_mode_private.matching_signal_estimates e
            on least(9, floor(e.score * 10)::integer) = g.band
          group by g.band
        ) b
      ),
      'estimates', (select count(*) from halal_mode_private.matching_signal_estimates),
      'avg_confidence', (select round(coalesce(avg(e.confidence), 0), 3) from halal_mode_private.matching_signal_estimates e),
      'last_computed_at', (select max(e.computed_at) from halal_mode_private.matching_signal_estimates e),
      'observations_30d', (
        select count(*) from halal_mode_private.matching_engagement_observations o
        where o.created_at > now() - interval '30 days'
      )
    ),

    'luna', jsonb_build_object(
      'enabled', exists (
        select 1 from halal_mode_private.matching_signal_metric_config c
        where c.metric_key = 'luna_presentation' and c.enabled
      ),
      'queued', (select count(*) from halal_mode_private.matching_photo_analysis_queue q where q.attempts < 5),
      'failed', (select count(*) from halal_mode_private.matching_photo_analysis_queue q where q.attempts >= 5),
      'analyzed', (select count(*) from halal_mode_private.matching_photo_presentations),
      'analyzed_7d', (
        select count(*) from halal_mode_private.matching_photo_presentations p where p.analyzed_at > now() - interval '7 days'
      )
    ),

    'audit', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'at', l.created_at, 'action', l.action, 'detail', l.detail,
        'actor', coalesce(nullif(a.note, ''), 'admin ' || left(l.actor_id::text, 8))
      ) order by l.created_at desc), '[]'::jsonb)
      from (select * from halal_mode_private.admin_audit_log order by created_at desc limit 25) l
      left join halal_mode_private.admin_members a on a.user_id = l.actor_id
    )
  ) into v_result;

  return v_result;
end;
$function$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- Change one matching signal. The old and new values are kept in the audit
-- log, so any change can be undone by setting the previous values again.
create or replace function public.admin_set_matching_metric(
  p_metric_key text,
  p_enabled boolean,
  p_weight numeric,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_old halal_mode_private.matching_signal_metric_config%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  perform halal_mode_private.require_admin(true);
  if p_enabled is null or p_weight is null then
    raise exception 'Give both the switch and the weight' using errcode = '22023';
  end if;
  if p_weight < 0 or p_weight > 1 then
    raise exception 'Weight must be between 0 and 1' using errcode = '22023';
  end if;
  if p_metric_key = 'reception_similarity' and p_weight > 0.2 then
    raise exception 'Reception similarity is capped at 0.20 so it can never act as a score band'
      using errcode = '22023';
  end if;
  if length(v_reason) not between 3 and 300 then
    raise exception 'Say briefly why (3 to 300 characters)' using errcode = '22023';
  end if;

  select * into v_old from halal_mode_private.matching_signal_metric_config
  where metric_key = p_metric_key for update;
  if not found then
    raise exception 'Unknown matching metric' using errcode = '22023';
  end if;
  if v_old.enabled = p_enabled and v_old.weight = p_weight then
    return jsonb_build_object('changed', false);
  end if;

  update halal_mode_private.matching_signal_metric_config
  set enabled = p_enabled, weight = p_weight, updated_at = now()
  where metric_key = p_metric_key;

  insert into halal_mode_private.admin_audit_log (actor_id, action, detail)
  values (auth.uid(), 'matching_metric.set', jsonb_build_object(
    'metric', p_metric_key,
    'before', jsonb_build_object('enabled', v_old.enabled, 'weight', v_old.weight),
    'after', jsonb_build_object('enabled', p_enabled, 'weight', p_weight),
    'reason', v_reason
  ));

  return jsonb_build_object('changed', true,
    'config_version', (select version from halal_mode_private.matching_signal_config_state where singleton));
end;
$function$;
revoke all on function public.admin_set_matching_metric(text, boolean, numeric, text) from public, anon;
grant execute on function public.admin_set_matching_metric(text, boolean, numeric, text) to authenticated;

-- The bounded Luna backfill, shared by the service RPC and the dashboard so
-- the two can never drift apart.
create or replace function halal_mode_private.queue_matching_photo_analysis_backfill(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
declare
  v_queued integer := 0;
begin
  if not exists (
    select 1 from halal_mode_private.matching_signal_metric_config
    where metric_key = 'luna_presentation' and enabled
  ) then
    raise exception 'Enable Luna presentation analysis before queuing images' using errcode = '55000';
  end if;

  with candidates as (
    select p.id as owner_id, photo.photo_path,
      encode(extensions.digest(photo.photo_path, 'sha256'), 'hex') as photo_hash
    from public.profiles p
    cross join lateral unnest(coalesce(p.photos, '{}'::text[])) photo(photo_path)
    where photo.photo_path not like 'https://%'
      and halal_mode_private.member_has_current_legal_consents(p.id)
      and not exists (select 1 from halal_mode_private.demo_members d where d.user_id = p.id)
      and not exists (
        select 1 from halal_mode_private.matching_photo_presentations existing
        where existing.photo_hash = encode(extensions.digest(photo.photo_path, 'sha256'), 'hex')
      )
      and not exists (
        select 1 from halal_mode_private.matching_photo_analysis_queue queued
        where queued.photo_hash = encode(extensions.digest(photo.photo_path, 'sha256'), 'hex')
      )
    order by p.id, photo.photo_path
    limit greatest(1, least(coalesce(p_limit, 20), 50))
  ), inserted as (
    insert into halal_mode_private.matching_photo_analysis_queue
      (photo_hash, owner_id, storage_path)
    select photo_hash, owner_id, photo_path from candidates
    on conflict (photo_hash) do nothing
    returning 1
  )
  select count(*)::integer into v_queued from inserted;
  return v_queued;
end;
$function$;
revoke all on function halal_mode_private.queue_matching_photo_analysis_backfill(integer)
  from public, anon, authenticated, service_role;

create or replace function public.queue_matching_photo_analysis_backfill_service(
  p_limit integer default 20
) returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
begin
  if (auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'Photo backfill is an internal service' using errcode = '42501';
  end if;
  return halal_mode_private.queue_matching_photo_analysis_backfill(p_limit);
end;
$function$;
revoke all on function public.queue_matching_photo_analysis_backfill_service(integer)
  from public, anon, authenticated;
grant execute on function public.queue_matching_photo_analysis_backfill_service(integer)
  to service_role;

-- Each image costs API usage, so the page must send the exact confirmation
-- word and a batch of at most 50.
create or replace function public.admin_queue_luna_backfill(p_limit integer, p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_queued integer;
begin
  perform halal_mode_private.require_admin(true);
  if p_confirm is distinct from 'QUEUE' then
    raise exception 'Type QUEUE to confirm' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception 'Queue between 1 and 50 photos at a time' using errcode = '22023';
  end if;
  v_queued := halal_mode_private.queue_matching_photo_analysis_backfill(p_limit);
  insert into halal_mode_private.admin_audit_log (actor_id, action, detail)
  values (auth.uid(), 'luna.backfill', jsonb_build_object('requested', p_limit, 'queued', v_queued));
  return jsonb_build_object('queued', v_queued);
end;
$function$;
revoke all on function public.admin_queue_luna_backfill(integer, text) from public, anon;
grant execute on function public.admin_queue_luna_backfill(integer, text) to authenticated;
