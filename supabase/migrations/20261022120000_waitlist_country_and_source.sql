-- Where waitlist sign-ups come from (owner's request, 22 Oct):
--   * country_code: the country the sign-up came from, taken from the API
--     gateway's country header. Never asked for and never an address.
--   * source: where the visitor arrived from (utm_source/utm_medium/
--     utm_campaign from an ad or post link, or the referring site), saved
--     with the first sign-up only.
-- Both are first-touch: a repeat sign-up never overwrites them. Neither is
-- ever shown to anyone but an admin, and only as totals.

alter table halal_mode_private.waitlist
  add column if not exists country_code text,
  add column if not exists source text;

alter table halal_mode_private.waitlist
  drop constraint if exists waitlist_country_code_shape,
  add constraint waitlist_country_code_shape check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  drop constraint if exists waitlist_source_shape,
  add constraint waitlist_source_shape check (source is null or source ~ '^[a-z0-9._~:/-]{1,80}$');

-- The caller's country as the API gateway reports it; null when the request
-- did not come through the gateway (SQL editor, tests) or the country is
-- unknown (XX) or Tor (T1).
create or replace function halal_mode_private.request_country_code()
returns text
language plpgsql
stable
set search_path = pg_catalog
as $function$
declare
  v_headers jsonb;
  v_country text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return null;
  end;
  v_country := upper(btrim(coalesce(v_headers ->> 'cf-ipcountry', '')));
  if v_country !~ '^[A-Z]{2}$' or v_country in ('XX', 'T1') then
    return null;
  end if;
  return v_country;
end;
$function$;
revoke all on function halal_mode_private.request_country_code() from public, anon, authenticated;

-- join_waitlist_now gains an optional sixth argument. The five-argument
-- version is replaced, not kept beside it, so a call can never be ambiguous;
-- a page still sending five arguments keeps working through the default.
drop function if exists public.join_waitlist_now(text, text, text, text, text);

create or replace function public.join_waitlist_now(
  p_email text,
  p_city text,
  p_age_range text,
  p_locale text default null,
  p_referral_code text default null,
  p_source text default null
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
  -- Anything that is not a short, plain label is dropped rather than refused:
  -- an odd source must never stop someone joining.
  v_source text := lower(btrim(coalesce(p_source, '')));
  v_country text := halal_mode_private.request_country_code();
  v_owner halal_mode_private.referral_codes%rowtype;
  v_owner_email text;
  v_referrer_id uuid;
  v_row halal_mode_private.waitlist%rowtype;
  v_new boolean := false;
  v_open boolean;
begin
  if v_source !~ '^[a-z0-9._~:/-]{1,80}$' then
    v_source := null;
  end if;
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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('waitlist-intake', 1818));
  if (select count(*) from halal_mode_private.waitlist) >= 1000000 then
    raise exception 'Waitlist intake is temporarily full' using errcode = 'P0001';
  end if;
  v_open := coalesce((select max(joined_rank) from halal_mode_private.waitlist), 0) < 10000;

  select * into v_row
  from halal_mode_private.waitlist
  where email_canonical = v_canonical
  order by (email = v_email) desc, joined_rank nulls last, created_at
  limit 1
  for update;

  if not found then
    insert into halal_mode_private.waitlist (email, city, age_range, locale, joined_rank, country_code, source)
    values (v_email, v_city, p_age_range, v_locale,
            coalesce((select max(joined_rank) from halal_mode_private.waitlist), 0) + 1,
            v_country, v_source)
    returning * into v_row;
    v_new := true;
  elsif v_row.joined_rank is null then
    update halal_mode_private.waitlist
    set joined_rank = coalesce((select max(joined_rank) from halal_mode_private.waitlist), 0) + 1
    where id = v_row.id
    returning * into v_row;
  end if;

  -- Keep first-touch attribution, and never credit the same inbox.
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
    insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
    values ('waitlist_welcome', v_row.id::text, v_row.email, coalesce(v_row.locale, v_locale, 'en'));
  end if;

  return jsonb_build_object('state', 'joined', 'eligible', v_open);
end;
$function$;
revoke all on function public.join_waitlist_now(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.join_waitlist_now(text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The admin panel's view: totals by country and by source, nothing per person.
-- ---------------------------------------------------------------------------

create or replace function public.admin_waitlist_origins()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
begin
  perform halal_mode_private.require_admin(false);
  return jsonb_build_object(
    'total', (select count(*) from halal_mode_private.waitlist),
    'with_country', (select count(*) from halal_mode_private.waitlist where country_code is not null),
    'with_source', (select count(*) from halal_mode_private.waitlist where source is not null),
    'countries', (
      select coalesce(jsonb_agg(jsonb_build_object('country_code', c.country_code, 'count', c.n) order by c.n desc, c.country_code), '[]'::jsonb)
      from (
        select w.country_code, count(*) as n
        from halal_mode_private.waitlist w
        where w.country_code is not null
        group by w.country_code
        order by n desc, w.country_code
        limit 20
      ) c
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', s.source, 'count', s.n) order by s.n desc, s.source), '[]'::jsonb)
      from (
        select w.source, count(*) as n
        from halal_mode_private.waitlist w
        where w.source is not null
        group by w.source
        order by n desc, w.source
        limit 20
      ) s
    )
  );
end;
$function$;
revoke all on function public.admin_waitlist_origins() from public, anon;
grant execute on function public.admin_waitlist_origins() to authenticated;
