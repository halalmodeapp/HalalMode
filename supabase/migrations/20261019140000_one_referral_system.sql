-- One referral system for the waitlist and the app.
--
-- Every person has one referral code, whether they reached Halal Mode through
-- the waitlist, the app, or both:
-- - referral_codes holds each code and who owns it: a waitlist place, an app
--   account, or both once the account's confirmed email matches the place.
-- - A friend counts through the waitlist (waitlist_referrals, when they confirm
--   their email) or through the app (member_referrals, once their profile is
--   complete, the same rule that admits them to daily introductions).
-- - referral_progress(code) adds both up, so halalmo.de/refer, its emails and
--   the app's Referrals screen always show the same numbers.
-- A signed-in member never needs an email step: their code is created, or
-- carried over from their waitlist place, the first time they ask for it.

-- ---------------------------------------------------------------- codes
create table if not exists halal_mode_private.referral_codes (
  code text primary key check (code ~ '^HM[A-Z0-9]{8}$'),
  user_id uuid unique references auth.users(id) on delete cascade,
  waitlist_id uuid unique references halal_mode_private.waitlist(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint referral_codes_owned check (user_id is not null or waitlist_id is not null)
);
alter table halal_mode_private.referral_codes enable row level security;
revoke all on halal_mode_private.referral_codes from public, anon, authenticated;

insert into halal_mode_private.referral_codes (code, waitlist_id)
select referral_code, id from halal_mode_private.waitlist
where referral_code is not null
on conflict do nothing;

-- A waitlist place that gets a code (confirming from /refer) registers it here.
create or replace function halal_mode_private.register_waitlist_referral_code()
returns trigger
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
begin
  if new.referral_code is not null then
    insert into halal_mode_private.referral_codes (code, waitlist_id)
    values (new.referral_code, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$function$;
drop trigger if exists waitlist_register_referral_code on halal_mode_private.waitlist;
create trigger waitlist_register_referral_code
after insert or update of referral_code on halal_mode_private.waitlist
for each row execute function halal_mode_private.register_waitlist_referral_code();

-- A fresh code, unique across both owners.
create or replace function halal_mode_private.new_referral_code()
returns text
language plpgsql
security definer
set search_path = halal_mode_private, extensions, pg_catalog
as $function$
declare
  v_code text;
begin
  loop
    v_code := 'HM' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists (select 1 from halal_mode_private.referral_codes where code = v_code)
      and not exists (select 1 from halal_mode_private.waitlist where referral_code = v_code);
  end loop;
  return v_code;
end;
$function$;
revoke all on function halal_mode_private.new_referral_code() from public, anon, authenticated;

-- ---------------------------------------------------------------- app referrals
create table if not exists halal_mode_private.member_referrals (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null references halal_mode_private.referral_codes(code) on delete cascade,
  created_at timestamptz not null default now(),
  counted_at timestamptz
);
create index if not exists member_referrals_code_idx on halal_mode_private.member_referrals (code);
alter table halal_mode_private.member_referrals enable row level security;
revoke all on halal_mode_private.member_referrals from public, anon, authenticated;

-- ---------------------------------------------------------------- progress
-- The one place the numbers come from. A friend who joined through the app
-- counts once their profile is complete; once counted, they stay counted.
create or replace function halal_mode_private.referral_progress(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
  with owner as (
    select c.code, w.id as waitlist_id, coalesce(w.joined_rank <= 10000, false) as eligible
    from halal_mode_private.referral_codes c
    left join halal_mode_private.waitlist w on w.id = c.waitlist_id
    where c.code = p_code
  ), counted as (
    select
      (select count(*) from halal_mode_private.waitlist_referrals r, owner o where r.referrer_id = o.waitlist_id)
      + (select count(*) from halal_mode_private.member_referrals m
         where m.code = p_code
           and (m.counted_at is not null or public.profile_is_ready_for_matching(m.referred_user_id)))
      as n
  )
  select jsonb_build_object(
    'state', 'verified',
    'eligible', o.eligible,
    'referral_code', o.code,
    'referral_url', 'https://halalmo.de/?ref=' || o.code,
    'referral_count', c.n::integer,
    'reward_months', public.waitlist_reward_months(o.eligible, c.n::integer)
  )
  from owner o, counted c;
$function$;
revoke all on function halal_mode_private.referral_progress(text) from public, anon, authenticated;

-- The waitlist's own entry point now reads the same numbers.
create or replace function halal_mode_private.waitlist_progress(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
  select coalesce(
    (select halal_mode_private.referral_progress(w.referral_code)
     from halal_mode_private.waitlist w where w.id = p_id and w.referral_code is not null),
    jsonb_build_object('state', 'unconfirmed')
  );
$function$;
revoke all on function halal_mode_private.waitlist_progress(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- confirming
-- Confirming a waitlist place, in one place: the email link's Confirm button,
-- and a signed-in account whose confirmed email matches the place.
create or replace function halal_mode_private.waitlist_confirm(p_id uuid)
returns void
language plpgsql
security definer
set search_path = halal_mode_private, public, extensions, pg_catalog, vault
as $function$
declare
  v_row halal_mode_private.waitlist%rowtype;
  v_referrer halal_mode_private.waitlist%rowtype;
  v_counted integer;
  v_verified_rank integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('waitlist-verification-order', 1818));
  select * into v_row from halal_mode_private.waitlist where id = p_id for update;
  if not found then
    return;
  end if;

  update halal_mode_private.waitlist
  set verified_at = coalesce(verified_at, now()),
      referral_code = coalesce(referral_code, halal_mode_private.new_referral_code())
  where id = p_id
  returning * into v_row;

  if v_row.referred_by_id is not null then
    insert into halal_mode_private.waitlist_referrals (referrer_id, referred_id, verified_at)
    values (v_row.referred_by_id, v_row.id, v_row.verified_at)
    on conflict (referred_id) do nothing;
    get diagnostics v_counted = row_count;
    -- A friend just counted: tell the referrer, with a fresh progress link.
    if v_counted > 0 then
      select * into v_referrer from halal_mode_private.waitlist where id = v_row.referred_by_id;
      if found and v_referrer.verified_at is not null
         and halal_mode_private.waitlist_issue_token(v_referrer.id, 30) then
        insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
        values ('referral_joined', v_referrer.id::text, v_referrer.email, coalesce(v_referrer.locale, 'en'));
      end if;
    end if;
  end if;

  if v_row.verified_rank is null then
    select count(*)::integer into v_verified_rank
    from halal_mode_private.waitlist w
    where w.verified_at is not null
      and (w.verified_at, w.id) <= (v_row.verified_at, v_row.id);
    update halal_mode_private.waitlist
    set verified_rank = v_verified_rank
    where id = v_row.id and verified_rank is null;
  end if;
end;
$function$;
revoke all on function halal_mode_private.waitlist_confirm(uuid) from public, anon, authenticated;

create or replace function public.verify_waitlist_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog
as $function$
declare
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_id uuid;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    raise exception 'This waitlist link is invalid or expired' using errcode = '22023';
  end if;
  select id into v_id
  from halal_mode_private.waitlist
  where verification_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
    and verification_token_expires_at > now();
  if v_id is null then
    raise exception 'This waitlist link is invalid or expired' using errcode = '22023';
  end if;

  perform halal_mode_private.waitlist_confirm(v_id);
  -- The same link now serves as the progress page for 30 days.
  update halal_mode_private.waitlist
  set verification_token_expires_at = greatest(verification_token_expires_at, now() + interval '30 days')
  where id = v_id;
  return halal_mode_private.waitlist_progress(v_id);
end;
$function$;
revoke all on function public.verify_waitlist_token(text) from public, anon, authenticated;
grant execute on function public.verify_waitlist_token(text) to service_role;

-- ---------------------------------------------------------------- a member's code
-- A member's one code: theirs already; or their waitlist place's, when the
-- account's confirmed email matches it (confirming the place if needed); or a
-- new one.
create or replace function halal_mode_private.member_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
declare
  v_code text;
  v_email text;
  v_place halal_mode_private.waitlist%rowtype;
begin
  select code into v_code from halal_mode_private.referral_codes where user_id = p_user_id;
  if v_code is not null then
    return v_code;
  end if;

  select lower(btrim(u.email)) into v_email
  from auth.users u
  where u.id = p_user_id and u.email_confirmed_at is not null;

  if v_email is not null and v_email <> '' then
    select * into v_place from halal_mode_private.waitlist where email = v_email;
    if found then
      if v_place.referral_code is null or v_place.verified_at is null then
        perform halal_mode_private.waitlist_confirm(v_place.id);
        select * into v_place from halal_mode_private.waitlist where id = v_place.id;
      end if;
      update halal_mode_private.referral_codes
      set user_id = p_user_id
      where waitlist_id = v_place.id and user_id is null;
      if found then
        return v_place.referral_code;
      end if;
    end if;
  end if;

  v_code := halal_mode_private.new_referral_code();
  insert into halal_mode_private.referral_codes (code, user_id) values (v_code, p_user_id);
  return v_code;
end;
$function$;
revoke all on function halal_mode_private.member_referral_code(uuid) from public, anon, authenticated;

-- The Referrals screen: always the member's link and numbers, no email step.
create or replace function public.my_referral_progress()
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  v_code := halal_mode_private.member_referral_code(v_uid);
  -- Friends whose profiles are now complete stay counted from here on.
  update halal_mode_private.member_referrals
  set counted_at = now()
  where code = v_code and counted_at is null
    and public.profile_is_ready_for_matching(referred_user_id);
  return halal_mode_private.referral_progress(v_code);
end;
$function$;
revoke all on function public.my_referral_progress() from public, anon, authenticated;
grant execute on function public.my_referral_progress() to authenticated;

-- ---------------------------------------------------------------- joining with a code
-- A new member says who invited them: from a shared link, or typed in at
-- sign-up. One referrer per account, never themselves, and only in their
-- first 30 days.
create or replace function public.claim_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_owner halal_mode_private.referral_codes%rowtype;
  v_email text;
  v_created timestamptz;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if v_code !~ '^HM[A-Z0-9]{8}$' then
    return jsonb_build_object('state', 'invalid');
  end if;
  if exists (select 1 from halal_mode_private.member_referrals where referred_user_id = v_uid) then
    return jsonb_build_object('state', 'already');
  end if;

  select * into v_owner from halal_mode_private.referral_codes where code = v_code;
  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  select lower(btrim(u.email)), u.created_at into v_email, v_created from auth.users u where u.id = v_uid;
  if v_owner.user_id = v_uid
     or exists (select 1 from halal_mode_private.waitlist w where w.id = v_owner.waitlist_id and w.email = v_email) then
    return jsonb_build_object('state', 'own');
  end if;
  if v_created < now() - interval '30 days' then
    return jsonb_build_object('state', 'too_late');
  end if;

  insert into halal_mode_private.member_referrals (referred_user_id, code)
  values (v_uid, v_code)
  on conflict (referred_user_id) do nothing;
  return jsonb_build_object('state', 'claimed');
end;
$function$;
revoke all on function public.claim_referral_code(text) from public, anon, authenticated;
grant execute on function public.claim_referral_code(text) to authenticated;

-- A shared link's code is real if anyone owns it.
create or replace function public.referral_code_exists(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
  select exists (
    select 1 from halal_mode_private.referral_codes
    where code = upper(trim(coalesce(p_code, '')))
  );
$function$;
revoke all on function public.referral_code_exists(text) from public, anon, authenticated;
grant execute on function public.referral_code_exists(text) to anon, authenticated;
