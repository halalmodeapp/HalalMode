-- No launch switch after all: the app only ever shows after-launch copy, and
-- the waitlist site before-launch copy, so nothing needs to ask which it is.
drop function if exists public.launch_state();
drop function if exists halal_mode_private.set_launched(boolean);
drop table if exists halal_mode_private.launch_settings;
