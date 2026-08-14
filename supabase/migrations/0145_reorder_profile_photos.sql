-- Let a member choose which photo comes first.
--
-- Until now the order of `profiles.photos` was the order they happened to be
-- uploaded in, and the first one is the one everybody sees. Changing it meant
-- deleting photos and adding them back in a different sequence.
--
-- This is deliberately not a write of an arbitrary array. It is a permutation:
-- the same paths, the same number of them, rearranged. Anything else — a path
-- that is not already theirs, a missing one, a repeat — is refused. So a
-- reorder cannot be used to attach a photo that was never uploaded, or to
-- quietly drop one without the storage object being cleaned up.
--
-- It sets `app.profile_media_rpc` for the same reason the other media
-- functions do: the trigger on `profiles` refuses any write to this column
-- unless a media service is the one making it.

create or replace function public.reorder_profile_photos(p_paths text[])
returns text[]
language plpgsql
security definer
set search_path = public as $$
declare
  v_photos text[];
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if p_paths is null then
    raise exception 'Provide the photos in their new order' using errcode = '22023';
  end if;

  select photos into v_photos from profiles where id = auth.uid() for update;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  -- Same count. Catches both a dropped photo and an added one.
  if coalesce(cardinality(p_paths), 0) is distinct from coalesce(cardinality(v_photos), 0) then
    raise exception 'A reorder must keep the same photos' using errcode = '22023';
  end if;

  -- No repeats. Without this, {a,b,b} and {a,a,b} would satisfy the set
  -- comparison below and a photo would silently vanish from the profile.
  if cardinality(array(select distinct unnest(p_paths))) is distinct from cardinality(p_paths) then
    raise exception 'A reorder must keep the same photos' using errcode = '22023';
  end if;

  -- Same members, in either direction.
  if exists (select unnest(p_paths) except select unnest(v_photos))
     or exists (select unnest(v_photos) except select unnest(p_paths)) then
    raise exception 'A reorder must keep the same photos' using errcode = '22023';
  end if;

  if p_paths = v_photos then
    return v_photos;
  end if;

  perform set_config('app.profile_media_rpc', 'true', true);
  update profiles set photos = p_paths where id = auth.uid()
  returning photos into v_photos;
  perform set_config('app.profile_media_rpc', 'false', true);

  return v_photos;
end;
$$;

revoke all on function public.reorder_profile_photos(text[]) from public, anon;
grant execute on function public.reorder_profile_photos(text[]) to authenticated;
