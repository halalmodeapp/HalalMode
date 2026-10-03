-- Under each sect, only the major madhhabs: the four Sunni schools and
-- Ja'fari for Shia. Movements (Salafi, Sufi, Deobandi, Barelvi) and the small
-- schools (Zaydi, Ibadi) are gone, and so is "Just Muslim", which is not a
-- school. Anyone who picked one keeps their sect and loses only the detail.

update public.profiles
  set sect_detail = null
  where sect_detail is not null
    and sect_detail not in ('hanafi', 'maliki', 'shafii', 'hanbali', 'twelver');

update public.private_preferences
  set preferred_sect_details = array(
    select detail from unnest(preferred_sect_details) as detail
    where detail in ('hanafi', 'maliki', 'shafii', 'hanbali', 'twelver')
  )
  where cardinality(preferred_sect_details) > 0;

create or replace function public.sect_of_detail(p_detail text)
returns sect
language sql
immutable
set search_path = public
as $$
  select case
    when p_detail in ('hanafi', 'maliki', 'shafii', 'hanbali') then 'sunni'::sect
    when p_detail = 'twelver' then 'shia'::sect
    else null
  end
$$;
