-- Testers can switch Halal Mode Premium on and off for themselves, to try it
-- without paying. Recorded as a 'tester' entitlement, so it is never mistaken
-- for a purchase; anyone not on the tester list is refused.

insert into halal_mode_private.release_flag_members (key, user_id)
select 'tester_tools', u.id from auth.users u
where u.email in ('mohammedabdullah89@gmail.com', 'halalmodeapp@gmail.com')
on conflict do nothing;

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

revoke all on function public.set_my_test_premium(boolean) from public, anon;
grant execute on function public.set_my_test_premium(boolean) to authenticated;
