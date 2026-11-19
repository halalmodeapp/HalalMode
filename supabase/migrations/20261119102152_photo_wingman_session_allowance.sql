-- One usage charge per successful analysis session, however many photos it covers.
create table halal_mode_private.photo_coach_runs (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  free_session boolean not null,
  charged boolean not null default false
);
create index photo_coach_runs_user_started on halal_mode_private.photo_coach_runs(user_id, started_at desc);
alter table halal_mode_private.photo_coach_runs enable row level security;
revoke all on halal_mode_private.photo_coach_runs from public, anon, authenticated;
select cron.schedule('halal-mode-expire-wingman-runs', '41 * * * *',
  $$delete from halal_mode_private.photo_coach_runs where started_at < now() - interval '2 days'$$);

-- Keep prior paid-from-free usage and count the former introductory look only
-- if advice from a free first look was actually saved.
update halal_mode_private.photo_coach_usage u set free_looks_used = least(3, u.free_looks_used +
  case when u.first_look_at is not null and exists (
    select 1 from halal_mode_private.photo_coach_reviews r where r.user_id = u.user_id
      and r.advice is not null and not r.counted and r.claimed_at <= u.first_look_at
  ) then 1 else 0 end);

create or replace function public.get_my_photo_coach()
returns jsonb language sql stable security definer set search_path = public, halal_mode_private as $$
  select jsonb_build_object(
    'reviews', coalesce(jsonb_agg(jsonb_build_object('photo', x.photo, 'position', x.at, 'advice', r.advice) order by x.at)
      filter (where r.advice is not null), '[]'::jsonb),
    'unreviewed', count(x.photo) filter (where r.advice is null),
    'firstLookFree', not exists(select 1 from photo_coach_reviews reviewed where reviewed.user_id = p.id and reviewed.advice is not null),
    'freeLooksLeft', greatest(0, 3 - coalesce(u.free_looks_used, 0)),
    'premium', effective_membership_tier(p.id) = 'premium'
  )
  from profiles p
  left join photo_coach_usage u on u.user_id = p.id
  left join lateral unnest(p.photos) with ordinality as x(photo, at) on true
  left join photo_coach_reviews r on r.user_id = p.id and r.photo_path = x.photo
  where p.id = auth.uid()
  group by p.id, u.free_looks_used;
$$;

create or replace function public.photo_coach_claim_service(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public, halal_mode_private as $$
declare
  run_token uuid;
  unreviewed text[];
  premium boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 7401));
  select effective_membership_tier(p.id) = 'premium', array(
    select photo from unnest(p.photos) with ordinality as gallery(photo, slot)
    where not exists(select 1 from photo_coach_reviews r where r.user_id = p.id and r.photo_path = photo and r.advice is not null)
    group by photo order by min(slot)
  ) into premium, unreviewed from profiles p where p.id = p_user;
  if coalesce(cardinality(unreviewed), 0) = 0 then
    return jsonb_build_object('token', null, 'photos', '[]'::jsonb, 'reason', 'up_to_date');
  end if;
  if exists(select 1 from photo_coach_runs r where r.user_id = p_user and r.finished_at is null
    and r.started_at > now() - interval '3 minutes') then
    return jsonb_build_object('token', null, 'photos', '[]'::jsonb, 'reason', 'in_progress');
  end if;
  if not premium and exists(select 1 from photo_coach_usage u where u.user_id = p_user and u.free_looks_used >= 3) then
    return jsonb_build_object('token', null, 'photos', '[]'::jsonb, 'reason', 'premium_required');
  end if;
  if (select count(*) from photo_coach_runs r where r.user_id = p_user and r.started_at > now() - interval '24 hours') >= 100 then
    return jsonb_build_object('token', null, 'photos', '[]'::jsonb, 'reason', 'fair_use');
  end if;

  insert into photo_coach_runs(user_id, free_session) values (p_user, not premium) returning token into run_token;
  insert into photo_coach_reviews(user_id, photo_path, counted, claim_token)
  select p_user, photo, not premium, run_token from unnest(unreviewed) photo
  on conflict (user_id,photo_path) do update
  set counted = excluded.counted, claim_token = excluded.claim_token, claimed_at = now()
  where photo_coach_reviews.advice is null;
  return jsonb_build_object('token', run_token, 'photos', to_jsonb(unreviewed));
end;
$$;

create or replace function public.photo_coach_save_fenced_service(p_user uuid, p_photo text, p_token uuid, p_advice jsonb, p_model text)
returns boolean language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 7401));
  if p_advice is null or jsonb_typeof(p_advice) <> 'object' or not exists (
    select 1 from photo_coach_runs r where r.token = p_token and r.user_id = p_user
      and r.finished_at is null and r.started_at > now() - interval '3 minutes'
  ) then return false; end if;
  update photo_coach_reviews set advice = p_advice, model = p_model
  where user_id = p_user and photo_path = p_photo and claim_token = p_token and advice is null
    and exists(select 1 from profiles p where p.id = p_user and p_photo = any(p.photos));
  if not found then return false; end if;

  update photo_coach_runs set charged = true where token = p_token and free_session and not charged;
  if found then
    insert into photo_coach_usage(user_id, first_look_at, free_looks_used) values (p_user, now(), 1)
    on conflict(user_id) do update set free_looks_used = photo_coach_usage.free_looks_used + 1;
  end if;
  return true;
end;
$$;

create function public.photo_coach_finish_service(p_user uuid,p_token uuid) returns void
language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 7401));
  update photo_coach_runs set finished_at = now() where user_id = p_user and token = p_token and finished_at is null;
end;
$$;
revoke all on function public.photo_coach_finish_service(uuid,uuid) from public, anon, authenticated;
grant execute on function public.photo_coach_finish_service(uuid,uuid) to service_role;

update halal_mode_private.legal_document_registry set is_current = false where is_current;
insert into halal_mode_private.legal_document_registry
  (document_type, version, title, effective_date, url, is_current)
values
  ('terms', '2026-11-19', 'Terms of Service', date '2026-11-19', 'https://halalmo.de/legal/terms', true),
  ('privacy', '2026-11-19', 'Privacy Notice', date '2026-11-19', 'https://halalmo.de/legal/privacy', true);
