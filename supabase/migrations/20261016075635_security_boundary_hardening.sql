-- Security boundary hardening from the 2026-10-16 Codex Security review.
-- These changes close server-side boundaries; client changes that pair with
-- them live beside the relevant screens and Edge Functions.

-- Reserve an operator action before calling the Auth Admin API. If that API
-- is unavailable, the claim is released and the signed link remains retryable;
-- if the worker dies after Auth succeeds, the short-lived claim lets a later
-- retry finish the database side without applying a second report action.
create table if not exists halal_mode_private.report_action_claims (
  report_id uuid primary key references public.reports(id) on delete cascade,
  action text not null check (action in ('dismiss', 'suspend', 'ban')),
  subject_id uuid not null references public.profiles(id) on delete cascade,
  claimed_at timestamptz not null default now()
);

revoke all on table halal_mode_private.report_action_claims
  from public, anon, authenticated;

create or replace function public.claim_report_action_service(
  p_report_id uuid,
  p_action text
)
returns uuid
language plpgsql
security definer
set search_path = public, halal_mode_private
as $$
declare
  v_subject uuid;
  v_claim_action text;
  v_claimed_at timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Report action requires service role' using errcode = '42501';
  end if;
  if p_action not in ('dismiss', 'suspend', 'ban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;

  select subject_id into v_subject
  from public.reports
  where id = p_report_id and resolved_at is null
  for update;
  if not found then
    if exists (select 1 from public.reports where id = p_report_id) then
      raise exception 'Report already resolved' using errcode = 'P0001';
    end if;
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  select action, claimed_at into v_claim_action, v_claimed_at
  from halal_mode_private.report_action_claims
  where report_id = p_report_id;
  if found then
    if v_claimed_at > now() - interval '10 minutes' and v_claim_action <> p_action then
      raise exception 'Another report action is already in progress' using errcode = 'P0001';
    end if;
    if v_claimed_at > now() - interval '10 minutes' then
      return v_subject;
    end if;
    delete from halal_mode_private.report_action_claims where report_id = p_report_id;
  end if;

  insert into halal_mode_private.report_action_claims (report_id, action, subject_id)
  values (p_report_id, p_action, v_subject);
  return v_subject;
end;
$$;

create or replace function public.release_report_action_service(
  p_report_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Report action requires service role' using errcode = '42501';
  end if;
  delete from halal_mode_private.report_action_claims
  where report_id = p_report_id and action = p_action;
end;
$$;

revoke all on function public.claim_report_action_service(uuid, text),
  public.release_report_action_service(uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_report_action_service(uuid, text),
  public.release_report_action_service(uuid, text)
  to service_role;

-- A report action is a one-shot operator command. Locking the row and
-- rejecting an already-resolved report prevents a replayed link from applying
-- a second moderation action.
create or replace function public.apply_report_action_service(p_report_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_subject uuid;
  v_reporter uuid;
begin
  if p_action not in ('dismiss', 'suspend', 'ban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;

  select subject_id, reporter_id
    into v_subject, v_reporter
    from public.reports
    where id = p_report_id
      and resolved_at is null
    for update;
  if not found then
    if exists (select 1 from public.reports where id = p_report_id) then
      raise exception 'Report already resolved' using errcode = 'P0001';
    end if;
    raise exception 'Report not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from halal_mode_private.report_action_claims c
    where c.report_id = p_report_id and c.action = p_action
  ) then
    raise exception 'Report action was not claimed' using errcode = '42501';
  end if;

  if p_action in ('suspend', 'ban') then
    update public.profiles set is_paused = true where id = v_subject;
  end if;
  update public.reports set resolved_at = now() where id = p_report_id;
  delete from halal_mode_private.report_action_claims where report_id = p_report_id;
  perform halal_mode_private.add_member_notice(
    v_reporter,
    case when p_action = 'dismiss' then 'report_reviewed' else 'report_actioned' end
  );
  return jsonb_build_object('subject_id', v_subject, 'action', p_action);
end;
$function$;

revoke all on function public.apply_report_action_service(uuid, text)
  from public, anon, authenticated;
grant execute on function public.apply_report_action_service(uuid, text)
  to service_role;

-- The Edge Function uses the service role to read answers. This function is
-- its consent gate, so a deployment mistake cannot turn that service client
-- into a path around the member-traffic consent boundary.
create or replace function public.can_generate_connection_summary_service(
  p_connection_id uuid,
  p_viewer_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_a uuid;
  v_b uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Connection summary access requires service role' using errcode = '42501';
  end if;
  if p_viewer_id is null then
    return false;
  end if;

  select c.user_a, c.user_b
    into v_a, v_b
    from public.connections c
    where c.id = p_connection_id
      and c.closed_at is null
      and c.stage in ('recap', 'open');
  if not found or p_viewer_id not in (v_a, v_b) then
    return false;
  end if;

  return halal_mode_private.member_has_current_legal_consents(v_a)
     and halal_mode_private.member_has_current_legal_consents(v_b);
end;
$function$;

revoke all on function public.can_generate_connection_summary_service(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.can_generate_connection_summary_service(uuid, uuid)
  to service_role;

-- Read the summary cache and the answer inputs under one database snapshot.
-- The Edge Function may call this again after claiming generation; there is no
-- separate consent check followed by later service-role answer reads.
create or replace function public.get_connection_summary_data_service(
  p_connection_id uuid,
  p_viewer_id uuid,
  p_language text
)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_a uuid;
  v_b uuid;
  v_cached_body text;
  v_cached_at timestamptz;
  v_picked jsonb;
  v_answers jsonb;
  v_people jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Connection summary access requires service role' using errcode = '42501';
  end if;
  if p_viewer_id is null or p_language is null then
    return jsonb_build_object('allowed', false);
  end if;

  select c.user_a, c.user_b into v_a, v_b
  from public.connections c
  where c.id = p_connection_id
    and c.closed_at is null
    and c.stage in ('recap', 'open');
  if not found or p_viewer_id not in (v_a, v_b) then
    return jsonb_build_object('allowed', false);
  end if;
  if not halal_mode_private.member_has_current_legal_consents(v_a)
     or not halal_mode_private.member_has_current_legal_consents(v_b) then
    return jsonb_build_object('allowed', false);
  end if;

  select s.body, s.created_at into v_cached_body, v_cached_at
  from public.connection_summaries s
  where s.connection_id = p_connection_id and s.language = p_language;
  select coalesce(jsonb_agg(jsonb_build_object('question_id', q.question_id) order by q.question_id), '[]'::jsonb)
    into v_picked
  from public.connection_questions q
  where q.connection_id = p_connection_id;
  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', a.user_id, 'question_id', a.question_id, 'body', a.body
         ) order by a.question_id, a.user_id), '[]'::jsonb)
    into v_answers
  from public.question_answers a
  where a.connection_id = p_connection_id;
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name) order by p.id), '[]'::jsonb)
    into v_people
  from public.profiles p
  where p.id in (v_a, v_b);

  return jsonb_build_object(
    'allowed', true,
    'cached', case when v_cached_body is null then null else jsonb_build_object(
      'body', v_cached_body, 'created_at', v_cached_at
    ) end,
    'picked', v_picked,
    'answers', v_answers,
    'people', v_people
  );
end;
$function$;

revoke all on function public.get_connection_summary_data_service(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.get_connection_summary_data_service(uuid, uuid, text)
  to service_role;

-- Profile media may be self-viewed before the consent screen, but another
-- member's media requires current consent from both sides of the relationship.
create or replace function halal_mode_private.can_read_profile_media(p_subject_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, halal_mode_private
as $$
declare
  v_viewer uuid := auth.uid();
  v_subject uuid;
begin
  if v_viewer is null then return false; end if;
  if p_subject_id = v_viewer::text then return true; end if;
  if p_subject_id is null
     or p_subject_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_subject := p_subject_id::uuid;

  if not halal_mode_private.member_has_current_legal_consents(v_viewer)
     or not halal_mode_private.member_has_current_legal_consents(v_subject) then
    return false;
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_viewer and b.blocked_id = v_subject)
       or (b.blocker_id = v_subject and b.blocked_id = v_viewer)
  ) then
    return false;
  end if;

  return exists (
    select 1
    from public.introductions i
    join public.rounds r on r.id = i.round_id
    where i.viewer_id = v_viewer
      and i.subject_id = v_subject
      and r.submitted_at is null
      and r.expires_at > now()
      and r.opens_at <= now()
  ) or exists (
    select 1 from public.connections c
    where c.closed_at is null
      and (
        (c.user_a = v_viewer and c.user_b = v_subject)
        or (c.user_b = v_viewer and c.user_a = v_subject)
      )
  );
end;
$$;

revoke all on function halal_mode_private.can_read_profile_media(text)
  from public, anon, authenticated;
grant execute on function halal_mode_private.can_read_profile_media(text)
  to authenticated;

-- Blocks and messages are consumed through consent-checked RPCs. Direct table
-- grants would otherwise make those wrappers optional.
revoke all on table public.blocks from public, anon, authenticated;
revoke all on table public.messages from public, anon, authenticated;

-- Realtime row payloads are also direct table reads. The chat screen now polls
-- the guarded message RPC instead, so the publication cannot leak raw rows.
do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
     and exists (
       select 1 from pg_catalog.pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'messages'
     ) then
    execute 'alter publication supabase_realtime drop table public.messages';
  end if;
end;
$$;

-- Keep notification registration bounded per member and serialize concurrent
-- registrations for the same account before counting existing devices.
create or replace function public.register_my_notification_device(
  p_token text,
  p_platform text,
  p_locale text default 'en'
)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $$
declare
  v_token_hash text;
  v_locale text := coalesce(nullif(btrim(p_locale), ''), 'en');
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_token is null or length(p_token) not between 20 and 400 then
    raise exception 'Notification token is invalid' using errcode = '22023';
  end if;
  if p_platform is null or p_platform not in ('ios', 'android') then
    raise exception 'Notification platform is invalid' using errcode = '22023';
  end if;
  if length(v_locale) > 16 or v_locale !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,12})*$' then
    raise exception 'Notification locale is invalid' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('notification-devices:' || auth.uid()::text, 1818)
  );
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('notification-token:' || p_platform || ':' || v_token_hash, 1818)
  );

  delete from halal_mode_private.notification_devices
  where platform = p_platform and token_hash = v_token_hash and user_id <> auth.uid();

  if (
    select count(*) from halal_mode_private.notification_devices
    where user_id = auth.uid() and notifications_enabled
  ) >= 5 and not exists (
    select 1 from halal_mode_private.notification_devices
    where user_id = auth.uid() and platform = p_platform
      and token_hash = v_token_hash and notifications_enabled
  ) then
    raise exception 'Maximum number of notification devices reached' using errcode = 'P0001';
  end if;

  insert into halal_mode_private.notification_devices
    (user_id, platform, token_hash, push_token, locale, notifications_enabled, last_seen_at)
  values (auth.uid(), p_platform, v_token_hash, p_token, v_locale, true, now())
  on conflict (user_id, platform, token_hash) do update
    set push_token = excluded.push_token,
        locale = excluded.locale,
        notifications_enabled = true,
        last_seen_at = now();
end;
$$;

revoke all on function public.register_my_notification_device(text, text, text)
  from public, anon;
grant execute on function public.register_my_notification_device(text, text, text)
  to authenticated;

create or replace function public.disable_my_notifications()
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('notification-devices:' || auth.uid()::text, 1818)
  );
  update halal_mode_private.notification_devices
  set notifications_enabled = false, push_token = null, last_seen_at = now()
  where user_id = auth.uid();
end;
$$;

revoke all on function public.disable_my_notifications() from public, anon;
grant execute on function public.disable_my_notifications() to authenticated;

-- The object count is a quota check in a Storage INSERT policy. A transaction
-- advisory lock makes two simultaneous uploads observe a serialized count.
create or replace function halal_mode_private.can_store_more_profile_media(p_bucket text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, storage, pg_catalog
as $$
declare
  v_user uuid := auth.uid();
  v_count bigint;
  v_limit bigint;
begin
  if v_user is null or p_bucket not in ('profile-photos', 'voice-introductions') then
    return false;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('profile-media:' || v_user::text || ':' || p_bucket, 1818)
  );
  v_limit := case when p_bucket = 'profile-photos' then 24 else 4 end;
  select count(*) into v_count
  from storage.objects o
  where o.bucket_id = p_bucket
    and (storage.foldername(o.name))[1] = v_user::text;
  return v_count < v_limit;
end;
$$;

revoke all on function halal_mode_private.can_store_more_profile_media(text)
  from public, anon;
grant execute on function halal_mode_private.can_store_more_profile_media(text)
  to authenticated;

-- The public waitlist remains anonymous, but it has a bounded intake window and
-- a strict locale shape. Existing email addresses stay first-write-wins.
create or replace function public.join_waitlist(
  p_email text,
  p_city text,
  p_age_range text,
  p_locale text default null
) returns void
language plpgsql
security definer
set search_path = public, halal_mode_private, pg_catalog
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_city text := trim(coalesce(p_city, ''));
  v_locale text := nullif(btrim(coalesce(p_locale, '')), '');
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or length(v_email) not between 6 and 254 then
    raise exception 'That email address does not look right' using errcode = '22023';
  end if;
  if length(v_city) not between 2 and 80 then
    raise exception 'Please tell us which city you are in' using errcode = '22023';
  end if;
  if p_age_range is null or p_age_range not in ('18-24', '25-29', '30-34', '35-39', '40-49', '50+') then
    raise exception 'Please choose an age range' using errcode = '22023';
  end if;
  if v_locale is not null
     and (length(v_locale) > 16 or v_locale !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,12})*$') then
    raise exception 'That locale is not supported' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('waitlist-intake', 1818)
  );
  if not exists (
    select 1 from halal_mode_private.waitlist where email = v_email
  ) and (
    (select count(*) from halal_mode_private.waitlist
     where created_at > now() - interval '1 hour') >= 500
    or (select count(*) from halal_mode_private.waitlist) >= 100000
  ) then
    raise exception 'Waitlist intake is temporarily full' using errcode = 'P0001';
  end if;

  insert into halal_mode_private.waitlist (email, city, age_range, locale)
  values (v_email, v_city, p_age_range, v_locale)
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.join_waitlist(text, text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text, text) to anon, authenticated;

-- No relationship metadata is returned until the caller is eligible for the
-- same current consent boundary used by the rest of member traffic.
create or replace function public.get_current_round_state()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, halal_mode_private
as $$
declare
  v_member_id uuid := auth.uid();
  v_all jsonb;
  v_state jsonb;
  v_next_fajr_at timestamptz;
begin
  if v_member_id is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if not halal_mode_private.member_has_current_legal_consents(v_member_id) then
    return jsonb_build_object('status', 'legal_consent_required', 'round', null);
  end if;

  select jsonb_agg(jsonb_build_object(
           'connectionId', o.connection_id,
           'name', o.other_first_name,
           'step', o.step))
    into v_all
    from halal_mode_private.owed_connections(v_member_id) o;
  if v_all is not null then
    return jsonb_build_object(
      'status', 'answers_owed',
      'round', null,
      'owed', v_all -> 0,
      'owedAll', v_all
    );
  end if;

  v_state := halal_mode_private.get_current_round_state_before_answer_gate();
  if v_state ->> 'status' = 'next_set_scheduled' and v_state ? 'nextOpensAt' then
    v_state := (v_state - 'nextOpensAt')
      || jsonb_build_object('nextFajrAt', v_state -> 'nextOpensAt');
  end if;
  if v_state ->> 'status' = 'set_complete' then
    select max(expires_at) into v_next_fajr_at
    from public.rounds
    where user_id = v_member_id
      and submitted_at is not null
      and expires_at > now();
    if v_next_fajr_at is not null then
      v_state := v_state || jsonb_build_object('nextFajrAt', v_next_fajr_at);
    end if;
  end if;
  return v_state;
end;
$$;

revoke all on function public.get_current_round_state() from public, anon;
grant execute on function public.get_current_round_state() to authenticated;

create or replace function public.get_halal_cards_attention()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private
as $$
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  return coalesce((
    select jsonb_object_agg(x.connection_id, x.waiting)
    from (
      select c.id as connection_id,
        (select count(*) from halal_mode_private.halal_cards_sessions s
          where s.connection_id = c.id
            and ((s.status = 'invited' and s.host_id <> auth.uid() and s.created_at > now() - interval '7 days')
              or (s.status = 'active' and (
                    s.awaiting = 'both'
                 or (s.awaiting = 'host' and s.host_id = auth.uid())
                 or (s.awaiting = 'guest' and s.host_id <> auth.uid())))))
        + (select count(*) from halal_mode_private.halal_cards_guide g
            where g.connection_id = c.id and g.removed_at is null
              and g.agreed_at is null and g.proposed_by <> auth.uid()) as waiting
      from public.connections c
      where auth.uid() in (c.user_a, c.user_b) and c.closed_at is null and c.stage = 'open'
    ) x
    where x.waiting > 0
  ), '{}'::jsonb);
end;
$$;

revoke all on function public.get_halal_cards_attention() from public, anon;
grant execute on function public.get_halal_cards_attention() to authenticated;
