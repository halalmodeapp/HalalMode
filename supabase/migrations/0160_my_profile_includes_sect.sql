-- The owner's own profile read never carried `sect`, so the app showed
-- "prefer not to say" after every reload whatever had been saved.
create or replace function public.get_my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public as $$
declare p profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into p from profiles where id = auth.uid();
  if p is null then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  return safe_member_profile(p) || jsonb_build_object(
    'isPaused', p.is_paused,
    'sect', p.sect,
    'sect_detail', p.sect_detail
  );
end;
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;
