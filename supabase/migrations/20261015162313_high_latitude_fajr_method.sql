-- One account-level estimate, defaulting to the simple one-seventh method.
-- The setting only affects dates where the standard 18.5-degree Fajr is absent.
alter table public.profiles
  add column high_latitude_fajr_method text not null default 'one_seventh'
  constraint profiles_high_latitude_fajr_method_check
  check (high_latitude_fajr_method in ('one_seventh', 'reference_latitude_45'));

-- Return the owner's own coordinates and chosen method for the shared Fajr
-- calculation. Coordinates remain private and are not added to profile DTOs.
create function public.get_my_high_latitude_fajr_settings()
returns table (
  is_high_latitude boolean,
  method text,
  latitude double precision,
  longitude double precision
)
language plpgsql
stable
security definer
set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;

  return query
  select
    coalesce(abs(p.latitude) >= 45, false),
    p.high_latitude_fajr_method,
    p.latitude,
    p.longitude
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

-- The column is not directly writable through the Data API. This narrow RPC
-- validates the two supported values and can update only the signed-in member.
create function public.set_my_high_latitude_fajr_method(p_method text)
returns void
language plpgsql
security definer
set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if p_method is null or p_method not in ('one_seventh', 'reference_latitude_45') then
    raise exception 'Unsupported high-latitude Fajr method' using errcode = '22023';
  end if;

  update public.profiles
  set high_latitude_fajr_method = p_method,
      updated_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.get_my_high_latitude_fajr_settings()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_high_latitude_fajr_settings() to authenticated;
revoke all on function public.set_my_high_latitude_fajr_method(text)
  from public, anon, authenticated, service_role;
grant execute on function public.set_my_high_latitude_fajr_method(text) to authenticated;

-- The service-only scheduler receives the preference with eligible member
-- coordinates so server-side round openings use the same method as the app.
drop function public.members_awaiting_round_service();

create function public.members_awaiting_round_service()
returns table (
  user_id uuid,
  latitude double precision,
  longitude double precision,
  high_latitude_fajr_method text
)
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select p.id, p.latitude, p.longitude, p.high_latitude_fajr_method
  from public.profiles p
  where p.onboarding_complete
    and not p.is_paused
    and public.profile_is_ready_for_matching(p.id)
    and halal_mode_private.member_has_current_legal_consents(p.id)
    and p.latitude is not null and p.longitude is not null
    and not exists (
      select 1 from public.rounds r
      where r.user_id = p.id and r.submitted_at is null and r.expires_at > now()
    );
$$;

revoke all on function public.members_awaiting_round_service()
  from public, anon, authenticated, service_role;
grant execute on function public.members_awaiting_round_service() to service_role;

-- A completed round keeps its authoritative Fajr expiry in the database even
-- after get_current_round() stops returning the submitted round. Return that
-- instant to the countdown rather than recalculating it on the device.
create or replace function public.get_current_round_state()
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_owed record;
  v_state jsonb;
  v_next_fajr_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;

  select * into v_owed from halal_mode_private.owed_connection(auth.uid());
  if v_owed.connection_id is not null then
    return jsonb_build_object(
      'status', 'answers_owed',
      'round', null,
      'owed', jsonb_build_object(
        'connectionId', v_owed.connection_id,
        'name', v_owed.other_first_name,
        'step', v_owed.step
      )
    );
  end if;

  v_state := halal_mode_private.get_current_round_state_before_answer_gate();
  if v_state ->> 'status' = 'next_set_scheduled'
     and v_state ? 'nextOpensAt' then
    v_state := (v_state - 'nextOpensAt')
      || jsonb_build_object('nextFajrAt', v_state -> 'nextOpensAt');
  end if;
  if v_state ->> 'status' = 'set_complete' then
    select max(expires_at) into v_next_fajr_at
    from public.rounds
    where user_id = auth.uid()
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
