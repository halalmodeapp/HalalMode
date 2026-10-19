-- Email verification and first-touch referrals for the public waitlist.
--
-- The existing waitlist rows are deliberately left unverified. A person's
-- place in the first-10,000 offer is earned when they verify, not guessed from
-- an old signup timestamp that was never a verification event.

alter table halal_mode_private.waitlist
  add column if not exists verified_at timestamptz,
  add column if not exists verification_token_hash text,
  add column if not exists verification_token_ciphertext text,
  add column if not exists verification_token_expires_at timestamptz,
  add column if not exists verification_sent_at timestamptz,
  add column if not exists referral_code text,
  add column if not exists referred_by_id uuid,
  add column if not exists verified_rank integer;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class r on r.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = r.relnamespace
    where c.conname = 'waitlist_referred_by_fk'
      and r.relname = 'waitlist'
      and n.nspname = 'halal_mode_private'
  ) then
    alter table halal_mode_private.waitlist
      add constraint waitlist_referred_by_fk
      foreign key (referred_by_id)
      references halal_mode_private.waitlist(id)
      on delete set null;
  end if;
  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class r on r.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = r.relnamespace
    where c.conname = 'waitlist_not_self_referred'
      and r.relname = 'waitlist'
      and n.nspname = 'halal_mode_private'
  ) then
    alter table halal_mode_private.waitlist
      add constraint waitlist_not_self_referred
      check (referred_by_id is null or referred_by_id <> id);
  end if;
end;
$$;

create unique index if not exists waitlist_referral_code_unique
  on halal_mode_private.waitlist (referral_code)
  where referral_code is not null;
create unique index if not exists waitlist_verification_token_hash_unique
  on halal_mode_private.waitlist (verification_token_hash)
  where verification_token_hash is not null;
create index if not exists waitlist_verified_order_idx
  on halal_mode_private.waitlist (verified_at, id)
  where verified_at is not null;
create index if not exists waitlist_verified_rank_idx
  on halal_mode_private.waitlist (verified_rank)
  where verified_rank is not null;
create index if not exists waitlist_referred_by_idx
  on halal_mode_private.waitlist (referred_by_id)
  where referred_by_id is not null;

create table if not exists halal_mode_private.waitlist_referrals (
  referrer_id uuid not null references halal_mode_private.waitlist(id) on delete cascade,
  referred_id uuid primary key references halal_mode_private.waitlist(id) on delete cascade,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint waitlist_referrals_not_self check (referrer_id <> referred_id)
);
create index if not exists waitlist_referrals_referrer_idx
  on halal_mode_private.waitlist_referrals (referrer_id, verified_at);
alter table halal_mode_private.waitlist_referrals enable row level security;
revoke all on halal_mode_private.waitlist_referrals from public, anon, authenticated;

-- Tokens are encrypted at rest so the email worker can use them without
-- putting a bearer token in the mail outbox or exposing it to the API.
do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'halal_mode_waitlist_tokens'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'halal_mode_waitlist_tokens'
    );
  end if;
end;
$$;

alter table halal_mode_private.mail_outbox drop constraint if exists mail_outbox_kind_check;
alter table halal_mode_private.mail_outbox add constraint mail_outbox_kind_check
  check (kind in ('report', 'waitlist_welcome', 'moderation', 'waitlist_verification'));

-- One formula for every caller. Referral rewards replace the first-month
-- reward rather than stacking on top of it.
create or replace function public.waitlist_reward_months(
  p_eligible boolean,
  p_referral_count integer
) returns integer
language sql
immutable
as $function$
  select case
    when greatest(coalesce(p_referral_count, 0), 0) >= 10 then 12
    when greatest(coalesce(p_referral_count, 0), 0) >= 5 then 6
    when greatest(coalesce(p_referral_count, 0), 0) >= 3 then 3
    when coalesce(p_eligible, false) then 1
    else 0
  end;
$function$;
revoke all on function public.waitlist_reward_months(boolean, integer) from public, anon, authenticated;
grant execute on function public.waitlist_reward_months(boolean, integer) to service_role;

-- This only answers whether a referral code is live. It never returns an
-- address, a person id, or a waitlist status.
create or replace function public.referral_code_exists(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
  select exists (
    select 1
    from halal_mode_private.waitlist
    where referral_code = upper(trim(coalesce(p_code, '')))
      and verified_at is not null
  );
$function$;
revoke all on function public.referral_code_exists(text) from public, anon, authenticated;
grant execute on function public.referral_code_exists(text) to anon, authenticated;

-- The public form calls this instead of writing directly to the private table.
-- It returns the same generic state for a new, pending, or already verified
-- address, so the open endpoint cannot be used to enumerate the waitlist.
create or replace function public.request_waitlist_verification(
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
  v_email text := lower(trim(coalesce(p_email, '')));
  v_city text := trim(coalesce(p_city, ''));
  v_locale text := nullif(btrim(coalesce(p_locale, '')), '');
  v_referral_code text := upper(trim(coalesce(p_referral_code, '')));
  v_referrer_id uuid;
  v_row halal_mode_private.waitlist%rowtype;
  v_exists boolean;
  v_token text;
  v_secret text;
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or length(v_email) not between 6 and 254 then
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

  -- This lock keeps the rate/cap check and first-write insert atomic even when
  -- several public requests arrive at exactly the same time.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('waitlist-intake', 1818)
  );
  select exists (
    select 1 from halal_mode_private.waitlist where email = v_email
  ) into v_exists;
  if not v_exists and (
    (select count(*) from halal_mode_private.waitlist
     where created_at > now() - interval '1 hour') >= 500
    or (select count(*) from halal_mode_private.waitlist) >= 100000
  ) then
    raise exception 'Waitlist intake is temporarily full' using errcode = 'P0001';
  end if;

  insert into halal_mode_private.waitlist (email, city, age_range, locale)
  values (v_email, v_city, p_age_range, v_locale)
  on conflict (email) do nothing;

  select * into v_row
  from halal_mode_private.waitlist
  where email = v_email
  for update;

  -- First-touch attribution is stored once, and only for an existing verified
  -- referrer. Invalid or unverified codes never enter the database.
  if v_row.referred_by_id is null
     and v_referral_code ~ '^HM[A-Z0-9]{8}$' then
    select id into v_referrer_id
    from halal_mode_private.waitlist
    where referral_code = v_referral_code
      and verified_at is not null
      and id <> v_row.id;
    if v_referrer_id is not null then
      update halal_mode_private.waitlist
      set referred_by_id = v_referrer_id
      where id = v_row.id and referred_by_id is null;
      v_row.referred_by_id := v_referrer_id;
    end if;
  end if;

  -- A repeated click within ten minutes does not send another email. A later
  -- click may refresh an expired or lost token, but it still keeps the same
  -- first signup row and any already recorded attribution.
  if v_row.verified_at is not null
     or (v_row.verification_sent_at is not null
         and v_row.verification_sent_at > now() - interval '10 minutes'
         and v_row.verification_token_hash is not null
         and v_row.verification_token_expires_at > now()) then
    return jsonb_build_object('state', 'verification_required');
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'halal_mode_waitlist_tokens'
  order by created_at desc
  limit 1;
  if v_secret is null then
    raise exception 'Waitlist verification is temporarily unavailable' using errcode = 'P0001';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  update halal_mode_private.waitlist
  set verification_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      verification_token_ciphertext = encode(extensions.pgp_sym_encrypt(v_token, v_secret), 'base64'),
      verification_token_expires_at = now() + interval '7 days',
      verification_sent_at = now()
  where id = v_row.id;

  insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
  values ('waitlist_verification', v_row.id::text, v_row.email, coalesce(v_row.locale, v_locale, 'en'));

  return jsonb_build_object('state', 'verification_required');
end;
$function$;

revoke all on function public.request_waitlist_verification(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.request_waitlist_verification(text, text, text, text, text) to anon, authenticated;

-- Keep the original four-argument RPC working for old app builds and other
-- callers. New callers use the result-returning function above.
create or replace function public.join_waitlist(
  p_email text,
  p_city text,
  p_age_range text,
  p_locale text default null
) returns void
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog, vault
as $function$
begin
  perform public.request_waitlist_verification(p_email, p_city, p_age_range, p_locale, null);
end;
$function$;
revoke all on function public.join_waitlist(text, text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text, text) to anon, authenticated;

-- Exchange a one-time bearer token for the minimum information the page needs
-- to show the verified state and share controls. No email is returned.
create or replace function public.verify_waitlist_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog
as $function$
declare
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_row halal_mode_private.waitlist%rowtype;
  v_code text;
  v_referral_count integer;
  v_verified_rank integer;
  v_reward_months integer;
  v_eligible boolean;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    raise exception 'This waitlist link is invalid or expired' using errcode = '22023';
  end if;

  -- Rank assignment is a small, infrequent operation. Serializing it makes
  -- the 10,000 boundary deterministic even when two people verify together.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('waitlist-verification-order', 1818)
  );

  select * into v_row
  from halal_mode_private.waitlist
  where verification_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
    and verification_token_expires_at > now()
  for update;
  if not found then
    raise exception 'This waitlist link is invalid or expired' using errcode = '22023';
  end if;

  if v_row.referral_code is null then
    loop
      v_code := 'HM' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
      begin
        update halal_mode_private.waitlist
        set verified_at = coalesce(verified_at, now()), referral_code = v_code
        where id = v_row.id;
        exit;
      exception when unique_violation then
        -- A random collision is harmless; choose another code in the same
        -- transaction rather than returning a 500 to the person verifying.
        null;
      end;
    end loop;
  else
    update halal_mode_private.waitlist
    set verified_at = coalesce(verified_at, now())
    where id = v_row.id;
  end if;

  select * into v_row from halal_mode_private.waitlist where id = v_row.id;

  if v_row.referred_by_id is not null then
    insert into halal_mode_private.waitlist_referrals (referrer_id, referred_id, verified_at)
    values (v_row.referred_by_id, v_row.id, v_row.verified_at)
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
  else
    v_verified_rank := v_row.verified_rank;
  end if;

  select count(*)::integer into v_referral_count
  from halal_mode_private.waitlist_referrals r
  where r.referrer_id = v_row.id;

  v_eligible := v_verified_rank <= 10000;
  v_reward_months := public.waitlist_reward_months(v_eligible, v_referral_count);

  return jsonb_build_object(
    'state', 'verified',
    'eligible', v_eligible,
    'verified_rank', v_verified_rank,
    'referral_code', v_row.referral_code,
    'referral_url', 'https://halalmo.de/?ref=' || v_row.referral_code,
    'referral_count', v_referral_count,
    'reward_months', v_reward_months
  );
end;
$function$;

revoke all on function public.verify_waitlist_token(text) from public, anon, authenticated;
grant execute on function public.verify_waitlist_token(text) to service_role;

-- The mail worker is the only caller that can read the encrypted token. It
-- receives the token as a short-lived claim payload, never from the API.
create or replace function public.claim_mail_service(p_limit int default 20)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog, vault
as $function$
declare
  v_rows jsonb;
begin
  with picked as (
    select id from halal_mode_private.mail_outbox
    where sent_at is null and attempts < 6
      and (claimed_until is null or claimed_until < now())
    order by created_at
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  ), claimed as (
    update halal_mode_private.mail_outbox o
    set claimed_until = now() + interval '5 minutes', attempts = o.attempts + 1
    from picked where o.id = picked.id
    returning o.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'kind', c.kind,
    'to', c.to_email,
    'locale', c.locale,
    'verification', case when c.kind = 'waitlist_verification' then (
      select jsonb_build_object(
        'token', extensions.pgp_sym_decrypt(
          decode(w.verification_token_ciphertext, 'base64'),
          (select decrypted_secret from vault.decrypted_secrets
           where name = 'halal_mode_waitlist_tokens'
           order by created_at desc limit 1)
        )
      )
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

revoke all on function public.claim_mail_service(int) from public, anon, authenticated;
grant execute on function public.claim_mail_service(int) to service_role;
