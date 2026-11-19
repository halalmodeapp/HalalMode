alter table public.profiles
  add column display_name_changed_at timestamptz,
  add column profile_completion_seen_at timestamptz;

create function halal_mode_private.limit_display_name_changes() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if auth.uid() = old.id and old.onboarding_complete
    and (new.name, new.first_name) is distinct from (old.name, old.first_name) then
    if old.display_name_changed_at + interval '3 months' > clock_timestamp() then
      raise exception 'Display name cooldown' using errcode = '22023';
    end if;
    new.display_name_changed_at := clock_timestamp();
  end if;
  return new;
end;
$$;
create trigger limit_display_name_changes before update of name, first_name on public.profiles
for each row execute function halal_mode_private.limit_display_name_changes();

create function public.my_display_name_available_at() returns timestamptz
language sql stable security definer set search_path = public as $$
  select display_name_changed_at + interval '3 months' from profiles where id = auth.uid();
$$;
revoke all on function public.my_display_name_available_at() from public, anon;
grant execute on function public.my_display_name_available_at() to authenticated;

-- Members already complete at rollout have passed this milestone.
update public.profiles p set profile_completion_seen_at = now()
where public.profile_is_ready_for_matching(p.id);

create function public.claim_profile_completion_message() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update profiles set profile_completion_seen_at = now()
  where id = auth.uid() and profile_completion_seen_at is null and profile_is_ready_for_matching(auth.uid());
  return found;
end;
$$;
revoke all on function public.claim_profile_completion_message() from public, anon;
grant execute on function public.claim_profile_completion_message() to authenticated;

-- Serialize a reset with ordinary sample requests. A failed deal rolls back
-- the reset, so an account with demo mode turned off keeps its existing data.
create function public.restart_my_sample_round() returns void
language plpgsql security definer set search_path = public, halal_mode_private as $$
declare
  result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 4471));
  perform public.reset_my_sample_flow();
  result := public.request_demo_round();
  if result->>'created' is distinct from 'true' then
    raise exception 'Sample round unavailable (%)', result->>'reason' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public.restart_my_sample_round() from public, anon;
grant execute on function public.restart_my_sample_round() to authenticated;
