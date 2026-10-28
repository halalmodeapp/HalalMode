-- Test accounts, controlled by an admin from the app.
--
-- Demo mode (sample members, free test Premium, resetting the sample flow) is
-- for the owners and for test accounts an owner has switched on, for example
-- the one an AI assistant signs in with. Nobody else has it, and nobody else
-- ever meets a sample member.

-- 1. Every owner is a tester, so demo mode is there for them from the start.
insert into halal_mode_private.release_flag_members (key, user_id)
select f.key, a.user_id
from halal_mode_private.admin_members a
cross join (values ('tester_tools'), ('demo_introductions')) as f(key)
where a.role = 'owner'
on conflict do nothing;

-- 2. Anyone who is neither a tester nor an owner loses demo mode, and any
--    sample rounds, sample connections and pair history they were given.
delete from halal_mode_private.release_flag_members m
where m.key in ('demo_introductions')
  and not exists (select 1 from halal_mode_private.release_flag_members t
                  where t.key = 'tester_tools' and t.user_id = m.user_id);

delete from public.connections c
where not exists (select 1 from halal_mode_private.release_flag_members t where t.key = 'tester_tools' and t.user_id in (c.user_a, c.user_b))
  and (halal_mode_private.is_demo_member(c.user_a) or halal_mode_private.is_demo_member(c.user_b));

delete from public.rounds r
where exists (select 1 from halal_mode_private.demo_rounds d where d.round_id = r.id)
  and not exists (select 1 from halal_mode_private.release_flag_members t
                  where t.key = 'tester_tools'
                    and (t.user_id = r.user_id
                         or exists (select 1 from public.introductions i where i.round_id = r.id and i.subject_id = t.user_id)));

delete from halal_mode_private.pair_exposure e
where (halal_mode_private.is_demo_member(e.user_low) or halal_mode_private.is_demo_member(e.user_high))
  and not exists (select 1 from halal_mode_private.release_flag_members t
                  where t.key = 'tester_tools' and t.user_id in (e.user_low, e.user_high));

-- 3. Owners manage test accounts from the app. Only an owner, and every change
--    is written to the audit log. This does not need the two-factor step the
--    web panel asks for, because it cannot reach any real member's data.
create or replace function halal_mode_private.require_owner()
returns void
language plpgsql
stable
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
begin
  if auth.uid() is null
     or not exists (select 1 from halal_mode_private.admin_members a where a.user_id = auth.uid() and a.role = 'owner') then
    raise exception 'Owners only' using errcode = '42501';
  end if;
end;
$function$;
revoke all on function halal_mode_private.require_owner() from public, anon, authenticated, service_role;

create or replace function public.admin_list_test_accounts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private
as $function$
begin
  perform halal_mode_private.require_owner();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'email', u.email,
      'owner', exists (select 1 from halal_mode_private.admin_members a where a.user_id = u.id),
      'demo', exists (select 1 from halal_mode_private.release_flag_members d where d.key = 'demo_introductions' and d.user_id = u.id),
      'premium', exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = u.id and e.provider = 'tester')
    ) order by u.email)
    from halal_mode_private.release_flag_members t
    join auth.users u on u.id = t.user_id
    where t.key = 'tester_tools'
  ), '[]'::jsonb);
end;
$function$;

create or replace function public.admin_set_test_account(p_email text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_user uuid;
begin
  perform halal_mode_private.require_owner();
  select u.id into v_user from auth.users u where lower(u.email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No account with that email. It has to sign up first.' using errcode = 'P0002';
  end if;
  if coalesce(p_enabled, true) then
    insert into halal_mode_private.release_flag_members (key, user_id)
    values ('tester_tools', v_user), ('demo_introductions', v_user)
    on conflict do nothing;
  else
    if exists (select 1 from halal_mode_private.admin_members a where a.user_id = v_user) then
      raise exception 'An owner always has demo mode' using errcode = '22023';
    end if;
    delete from halal_mode_private.release_flag_members where user_id = v_user and key in ('tester_tools', 'demo_introductions');
    -- A tester grant of Premium goes with it; a real purchase never does.
    perform set_config('app.account_control_rpc', 'true', true);
    delete from halal_mode_private.member_entitlements where user_id = v_user and provider = 'tester';
    update public.profiles set tier = 'free'
    where id = v_user
      and not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = v_user);
  end if;
  perform halal_mode_private.admin_audit(
    case when coalesce(p_enabled, true) then 'test_account.enabled' else 'test_account.disabled' end,
    jsonb_build_object('email', lower(trim(p_email))));
end;
$function$;

revoke all on function public.admin_list_test_accounts() from public, anon;
revoke all on function public.admin_set_test_account(text, boolean) from public, anon;
grant execute on function public.admin_list_test_accounts() to authenticated;
grant execute on function public.admin_set_test_account(text, boolean) to authenticated;
