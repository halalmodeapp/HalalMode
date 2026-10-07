-- Where the round profile picture sits on the main photo: a centre and a size,
-- as fractions of the photo's width and height. Tied to the photo's storage
-- path, so a new main photo starts centred again.
alter table public.profiles add column if not exists avatar_crop jsonb;

create or replace function public.get_my_avatar_crop()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select avatar_crop from public.profiles where id = auth.uid();
$function$;

create or replace function public.set_my_avatar_crop(p_path text, p_cx double precision, p_cy double precision, p_size double precision)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_cx not between 0 and 1 or p_cy not between 0 and 1 or p_size not between 0.05 and 1 then
    raise exception 'Crop out of range' using errcode = '22023';
  end if;
  update public.profiles
  set avatar_crop = jsonb_build_object('path', left(p_path, 300), 'cx', p_cx, 'cy', p_cy, 'size', p_size)
  where id = auth.uid();
end;
$function$;

revoke all on function public.get_my_avatar_crop() from public, anon;
revoke all on function public.set_my_avatar_crop(text, double precision, double precision, double precision) from public, anon;
grant execute on function public.get_my_avatar_crop() to authenticated;
grant execute on function public.set_my_avatar_crop(text, double precision, double precision, double precision) to authenticated;
