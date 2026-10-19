-- The launch switch: one value the website, the app and the emails all read,
-- so launch-day copy (rewards "added" rather than "reserved for launch", the
-- share message, the referral small print) changes everywhere at once,
-- without a new app build or a deploy.
--
-- To launch, run in the Supabase SQL editor:
--   select halal_mode_private.set_launched(true);
-- and to go back:
--   select halal_mode_private.set_launched(false);

create table if not exists halal_mode_private.launch_settings (
  id boolean primary key default true check (id),
  launched boolean not null default false,
  launched_at timestamptz
);
insert into halal_mode_private.launch_settings (id, launched) values (true, false)
on conflict (id) do nothing;
alter table halal_mode_private.launch_settings enable row level security;
revoke all on halal_mode_private.launch_settings from public, anon, authenticated;

-- Readable by anyone: it only says whether Halal Mode has launched.
create or replace function public.launch_state()
returns jsonb
language sql
stable
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
  select jsonb_build_object('launched', coalesce((select launched from halal_mode_private.launch_settings), false));
$function$;
revoke all on function public.launch_state() from public;
grant execute on function public.launch_state() to anon, authenticated, service_role;

create or replace function halal_mode_private.set_launched(p_launched boolean)
returns jsonb
language sql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
  update halal_mode_private.launch_settings
  set launched = p_launched,
      launched_at = case when p_launched then coalesce(launched_at, now()) else null end
  where id
  returning jsonb_build_object('launched', launched, 'launched_at', launched_at);
$function$;
revoke all on function halal_mode_private.set_launched(boolean) from public, anon, authenticated;
