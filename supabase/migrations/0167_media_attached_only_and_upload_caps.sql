-- Profile media: other members may read only what is attached, and uploads
-- are bounded per account. (Red-team H10 and H11, 2026-10-03.)

-- True when the object is one of the profile's current photos or its voice
-- introduction. Old, replaced or never-attached uploads are not readable by
-- anyone but their owner.
create or replace function halal_mode_private.profile_media_attached(p_bucket text, p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id::text = (storage.foldername(p_name))[1]
      and (
        (p_bucket = 'profile-photos' and p_name = any(p.photos))
        or (p_bucket = 'voice-introductions' and p.audio_greeting_url = p_name)
      )
  );
$$;

revoke all on function halal_mode_private.profile_media_attached(text, text) from public, anon;
grant execute on function halal_mode_private.profile_media_attached(text, text) to authenticated;

drop policy if exists "profile media authorized read" on storage.objects;
create policy "profile media authorized read" on storage.objects
  for select to authenticated
  using (
    bucket_id = any (array['profile-photos', 'voice-introductions'])
    and (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or (
        halal_mode_private.can_read_profile_media((storage.foldername(name))[1])
        and halal_mode_private.profile_media_attached(bucket_id, name)
      )
    )
  );

-- Per-account ceiling on stored objects: six photos attached plus room to
-- replace them, and a couple of voice takes. Unattached uploads are cleared by
-- the existing cleanup, so a member who keeps replacing photos is never stuck.
create or replace function halal_mode_private.can_store_more_profile_media(p_bucket text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select (
    select count(*) from storage.objects o
    where o.bucket_id = p_bucket
      and (storage.foldername(o.name))[1] = auth.uid()::text
  ) < case when p_bucket = 'profile-photos' then 24 else 4 end;
$$;

revoke all on function halal_mode_private.can_store_more_profile_media(text) from public, anon;
grant execute on function halal_mode_private.can_store_more_profile_media(text) to authenticated;

do $$
declare
  v_check text;
begin
  select with_check into v_check from pg_policies
  where schemaname = 'storage' and tablename = 'objects' and policyname = 'profile media owner upload';
  if v_check is null then
    raise exception 'upload policy not found';
  end if;
  execute 'drop policy "profile media owner upload" on storage.objects';
  execute format(
    'create policy "profile media owner upload" on storage.objects for insert to authenticated with check ((%s) and halal_mode_private.can_store_more_profile_media(bucket_id))',
    v_check
  );
end;
$$;
