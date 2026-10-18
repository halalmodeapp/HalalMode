-- Instant waitlist joins; email confirmation only for referrals.
--
-- Joining the waitlist no longer needs a confirmation click. A signup is saved
-- at once, takes the next place in line, and gets a thank-you email. The first
-- 10,000 places carry the free month of Premium, counted by when people
-- joined. Signups from before the verification step count too, in the order
-- they joined.
--
-- Confirmation remains where it protects the referral rewards:
-- - to get a referral link, a member confirms their email from /refer;
-- - a referred member's welcome email carries a confirm link, and the
--   referral counts once they use it.
--
-- Obvious throwaway addresses (placeholder domains, made-up endings, keyboard
-- mashes, disposable inboxes, common typos) are refused here as well as in
-- the browser, so the public endpoint cannot be filled with junk.

alter table halal_mode_private.waitlist
  add column if not exists joined_rank integer;
create unique index if not exists waitlist_joined_rank_unique
  on halal_mode_private.waitlist (joined_rank)
  where joined_rank is not null;

-- Existing signups keep their place in line.
with ordered as (
  select id, row_number() over (order by created_at, id)::integer as rank
  from halal_mode_private.waitlist
  where joined_rank is null
)
update halal_mode_private.waitlist w
set joined_rank = ordered.rank + coalesce((select max(joined_rank) from halal_mode_private.waitlist), 0)
from ordered
where w.id = ordered.id;

-- ---------------------------------------------------------------- email checks
-- Mirrored in site/waitlist-email.js; keep the two in step.
create or replace function public.waitlist_email_plausible(p_email text)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $function$
declare
  v text := lower(btrim(coalesce(p_email, '')));
  v_local text;
  v_domain text;
  v_labels text[];
  v_tld text;
  v_name text;
  v_label text;
begin
  if length(v) not between 6 and 254
     or v !~ '^[a-z0-9._%+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$' then
    return false;
  end if;
  v_local := split_part(v, '@', 1);
  v_domain := split_part(v, '@', 2);
  if length(v_local) > 64 or v_local ~ '(^\.|\.$|\.\.)' then
    return false;
  end if;

  v_labels := string_to_array(v_domain, '.');
  foreach v_label in array v_labels loop
    if v_label = '' or length(v_label) > 63 or v_label ~ '(^-|-$)' then
      return false;
    end if;
  end loop;
  v_tld := v_labels[array_length(v_labels, 1)];
  v_name := v_labels[array_length(v_labels, 1) - 1];

  -- Endings: any two-letter country code, or a known generic ending.
  if v_tld !~ '^[a-z]{2,}$' then
    return false;
  end if;
  if length(v_tld) > 2 and not v_tld = any (array[
    'com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro', 'mobi', 'asia',
    'app', 'dev', 'online', 'site', 'store', 'shop', 'tech', 'xyz', 'club', 'blog', 'live', 'life',
    'email', 'cloud', 'page', 'space', 'website', 'world', 'one', 'family', 'love', 'studio',
    'design', 'media', 'news', 'agency', 'company', 'group', 'team', 'today', 'digital', 'network',
    'solutions', 'services', 'systems', 'consulting', 'academy', 'education', 'school', 'health',
    'care', 'law', 'legal', 'finance', 'money', 'capital', 'global', 'international', 'london',
    'nyc', 'paris', 'berlin', 'dubai', 'istanbul', 'africa', 'mail', 'me', 'icu', 'top', 'vip',
    'work', 'works', 'co', 'io', 'ai'
  ]) then
    return false;
  end if;
  if v_tld in ('test', 'invalid', 'localhost', 'example', 'local') then
    return false;
  end if;

  -- Placeholder, disposable and mistyped domains.
  if v_domain = any (array[
    'example.com', 'example.org', 'example.net', 'test.com', 'testing.com', 'domain.com',
    'fake.com', 'fakeemail.com', 'none.com', 'nomail.com', 'noemail.com', 'no.com', 'asdf.com',
    'qwerty.com', 'blah.com', 'blahblah.com', 'foo.com', 'bar.com', 'foobar.com',
    'mailinator.com', 'guerrillamail.com', 'sharklasers.com', '10minutemail.com', 'tempmail.com',
    'temp-mail.org', 'yopmail.com', 'trashmail.com', 'dispostable.com', 'getnada.com', 'maildrop.cc',
    'throwawaymail.com', 'fakeinbox.com', 'mintemail.com',
    'gmail.co', 'gmail.con', 'gmail.cm', 'gmial.com', 'gmai.com', 'gamil.com', 'gnail.com', 'gmaill.com',
    'hotmial.com', 'hotmail.con', 'hotmal.com', 'hotmai.com', 'yahoo.con', 'yaho.com', 'yahooo.com',
    'outlok.com', 'outlook.con', 'iclod.com', 'icloud.con'
  ]) then
    return false;
  end if;

  -- Keyboard mashes and filler words.
  if v_name ~ '^(blah)+$' or v_local ~ '^(blah)+$'
     or v_name ~ '(.)\1{3,}' or v_local ~ '^(.)\1{3,}$'
     or (length(v_name) >= 5 and v_name !~ '[aeiouy0-9]')
     or v_name in ('asdf', 'asdfgh', 'asdfghjkl', 'qwerty', 'qwertyuiop', 'zxcv', 'hjkl', 'sdfg', 'test', 'testing', 'fake', 'none', 'nothing', 'nobody', 'null', 'sample', 'example', 'lorem', 'ipsum')
     or (v_local in ('test', 'asdf', 'qwerty', 'fake', 'none', 'nobody', 'null', 'sample', 'example', 'abc', 'xxx', 'aaa', 'noreply', 'no-reply') and length(v_name) <= 4)
  then
    return false;
  end if;
  return true;
end;
$function$;
revoke all on function public.waitlist_email_plausible(text) from public;
grant execute on function public.waitlist_email_plausible(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- joining
-- Saves the signup at once and reports whether its place carries the free
-- month. A repeat signup from the same address returns the same shape and
-- sends no second email, so the endpoint does not reveal who is listed.
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
  v_referrer_id uuid;
  v_row halal_mode_private.waitlist%rowtype;
  v_new boolean := false;
  v_token text;
  v_secret text;
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

  -- One lock keeps the intake cap, the insert and the place in line atomic.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('waitlist-intake', 1818));

  select * into v_row from halal_mode_private.waitlist where email = v_email for update;
  if not found then
    if (select count(*) from halal_mode_private.waitlist where created_at > now() - interval '1 hour') >= 500
       or (select count(*) from halal_mode_private.waitlist) >= 100000 then
      raise exception 'Waitlist intake is temporarily full' using errcode = 'P0001';
    end if;
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

  return jsonb_build_object('state', 'joined', 'eligible', v_row.joined_rank <= 10000);
end;
$function$;
revoke all on function public.join_waitlist_now(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.join_waitlist_now(text, text, text, text, text) to anon, authenticated;

-- Old callers (earlier app builds) join the same way.
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
  perform public.join_waitlist_now(p_email, p_city, p_age_range, p_locale, null);
end;
$function$;
revoke all on function public.join_waitlist(text, text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- referral links
-- A member asks for their referral link from /refer. If the address is on the
-- waitlist, a confirm link is emailed; the reply is the same either way.
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
  v_token text;
  v_secret text;
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
  if not found
     or (v_row.verification_sent_at > now() - interval '10 minutes'
         and v_row.verification_token_expires_at > now()) then
    return jsonb_build_object('state', 'sent');
  end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets
  where name = 'halal_mode_waitlist_tokens' order by created_at desc limit 1;
  if v_secret is null then
    raise exception 'Referral links are temporarily unavailable' using errcode = 'P0001';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  update halal_mode_private.waitlist
  set verification_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      verification_token_ciphertext = encode(extensions.pgp_sym_encrypt(v_token, v_secret), 'base64'),
      verification_token_expires_at = now() + interval '7 days',
      verification_sent_at = now()
  where id = v_row.id;
  insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
  values ('waitlist_verification', v_row.id::text, v_row.email, coalesce(v_locale, v_row.locale, 'en'));
  return jsonb_build_object('state', 'sent');
end;
$function$;
revoke all on function public.request_referral_link(text, text) from public, anon, authenticated;
grant execute on function public.request_referral_link(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- confirming
-- Same as before, except the free month follows the place in line.
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
  end if;

  select count(*)::integer into v_referral_count
  from halal_mode_private.waitlist_referrals r
  where r.referrer_id = v_row.id;

  v_eligible := coalesce(v_row.joined_rank <= 10000, false);
  v_reward_months := public.waitlist_reward_months(v_eligible, v_referral_count);

  return jsonb_build_object(
    'state', 'verified',
    'eligible', v_eligible,
    'referral_code', v_row.referral_code,
    'referral_url', 'https://halalmo.de/?ref=' || v_row.referral_code,
    'referral_count', v_referral_count,
    'reward_months', v_reward_months
  );
end;
$function$;
revoke all on function public.verify_waitlist_token(text) from public, anon, authenticated;
grant execute on function public.verify_waitlist_token(text) to service_role;

-- ---------------------------------------------------------------- mail worker
-- Welcome mail now carries whether the place includes the free month and, for
-- a referred member, the confirm link that credits their referrer.
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
    'verification', case when c.kind in ('waitlist_verification', 'waitlist_welcome') then (
      select jsonb_build_object(
        'token', extensions.pgp_sym_decrypt(decode(w.verification_token_ciphertext, 'base64'), v_secret)
      )
      from halal_mode_private.waitlist w
      where w.id::text = c.ref_id
        and w.verification_token_ciphertext is not null
        and w.verification_token_expires_at > now()
        and w.verified_at is null
        and v_secret is not null
        and (c.kind = 'waitlist_verification' or w.referred_by_id is not null)
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
