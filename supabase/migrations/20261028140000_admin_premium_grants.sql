-- Complimentary Premium, given by an admin in the web panel.
--
-- A grant is its own kind of Premium ("comp"): it always has an end date (1 to
-- 365 days), always has a reason, is written to the activity log, and can be
-- taken back. It never touches a real purchase and is never mistaken for a
-- tester grant or a launch reward. Everything here needs the owner role, the
-- authenticator code, and a fresh step-up, like every other change in the panel.

create table if not exists halal_mode_private.premium_grants (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'comp' check (kind = 'comp'),
  reason text not null,
  granted_by uuid references auth.users(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text,
  check (ends_at > starts_at)
);
create index if not exists premium_grants_user_idx on halal_mode_private.premium_grants (user_id, starts_at desc);
alter table halal_mode_private.premium_grants enable row level security;
revoke all on halal_mode_private.premium_grants from public, anon, authenticated;

create or replace function public.admin_grant_premium(p_email text, p_days integer, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_reason text;
  v_user uuid;
  v_current halal_mode_private.member_entitlements%rowtype;
  v_ends timestamptz;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  if p_days is null or p_days not between 1 and 365 then
    raise exception 'Choose between 1 and 365 days' using errcode = '22023';
  end if;
  select p.id into v_user from public.profiles p join auth.users u on u.id = p.id
  where lower(u.email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'No member with that email. They need to have signed up to the app.' using errcode = 'P0002';
  end if;

  select * into v_current from halal_mode_private.member_entitlements where user_id = v_user for update;
  if found and v_current.state in ('active', 'grace')
     and coalesce(v_current.provider, '') <> 'comp'
     and (v_current.expires_at is null or v_current.expires_at > now()) then
    raise exception 'They already have Premium (%). Wait for it to end.', coalesce(v_current.provider, 'unknown source')
      using errcode = '22023';
  end if;

  v_ends := now() + make_interval(days => p_days);
  insert into halal_mode_private.member_entitlements (user_id, tier, state, provider, provider_reference_hash, expires_at)
  values (v_user, 'premium', 'active', 'comp', null, v_ends)
  on conflict (user_id) do update set
    tier = 'premium', state = 'active', provider = 'comp', provider_reference_hash = null,
    expires_at = excluded.expires_at, updated_at = now();
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles set tier = 'premium' where id = v_user;

  -- A newer grant replaces a running one.
  update halal_mode_private.premium_grants set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = 'replaced by a newer grant'
  where user_id = v_user and revoked_at is null and ends_at > now();
  insert into halal_mode_private.premium_grants (user_id, reason, granted_by, ends_at)
  values (v_user, v_reason, auth.uid(), v_ends);

  perform halal_mode_private.admin_audit('premium.granted', jsonb_build_object(
    'email', lower(btrim(p_email)), 'days', p_days, 'ends_at', v_ends, 'reason', v_reason));
  return jsonb_build_object('ends_at', v_ends);
end;
$function$;

create or replace function public.admin_revoke_premium_grant(p_email text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_reason text;
  v_user uuid;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  select p.id into v_user from public.profiles p join auth.users u on u.id = p.id
  where lower(u.email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'No member with that email.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = v_user and e.provider = 'comp') then
    raise exception 'They have no complimentary Premium to remove. A purchase is never removed here.' using errcode = '22023';
  end if;
  delete from halal_mode_private.member_entitlements where user_id = v_user and provider = 'comp';
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles set tier = 'free' where id = v_user
    and not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = v_user);
  update halal_mode_private.premium_grants set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = v_reason
  where user_id = v_user and revoked_at is null;
  perform halal_mode_private.admin_audit('premium.revoked', jsonb_build_object(
    'email', lower(btrim(p_email)), 'reason', v_reason));
  return jsonb_build_object('revoked', true);
end;
$function$;

-- Running grants first, then the last few that ended or were taken back.
create or replace function public.admin_premium_grants()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private
as $function$
begin
  perform halal_mode_private.require_admin();
  return coalesce((
    select jsonb_agg(row_to_json(g)::jsonb order by g.active desc, g.starts_at desc)
    from (
      select u.email, pg.reason, pg.starts_at, pg.ends_at, pg.revoked_at, pg.revoke_reason,
             (pg.revoked_at is null and pg.ends_at > now()) as active,
             coalesce(a.note, gu.email) as granted_by
      from halal_mode_private.premium_grants pg
      join auth.users u on u.id = pg.user_id
      left join auth.users gu on gu.id = pg.granted_by
      left join halal_mode_private.admin_members a on a.user_id = pg.granted_by
      order by (pg.revoked_at is null and pg.ends_at > now()) desc, pg.starts_at desc
      limit 100
    ) g
  ), '[]'::jsonb);
end;
$function$;

-- Ends grants whose time is up.
create or replace function halal_mode_private.expire_comp_premium()
returns integer
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
declare
  v_ended integer;
begin
  perform set_config('app.account_control_rpc', 'true', true);
  with ended as (
    delete from halal_mode_private.member_entitlements
    where provider = 'comp' and expires_at <= now()
    returning user_id
  ), demoted as (
    update public.profiles p set tier = 'free' from ended
    where p.id = ended.user_id
      and not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = p.id)
    returning p.id
  )
  select count(*) into v_ended from demoted;
  return v_ended;
end;
$function$;
revoke all on function halal_mode_private.expire_comp_premium() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'halal-mode-comp-expiry') then
    perform cron.unschedule('halal-mode-comp-expiry');
  end if;
  perform cron.schedule('halal-mode-comp-expiry', '5 * * * *', 'select halal_mode_private.expire_comp_premium()');
end;
$$;

revoke all on function public.admin_grant_premium(text, integer, text) from public, anon;
revoke all on function public.admin_revoke_premium_grant(text, text) from public, anon;
revoke all on function public.admin_premium_grants() from public, anon;
grant execute on function public.admin_grant_premium(text, integer, text) to authenticated;
grant execute on function public.admin_revoke_premium_grant(text, text) to authenticated;
grant execute on function public.admin_premium_grants() to authenticated;
