-- Test tools stay in production, locked down. The decisions:
--   * a small team only: the owners plus one or two people;
--   * no self-service test Premium once the app is live: Premium is given only
--     through the web panel (with an end date and a reason);
--   * sample members stay hidden from everyone except testers (already so).
--
-- The self-service switch goes behind a feature flag, so launch is one switch in
-- the panel's Features page rather than a deploy. And adding a test account is
-- capped, so the list cannot quietly grow.

insert into halal_mode_private.release_flags (key, enabled, rollout_percentage)
values ('tester_premium_switch', true, 100)
on conflict (key) do nothing;

-- A tester's own free Premium: only while the flag is on.
create or replace function public.set_my_test_premium(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if not halal_mode_private.release_flag_enabled_for('tester_tools', auth.uid()) then
    raise exception 'Testers only' using errcode = '42501';
  end if;
  if not halal_mode_private.release_flag_enabled_for('tester_premium_switch', auth.uid()) then
    raise exception 'Premium is given by an administrator now' using errcode = '42501', hint = 'switch_off';
  end if;
  -- The tier is server controlled; this function is the server.
  perform set_config('app.account_control_rpc', 'true', true);
  if p_enabled then
    insert into halal_mode_private.member_entitlements (user_id, tier, state, provider, updated_at)
    values (auth.uid(), 'premium', 'active', 'tester', now())
    on conflict (user_id) do update
      set tier = 'premium', state = 'active', provider = 'tester', expires_at = null, updated_at = now();
    update public.profiles set tier = 'premium' where id = auth.uid();
  else
    -- Only a tester grant is taken back; a real purchase is never touched.
    delete from halal_mode_private.member_entitlements
    where user_id = auth.uid() and provider = 'tester';
    update public.profiles set tier = 'free'
    where id = auth.uid()
      and not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = auth.uid());
  end if;
end;
$$;

-- The app asks this to decide whether to show the switch at all.
create or replace function public.get_my_sample_members()
returns jsonb
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select jsonb_build_object(
    'allowed', halal_mode_private.release_flag_enabled_for('tester_tools', auth.uid()),
    'enabled', exists (
      select 1 from halal_mode_private.release_flag_members m
      where m.key = 'demo_introductions' and m.user_id = auth.uid()
    ),
    'premiumSwitch', halal_mode_private.release_flag_enabled_for('tester_premium_switch', auth.uid())
  )
  where auth.uid() is not null;
$$;

-- Adding a test account: at most three people besides the owners.
create or replace function public.admin_set_test_account(p_email text, p_enabled boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_user uuid;
  v_reason text;
  v_others integer;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  select u.id into v_user from auth.users u where lower(u.email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No account with that email. It has to sign up first.' using errcode = 'P0002';
  end if;
  if coalesce(p_enabled, true) then
    select count(*)::int into v_others
    from halal_mode_private.release_flag_members m
    where m.key = 'tester_tools' and m.user_id <> v_user
      and not exists (select 1 from halal_mode_private.admin_members a where a.user_id = m.user_id);
    if v_others >= 3
       and not exists (select 1 from halal_mode_private.release_flag_members m where m.key = 'tester_tools' and m.user_id = v_user)
       and not exists (select 1 from halal_mode_private.admin_members a where a.user_id = v_user) then
      raise exception 'The test team is limited to the owners and three other accounts. Remove one first.' using errcode = '22023';
    end if;
    insert into halal_mode_private.release_flag_members (key, user_id)
    values ('tester_tools', v_user), ('demo_introductions', v_user)
    on conflict do nothing;
  else
    delete from halal_mode_private.release_flag_members where user_id = v_user and key = 'demo_introductions';
    perform set_config('app.account_control_rpc', 'true', true);
    delete from halal_mode_private.member_entitlements where user_id = v_user and provider = 'tester';
    update public.profiles set tier = 'free'
    where id = v_user
      and not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = v_user);
  end if;
  perform halal_mode_private.admin_audit(
    case when coalesce(p_enabled, true) then 'test_account.enabled' else 'test_account.disabled' end,
    jsonb_build_object('email', lower(trim(p_email)), 'reason', v_reason));
end;
$function$;
