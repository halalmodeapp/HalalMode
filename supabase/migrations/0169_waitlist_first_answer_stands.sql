-- The public waitlist no longer lets anyone overwrite another address's
-- details (red-team M9).

create or replace function public.join_waitlist(
  p_email text,
  p_city text,
  p_age_range text,
  p_locale text default null
) returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_city  text := trim(coalesce(p_city, ''));
begin
  -- Validated here rather than trusted from a page anyone can post to. The
  -- table constraints say the same things again, because a check constraint is
  -- the only one of the two that a future caller cannot skip.
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or length(v_email) not between 6 and 254 then
    raise exception 'That email address does not look right' using errcode = '22023';
  end if;
  if length(v_city) not between 2 and 80 then
    raise exception 'Please tell us which city you are in' using errcode = '22023';
  end if;
  if p_age_range not in ('18-24', '25-29', '30-34', '35-39', '40-49', '50+') then
    raise exception 'Please choose an age range' using errcode = '22023';
  end if;

  insert into halal_mode_private.waitlist as w (email, city, age_range, locale)
  values (v_email, v_city, p_age_range, nullif(trim(coalesce(p_locale, '')), ''))
  -- First answer stands. Without proof the address is theirs, a later sign-up
  -- could rewrite someone else's details; a correction can come by email.
  on conflict (email) do nothing;
end;
$$;
