-- A waitlist referral is attribution, not a conversion. Keep it pending until
-- the referred person has a matching-ready profile in the app.
alter table halal_mode_private.waitlist
  add column if not exists referral_counted_at timestamptz;

create index if not exists waitlist_counted_referrals_by_code_idx
  on halal_mode_private.waitlist (referred_code)
  where referral_counted_at is not null and referred_code is not null;
create index if not exists waitlist_counted_referrals_by_owner_idx
  on halal_mode_private.waitlist (referred_by_id)
  where referral_counted_at is not null and referred_by_id is not null;

-- Remember the first time a referred waitlist member completes their profile.
-- The marker is durable, so a later profile edit does not undo earned credit.
create or replace function halal_mode_private.mark_completed_waitlist_referral()
returns trigger
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
declare
  v_user_id uuid;
  v_waitlist_id uuid;
  v_email_canonical text;
begin
  if tg_table_name = 'profiles' then
    v_user_id := new.id;
  elsif tg_table_name = 'private_preferences' then
    v_user_id := new.user_id;
  elsif tg_table_name = 'waitlist' then
    if new.referred_by_id is null and new.referred_code is null then
      return new;
    end if;
    v_email_canonical := new.email_canonical;
  elsif tg_table_name in ('waitlist_referrals', 'waitlist_code_referrals') then
    v_waitlist_id := new.referred_id;
    select email_canonical into v_email_canonical
    from halal_mode_private.waitlist where id = v_waitlist_id;
  else
    return new;
  end if;

  if v_user_id is not null then
    if not public.profile_is_ready_for_matching(v_user_id) then
      return new;
    end if;
    select halal_mode_private.canonical_email(u.email)
      into v_email_canonical
    from auth.users u
    where u.id = v_user_id;
  end if;

  if v_email_canonical is null then
    return new;
  end if;

  update halal_mode_private.waitlist w
  set referral_counted_at = coalesce(w.referral_counted_at, now())
  where w.email_canonical = v_email_canonical
    and w.referral_counted_at is null
    and (v_waitlist_id is null or w.id = v_waitlist_id)
    and (w.referred_code is not null or w.referred_by_id is not null
      or exists (
        select 1 from halal_mode_private.waitlist_referrals r
        where r.referred_id = w.id
      )
      or exists (
        select 1 from halal_mode_private.waitlist_code_referrals r
        where r.referred_id = w.id
      ))
    and exists (
      select 1
      from auth.users u
      where halal_mode_private.canonical_email(u.email) = w.email_canonical
        and (v_user_id is null or u.id = v_user_id)
        and public.profile_is_ready_for_matching(u.id)
    );

  return new;
end;
$function$;
revoke all on function halal_mode_private.mark_completed_waitlist_referral() from public, anon, authenticated;

drop trigger if exists profiles_count_completed_waitlist_referral on public.profiles;
create trigger profiles_count_completed_waitlist_referral
after insert or update of first_name, city, country, bio, photos on public.profiles
for each row execute function halal_mode_private.mark_completed_waitlist_referral();

drop trigger if exists preferences_count_completed_waitlist_referral on public.private_preferences;
create trigger preferences_count_completed_waitlist_referral
after insert or update of matching_preferences_completed_at on public.private_preferences
for each row execute function halal_mode_private.mark_completed_waitlist_referral();

drop trigger if exists waitlist_count_completed_referral on halal_mode_private.waitlist;
create trigger waitlist_count_completed_referral
after insert or update of email, referred_by_id, referred_code on halal_mode_private.waitlist
for each row execute function halal_mode_private.mark_completed_waitlist_referral();

drop trigger if exists waitlist_referrals_count_completed_referral on halal_mode_private.waitlist_referrals;
create trigger waitlist_referrals_count_completed_referral
after insert on halal_mode_private.waitlist_referrals
for each row execute function halal_mode_private.mark_completed_waitlist_referral();

drop trigger if exists waitlist_code_referrals_count_completed_referral on halal_mode_private.waitlist_code_referrals;
create trigger waitlist_code_referrals_count_completed_referral
after insert on halal_mode_private.waitlist_code_referrals
for each row execute function halal_mode_private.mark_completed_waitlist_referral();

-- Preserve credit for people who had already completed profiles before this
-- rule was introduced. Email verification alone does not pass this backfill.
update halal_mode_private.waitlist w
set referral_counted_at = coalesce(w.referral_counted_at, now())
where w.referral_counted_at is null
  and (w.referred_code is not null or w.referred_by_id is not null
    or exists (select 1 from halal_mode_private.waitlist_referrals r where r.referred_id = w.id)
    or exists (select 1 from halal_mode_private.waitlist_code_referrals r where r.referred_id = w.id))
  and exists (
    select 1 from auth.users u
    where halal_mode_private.canonical_email(u.email) = w.email_canonical
      and public.profile_is_ready_for_matching(u.id)
  );

-- Only completed app profiles count, whether the invitation began on the
-- waitlist or in the app. Count a canonical inbox once per referral code.
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
    select w.email_canonical
    from halal_mode_private.waitlist w
    where w.referral_counted_at is not null and w.referred_code = p_code
    union
    select w.email_canonical
    from halal_mode_private.waitlist w
    join owner o on o.waitlist_id is not null and w.referred_by_id = o.waitlist_id
    where w.referral_counted_at is not null
    union
    select w.email_canonical
    from halal_mode_private.waitlist_code_referrals r
    join halal_mode_private.waitlist w on w.id = r.referred_id
    where r.code = p_code and w.referral_counted_at is not null
    union
    select w.email_canonical
    from halal_mode_private.waitlist_referrals r
    join owner o on o.waitlist_id is not null and r.referrer_id = o.waitlist_id
    join halal_mode_private.waitlist w on w.id = r.referred_id
    where w.referral_counted_at is not null
  ), counted as (
    select
      (select count(*) from waitlist_friends)
      + (select count(distinct halal_mode_private.canonical_email(u.email))
         from halal_mode_private.member_referrals m
         join auth.users u on u.id = m.referred_user_id
         where m.code = p_code
           and (m.counted_at is not null or public.profile_is_ready_for_matching(m.referred_user_id))
           and not exists (
             select 1 from waitlist_friends f
             where f.email_canonical = halal_mode_private.canonical_email(u.email)
           )) as n
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

-- A waitlist signup stores referral attribution but never asks the invited
-- person to confirm by email. Their profile completion is the only qualifier.
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
revoke all on function public.join_waitlist_now(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.join_waitlist_now(text, text, text, text, text) to anon, authenticated;
