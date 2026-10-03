-- Sample members become something a tester switches on for themselves, rather
-- than something everyone sees. The flag stays on but reaches nobody by
-- percentage; a member is in it only while their own toggle is on.
--
-- Only accounts on the `tester_tools` flag can flip the toggle, so a real
-- member can never opt themselves into meeting people who do not exist.

insert into halal_mode_private.release_flags (key, enabled, rollout_percentage)
values ('tester_tools', true, 0)
on conflict (key) do update set enabled = true, rollout_percentage = 0, updated_at = now();

update halal_mode_private.release_flags
  set enabled = true, rollout_percentage = 0, updated_at = now()
  where key = 'demo_introductions';

-- The two founder accounts are testers, and start with samples on so nothing
-- they were already testing disappears.
insert into halal_mode_private.release_flag_members (key, user_id)
select flag.key, u.id
from auth.users u
join public.profiles p on p.id = u.id
cross join (values ('tester_tools'), ('demo_introductions')) as flag(key)
where lower(u.email) in ('mohammedabdullah89@gmail.com', 'halalmodeapp@gmail.com')
on conflict do nothing;

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
    )
  )
  where auth.uid() is not null;
$$;

create or replace function public.set_my_sample_members(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if not halal_mode_private.release_flag_enabled_for('tester_tools', auth.uid()) then
    raise exception 'Sample members are for testers only' using errcode = '42501';
  end if;
  if p_enabled then
    insert into halal_mode_private.release_flag_members (key, user_id)
    values ('demo_introductions', auth.uid())
    on conflict do nothing;
  else
    delete from halal_mode_private.release_flag_members
    where key = 'demo_introductions' and user_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.get_my_sample_members() from public, anon;
revoke all on function public.set_my_sample_members(boolean) from public, anon;
grant execute on function public.get_my_sample_members() to authenticated;
grant execute on function public.set_my_sample_members(boolean) to authenticated;
