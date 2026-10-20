-- Waitlist launch hardening.
--
-- 1. Joining: the global cap of 500 new places an hour would have turned
--    real people away on a busy day. It is now 10,000 an hour, with a
--    per-network limit (5 new places an hour from one address, kept only as
--    a hash for a day) to slow bots instead. The limits are checked before
--    the address is looked up, so an existing member and a new one get the
--    same reply, and `eligible` no longer depends on the address given: it
--    says whether first-10,000 places are still open, the same for everyone.
-- 2. Asking for a referral link again reuses a link that is still valid, so
--    an earlier email keeps working, and repeat requests are spaced an hour
--    apart instead of ten minutes.
-- 3. The old app join endpoint (request_waitlist_verification), which sent a
--    confirm email for every attempt, is closed to the public; the app's
--    join page now uses join_waitlist_now like the website.
-- 4. Referrals: a friend already counted on the waitlist is not counted
--    again when the same person joins the app with the same code.
-- 5. Mail: retries back off (2 minutes doubling, up to 6 hours) for 12
--    attempts instead of 6 quick ones, safety mail goes first, and the
--    worker runs every minute.

-- ---------------------------------------------------------------- joining
create table if not exists halal_mode_private.waitlist_intake_sources (
  source_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists waitlist_intake_sources_recent_idx
  on halal_mode_private.waitlist_intake_sources (source_hash, created_at);
alter table halal_mode_private.waitlist_intake_sources enable row level security;
revoke all on halal_mode_private.waitlist_intake_sources from public, anon, authenticated;

-- The caller's address as the API gateway reports it, hashed; null when the
-- request did not come through the gateway (SQL editor, tests).
create or replace function halal_mode_private.request_source_hash()
returns text
language plpgsql
stable
set search_path = pg_catalog, extensions
as $function$
declare
  v_headers jsonb;
  v_source text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return null;
  end;
  v_source := btrim(split_part(coalesce(
    v_headers ->> 'cf-connecting-ip',
    v_headers ->> 'x-real-ip',
    v_headers ->> 'x-forwarded-for', ''), ',', 1));
  if v_source = '' then
    return null;
  end if;
  return encode(extensions.digest('halal-mode-intake:' || v_source, 'sha256'), 'hex');
end;
$function$;
revoke all on function halal_mode_private.request_source_hash() from public, anon, authenticated;

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
  v_city text := btrim(coalesce(p_city, ''));
  v_locale text := nullif(btrim(coalesce(p_locale, '')), '');
  v_referral_code text := upper(btrim(coalesce(p_referral_code, '')));
  v_source text := halal_mode_private.request_source_hash();
  v_referrer_id uuid;
  v_row halal_mode_private.waitlist%rowtype;
  v_new boolean := false;
  v_token text;
  v_secret text;
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

  -- Limits first, for every caller, so the reply never depends on whether
  -- the address is already on the list.
  if (select count(*) from halal_mode_private.waitlist where created_at > now() - interval '1 hour') >= 10000
     or (select count(*) from halal_mode_private.waitlist) >= 1000000 then
    raise exception 'Waitlist intake is temporarily full' using errcode = 'P0001';
  end if;
  if v_source is not null and (
    select count(*) from halal_mode_private.waitlist_intake_sources
    where source_hash = v_source and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many sign-ups from this network' using errcode = 'P0001';
  end if;

  v_open := coalesce((select max(joined_rank) from halal_mode_private.waitlist), 0) < 10000;

  select * into v_row from halal_mode_private.waitlist where email = v_email for update;
  if not found then
    insert into halal_mode_private.waitlist (email, city, age_range, locale, joined_rank)
    values (v_email, v_city, p_age_range, v_locale,
            coalesce((select max(joined_rank) from halal_mode_private.waitlist), 0) + 1)
    returning * into v_row;
    v_new := true;
    if v_source is not null then
      insert into halal_mode_private.waitlist_intake_sources (source_hash) values (v_source);
      delete from halal_mode_private.waitlist_intake_sources where created_at < now() - interval '1 day';
    end if;
  elsif v_row.joined_rank is null then
    update halal_mode_private.waitlist
    set joined_rank = coalesce((select max(joined_rank) from halal_mode_private.waitlist), 0) + 1
    where id = v_row.id
    returning * into v_row;
  end if;

  -- First-touch attribution, only to a referrer who has confirmed their email.
  if v_row.referred_by_id is null and v_referral_code ~ '^HM[A-Z0-9]{8}$' then
    select id into v_referrer_id
    from halal_mode_private.waitlist
    where referral_code = v_referral_code and verified_at is not null and id <> v_row.id;
    if v_referrer_id is not null then
      update halal_mode_private.waitlist set referred_by_id = v_referrer_id
      where id = v_row.id and referred_by_id is null
      returning * into v_row;
    end if;
  end if;

  if v_new then
    -- A referred member's welcome email carries a confirm link, so the
    -- referral can count; everyone else simply gets the thank-you.
    if v_row.referred_by_id is not null then
      select decrypted_secret into v_secret from vault.decrypted_secrets
      where name = 'halal_mode_waitlist_tokens' order by created_at desc limit 1;
      if v_secret is not null then
        v_token := encode(extensions.gen_random_bytes(32), 'hex');
        update halal_mode_private.waitlist
        set verification_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
            verification_token_ciphertext = encode(extensions.pgp_sym_encrypt(v_token, v_secret), 'base64'),
            verification_token_expires_at = now() + interval '30 days',
            verification_sent_at = now()
        where id = v_row.id;
      end if;
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

-- The old join endpoint is retired for public callers.
revoke all on function public.request_waitlist_verification(text, text, text, text, text)
  from public, anon, authenticated;

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
  if (select count(*) from halal_mode_private.waitlist where verification_sent_at > now() - interval '1 hour') >= 2000 then
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

-- ---------------------------------------------------------------- referrals
-- A member referral whose account email matches a waitlist place the same
-- referrer already has counted is the same friend: count them once.
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
           and (m.counted_at is not null or public.profile_is_ready_for_matching(m.referred_user_id))
           and not exists (
             select 1
             from owner o
             join halal_mode_private.waitlist_referrals r on r.referrer_id = o.waitlist_id
             join halal_mode_private.waitlist friend on friend.id = r.referred_id
             join auth.users u on u.id = m.referred_user_id
             where friend.email = lower(btrim(u.email))
           ))
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

-- ---------------------------------------------------------------- mail
-- A failed send waits 2, 4, 8 ... minutes (at most 6 hours) before the next
-- try, so a provider outage or quota reset does not use up every attempt.
create or replace function public.settle_mail_service(p_id bigint, p_ok boolean, p_error text default null)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update halal_mode_private.mail_outbox
  set sent_at = case when p_ok then now() else null end,
      claimed_until = case when p_ok then claimed_until
        else now() + make_interval(mins => least(360, power(2, greatest(attempts, 1))::integer)) end,
      last_error = case when p_ok then null else left(p_error, 500) end
  where id = p_id;
$function$;
revoke all on function public.settle_mail_service(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.settle_mail_service(bigint, boolean, text) to service_role;

-- Safety mail first, and 12 spaced attempts instead of 6 quick ones.
create or replace function public.claim_mail_service(p_limit integer default 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'halal_mode_private', 'extensions', 'pg_catalog', 'vault'
AS $function$
declare
  v_rows jsonb;
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets
  where name = 'halal_mode_waitlist_tokens' order by created_at desc limit 1;

  with picked as (
    select id from halal_mode_private.mail_outbox
    where sent_at is null and attempts < 12
      and (claimed_until is null or claimed_until < now())
    -- Safety reports and moderation go before waitlist mail.
    order by (kind in ('report', 'moderation')) desc, created_at
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

-- The worker runs every minute and keeps going while anything can still be sent.
do $$
declare
  v_job bigint;
begin
  select jobid into v_job from cron.job where jobname = 'halal-mode-send-mail';
  if v_job is not null then
    perform cron.alter_job(
      v_job,
      schedule := '* * * * *',
      command := replace((select command from cron.job where jobid = v_job), 'attempts < 6', 'attempts < 12')
    );
  end if;
end;
$$;
