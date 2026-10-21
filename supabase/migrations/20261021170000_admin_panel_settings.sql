-- The admin panel's settings, team and security controls.
--
-- Builds on 20261021160000_admin_dashboard.sql. Every change still needs an
-- owner on the admin list with two-factor sign-in, and now also:
--   * step-up: the authenticator code must have been entered in the last
--     15 minutes (the JWT's amr 'totp' timestamp), so a stolen or idle
--     session cannot change anything without the second factor again;
--   * a rate limit of 60 changes per admin per 10 minutes;
--   * an audit row in the same transaction, with the previous value.
-- Settings exposed here are the ones that already exist in the private
-- schema; nothing new is decided by this migration.

create or replace function halal_mode_private.admin_step_up_seconds_left()
returns integer
language sql
stable
set search_path = pg_catalog
as $function$
  select greatest(0, coalesce((
    select max((a ->> 'timestamp')::bigint)
    from jsonb_array_elements(
      case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end
    ) a
    where a ->> 'method' = 'totp' and (a ->> 'timestamp') ~ '^[0-9]{1,12}$'
  ) + 900 - extract(epoch from now())::bigint, 0))::integer;
$function$;
revoke all on function halal_mode_private.admin_step_up_seconds_left() from public, anon, authenticated, service_role;

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
  if p_write then
    if v_role <> 'owner' then
      raise exception 'Only an owner can change settings' using errcode = '42501';
    end if;
    if halal_mode_private.admin_step_up_seconds_left() <= 0 then
      raise exception 'Confirm your authenticator code to make changes' using errcode = '42501', hint = 'step_up';
    end if;
    if (select count(*) from halal_mode_private.admin_audit_log l
        where l.actor_id = auth.uid() and l.created_at > now() - interval '10 minutes'
          and l.action <> 'admin.sign_in') >= 60 then
      raise exception 'Too many changes in a short time. Wait a few minutes.' using errcode = '54000';
    end if;
  end if;
  return v_role;
end;
$function$;
revoke all on function halal_mode_private.require_admin(boolean) from public, anon, authenticated, service_role;

create or replace function halal_mode_private.admin_audit(p_action text, p_detail jsonb)
returns void
language sql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
  insert into halal_mode_private.admin_audit_log (actor_id, action, detail)
  values (auth.uid(), p_action, coalesce(p_detail, '{}'::jsonb));
$function$;
revoke all on function halal_mode_private.admin_audit(text, jsonb) from public, anon, authenticated, service_role;

create or replace function halal_mode_private.admin_reason(p_reason text)
returns text
language plpgsql
immutable
as $function$
declare
  v text := btrim(coalesce(p_reason, ''));
begin
  if length(v) not between 3 and 300 then
    raise exception 'Say briefly why (3 to 300 characters)' using errcode = '22023';
  end if;
  return v;
end;
$function$;
revoke all on function halal_mode_private.admin_reason(text) from public, anon, authenticated, service_role;

-- Session: who you are, your role, and how long changes stay unlocked.
create or replace function public.admin_session()
returns jsonb
language plpgsql
stable
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_role text;
  v_note text;
begin
  if auth.uid() is null then
    return jsonb_build_object('admin', false);
  end if;
  select a.role, a.note into v_role, v_note from halal_mode_private.admin_members a where a.user_id = auth.uid();
  if v_role is null then
    return jsonb_build_object('admin', false);
  end if;
  return jsonb_build_object(
    'admin', true,
    'role', v_role,
    'name', v_note,
    'mfa', coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2',
    'step_up_seconds', halal_mode_private.admin_step_up_seconds_left()
  );
end;
$function$;
revoke all on function public.admin_session() from public, anon;
grant execute on function public.admin_session() to authenticated;

-- Recorded once per sign-in by the page, so the Security page can show when
-- and how often each admin signed in. At most one row per five minutes.
create or replace function public.admin_record_sign_in()
returns void
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
begin
  perform halal_mode_private.require_admin(false);
  if not exists (
    select 1 from halal_mode_private.admin_audit_log l
    where l.actor_id = auth.uid() and l.action = 'admin.sign_in' and l.created_at > now() - interval '5 minutes'
  ) then
    perform halal_mode_private.admin_audit('admin.sign_in',
      jsonb_build_object('session', left(coalesce(auth.jwt() ->> 'session_id', ''), 8)));
  end if;
end;
$function$;
revoke all on function public.admin_record_sign_in() from public, anon;
grant execute on function public.admin_record_sign_in() to authenticated;

-- Everything the Settings, Feature flags and Team pages show.
create or replace function public.admin_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_role text := halal_mode_private.require_admin(false);
begin
  return jsonb_build_object(
    'role', v_role,
    'launch', (select jsonb_build_object('launched', l.launched, 'launched_at', l.launched_at)
               from halal_mode_private.launch_settings l where l.id),
    'referral_link_base', (select r.link_base from halal_mode_private.referral_settings r where r.id),
    'mail_daily_limit', (select m.daily_limit from halal_mode_private.mail_settings m where m.id),
    'flags', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', f.key, 'enabled', f.enabled, 'rollout', f.rollout_percentage, 'updated_at', f.updated_at,
        'members', (select count(*) from halal_mode_private.release_flag_members m where m.key = f.key)
      ) order by f.key), '[]'::jsonb)
      from halal_mode_private.release_flags f
    ),
    'team', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', a.user_id, 'email', u.email, 'role', a.role, 'note', a.note, 'added_at', a.added_at,
        'you', a.user_id = auth.uid(),
        'mfa_factors', (select count(*) from auth.mfa_factors f where f.user_id = a.user_id and f.status = 'verified'),
        'last_sign_in', (
          select max(l.created_at) from halal_mode_private.admin_audit_log l
          where l.actor_id = a.user_id and l.action = 'admin.sign_in'
        )
      ) order by a.role, a.added_at), '[]'::jsonb)
      from halal_mode_private.admin_members a
      join auth.users u on u.id = a.user_id
    ),
    'sign_ins', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'at', l.created_at, 'actor', coalesce(nullif(a.note, ''), 'admin ' || left(l.actor_id::text, 8))
      ) order by l.created_at desc), '[]'::jsonb)
      from (
        select * from halal_mode_private.admin_audit_log
        where action = 'admin.sign_in' order by created_at desc limit 20
      ) l
      left join halal_mode_private.admin_members a on a.user_id = l.actor_id
    )
  );
end;
$function$;
revoke all on function public.admin_settings() from public, anon;
grant execute on function public.admin_settings() to authenticated;

-- A page of the audit log, newest first, optionally one category.
create or replace function public.admin_audit_log(
  p_before timestamptz default null,
  p_category text default null,
  p_limit integer default 50
) returns jsonb
language plpgsql
stable
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
begin
  perform halal_mode_private.require_admin(false);
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id, 'at', l.created_at, 'action', l.action, 'detail', l.detail,
      'actor', coalesce(nullif(a.note, ''), 'admin ' || left(l.actor_id::text, 8))
    ) order by l.created_at desc, l.id desc), '[]'::jsonb)
    from (
      select * from halal_mode_private.admin_audit_log x
      where (p_before is null or x.created_at < p_before)
        and (p_category is null or split_part(x.action, '.', 1) = p_category)
      order by x.created_at desc, x.id desc
      limit greatest(1, least(coalesce(p_limit, 50), 200))
    ) l
    left join halal_mode_private.admin_members a on a.user_id = l.actor_id
  );
end;
$function$;
revoke all on function public.admin_audit_log(timestamptz, text, integer) from public, anon;
grant execute on function public.admin_audit_log(timestamptz, text, integer) to authenticated;

-- Feature flags. The confirmation must repeat the flag's key exactly.
create or replace function public.admin_set_release_flag(
  p_key text, p_enabled boolean, p_rollout integer, p_confirm text, p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_old halal_mode_private.release_flags%rowtype;
  v_reason text;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  if p_enabled is null or p_rollout is null or p_rollout not between 0 and 100 then
    raise exception 'Give the switch and a rollout from 0 to 100' using errcode = '22023';
  end if;
  if p_confirm is distinct from p_key then
    raise exception 'Type the flag name to confirm' using errcode = '22023';
  end if;
  select * into v_old from halal_mode_private.release_flags where key = p_key for update;
  if not found then
    raise exception 'Unknown flag' using errcode = '22023';
  end if;
  if v_old.enabled = p_enabled and v_old.rollout_percentage = p_rollout then
    return jsonb_build_object('changed', false);
  end if;
  update halal_mode_private.release_flags
  set enabled = p_enabled, rollout_percentage = p_rollout, updated_at = now()
  where key = p_key;
  perform halal_mode_private.admin_audit('flag.set', jsonb_build_object(
    'flag', p_key,
    'before', jsonb_build_object('enabled', v_old.enabled, 'rollout', v_old.rollout_percentage),
    'after', jsonb_build_object('enabled', p_enabled, 'rollout', p_rollout),
    'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;
revoke all on function public.admin_set_release_flag(text, boolean, integer, text, text) from public, anon;
grant execute on function public.admin_set_release_flag(text, boolean, integer, text, text) to authenticated;

-- The launch switch changes launch-day copy everywhere at once.
create or replace function public.admin_set_launched(p_launched boolean, p_confirm text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_before boolean;
  v_reason text;
  v_result jsonb;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  if p_launched is null or p_confirm is distinct from (case when p_launched then 'LAUNCH' else 'UNLAUNCH' end) then
    raise exception 'Type LAUNCH (or UNLAUNCH) to confirm' using errcode = '22023';
  end if;
  select launched into v_before from halal_mode_private.launch_settings where id for update;
  if v_before = p_launched then
    return jsonb_build_object('changed', false);
  end if;
  v_result := halal_mode_private.set_launched(p_launched);
  perform halal_mode_private.admin_audit('launch.set', jsonb_build_object(
    'before', v_before, 'after', p_launched, 'reason', v_reason));
  return v_result || jsonb_build_object('changed', true);
end;
$function$;
revoke all on function public.admin_set_launched(boolean, text, text) from public, anon;
grant execute on function public.admin_set_launched(boolean, text, text) to authenticated;

-- Referral links may only point at halalmo.de, so a compromised admin
-- session cannot redirect every shared invite to another site.
create or replace function public.admin_set_referral_link_base(p_link_base text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_before text;
  v_reason text;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  if p_link_base is null or p_link_base !~ '^https://halalmo\.de/[A-Za-z0-9/_-]*\?([A-Za-z0-9_=&-]*&)?ref=$' then
    raise exception 'Use a halalmo.de address ending in ?ref= (for example https://halalmo.de/?ref=)' using errcode = '22023';
  end if;
  select link_base into v_before from halal_mode_private.referral_settings where id for update;
  if v_before = p_link_base then
    return jsonb_build_object('changed', false);
  end if;
  update halal_mode_private.referral_settings set link_base = p_link_base where id;
  perform halal_mode_private.admin_audit('referral.link_base', jsonb_build_object(
    'before', v_before, 'after', p_link_base, 'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;
revoke all on function public.admin_set_referral_link_base(text, text) from public, anon;
grant execute on function public.admin_set_referral_link_base(text, text) to authenticated;

-- Null means "use the provider's own quota" (SES).
create or replace function public.admin_set_mail_daily_limit(p_daily_limit integer, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_before integer;
  v_reason text;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  if p_daily_limit is not null and p_daily_limit not between 11 and 1000000 then
    raise exception 'Daily limit must be empty (provider quota) or between 11 and 1,000,000' using errcode = '22023';
  end if;
  select daily_limit into v_before from halal_mode_private.mail_settings where id for update;
  if v_before is not distinct from p_daily_limit then
    return jsonb_build_object('changed', false);
  end if;
  update halal_mode_private.mail_settings set daily_limit = p_daily_limit where id;
  perform halal_mode_private.admin_audit('mail.daily_limit', jsonb_build_object(
    'before', v_before, 'after', p_daily_limit, 'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;
revoke all on function public.admin_set_mail_daily_limit(integer, text) from public, anon;
grant execute on function public.admin_set_mail_daily_limit(integer, text) to authenticated;

-- Team. Admins are existing accounts, found by their sign-in email. There
-- must always be at least one owner.
create or replace function halal_mode_private.admin_require_an_owner_remains()
returns void
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
begin
  if not exists (select 1 from halal_mode_private.admin_members where role = 'owner') then
    raise exception 'There must always be at least one owner' using errcode = '22023';
  end if;
end;
$function$;
revoke all on function halal_mode_private.admin_require_an_owner_remains() from public, anon, authenticated, service_role;

create or replace function public.admin_add_member(p_email text, p_role text, p_note text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_user uuid;
  v_reason text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  if p_role not in ('owner', 'viewer') then
    raise exception 'Role must be owner or viewer' using errcode = '22023';
  end if;
  if v_note is not null and length(v_note) > 60 then
    raise exception 'Keep the display name under 60 characters' using errcode = '22023';
  end if;
  select u.id into v_user from auth.users u
  where lower(u.email) = lower(btrim(coalesce(p_email, '')))
  order by u.created_at limit 1;
  if v_user is null then
    raise exception 'No account uses that email. They must sign in to Halal Mode once first.' using errcode = '22023';
  end if;
  if exists (select 1 from halal_mode_private.admin_members where user_id = v_user) then
    raise exception 'That account is already an admin' using errcode = '22023';
  end if;
  insert into halal_mode_private.admin_members (user_id, role, note) values (v_user, p_role, v_note);
  perform halal_mode_private.admin_audit('team.add', jsonb_build_object(
    'member', left(v_user::text, 8), 'name', v_note, 'role', p_role, 'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;
revoke all on function public.admin_add_member(text, text, text, text) from public, anon;
grant execute on function public.admin_add_member(text, text, text, text) to authenticated;

create or replace function public.admin_set_member_role(p_user_id uuid, p_role text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_before text;
  v_note text;
  v_reason text;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  if p_role not in ('owner', 'viewer') then
    raise exception 'Role must be owner or viewer' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('admin-team', 0));
  select role, note into v_before, v_note from halal_mode_private.admin_members where user_id = p_user_id for update;
  if v_before is null then
    raise exception 'Not an admin' using errcode = '22023';
  end if;
  if v_before = p_role then
    return jsonb_build_object('changed', false);
  end if;
  update halal_mode_private.admin_members set role = p_role where user_id = p_user_id;
  perform halal_mode_private.admin_require_an_owner_remains();
  perform halal_mode_private.admin_audit('team.role', jsonb_build_object(
    'member', left(p_user_id::text, 8), 'name', v_note, 'before', v_before, 'after', p_role, 'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;
revoke all on function public.admin_set_member_role(uuid, text, text) from public, anon;
grant execute on function public.admin_set_member_role(uuid, text, text) to authenticated;

create or replace function public.admin_remove_member(p_user_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_before text;
  v_note text;
  v_reason text;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('admin-team', 0));
  delete from halal_mode_private.admin_members where user_id = p_user_id
  returning role, note into v_before, v_note;
  if v_before is null then
    raise exception 'Not an admin' using errcode = '22023';
  end if;
  perform halal_mode_private.admin_require_an_owner_remains();
  perform halal_mode_private.admin_audit('team.remove', jsonb_build_object(
    'member', left(p_user_id::text, 8), 'name', v_note, 'role', v_before, 'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;
revoke all on function public.admin_remove_member(uuid, text) from public, anon;
grant execute on function public.admin_remove_member(uuid, text) to authenticated;
