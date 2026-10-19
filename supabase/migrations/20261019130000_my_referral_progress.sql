-- Referral progress inside the app.
--
-- A signed-in member sees the same link and counts as halalmo.de/refer shows,
-- found by the email on their account. Only an address the account has
-- confirmed is looked up, so nobody can read another person's progress by
-- signing up with their address. The reply never includes the address.
--
-- States:
-- - 'verified': the waitlist_progress() reply, with the member's link.
-- - 'unconfirmed': the account's email is not confirmed yet, or the waitlist
--   place is there but has not been confirmed from /refer (so no link yet).
-- - 'not_on_waitlist': a confirmed address with no waitlist place.
create or replace function public.my_referral_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_row halal_mode_private.waitlist%rowtype;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select lower(btrim(u.email)) into v_email
  from auth.users u
  where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null or v_email = '' then
    return jsonb_build_object('state', 'unconfirmed');
  end if;

  select * into v_row from halal_mode_private.waitlist where email = v_email;
  if not found then
    return jsonb_build_object('state', 'not_on_waitlist');
  end if;
  if v_row.verified_at is null or v_row.referral_code is null then
    return jsonb_build_object('state', 'unconfirmed');
  end if;
  return halal_mode_private.waitlist_progress(v_row.id);
end;
$function$;
revoke all on function public.my_referral_progress() from public, anon, authenticated;
grant execute on function public.my_referral_progress() to authenticated;
