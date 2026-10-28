-- A fairer waitlist, and the Premium it promised.
--
-- 1. One inbox, one place. Gmail ignores dots and everything after a plus,
--    so a.b+1@gmail.com and ab@gmail.com reach the same person. Every
--    address now has a canonical form (lower case, no +tag anywhere, no dots
--    for Gmail, googlemail.com read as gmail.com). Joining with an alias of a
--    listed address is a repeat, not a new place or a new referral, and an
--    app account cannot claim a code owned by its own inbox.
-- 2. No throttling on the waitlist. A campus, mosque or office Wi-Fi, or a
--    mobile carrier, puts many people behind one address, and 5 an hour
--    turned the sixth away; a busy launch hour would have hit 10,000. Now
--    everyone joins at once, from anywhere, at any rate, with no extra step.
--    The network counts and their hashes are removed. (Account sign-ups in
--    the app are a separate matter, limited by Supabase Auth.)
-- 3. An app member's link credits them on the waitlist too. A friend who
--    joins the waitlist with an app-only code is remembered, gets a confirm
--    link, and counts toward that member's rewards once confirmed.
-- 4. Mail follows the provider. The worker passes the provider's own daily
--    quota (Amazon SES reports it) and batches of up to 200; Resend keeps
--    mail_settings.daily_limit.
-- 5. The free Premium is granted. Every ten minutes, a member whose profile
--    is complete gets the months their waitlist place and referrals earned
--    (1 for the first 10,000; 3, 6 or 12 for referrals), and more when
--    later referrals reach a new tier. It starts when they can use it, not
--    while they are still setting up, and ends on its own.
-- 6. The Terms and Privacy Notice have one address, halalmo.de/legal/…, the
--    one in src/data/legalDocuments.ts. The current registry rows pointed at
--    /app/terms and /app/privacy, which only reached them by redirect. The
--    version is unchanged, so nobody is asked to accept again.

-- ---------------------------------------------------------------- 1. canonical addresses
create or replace function halal_mode_private.canonical_email(p_email text)
returns text
language sql
immutable
set search_path = pg_catalog
as $function$
  with parts as (
    select split_part(v, '@', 1) as local_part, split_part(v, '@', 2) as domain
    from (select lower(btrim(coalesce(p_email, ''))) as v) s
  ), cleaned as (
    select split_part(local_part, '+', 1) as local_part,
           case when domain = 'googlemail.com' then 'gmail.com' else domain end as domain
    from parts
  )
  select case
    when domain = '' then local_part
    when domain = 'gmail.com' then replace(local_part, '.', '') || '@' || domain
    else local_part || '@' || domain
  end
  from cleaned;
$function$;
revoke all on function halal_mode_private.canonical_email(text) from public, anon, authenticated;

alter table halal_mode_private.waitlist
  add column if not exists email_canonical text
    generated always as (halal_mode_private.canonical_email(email)) stored;
create index if not exists waitlist_email_canonical_idx
  on halal_mode_private.waitlist (email_canonical);

-- ---------------------------------------------------------------- 2. no per-network limit
-- join_waitlist_now below no longer reads or writes these.
drop table if exists halal_mode_private.waitlist_intake_sources;
drop function if exists halal_mode_private.request_source_hash();

-- ---------------------------------------------------------------- 8. where referral links go
-- One switchable address for every member's referral link (the app, the
-- halalmo.de/refer page and the emails all read referral_url from here).
-- Today it is the waitlist. At launch, one update repoints every link:
--   update halal_mode_private.referral_settings set link_base = 'https://halalmo.de/app?ref=';
create table if not exists halal_mode_private.referral_settings (
  id boolean primary key default true check (id),
  link_base text not null default 'https://halalmo.de/?ref='
    check (link_base ~ '^https://[^ ]+[?&]ref=$')
);
insert into halal_mode_private.referral_settings (id) values (true) on conflict (id) do nothing;
alter table halal_mode_private.referral_settings enable row level security;
revoke all on halal_mode_private.referral_settings from public, anon, authenticated;

create or replace function halal_mode_private.referral_link(p_code text)
returns text
language sql
stable
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
  select coalesce((select link_base from halal_mode_private.referral_settings), 'https://halalmo.de/?ref=') || p_code;
$function$;
revoke all on function halal_mode_private.referral_link(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. app members' codes
alter table halal_mode_private.waitlist
  add column if not exists referred_code text;

-- Waitlist friends credited to a code whose owner has no waitlist place.
create table if not exists halal_mode_private.waitlist_code_referrals (
  referred_id uuid primary key references halal_mode_private.waitlist(id) on delete cascade,
  code text not null references halal_mode_private.referral_codes(code) on delete cascade,
  verified_at timestamptz not null default now()
);
create index if not exists waitlist_code_referrals_code_idx
  on halal_mode_private.waitlist_code_referrals (code);
alter table halal_mode_private.waitlist_code_referrals enable row level security;
revoke all on halal_mode_private.waitlist_code_referrals from public, anon, authenticated;

-- ---------------------------------------------------------------- joining
create or replace function public.join_waitlist_now(
  p_email text,
  p_city text,
  p_age_range text,
  p_locale text default null,
  p_referral_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog, vault
as $function$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_canonical text := halal_mode_private.canonical_email(p_email);
  v_city text := btrim(coalesce(p_city, ''));
  v_locale text := nullif(btrim(coalesce(p_locale, '')), '');
  v_referral_code text := upper(btrim(coalesce(p_referral_code, '')));
  v_owner halal_mode_private.referral_codes%rowtype;
  v_owner_email text;
  v_referrer_id uuid;
  v_row halal_mode_private.waitlist%rowtype;
  v_new boolean := false;
  v_open boolean;
begin
  if not public.waitlist_email_plausible(v_email) then
    raise exception 'That email address does not look right' using errcode = '22023';
  end if;
  if length(v_city) not between 2 and 80 then
    raise exception 'Please tell us which city you are in' using errcode = '22023';
  end if;
  if p_age_range is null or p_age_range not in ('18-24', '25-29', '30-34', '35-39', '40-49', '50+') then
    raise exception 'Please choose an age range' using errcode = '22023';
  end if;
  if v_locale is not null
     and (length(v_locale) > 16 or v_locale !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,12})*$') then
    raise exception 'That locale is not supported' using errcode = '22023';
  end if;

  -- One lock keeps the limits, the insert and the place in line atomic.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('waitlist-intake', 1818));

  -- No throttling: anyone may join at any rate. Only a ceiling on the list's
  -- size, far beyond any real waitlist, checked for every caller so the reply
  -- never depends on whether the address is already on the list.
  if (select count(*) from halal_mode_private.waitlist) >= 1000000 then
    raise exception 'Waitlist intake is temporarily full' using errcode = 'P0001';
  end if;

  v_open := coalesce((select max(joined_rank) from halal_mode_private.waitlist), 0) < 10000;

  -- The address as typed first, then any alias of the same inbox.
  select * into v_row
  from halal_mode_private.waitlist
  where email_canonical = v_canonical
  order by (email = v_email) desc, joined_rank nulls last, created_at
  limit 1
  for update;

  if not found then
    insert into halal_mode_private.waitlist (email, city, age_range, locale, joined_rank)
    values (v_email, v_city, p_age_range, v_locale,
            coalesce((select max(joined_rank) from halal_mode_private.waitlist), 0) + 1)
    returning * into v_row;
    v_new := true;
  elsif v_row.joined_rank is null then
    update halal_mode_private.waitlist
    set joined_rank = coalesce((select max(joined_rank) from halal_mode_private.waitlist), 0) + 1
    where id = v_row.id
    returning * into v_row;
  end if;

  -- First-touch attribution, never to the same inbox. A waitlist place's code
  -- needs a confirmed owner; an app member's code is remembered by code.
  if v_row.referred_by_id is null and v_row.referred_code is null
     and v_referral_code ~ '^HM[A-Z0-9]{8}$' then
    select * into v_owner from halal_mode_private.referral_codes where code = v_referral_code;
    if found and v_owner.waitlist_id is not null then
      select id into v_referrer_id
      from halal_mode_private.waitlist
      where id = v_owner.waitlist_id and verified_at is not null
        and id <> v_row.id and email_canonical <> v_row.email_canonical;
      if v_referrer_id is not null then
        update halal_mode_private.waitlist set referred_by_id = v_referrer_id
        where id = v_row.id and referred_by_id is null
        returning * into v_row;
      end if;
    elsif found and v_owner.user_id is not null then
      select halal_mode_private.canonical_email(u.email) into v_owner_email
      from auth.users u where u.id = v_owner.user_id;
      if v_owner_email is distinct from v_row.email_canonical then
        update halal_mode_private.waitlist set referred_code = v_referral_code
        where id = v_row.id and referred_code is null
        returning * into v_row;
      end if;
    end if;
  end if;

  if v_new then
    -- A referred member's welcome email carries a confirm link, so the
    -- referral can count; everyone else simply gets the thank-you.
    if v_row.referred_by_id is not null or v_row.referred_code is not null then
      perform halal_mode_private.waitlist_issue_token(v_row.id, 30);
    end if;
    insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
    values ('waitlist_welcome', v_row.id::text, v_row.email, coalesce(v_row.locale, v_locale, 'en'));
  end if;

  -- The same for a new and an existing address: are first-10,000 places
  -- still open? The welcome email tells each person their own outcome.
  return jsonb_build_object('state', 'joined', 'eligible', v_open);
end;
$function$;
revoke all on function public.join_waitlist_now(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.join_waitlist_now(text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- confirming
-- As before, plus: a friend of an app member is credited to that member's code.
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
  v_link boolean;
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
      if found and v_referrer.verified_at is not null then
        -- Reuse a link with more than a day left, so the one in their earlier
        -- emails keeps working; only issue a new one when it is about to end.
        v_link := v_referrer.verification_token_ciphertext is not null
          and v_referrer.verification_token_expires_at > now() + interval '1 day';
        if not v_link then
          v_link := halal_mode_private.waitlist_issue_token(v_referrer.id, 30);
        end if;
        if v_link then
          insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
          values ('referral_joined', v_referrer.id::text, v_referrer.email, coalesce(v_referrer.locale, 'en'));
        end if;
      end if;
    end if;
  elsif v_row.referred_code is not null then
    insert into halal_mode_private.waitlist_code_referrals (referred_id, code, verified_at)
    values (v_row.id, v_row.referred_code, v_row.verified_at)
    on conflict (referred_id) do nothing;
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

-- ---------------------------------------------------------------- progress
-- Adds friends credited by code, and counts a friend once across the
-- waitlist and the app by inbox, not by exact spelling.
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
  ), waitlist_friends as (
    select r.referred_id as id from halal_mode_private.waitlist_referrals r, owner o where r.referrer_id = o.waitlist_id
    union
    select x.referred_id from halal_mode_private.waitlist_code_referrals x where x.code = p_code
  ), counted as (
    select
      (select count(*) from waitlist_friends)
      + (select count(*) from halal_mode_private.member_referrals m
         where m.code = p_code
           and (m.counted_at is not null or public.profile_is_ready_for_matching(m.referred_user_id))
           and not exists (
             select 1
             from waitlist_friends f
             join halal_mode_private.waitlist friend on friend.id = f.id
             join auth.users u on u.id = m.referred_user_id
             where friend.email_canonical = halal_mode_private.canonical_email(u.email)
           ))
      as n
  )
  select jsonb_build_object(
    'state', 'verified',
    'eligible', o.eligible,
    'referral_code', o.code,
    'referral_url', halal_mode_private.referral_link(o.code),
    'referral_count', c.n::integer,
    'reward_months', public.waitlist_reward_months(o.eligible, c.n::integer)
  )
  from owner o, counted c;
$function$;
revoke all on function halal_mode_private.referral_progress(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- the app side
-- A member's code: theirs; or their waitlist place's when the account's
-- confirmed inbox matches it (any alias); or a new one.
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

  select halal_mode_private.canonical_email(u.email) into v_email
  from auth.users u
  where u.id = p_user_id and u.email_confirmed_at is not null;

  if v_email is not null and v_email <> '' then
    select * into v_place from halal_mode_private.waitlist
    where email_canonical = v_email
    order by joined_rank nulls last, created_at
    limit 1;
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

-- One referrer per account, never their own inbox, never a second account on
-- the same inbox, and only in the first 30 days.
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

  select halal_mode_private.canonical_email(u.email), u.created_at into v_email, v_created
  from auth.users u where u.id = v_uid;
  if v_owner.user_id = v_uid
     or exists (select 1 from halal_mode_private.waitlist w
                where w.id = v_owner.waitlist_id and w.email_canonical = v_email)
     or exists (select 1 from auth.users o
                where o.id = v_owner.user_id and halal_mode_private.canonical_email(o.email) = v_email) then
    return jsonb_build_object('state', 'own');
  end if;
  if v_created < now() - interval '30 days' then
    return jsonb_build_object('state', 'too_late');
  end if;
  if exists (select 1 from halal_mode_private.member_referrals m
             join auth.users u on u.id = m.referred_user_id
             where m.code = v_code and halal_mode_private.canonical_email(u.email) = v_email) then
    return jsonb_build_object('state', 'already');
  end if;

  insert into halal_mode_private.member_referrals (referred_user_id, code)
  values (v_uid, v_code)
  on conflict (referred_user_id) do nothing;
  return jsonb_build_object('state', 'claimed');
end;
$function$;
revoke all on function public.claim_referral_code(text) from public, anon, authenticated;
grant execute on function public.claim_referral_code(text) to authenticated;

-- Asking for a link finds the place under any alias of the inbox.
create or replace function public.request_referral_link(
  p_email text,
  p_locale text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog, vault
as $function$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_locale text := nullif(btrim(coalesce(p_locale, '')), '');
  v_row halal_mode_private.waitlist%rowtype;
  v_hash text;
begin
  if not public.waitlist_email_plausible(v_email) then
    raise exception 'That email address does not look right' using errcode = '22023';
  end if;
  if v_locale is not null
     and (length(v_locale) > 16 or v_locale !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,12})*$') then
    v_locale := null;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('waitlist-referral-links', 1818));
  if (select count(*) from halal_mode_private.waitlist where verification_sent_at > now() - interval '1 hour') >= 2000 then
    raise exception 'Please try again in a little while' using errcode = 'P0001';
  end if;

  select * into v_row from halal_mode_private.waitlist
  where email_canonical = halal_mode_private.canonical_email(v_email)
  order by (email = v_email) desc, joined_rank nulls last, created_at
  limit 1
  for update;

  if not found then
    -- Not on the waitlist: a "join first" note, spaced out per address and
    -- capped overall. The reply is the same as for a member.
    v_hash := encode(extensions.digest(v_email, 'sha256'), 'hex');
    if exists (select 1 from halal_mode_private.waitlist_link_requests
               where email_hash = v_hash and last_sent_at > now() - interval '1 day')
       or (select count(*) from halal_mode_private.waitlist_link_requests
           where last_sent_at > now() - interval '1 hour') >= 100 then
      return jsonb_build_object('state', 'sent');
    end if;
    insert into halal_mode_private.waitlist_link_requests (email_hash, last_sent_at)
    values (v_hash, now())
    on conflict (email_hash) do update set last_sent_at = excluded.last_sent_at;
    insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
    values ('waitlist_not_joined', v_hash, v_email, coalesce(v_locale, 'en'));
    return jsonb_build_object('state', 'sent');
  end if;

  -- At most one email an hour per address.
  if v_row.verification_sent_at > now() - interval '1 hour' then
    return jsonb_build_object('state', 'sent');
  end if;

  -- A link with more than a day left is sent again as it is, so the earlier
  -- email keeps working. Otherwise a fresh one: 30 days for a confirmed
  -- member, 7 to confirm.
  if v_row.verification_token_ciphertext is not null
     and v_row.verification_token_expires_at > now() + interval '1 day' then
    update halal_mode_private.waitlist set verification_sent_at = now() where id = v_row.id;
  elsif not halal_mode_private.waitlist_issue_token(v_row.id, case when v_row.verified_at is null then 7 else 30 end) then
    raise exception 'Referral links are temporarily unavailable' using errcode = 'P0001';
  end if;
  insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
  values ('waitlist_verification', v_row.id::text, v_row.email, coalesce(v_locale, v_row.locale, 'en'));
  return jsonb_build_object('state', 'sent');
end;
$function$;
revoke all on function public.request_referral_link(text, text) from public, anon, authenticated;
grant execute on function public.request_referral_link(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 4. mail
-- As 20261020110000, plus: p_daily_limit, the provider's own 24-hour quota
-- when the worker knows it (Amazon SES), in place of mail_settings; batches
-- of up to 200; and a welcome carries the confirm link for a friend of an
-- app member as well.
drop function if exists public.claim_mail_service(integer);
create or replace function public.claim_mail_service(p_limit integer default 20, p_daily_limit integer default null)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'halal_mode_private', 'extensions', 'pg_catalog', 'vault'
AS $function$
declare
  v_rows jsonb;
  v_secret text;
  v_daily integer;
  v_room integer;
  v_batch integer := least(greatest(p_limit, 1), 200);
  v_safety bigint[];
  v_other bigint[];
begin
  -- How much of today's budget is left (a rolling 24 hours, as the provider
  -- counts). Waitlist mail leaves the last 10 for safety reports.
  if p_daily_limit is not null and p_daily_limit > 10 then
    v_daily := p_daily_limit;
  else
    select daily_limit into v_daily from halal_mode_private.mail_settings;
  end if;
  v_room := case when v_daily is null then v_batch else greatest(0, v_daily - (
    select count(*)::integer from halal_mode_private.mail_outbox where sent_at > now() - interval '24 hours'
  )) end;

  select array_agg(id) into v_safety from (
    select id from halal_mode_private.mail_outbox
    where sent_at is null and attempts < 12
      and (claimed_until is null or claimed_until < now())
      and kind in ('report', 'moderation')
    order by created_at
    limit least(v_batch, v_room)
    for update skip locked
  ) s;
  select array_agg(id) into v_other from (
    select id from halal_mode_private.mail_outbox
    where sent_at is null and attempts < 12
      and (claimed_until is null or claimed_until < now())
      and kind not in ('report', 'moderation')
    order by created_at
    limit greatest(0, least(
      v_batch - coalesce(cardinality(v_safety), 0),
      case when v_daily is null then v_batch else v_room - 10 - coalesce(cardinality(v_safety), 0) end
    ))
    for update skip locked
  ) o;
  select decrypted_secret into v_secret from vault.decrypted_secrets
  where name = 'halal_mode_waitlist_tokens' order by created_at desc limit 1;

  with claimed as (
    update halal_mode_private.mail_outbox o
    set claimed_until = now() + interval '5 minutes', attempts = o.attempts + 1
    where o.id = any(coalesce(v_safety, '{}') || coalesce(v_other, '{}'))
    returning o.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'kind', c.kind,
    'to', c.to_email,
    'locale', c.locale,
    'welcome', case when c.kind = 'waitlist_welcome' then (
      select jsonb_build_object('eligible', coalesce(w.joined_rank <= 10000, false))
      from halal_mode_private.waitlist w
      where w.id::text = c.ref_id
    ) end,
    'verification', case when c.kind in ('waitlist_verification', 'waitlist_welcome', 'referral_joined') then (
      select jsonb_build_object(
        'token', extensions.pgp_sym_decrypt(decode(w.verification_token_ciphertext, 'base64'), v_secret),
        'confirmed', w.verified_at is not null
      )
      from halal_mode_private.waitlist w
      where w.id::text = c.ref_id
        and w.verification_token_ciphertext is not null
        and w.verification_token_expires_at > now()
        and v_secret is not null
        and (c.kind <> 'waitlist_welcome' or (w.verified_at is null and (
          w.referred_by_id is not null or w.referred_code is not null)))
    ) end,
    'progress', case when c.kind = 'referral_joined' then (
      select halal_mode_private.waitlist_progress(w.id)
      from halal_mode_private.waitlist w
      where w.id::text = c.ref_id
    ) end,
    'moderation', case when c.kind = 'moderation' then public.moderation_item_service(c.ref_id::bigint) end,
    'report', case when c.kind = 'report' then (
      select jsonb_build_object(
        'id', r.id, 'reason', r.reason, 'detail', r.detail, 'created_at', r.created_at,
        'reporter_id', r.reporter_id, 'reporter_name', rp.first_name,
        'subject_id', r.subject_id, 'subject_name', sp.first_name,
        'subject_city', sp.city, 'subject_country', sp.country,
        'subject_paused', sp.is_paused,
        'subject_report_count', (select count(*) from public.reports x where x.subject_id = r.subject_id)
      )
      from public.reports r
      left join public.profiles rp on rp.id = r.reporter_id
      left join public.profiles sp on sp.id = r.subject_id
      where r.id::text = c.ref_id
    ) end
  )), '[]'::jsonb) into v_rows
  from claimed c;
  return v_rows;
end;
$function$;
revoke all on function public.claim_mail_service(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_mail_service(integer, integer) to service_role;

-- ---------------------------------------------------------------- 5. launch Premium
-- How many reward months each member has been given, so a run only adds the
-- difference when a new referral tier is reached.
create table if not exists halal_mode_private.launch_reward_grants (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  months integer not null check (months > 0),
  updated_at timestamptz not null default now()
);
alter table halal_mode_private.launch_reward_grants enable row level security;
revoke all on halal_mode_private.launch_reward_grants from public, anon, authenticated;

-- Brings a member up to p_months of reward in total. Another running Premium
-- (the tester switch, later a purchase) is left alone; the reward is tried
-- again once it ends. Returns whether anything was added.
create or replace function halal_mode_private.grant_launch_reward(p_user_id uuid, p_months integer)
returns boolean
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
declare
  v_given integer;
  v_current halal_mode_private.member_entitlements%rowtype;
  v_has_current boolean;
  v_from timestamptz;
begin
  if p_months is null or p_months <= 0 then
    return false;
  end if;
  select months into v_given from halal_mode_private.launch_reward_grants where user_id = p_user_id;
  v_given := coalesce(v_given, 0);
  if p_months <= v_given then
    return false;
  end if;

  select * into v_current from halal_mode_private.member_entitlements where user_id = p_user_id for update;
  v_has_current := found;
  if v_has_current and coalesce(v_current.provider, '') <> 'launch_reward'
     and v_current.state in ('active', 'grace') then
    return false;
  end if;
  -- Extra months follow on from a reward still running.
  v_from := case
    when v_has_current and v_current.provider = 'launch_reward' and v_current.state = 'active'
         and v_current.expires_at > now() then v_current.expires_at
    else now() end;

  insert into halal_mode_private.member_entitlements (user_id, tier, state, provider, provider_reference_hash, expires_at)
  values (p_user_id, 'premium', 'active', 'launch_reward', null, v_from + make_interval(months => p_months - v_given))
  on conflict (user_id) do update set
    tier = 'premium', state = 'active', provider = 'launch_reward', provider_reference_hash = null,
    expires_at = excluded.expires_at, updated_at = now();
  -- The profile trigger rejects client-controlled tier changes. This function
  -- is a trusted server path, like the tester Premium switch.
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles set tier = 'premium' where id = p_user_id;

  insert into halal_mode_private.launch_reward_grants (user_id, months)
  values (p_user_id, p_months)
  on conflict (user_id) do update set months = excluded.months, updated_at = now();
  insert into halal_mode_private.audit_events (subject_id, event_type, metadata)
  values (p_user_id, 'launch_reward_granted', jsonb_build_object('months', p_months, 'added', p_months - v_given));
  return true;
end;
$function$;
revoke all on function halal_mode_private.grant_launch_reward(uuid, integer) from public, anon, authenticated;

-- Ends rewards whose time is up. Returns how many ended.
create or replace function halal_mode_private.expire_launch_rewards()
returns integer
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
declare
  v_ended integer;
begin
  -- The profile trigger rejects client-controlled tier changes. This function
  -- is a trusted server path, like the tester Premium switch.
  perform set_config('app.account_control_rpc', 'true', true);
  with ended as (
    update halal_mode_private.member_entitlements
    set tier = 'free', state = 'expired', updated_at = now()
    where provider = 'launch_reward' and state = 'active' and expires_at <= now()
    returning user_id
  ), demoted as (
    update public.profiles p set tier = 'free' from ended where p.id = ended.user_id
    returning p.id
  )
  insert into halal_mode_private.audit_events (subject_id, event_type)
  select id, 'launch_reward_expired' from demoted;
  get diagnostics v_ended = row_count;
  return v_ended;
end;
$function$;
revoke all on function halal_mode_private.expire_launch_rewards() from public, anon, authenticated;

-- What a member has earned: 1 month for a first-10,000 place, or 3, 6 or 12
-- for referrals, from their waitlist place (matched by confirmed inbox) and
-- their one referral code.
create or replace function halal_mode_private.launch_reward_months(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
  with member as (
    select u.id, halal_mode_private.canonical_email(u.email) as inbox
    from auth.users u
    where u.id = p_user_id and u.email_confirmed_at is not null
  ), place as (
    select w.* from halal_mode_private.waitlist w, member m
    where w.email_canonical = m.inbox
    order by w.joined_rank nulls last, w.created_at
    limit 1
  ), code as (
    select c.code from halal_mode_private.referral_codes c
    where c.user_id = p_user_id or c.waitlist_id = (select id from place)
    order by (c.user_id = p_user_id) desc nulls last
    limit 1
  )
  select public.waitlist_reward_months(
    coalesce((select joined_rank <= 10000 from place), false),
    coalesce((select (halal_mode_private.referral_progress(code)->>'referral_count')::integer from code), 0)
  );
$function$;
revoke all on function halal_mode_private.launch_reward_months(uuid) from public, anon, authenticated;

-- The scheduled run: end what has run out, then grant what is owed to
-- members whose profile is complete. Returns how many were granted.
create or replace function halal_mode_private.apply_launch_rewards()
returns integer
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
declare
  v_member record;
  v_granted integer := 0;
begin
  perform halal_mode_private.expire_launch_rewards();
  for v_member in
    select p.id
    from public.profiles p
    join auth.users u on u.id = p.id and u.email_confirmed_at is not null
    where (exists (select 1 from halal_mode_private.waitlist w
                   where w.email_canonical = halal_mode_private.canonical_email(u.email))
           or exists (select 1 from halal_mode_private.referral_codes c where c.user_id = p.id))
      and public.profile_is_ready_for_matching(p.id)
  loop
    if halal_mode_private.grant_launch_reward(v_member.id, halal_mode_private.launch_reward_months(v_member.id)) then
      v_granted := v_granted + 1;
    end if;
  end loop;
  return v_granted;
end;
$function$;
revoke all on function halal_mode_private.apply_launch_rewards() from public, anon, authenticated;

do $$
begin
  perform cron.schedule(
    'halal-mode-launch-rewards',
    '*/10 * * * *',
    'select halal_mode_private.apply_launch_rewards()'
  );
end;
$$;

-- ---------------------------------------------------------------- 6. one address for the legal documents
-- Held to src/data/legalDocuments.ts by tests/legalDocuments.test.ts.
update halal_mode_private.legal_document_registry
set url = 'https://halalmo.de/legal/' || document_type
where is_current and document_type in ('terms', 'privacy');

do $$
begin
  assert not exists (
    select 1 from halal_mode_private.legal_document_registry
    where is_current and url <> 'https://halalmo.de/legal/' || document_type
  ), 'every current legal document lives at halalmo.de/legal/';
end;
$$;

-- ---------------------------------------------------------------- 7. the retired join endpoint
-- request_waitlist_verification (the old double opt-in) has had no caller
-- since 20261020100000 closed it and the app's /join screen was removed.
drop function if exists public.request_waitlist_verification(text, text, text, text, text);
