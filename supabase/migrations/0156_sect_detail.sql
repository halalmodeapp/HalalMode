-- Sect gets an optional, more specific answer underneath it: Hanafi or Salafi
-- under Sunni, Twelver under Shia, and so on. The top-level `sect` column stays
-- the one matching reads; the detail is what a member says about themselves and
-- what they would prefer in someone else.
--
-- Two small RPCs rather than restating update_my_profile and
-- update_my_private_preferences, both of which carry guards that earlier
-- migrations had to splice back in after a restatement dropped them.

create or replace function public.sect_of_detail(p_detail text)
returns sect
language sql
immutable
set search_path = public
as $$
  select case
    when p_detail in ('hanafi', 'maliki', 'shafii', 'hanbali', 'salafi', 'sufi', 'deobandi', 'barelvi') then 'sunni'::sect
    when p_detail in ('twelver', 'zaydi') then 'shia'::sect
    when p_detail in ('just_muslim', 'ibadi') then 'other'::sect
    else null
  end
$$;

alter table public.profiles
  add column if not exists sect_detail text
  check (sect_detail is null or public.sect_of_detail(sect_detail) is not null);

alter table public.private_preferences
  add column if not exists preferred_sect_details text[] not null default '{}';

comment on column public.profiles.sect_detail is
  'Optional school or tradition under `sect`. Shown on the profile; matching uses `sect`.';
comment on column public.private_preferences.preferred_sect_details is
  'Optional schools or traditions under preferred_sects. Stored for the member; matching uses preferred_sects.';

-- Sets sect and its detail together so the two can never disagree.
create or replace function public.set_my_sect(p_sect sect, p_detail text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if p_detail is not null and public.sect_of_detail(p_detail) is distinct from p_sect then
    raise exception 'That tradition does not belong to the chosen sect' using errcode = '22023';
  end if;
  update public.profiles
    set sect = p_sect, sect_detail = p_detail
    where id = auth.uid();
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
end;
$$;

-- Details must sit under a sect the member also chose, so preferred_sects
-- (what matching reads) is always the wider of the two.
create or replace function public.set_my_preferred_sects(p_sects sect[], p_details text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detail text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if cardinality(coalesce(p_details, '{}')) > 12 then
    raise exception 'Choose at most twelve traditions' using errcode = '22023';
  end if;
  foreach v_detail in array coalesce(p_details, '{}') loop
    if public.sect_of_detail(v_detail) is null
      or not (public.sect_of_detail(v_detail) = any (coalesce(p_sects, '{}'))) then
      raise exception 'Unknown or unmatched tradition: %', v_detail using errcode = '22023';
    end if;
  end loop;
  update public.private_preferences
    set preferred_sects = coalesce(p_sects, '{}'),
        preferred_sect_details = coalesce(p_details, '{}')
    where user_id = auth.uid();
  if not found then raise exception 'Preferences not found' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.set_my_sect(sect, text) from public, anon;
revoke all on function public.set_my_preferred_sects(sect[], text[]) from public, anon;
grant execute on function public.set_my_sect(sect, text) to authenticated;
grant execute on function public.set_my_preferred_sects(sect[], text[]) to authenticated;

-- The owner sees their own detail. Restated from 0041 with one key added.
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
  return safe_member_profile(p) || jsonb_build_object('isPaused', p.is_paused, 'sect_detail', p.sect_detail);
end;
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;
