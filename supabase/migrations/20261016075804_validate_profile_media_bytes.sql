-- Profile media attachment requires a server-side magic-byte validation. The
-- Storage metadata label is supplied by the uploader and is not evidence of
-- the bytes that were actually uploaded.

create table if not exists halal_mode_private.profile_media_validations (
  bucket_id text not null check (bucket_id in ('profile-photos', 'voice-introductions')),
  object_path text primary key,
  media_type text not null check (media_type in ('photo', 'voice')),
  detected_mime text not null,
  size_bytes bigint not null check (size_bytes > 0),
  object_updated_at timestamptz not null,
  validated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (
    (bucket_id = 'profile-photos' and media_type = 'photo')
    or (bucket_id = 'voice-introductions' and media_type = 'voice')
  )
);

revoke all on table halal_mode_private.profile_media_validations
  from public, anon, authenticated;

create or replace function public.record_profile_media_validation_service(
  p_bucket_id text,
  p_object_path text,
  p_media_type text,
  p_detected_mime text,
  p_size_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private, storage
as $$
declare
  v_object_updated_at timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Media validation requires service role' using errcode = '42501';
  end if;
  if p_bucket_id not in ('profile-photos', 'voice-introductions')
     or p_media_type not in ('photo', 'voice')
     or (p_bucket_id = 'profile-photos' and p_media_type <> 'photo')
     or (p_bucket_id = 'voice-introductions' and p_media_type <> 'voice') then
    raise exception 'Invalid media validation target' using errcode = '22023';
  end if;
  if p_object_path is null
     or p_object_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|heic|heif|m4a|aac|mp3|webm)$' then
    raise exception 'Invalid media object path' using errcode = '22023';
  end if;
  if p_detected_mime is null or p_size_bytes is null or p_size_bytes <= 0 then
    raise exception 'Invalid media validation result' using errcode = '22023';
  end if;
  if (p_media_type = 'photo' and (
        p_detected_mime not in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')
        or p_size_bytes > 10 * 1024 * 1024
      ))
     or (p_media_type = 'voice' and (
        p_detected_mime not in ('audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/webm')
        or p_size_bytes > 15 * 1024 * 1024
      )) then
    raise exception 'Media bytes do not match the allowed profile media type' using errcode = '22023';
  end if;
  if (p_bucket_id = 'profile-photos' and (
        (p_object_path ~ '\.jpg$' and p_detected_mime <> 'image/jpeg')
        or (p_object_path ~ '\.png$' and p_detected_mime <> 'image/png')
        or (p_object_path ~ '\.webp$' and p_detected_mime <> 'image/webp')
        or (p_object_path ~ '\.heic$' and p_detected_mime <> 'image/heic')
        or (p_object_path ~ '\.heif$' and p_detected_mime <> 'image/heif')
      ))
     or (p_bucket_id = 'voice-introductions' and (
        (p_object_path ~ '\.m4a$' and p_detected_mime <> 'audio/mp4')
        or (p_object_path ~ '\.aac$' and p_detected_mime <> 'audio/aac')
        or (p_object_path ~ '\.mp3$' and p_detected_mime <> 'audio/mpeg')
        or (p_object_path ~ '\.webm$' and p_detected_mime <> 'audio/webm')
      )) then
    raise exception 'Media bytes do not match the object extension' using errcode = '22023';
  end if;

  select o.updated_at into v_object_updated_at
  from storage.objects o
  where o.bucket_id = p_bucket_id and o.name = p_object_path;
  if v_object_updated_at is null then
    raise exception 'Uploaded media was not found' using errcode = 'P0002';
  end if;

  delete from halal_mode_private.profile_media_validations where expires_at <= now();
  insert into halal_mode_private.profile_media_validations
    (bucket_id, object_path, media_type, detected_mime, size_bytes, object_updated_at, expires_at)
  values (p_bucket_id, p_object_path, p_media_type, p_detected_mime, p_size_bytes, v_object_updated_at, now() + interval '10 minutes')
  on conflict (object_path) do update
    set bucket_id = excluded.bucket_id,
        media_type = excluded.media_type,
        detected_mime = excluded.detected_mime,
        size_bytes = excluded.size_bytes,
        object_updated_at = excluded.object_updated_at,
        validated_at = now(),
        expires_at = excluded.expires_at;
end;
$$;

revoke all on function public.record_profile_media_validation_service(text, text, text, text, bigint)
  from public, anon, authenticated;
grant execute on function public.record_profile_media_validation_service(text, text, text, text, bigint)
  to service_role;

create or replace function halal_mode_private.consume_profile_media_validation(
  p_bucket_id text,
  p_object_path text,
  p_media_type text
)
returns boolean
language plpgsql
security definer
set search_path = public, halal_mode_private, storage
as $$
begin
  delete from halal_mode_private.profile_media_validations as v
  using storage.objects o
  where v.bucket_id = p_bucket_id
    and v.object_path = p_object_path
    and v.media_type = p_media_type
    and v.expires_at > now()
    and o.bucket_id = p_bucket_id
    and o.name = p_object_path
    and o.updated_at = v.object_updated_at;
  return found;
end;
$$;

revoke all on function halal_mode_private.consume_profile_media_validation(text, text, text)
  from public, anon, authenticated;

create or replace function public.attach_profile_photo(p_path text)
returns text[]
language plpgsql
security definer
set search_path = public, storage, halal_mode_private
as $$
declare
  v_photos text[];
begin
  if auth.uid() is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  if p_path is null or p_path !~ (
    '^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|heic|heif)$'
  ) then raise exception 'Invalid profile photo path' using errcode = '22023'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'profile-photos'
      and o.name = p_path
      and lower(coalesce(o.metadata->>'mimetype', '')) in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')
  ) then raise exception 'Uploaded profile photo was not found' using errcode = 'P0002'; end if;

  select photos into v_photos from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  if p_path = any(v_photos) then return v_photos; end if;
  if cardinality(v_photos) >= 6 then raise exception 'Choose at most six photos' using errcode = '22023'; end if;
  if not halal_mode_private.consume_profile_media_validation('profile-photos', p_path, 'photo') then
    raise exception 'Uploaded profile photo bytes were not validated' using errcode = '22023';
  end if;

  perform set_config('app.profile_media_rpc', 'true', true);
  update public.profiles set photos = array_append(v_photos, p_path) where id = auth.uid()
  returning photos into v_photos;
  perform set_config('app.profile_media_rpc', 'false', true);
  return v_photos;
end;
$$;

create or replace function public.attach_voice_introduction(
  p_path text,
  p_duration_seconds int
) returns jsonb
language plpgsql
security definer
set search_path = public, storage, halal_mode_private
as $$
declare
  v_previous_path text;
begin
  if auth.uid() is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  if p_duration_seconds is null or p_duration_seconds not between 1 and 120 then
    raise exception 'Voice introduction must be between 1 and 120 seconds' using errcode = '22023';
  end if;
  if p_path is null or p_path !~ (
    '^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(m4a|aac|mp3|webm)$'
  ) then raise exception 'Invalid voice introduction path' using errcode = '22023'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'voice-introductions'
      and o.name = p_path
      and lower(coalesce(o.metadata->>'mimetype', '')) in ('audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/webm')
  ) then raise exception 'Uploaded voice introduction was not found' using errcode = 'P0002'; end if;

  select audio_greeting_url into v_previous_path
  from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  if not halal_mode_private.consume_profile_media_validation('voice-introductions', p_path, 'voice') then
    raise exception 'Uploaded voice bytes were not validated' using errcode = '22023';
  end if;

  perform set_config('app.profile_media_rpc', 'true', true);
  update public.profiles
  set audio_greeting_url = p_path, audio_duration_seconds = p_duration_seconds
  where id = auth.uid();
  perform set_config('app.profile_media_rpc', 'false', true);

  return jsonb_build_object('path', p_path, 'previousPath', v_previous_path);
end;
$$;

revoke all on function public.attach_profile_photo(text) from public, anon;
revoke all on function public.attach_voice_introduction(text, integer) from public, anon;
grant execute on function public.attach_profile_photo(text) to authenticated;
grant execute on function public.attach_voice_introduction(text, integer) to authenticated;
