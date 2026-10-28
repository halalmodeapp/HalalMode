-- "They liked you", and the reminders that bring members back.
--
-- 1. LIKED YOU. When someone chose you and you did not choose them back, and
--    your round with them has closed, they appear in your Connections as
--    "They liked you": their age, city, occupation and bio can be read, their
--    photo is a heavily blurred copy and their name is hidden. A Premium member
--    sees them in full and can like them back, which starts a connection the
--    same way a mutual choice does. The member who liked is never told that
--    they were seen. Choosers are told up front (Terms, and the line under the
--    deck) that this can happen.
--
--    Only real likes appear: nothing is ever invented or padded. A like counts
--    only from a member whose selfie is verified (a setting), is still active,
--    is not blocked, and is at most seven days old.
--
-- 2. BLURRED PHOTOS are made on the server. A blurred picture drawn on the
--    phone would still ship the real photo to a free member, so the app is only
--    ever given a tiny pre-blurred copy (profile-photos-blurred).
--
-- 3. REMINDERS: your introductions are ready (with how many), someone chose
--    you, someone is waiting on your answer, and a conversation has gone quiet.
--    They are queued hourly, only during waking hours estimated from the
--    member's longitude, and never more than a couple of times per case.

-- ================================================================ notification kinds
alter table halal_mode_private.notification_outbox drop constraint if exists notification_outbox_kind_check;
alter table halal_mode_private.notification_outbox add constraint notification_outbox_kind_check
  check (kind in ('round_ready', 'mutual_match', 'new_message', 'notice', 'halal_cards',
                  'liked_you', 'waiting_on_you', 'quiet_match'));

-- "Your five are ready": the push says how many, and the number is the tier's.
create or replace function halal_mode_private.notify_round_ready()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  perform halal_mode_private.enqueue_notification(
    new.user_id, 'round_ready',
    jsonb_build_object('count', (select l.introductions from public.tier_limits(new.tier) l)),
    greatest(new.opens_at - now(), interval '0')
  );
  return new;
end;
$$;

-- ================================================================ settings and tracking
create table if not exists halal_mode_private.liked_you_settings (
  id boolean primary key default true check (id),
  verified_only boolean not null default true,
  window_days integer not null default 7 check (window_days between 1 and 60),
  max_shown integer not null default 10 check (max_shown between 1 and 50)
);
insert into halal_mode_private.liked_you_settings (id) values (true) on conflict (id) do nothing;
alter table halal_mode_private.liked_you_settings enable row level security;
revoke all on halal_mode_private.liked_you_settings from public, anon, authenticated;

create table if not exists halal_mode_private.retention_nudges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('liked_you', 'waiting_on_you', 'quiet_match')),
  ref uuid not null,
  first_seen timestamptz not null default now(),
  sent_count integer not null default 0,
  last_sent_at timestamptz,
  primary key (user_id, kind, ref)
);
alter table halal_mode_private.retention_nudges enable row level security;
revoke all on halal_mode_private.retention_nudges from public, anon, authenticated;

-- ================================================================ who liked whom
-- Chosen by someone, not chosen back, and my own round with them has closed.
create or replace view halal_mode_private.liked_you_pairs as
select distinct on (mine.viewer_id, sel.viewer_id)
  mine.viewer_id as member_id,
  sel.viewer_id as liker_id,
  sel.decided_at as liked_at,
  coalesce(r.submitted_at, r.expires_at) as closed_at
from public.introduction_selections sel
join public.introductions mine
  on mine.viewer_id = sel.subject_id and mine.subject_id = sel.viewer_id
join public.rounds r on r.id = mine.round_id
where sel.decision = 'kept'
  and (r.submitted_at is not null or r.expires_at <= now())
  and not exists (
    select 1 from public.introduction_selections back
    where back.viewer_id = sel.subject_id and back.subject_id = sel.viewer_id and back.decision = 'kept'
  )
order by mine.viewer_id, sel.viewer_id, coalesce(r.submitted_at, r.expires_at) desc;
revoke all on halal_mode_private.liked_you_pairs from public, anon, authenticated;

create or replace function halal_mode_private.liked_you_current(p_member uuid)
returns table (liker_id uuid, liked_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select p.liker_id, p.liked_at, p.closed_at + make_interval(days => s.window_days)
  from halal_mode_private.liked_you_pairs p
  cross join halal_mode_private.liked_you_settings s
  join public.profiles liker on liker.id = p.liker_id
  where p.member_id = p_member
    and p.closed_at > now() - make_interval(days => s.window_days)
    and liker.onboarding_complete and not liker.is_paused
    and (not s.verified_only or exists (
      select 1 from halal_mode_private.member_selfies f where f.user_id = p.liker_id and f.status = 'verified'))
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = p_member and b.blocked_id = p.liker_id) or (b.blocker_id = p.liker_id and b.blocked_id = p_member))
    and not exists (
      select 1 from public.connections c
      where c.user_a = least(p_member, p.liker_id) and c.user_b = greatest(p_member, p.liker_id))
  order by p.liked_at desc
  limit (select max_shown from halal_mode_private.liked_you_settings);
$function$;
revoke all on function halal_mode_private.liked_you_current(uuid) from public, anon, authenticated;

create or replace function halal_mode_private.premium_sees_liker(p_viewer uuid, p_subject uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select exists (select 1 from public.profiles v where v.id = p_viewer and v.tier = 'premium')
     and exists (select 1 from halal_mode_private.liked_you_current(p_viewer) l where l.liker_id = p_subject);
$function$;
revoke all on function halal_mode_private.premium_sees_liker(uuid, uuid) from public, anon, authenticated;

-- A Premium member can see the photos of someone who liked them.
do $$
declare
  v_def text;
  v_anchor constant text := $a$  return exists (
    select 1
    from public.introductions i$a$;
begin
  select pg_get_functiondef('halal_mode_private.can_read_profile_media(text)'::regprocedure) into v_def;
  if position(v_anchor in v_def) = 0 then raise exception 'can_read_profile_media: anchor not found'; end if;
  v_def := replace(v_def, v_anchor, $r$  -- Someone who liked a Premium member, so they can see them and like back.
  if halal_mode_private.premium_sees_liker(v_viewer, v_subject) then return true; end if;

$r$ || v_anchor);
  execute v_def;
end;
$$;

-- ================================================================ the member's calls
create or replace function public.get_my_liked_you()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_premium boolean;
begin
  if auth.uid() is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  select (tier = 'premium') into v_premium from public.profiles where id = auth.uid();
  return coalesce((
    select jsonb_agg(liked.item order by liked.liked_at desc)
    from (
      select l.liked_at,
        case when v_premium then
          public.safe_member_profile(p) || jsonb_build_object('likedAt', l.liked_at, 'expiresAt', l.expires_at, 'unlocked', true)
        else
          -- Free: the bio and the plain facts, a blurred photo, and no name.
          jsonb_build_object(
            'id', p.id,
            'age', extract(year from age(p.birth_date)),
            'city', p.city, 'country', p.country,
            'occupation', p.occupation, 'bio', p.bio,
            'maritalStatus', p.marital_status,
            'chips', p.chips,
            'blurredPhoto', (select b.path from halal_mode_private.photo_blurs b where b.path = p.photos[1]),
            'likedAt', l.liked_at, 'expiresAt', l.expires_at, 'unlocked', false)
        end as item
      from halal_mode_private.liked_you_current(auth.uid()) l
      join public.profiles p on p.id = l.liker_id
    ) as liked
  ), '[]'::jsonb);
end;
$function$;

-- Like back: a Premium member answers a like, and a connection starts the same
-- way it does for a mutual choice (or waits for room, as that one does).
create or replace function public.like_back(p_liker_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_me uuid := auth.uid();
  v_cap_me integer;
  v_cap_them integer;
  v_count_me integer;
  v_count_them integer;
  v_intro uuid;
begin
  if v_me is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  perform halal_mode_private.require_current_legal_consents(v_me);
  if not exists (select 1 from public.profiles where id = v_me and tier = 'premium') then
    raise exception 'Liking back needs Halal Mode Premium' using errcode = '42501', hint = 'premium_required';
  end if;
  if not exists (select 1 from halal_mode_private.liked_you_current(v_me) l where l.liker_id = p_liker_id) then
    raise exception 'That like is no longer available' using errcode = 'P0002';
  end if;

  -- My own interest, recorded like any other, on the card I was shown.
  select i.id into v_intro
  from public.introductions i
  where i.viewer_id = v_me and i.subject_id = p_liker_id
  order by i.created_at desc limit 1;
  if v_intro is not null then
    insert into public.introduction_selections (introduction_id, viewer_id, subject_id, decision)
    values (v_intro, v_me, p_liker_id, 'kept')
    on conflict (introduction_id) do update set decision = 'kept', decided_at = now();
  end if;

  select l.open_connections into v_cap_me from public.profiles p cross join lateral public.tier_limits(p.tier) l where p.id = v_me;
  select l.open_connections into v_cap_them from public.profiles p cross join lateral public.tier_limits(p.tier) l where p.id = p_liker_id;
  select count(*)::int into v_count_me from public.connections where closed_at is null and (user_a = v_me or user_b = v_me);
  select count(*)::int into v_count_them from public.connections where closed_at is null and (user_a = p_liker_id or user_b = p_liker_id);

  if v_count_me < v_cap_me and v_count_them < v_cap_them then
    insert into public.connections (user_a, user_b)
    values (least(v_me, p_liker_id), greatest(v_me, p_liker_id))
    on conflict (user_a, user_b) do nothing;
    return jsonb_build_object('status', 'matched');
  end if;
  insert into public.mutual_connection_queue (user_a, user_b)
  values (least(v_me, p_liker_id), greatest(v_me, p_liker_id))
  on conflict (user_a, user_b) do nothing;
  return jsonb_build_object('status', 'waiting');
end;
$function$;

revoke all on function public.get_my_liked_you() from public, anon;
revoke all on function public.like_back(uuid) from public, anon;
grant execute on function public.get_my_liked_you() to authenticated;
grant execute on function public.like_back(uuid) to authenticated;

-- ================================================================ blurred photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos-blurred', 'profile-photos-blurred', false, 262144, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists halal_mode_private.photo_blurs (
  path text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table halal_mode_private.photo_blurs enable row level security;
revoke all on halal_mode_private.photo_blurs from public, anon, authenticated;

-- Someone who liked you, or yourself. Nothing else reads a blurred copy.
create or replace function halal_mode_private.can_read_blurred_media(p_subject_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null or p_subject_id is null then return false; end if;
  if p_subject_id = v_viewer::text then return true; end if;
  if p_subject_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  return exists (select 1 from halal_mode_private.liked_you_current(v_viewer) l where l.liker_id = p_subject_id::uuid);
end;
$function$;
revoke all on function halal_mode_private.can_read_blurred_media(text) from public, anon, authenticated;
grant execute on function halal_mode_private.can_read_blurred_media(text) to authenticated;

drop policy if exists "blurred media authorized read" on storage.objects;
create policy "blurred media authorized read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos-blurred'
    and halal_mode_private.can_read_blurred_media((storage.foldername(name))[1])
  );

-- What the blurring job should make, and what it should delete.
create or replace function public.photos_to_blur_service(p_limit integer default 10)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', due.id, 'path', due.path)), '[]'::jsonb)
  from (
    select p.id, ph.path
    from public.profiles p, unnest(coalesce(p.photos, '{}'::text[])) with ordinality as ph(path, n)
    where p.onboarding_complete and ph.n <= 3
      and not exists (select 1 from halal_mode_private.photo_blurs b where b.path = ph.path)
    limit greatest(1, least(p_limit, 50))
  ) due;
$function$;

create or replace function public.mark_photo_blurred_service(p_user_id uuid, p_path text)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  insert into halal_mode_private.photo_blurs (path, user_id) values (p_path, p_user_id) on conflict (path) do nothing;
$function$;

create or replace function public.blurs_to_remove_service(p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(b.path), '[]'::jsonb)
  from (
    select b.path from halal_mode_private.photo_blurs b
    where not exists (select 1 from public.profiles p where b.path = any(coalesce(p.photos, '{}'::text[])))
    limit greatest(1, least(p_limit, 200))
  ) b;
$function$;

create or replace function public.forget_photo_blur_service(p_path text)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  delete from halal_mode_private.photo_blurs where path = p_path;
$function$;

revoke all on function public.photos_to_blur_service(integer) from public, anon, authenticated;
revoke all on function public.mark_photo_blurred_service(uuid, text) from public, anon, authenticated;
revoke all on function public.blurs_to_remove_service(integer) from public, anon, authenticated;
revoke all on function public.forget_photo_blur_service(text) from public, anon, authenticated;
grant execute on function public.photos_to_blur_service(integer) to service_role;
grant execute on function public.mark_photo_blurred_service(uuid, text) to service_role;
grant execute on function public.blurs_to_remove_service(integer) to service_role;
grant execute on function public.forget_photo_blur_service(text) to service_role;

-- ================================================================ the reminders
-- Roughly 08:00 to 21:59 where the member is, from their longitude.
create or replace function halal_mode_private.is_waking_hour(p_longitude double precision)
returns boolean
language sql
stable
as $function$
  select extract(hour from (now() at time zone 'utc') + make_interval(hours => round(coalesce(p_longitude, 0) / 15.0)::int))::int between 8 and 21;
$function$;

create or replace function halal_mode_private.queue_retention_notifications()
returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  r record;
  v_queued integer := 0;
begin
  -- Someone liked you: one push a day at most, however many.
  for r in
    select m.id as member_id
    from public.profiles m
    where m.onboarding_complete and not m.is_paused and halal_mode_private.is_waking_hour(m.longitude)
      and exists (
        select 1 from halal_mode_private.liked_you_current(m.id) l
        where not exists (select 1 from halal_mode_private.retention_nudges n
                          where n.user_id = m.id and n.kind = 'liked_you' and n.ref = l.liker_id))
      and not exists (select 1 from halal_mode_private.retention_nudges n2
                      where n2.user_id = m.id and n2.kind = 'liked_you' and n2.last_sent_at > now() - interval '20 hours')
  loop
    perform halal_mode_private.enqueue_notification(r.member_id, 'liked_you');
    insert into halal_mode_private.retention_nudges (user_id, kind, ref, sent_count, last_sent_at)
    select r.member_id, 'liked_you', l.liker_id, 1, now()
    from halal_mode_private.liked_you_current(r.member_id) l
    on conflict (user_id, kind, ref) do nothing;
    v_queued := v_queued + 1;
  end loop;

  -- Waiting on you: someone has done their part and you have not. A nudge after
  -- a day, and one more two days later, then no more.
  insert into halal_mode_private.retention_nudges (user_id, kind, ref)
  select m.id, 'waiting_on_you', oc.connection_id
  from public.profiles m
  cross join lateral halal_mode_private.owed_connections(m.id) oc
  where m.onboarding_complete
    and m.id in (
      select user_a from public.connections where closed_at is null and stage in ('choosing_questions', 'answering')
      union select user_b from public.connections where closed_at is null and stage in ('choosing_questions', 'answering'))
  on conflict (user_id, kind, ref) do nothing;
  delete from halal_mode_private.retention_nudges n
  where n.kind = 'waiting_on_you'
    and not exists (select 1 from halal_mode_private.owed_connections(n.user_id) oc where oc.connection_id = n.ref);
  for r in
    select n.user_id, n.ref
    from halal_mode_private.retention_nudges n
    join public.profiles m on m.id = n.user_id
    where n.kind = 'waiting_on_you' and n.sent_count < 2 and halal_mode_private.is_waking_hour(m.longitude)
      and ((n.sent_count = 0 and n.first_seen <= now() - interval '24 hours')
        or (n.sent_count = 1 and n.last_sent_at <= now() - interval '48 hours'))
  loop
    perform halal_mode_private.enqueue_notification(r.user_id, 'waiting_on_you');
    update halal_mode_private.retention_nudges
    set sent_count = sent_count + 1, last_sent_at = now()
    where user_id = r.user_id and kind = 'waiting_on_you' and ref = r.ref;
    v_queued := v_queued + 1;
  end loop;

  -- Quiet match: an open conversation with two days of silence, the bot offers
  -- an opener. At most three nudges per member per conversation, five days apart.
  insert into halal_mode_private.retention_nudges (user_id, kind, ref)
  select u.user_id, 'quiet_match', c.id
  from public.connections c
  cross join lateral (values (c.user_a), (c.user_b)) as u(user_id)
  where c.closed_at is null and c.stage = 'open'
  on conflict (user_id, kind, ref) do nothing;
  delete from halal_mode_private.retention_nudges n
  where n.kind = 'quiet_match'
    and not exists (select 1 from public.connections c where c.id = n.ref and c.closed_at is null and c.stage = 'open');
  for r in
    select n.user_id, n.ref
    from halal_mode_private.retention_nudges n
    join public.profiles m on m.id = n.user_id
    where n.kind = 'quiet_match' and n.sent_count < 3 and halal_mode_private.is_waking_hour(m.longitude)
      and greatest(n.first_seen, coalesce((select max(x.created_at) from public.messages x where x.connection_id = n.ref), n.first_seen))
            <= now() - interval '48 hours'
      and (n.last_sent_at is null or n.last_sent_at <= now() - interval '5 days')
  loop
    perform halal_mode_private.enqueue_notification(r.user_id, 'quiet_match');
    update halal_mode_private.retention_nudges
    set sent_count = sent_count + 1, last_sent_at = now()
    where user_id = r.user_id and kind = 'quiet_match' and ref = r.ref;
    v_queued := v_queued + 1;
  end loop;

  return v_queued;
end;
$function$;
revoke all on function halal_mode_private.queue_retention_notifications() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'halal-mode-retention') then
    perform cron.unschedule('halal-mode-retention');
  end if;
  perform cron.schedule('halal-mode-retention', '12 * * * *',
    'select halal_mode_private.queue_retention_notifications()');
end;
$$;

-- ================================================================ terms
-- Choosers are told up front: a like that is not returned can be seen, blurred.
update halal_mode_private.legal_document_registry set is_current = false where is_current;
insert into halal_mode_private.legal_document_registry
  (document_type, version, title, effective_date, url, is_current)
values
  ('terms', '2026-10-28', 'Terms of Service', date '2026-10-28', 'https://halalmo.de/legal/terms', true),
  ('privacy', '2026-10-28', 'Privacy Notice', date '2026-10-28', 'https://halalmo.de/legal/privacy', true)
on conflict (document_type, version) do update set
  title = excluded.title,
  effective_date = excluded.effective_date,
  url = excluded.url,
  is_current = true;
