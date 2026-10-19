-- Referral progress, kept private and honest.
--
-- 1. Asking for a referral link with an address that is not on the waitlist now
--    emails that address a short "join first" note. The reply on the page is
--    unchanged, so the form still says nothing about who is on the list. Each
--    address gets at most one such note a day, and at most 100 go out an hour.
-- 2. Opening a link no longer confirms anything by itself: email scanners open
--    links on arrival. waitlist_token_status() only reads; the page's Confirm
--    button calls verify_waitlist_token(), which confirms.
-- 3. A confirmed link keeps working for 30 days as the member's progress page.
-- 4. When a friend's confirmation counts, the referrer gets an email with their
--    progress and a fresh 30-day link.
-- 5. A confirmed member who asks for their link again now actually gets it (the
--    mail worker used to drop it once they had confirmed).

-- ---------------------------------------------------------------- mail kinds
alter table halal_mode_private.mail_outbox drop constraint if exists mail_outbox_kind_check;
alter table halal_mode_private.mail_outbox add constraint mail_outbox_kind_check
  check (kind in ('report', 'waitlist_welcome', 'moderation', 'waitlist_verification',
                  'waitlist_not_joined', 'referral_joined'));

-- ---------------------------------------------------------------- "join first" notes
-- Only a hash of the address is kept, to space the notes out.
create table if not exists halal_mode_private.waitlist_link_requests (
  email_hash text primary key,
  last_sent_at timestamptz not null
);
create index if not exists waitlist_link_requests_recent_idx
  on halal_mode_private.waitlist_link_requests (last_sent_at);
alter table halal_mode_private.waitlist_link_requests enable row level security;
revoke all on halal_mode_private.waitlist_link_requests from public, anon, authenticated;

-- ---------------------------------------------------------------- progress
-- What the member's own page shows. Nothing personal: counts and their link.
create or replace function halal_mode_private.waitlist_progress(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
  select jsonb_build_object(
    'state', 'verified',
    'eligible', coalesce(w.joined_rank <= 10000, false),
    'referral_code', w.referral_code,
    'referral_url', 'https://halalmo.de/?ref=' || w.referral_code,
    'referral_count', r.n,
    'reward_months', public.waitlist_reward_months(coalesce(w.joined_rank <= 10000, false), r.n)
  )
  from halal_mode_private.waitlist w
  cross join lateral (
    select count(*)::integer as n from halal_mode_private.waitlist_referrals x where x.referrer_id = w.id
  ) r
  where w.id = p_id;
$function$;
revoke all on function halal_mode_private.waitlist_progress(uuid) from public, anon, authenticated;

-- A fresh link for a member, valid for p_days, stored hashed and encrypted.
create or replace function halal_mode_private.waitlist_issue_token(p_id uuid, p_days integer)
returns boolean
language plpgsql
security definer
set search_path = halal_mode_private, extensions, pg_catalog, vault
as $function$
declare
  v_secret text;
  v_token text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets
  where name = 'halal_mode_waitlist_tokens' order by created_at desc limit 1;
  if v_secret is null then
    return false;
  end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  update halal_mode_private.waitlist
  set verification_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      verification_token_ciphertext = encode(extensions.pgp_sym_encrypt(v_token, v_secret), 'base64'),
      verification_token_expires_at = now() + make_interval(days => p_days),
      verification_sent_at = now()
  where id = p_id;
  return true;
end;
$function$;
revoke all on function halal_mode_private.waitlist_issue_token(uuid, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------- asking for a link
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
  if (select count(*) from halal_mode_private.waitlist where verification_sent_at > now() - interval '1 hour') >= 500 then
    raise exception 'Please try again in a little while' using errcode = 'P0001';
  end if;

  select * into v_row from halal_mode_private.waitlist where email = v_email for update;

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

  if v_row.verification_sent_at > now() - interval '10 minutes'
     and v_row.verification_token_expires_at > now() then
    return jsonb_build_object('state', 'sent');
  end if;

  -- A member who has confirmed gets a 30-day progress link; otherwise the
  -- confirm link lasts 7 days.
  if not halal_mode_private.waitlist_issue_token(v_row.id, case when v_row.verified_at is null then 7 else 30 end) then
    raise exception 'Referral links are temporarily unavailable' using errcode = 'P0001';
  end if;
  insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
  values ('waitlist_verification', v_row.id::text, v_row.email, coalesce(v_locale, v_row.locale, 'en'));
  return jsonb_build_object('state', 'sent');
end;
$function$;
revoke all on function public.request_referral_link(text, text) from public, anon, authenticated;
grant execute on function public.request_referral_link(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- reading a link
-- Opening a link only reads. An unconfirmed link says so and nothing more.
create or replace function public.waitlist_token_status(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog
as $function$
declare
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_row halal_mode_private.waitlist%rowtype;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    raise exception 'This waitlist link is invalid or expired' using errcode = '22023';
  end if;
  select * into v_row
  from halal_mode_private.waitlist
  where verification_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
    and verification_token_expires_at > now();
  if not found then
    raise exception 'This waitlist link is invalid or expired' using errcode = '22023';
  end if;
  if v_row.verified_at is null or v_row.referral_code is null then
    return jsonb_build_object('state', 'unconfirmed');
  end if;
  return halal_mode_private.waitlist_progress(v_row.id);
end;
$function$;
revoke all on function public.waitlist_token_status(text) from public, anon, authenticated;
grant execute on function public.waitlist_token_status(text) to service_role;

-- ---------------------------------------------------------------- confirming
-- Called by the page's Confirm button. Confirming keeps the link working for
-- 30 days, and a newly counted referral emails the referrer their progress.
create or replace function public.verify_waitlist_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog, vault
as $function$
declare
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_row halal_mode_private.waitlist%rowtype;
  v_code text;
  v_verified_rank integer;
  v_referrer halal_mode_private.waitlist%rowtype;
  v_counted integer;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    raise exception 'This waitlist link is invalid or expired' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('waitlist-verification-order', 1818));

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
        null;
      end;
    end loop;
  else
    update halal_mode_private.waitlist
    set verified_at = coalesce(verified_at, now())
    where id = v_row.id;
  end if;
  -- The same link now serves as the progress page for 30 days.
  update halal_mode_private.waitlist
  set verification_token_expires_at = greatest(verification_token_expires_at, now() + interval '30 days')
  where id = v_row.id;

  select * into v_row from halal_mode_private.waitlist where id = v_row.id;

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

  return halal_mode_private.waitlist_progress(v_row.id);
end;
$function$;
revoke all on function public.verify_waitlist_token(text) from public, anon, authenticated;
grant execute on function public.verify_waitlist_token(text) to service_role;

-- ---------------------------------------------------------------- mail worker
-- Adds the two new notes, and sends a confirmed member's link again.
create or replace function public.claim_mail_service(p_limit int default 20)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions, pg_catalog, vault
as $function$
declare
  v_rows jsonb;
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets
  where name = 'halal_mode_waitlist_tokens' order by created_at desc limit 1;

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
        and (c.kind <> 'waitlist_welcome' or (w.verified_at is null and w.referred_by_id is not null))
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
revoke all on function public.claim_mail_service(int) from public, anon, authenticated;
grant execute on function public.claim_mail_service(int) to service_role;
