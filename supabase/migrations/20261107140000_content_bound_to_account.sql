-- Private content stays bound to the account and the exact file that started the action.
-- docs/INVARIANT_AUDIT.md, recommendation 4 (C7, A5, A6, A8).

create function halal_mode_private.patch_once(p_signature text, p_find text, p_replace text)
returns void language plpgsql as $$
declare
  v_def text := replace(pg_get_functiondef(p_signature::regprocedure), chr(13), '');
  v_find text := replace(p_find, chr(13), '');
  v_count int := (length(v_def) - length(replace(v_def, v_find, ''))) / greatest(length(v_find), 1);
begin
  if v_count <> 1 then
    raise exception 'patch: anchor found % times in %: %', v_count, p_signature, p_find;
  end if;
  execute replace(v_def, v_find, replace(p_replace, chr(13), ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- C7. A message is sent only by the account that wrote it. The app names that account, and a
-- device that switched accounts meanwhile is refused instead of sending under the new one.
-- Installed apps leave it out and keep working. One function, so named arguments stay unambiguous.
-- ---------------------------------------------------------------------------
drop function public.send_message(uuid, text, text);
create function public.send_message(
  p_connection_id uuid, p_body text, p_client_request_id text default null, p_sender_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_message jsonb;
begin
  if p_sender_id is not null and p_sender_id is distinct from auth.uid() then
    raise exception 'This message belongs to another account' using errcode = '42501';
  end if;
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  v_message := halal_mode_private.send_message_after_legal_consent(p_connection_id, p_body, p_client_request_id);
  -- A replay returns the stored row, which may have been read since.
  if not halal_mode_private.sends_read_receipts(auth.uid()) then
    v_message := v_message || jsonb_build_object('read_at', null);
  end if;
  return v_message;
end;
$function$;
revoke all on function public.send_message(uuid, text, text, uuid) from public, anon;
grant execute on function public.send_message(uuid, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- A5. Approval names the exact revision whose bytes were checked, and its size. If the file was
-- swapped while it was being checked, approval is refused.
-- ---------------------------------------------------------------------------
create function public.get_profile_media_object_version_service(p_bucket_id text, p_object_path text)
returns text
language plpgsql
stable
security definer
set search_path = public, storage
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Media validation requires service role' using errcode = '42501';
  end if;
  return (select o.version from storage.objects o where o.bucket_id = p_bucket_id and o.name = p_object_path);
end;
$function$;
revoke all on function public.get_profile_media_object_version_service(text, text) from public, anon, authenticated;
grant execute on function public.get_profile_media_object_version_service(text, text) to service_role;

alter function public.record_profile_media_validation_service(text, text, text, text, bigint)
  rename to record_profile_media_validation_unversioned;
revoke all on function public.record_profile_media_validation_unversioned(text, text, text, text, bigint) from public, anon, authenticated, service_role;
alter function public.record_profile_media_validation_unversioned(text, text, text, text, bigint) set schema halal_mode_private;

-- The installed validator sends no revision; it can still record, as before, until it is redeployed.
create function public.record_profile_media_validation_service(
  p_bucket_id text, p_object_path text, p_media_type text, p_detected_mime text, p_size_bytes bigint,
  p_object_version text default null
) returns void
language plpgsql
security definer
set search_path = public, halal_mode_private, storage
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Media validation requires service role' using errcode = '42501';
  end if;
  if p_object_version is not null and not exists (
    select 1 from storage.objects o
    where o.bucket_id = p_bucket_id and o.name = p_object_path
      and o.version = p_object_version
      and coalesce((o.metadata ->> 'size')::bigint, p_size_bytes) = p_size_bytes
  ) then
    raise exception 'The file changed while it was being checked' using errcode = '40001';
  end if;
  perform halal_mode_private.record_profile_media_validation_unversioned(
    p_bucket_id, p_object_path, p_media_type, p_detected_mime, p_size_bytes);
end;
$function$;
revoke all on function public.record_profile_media_validation_service(text, text, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.record_profile_media_validation_service(text, text, text, text, bigint, text) to service_role;

-- Attaching holds the file, and a member cannot delete a file that is attached, so a delete and an
-- attach running together can never leave a profile pointing at nothing.
select halal_mode_private.patch_once('public.attach_profile_photo(text)',
  '      and lower(coalesce(o.metadata->>''mimetype'', '''')) in (''image/jpeg'', ''image/png'', ''image/webp'', ''image/heic'', ''image/heif'')
  ) then',
  '      and lower(coalesce(o.metadata->>''mimetype'', '''')) in (''image/jpeg'', ''image/png'', ''image/webp'', ''image/heic'', ''image/heif'')
    for share
  ) then');
select halal_mode_private.patch_once('public.attach_voice_introduction(text,integer)',
  '      and lower(coalesce(o.metadata->>''mimetype'', '''')) in (''audio/mp4'', ''audio/x-m4a'', ''audio/aac'', ''audio/mpeg'', ''audio/webm'')
  ) then',
  '      and lower(coalesce(o.metadata->>''mimetype'', '''')) in (''audio/mp4'', ''audio/x-m4a'', ''audio/aac'', ''audio/mpeg'', ''audio/webm'')
    for share
  ) then');

create function halal_mode_private.keep_attached_profile_media()
returns trigger language plpgsql security definer
set search_path = public, storage as $$
declare
  v_owner text := (storage.foldername(old.name))[1];
begin
  if auth.role() = 'authenticated' and old.bucket_id in ('profile-photos', 'voice-introductions')
     and v_owner ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and exists (select 1 from public.profiles p
                 where p.id = v_owner::uuid
                   and ((old.bucket_id = 'profile-photos' and old.name = any(p.photos))
                     or (old.bucket_id = 'voice-introductions' and p.audio_greeting_url = old.name))) then
    raise exception 'This file is attached to a profile' using errcode = '42501';
  end if;
  return old;
end;
$$;
revoke all on function halal_mode_private.keep_attached_profile_media() from public, anon, authenticated;
create trigger keep_attached_profile_media before delete on storage.objects
for each row execute function halal_mode_private.keep_attached_profile_media();

-- ---------------------------------------------------------------------------
-- A8. Uploads that were never attached, or were detached, are found here and removed by the
-- scheduled worker after two days. Anything still referenced anywhere is left alone.
-- ---------------------------------------------------------------------------
create function public.list_abandoned_profile_media_service(p_limit int default 200)
returns table (bucket_id text, name text)
language plpgsql
stable
security definer
set search_path = public, storage, halal_mode_private
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Media cleanup requires service role' using errcode = '42501';
  end if;
  return query
  select o.bucket_id, o.name
  from storage.objects o
  where o.bucket_id in ('profile-photos', 'voice-introductions')
    and o.created_at < now() - interval '2 days'
    and not exists (select 1 from public.profiles p where o.name = any(p.photos) or p.audio_greeting_url = o.name)
    and not exists (select 1 from halal_mode_private.profile_media_validations v where v.object_path = o.name)
    and not exists (select 1 from halal_mode_private.matching_photo_analysis_queue q where q.storage_path = o.name)
    and not exists (select 1 from halal_mode_private.photo_coach_reviews r where r.photo_path = o.name)
    and not exists (select 1 from halal_mode_private.moderation_queue m where m.ref = o.name and m.decided_at is null)
    and not exists (select 1 from public.messages m where m.voice_path = o.name)
  order by o.created_at
  limit least(greatest(p_limit, 1), 1000);
end;
$function$;
revoke all on function public.list_abandoned_profile_media_service(int) from public, anon, authenticated;
grant execute on function public.list_abandoned_profile_media_service(int) to service_role;

drop function halal_mode_private.patch_once(text, text, text);
