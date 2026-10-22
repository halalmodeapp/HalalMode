-- Invite page, clearer (owner's decision, 22 Oct):
--   * Who invited you: their first name, or their full email when they have
--     no name yet (instead of a masked email).
--   * Claiming while signed out says to sign in, instead of a bare
--     "permission denied".

create or replace function public.referral_inviter(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_owner halal_mode_private.referral_codes%rowtype;
  v_user uuid;
  v_email text;
  v_name text;
begin
  if v_code !~ '^HM[A-Z0-9]{8}$' then
    return jsonb_build_object('valid', false);
  end if;
  select * into v_owner from halal_mode_private.referral_codes where code = v_code;
  if not found then
    return jsonb_build_object('valid', false);
  end if;

  if v_owner.user_id is not null then
    v_user := v_owner.user_id;
    select u.email into v_email from auth.users u where u.id = v_user;
  else
    select w.email into v_email from halal_mode_private.waitlist w where w.id = v_owner.waitlist_id;
    -- A waitlist member who has since joined the app has a name to show.
    select u.id into v_user from auth.users u
    join halal_mode_private.waitlist w on w.id = v_owner.waitlist_id
    where halal_mode_private.canonical_email(u.email) = w.email_canonical
    order by u.created_at limit 1;
  end if;
  select nullif(btrim(p.first_name), '') into v_name from public.profiles p where p.id = v_user;

  return jsonb_build_object(
    'valid', true,
    'code', v_code,
    'name', v_name,
    'email', case when v_name is null then v_email end
  );
end;
$function$;
revoke all on function public.referral_inviter(text) from public;
grant execute on function public.referral_inviter(text) to anon, authenticated;

create or replace function public.claim_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_email text;
  v_waitlist halal_mode_private.waitlist%rowtype;
  v_existing text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Please sign in with Apple, Google or email to link your invite.'
      using errcode = '42501', hint = 'sign_in';
  end if;
  select halal_mode_private.canonical_email(u.email) into v_email from auth.users u where u.id = auth.uid();

  select * into v_waitlist from halal_mode_private.waitlist w
  where w.email_canonical = v_email and (w.referred_by_id is not null or w.referred_code is not null)
  order by w.created_at limit 1;
  if found then
    select coalesce(v_waitlist.referred_code,
      (select c.code from halal_mode_private.referral_codes c where c.waitlist_id = v_waitlist.referred_by_id limit 1))
    into v_existing;
    return jsonb_build_object('state', case when v_existing = v_code then 'claimed' else 'already' end)
      || public.referral_inviter(coalesce(v_existing, v_code));
  end if;

  v_result := public.claim_referral_code(v_code);
  return v_result || public.referral_inviter(v_code);
end;
$function$;
-- Callable signed out so it can explain itself; it does nothing until signed in.
revoke all on function public.claim_invite(text) from public;
grant execute on function public.claim_invite(text) to anon, authenticated;
