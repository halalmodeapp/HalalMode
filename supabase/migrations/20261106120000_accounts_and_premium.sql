-- Entitlements own access. The profile tier is only a projection for older clients.
-- Import existing access once; later reads never infer it from the projection.
insert into halal_mode_private.member_entitlements (user_id, tier, state, provider)
select p.id, 'premium', 'active', 'legacy'
from public.profiles p
where p.tier = 'premium'
  and not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = p.id);

create or replace function halal_mode_private.effective_membership_tier(p_user_id uuid)
returns public.membership_tier
language sql stable security definer
set search_path = public, halal_mode_private, pg_catalog as $$
  select case when exists (
    select 1 from halal_mode_private.member_entitlements e
    where e.user_id = p_user_id and e.tier = 'premium' and e.state in ('active', 'grace')
      and (e.expires_at is null or e.expires_at > now())
      and (e.provider is distinct from 'tester' or (
        halal_mode_private.release_flag_enabled_for('tester_tools', p_user_id)
        and halal_mode_private.release_flag_enabled_for('tester_premium_switch', p_user_id)
      ))
  ) then 'premium' else 'free' end::public.membership_tier;
$$;
revoke all on function halal_mode_private.effective_membership_tier(uuid) from public, anon, authenticated, service_role;

create or replace function public.get_my_membership_entitlement()
returns jsonb
language sql stable security definer
set search_path = public, halal_mode_private as $$
  select jsonb_build_object(
    'tier', halal_mode_private.effective_membership_tier(p.id),
    'state', case when halal_mode_private.effective_membership_tier(p.id) = 'premium'
                  then e.state::text else case when e.state = 'revoked' then 'revoked' else 'expired' end end,
    'expiresAt', e.expires_at
  )
  from public.profiles p
  left join halal_mode_private.member_entitlements e on e.user_id = p.id
  where p.id = auth.uid();
$$;

create or replace function halal_mode_private.project_membership_entitlement()
returns trigger
language plpgsql security definer
set search_path = public, halal_mode_private as $$
declare
  v_user uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  v_control text := current_setting('app.account_control_rpc', true);
begin
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles set tier = halal_mode_private.effective_membership_tier(v_user)
  where id = v_user and tier is distinct from halal_mode_private.effective_membership_tier(v_user);
  perform set_config('app.account_control_rpc', coalesce(v_control, ''), true);
  return null;
end;
$$;
revoke all on function halal_mode_private.project_membership_entitlement() from public, anon, authenticated, service_role;
create trigger project_membership_entitlement after insert or update or delete
on halal_mode_private.member_entitlements for each row
execute function halal_mode_private.project_membership_entitlement();

-- Time can pass without a write. Reads enforce expiry; the job repairs the old-client projection.
create or replace function halal_mode_private.reconcile_membership_entitlements()
returns integer
language plpgsql security definer
set search_path = public, halal_mode_private as $$
declare
  v_count integer;
  v_control text := current_setting('app.account_control_rpc', true);
begin
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles p set tier = halal_mode_private.effective_membership_tier(p.id)
  where p.tier is distinct from halal_mode_private.effective_membership_tier(p.id);
  get diagnostics v_count = row_count;
  perform set_config('app.account_control_rpc', coalesce(v_control, ''), true);
  return v_count;
end;
$$;
revoke all on function halal_mode_private.reconcile_membership_entitlements() from public, anon, authenticated, service_role;
select halal_mode_private.reconcile_membership_entitlements();
select cron.schedule('halal-mode-entitlement-projection', '*/15 * * * *',
  'select halal_mode_private.reconcile_membership_entitlements()');

-- Keep the installed no-argument RPC. New clients send the versions they actually displayed.
create or replace function public.accept_legal_documents(
  p_terms_version text default null, p_privacy_version text default null,
  p_sensitive_consent boolean default false
) returns jsonb
language plpgsql security definer
set search_path = public, halal_mode_private as $$
declare
  v_user_id uuid := auth.uid();
  v_terms text;
  v_privacy text;
begin
  if v_user_id is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_user_id and onboarding_complete) then
    raise exception 'Complete onboarding before accepting updated documents' using errcode = '42501';
  end if;
  -- Publication must wait until this acceptance has recorded the checked versions.
  lock table halal_mode_private.legal_document_registry in share mode;
  select version into v_terms from halal_mode_private.legal_document_registry where document_type = 'terms' and is_current;
  select version into v_privacy from halal_mode_private.legal_document_registry where document_type = 'privacy' and is_current;
  if v_terms is null or v_privacy is null then
    raise exception 'Current legal documents are unavailable' using errcode = '55000';
  end if;
  if (p_terms_version is not null and p_terms_version is distinct from v_terms)
     or (p_privacy_version is not null and p_privacy_version is distinct from v_privacy) then
    raise exception 'Current legal documents must be accepted' using errcode = '22023';
  end if;
  insert into halal_mode_private.member_legal_consent_history (user_id, document_type, version, acceptance_context)
  select v_user_id, d.document_type, d.version, 'reacceptance'
  from halal_mode_private.legal_document_registry d where d.is_current
  on conflict (user_id, document_type, version) do nothing;
  if p_sensitive_consent then perform public.record_sensitive_consent(); end if;
  return public.get_my_legal_consent_status();
end;
$$;
revoke all on function public.accept_legal_documents(text, text, boolean) from public, anon;
grant execute on function public.accept_legal_documents(text, text, boolean) to authenticated;

create or replace function public.accept_current_legal_documents()
returns jsonb language sql security definer
set search_path = public, halal_mode_private as $$
  select public.accept_legal_documents();
$$;

-- All required profile follow-ups commit together. Retrying a lost response is safe.
create or replace function public.complete_onboarding_account(
  p_name text, p_first_name text, p_birth_date date, p_gender text,
  p_city text, p_country text, p_latitude double precision, p_longitude double precision,
  p_terms_version text, p_privacy_version text,
  p_marital_status text default null, p_sensitive_consent boolean default false,
  p_selfie_path text default null
) returns void language plpgsql security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1919));
  lock table halal_mode_private.legal_document_registry in share mode;
  if not exists (select 1 from public.profiles where id = auth.uid() and onboarding_complete) then
    perform public.complete_onboarding(p_name, p_first_name, p_birth_date, p_gender, p_city, p_country,
      p_latitude, p_longitude, p_terms_version, p_privacy_version);
  end if;
  perform public.accept_legal_documents(p_terms_version, p_privacy_version, p_sensitive_consent);
  if p_marital_status is not null then perform public.set_my_marital_status(p_marital_status); end if;
  if p_selfie_path is not null and not exists (
    select 1 from halal_mode_private.member_selfies where user_id = auth.uid() and path = p_selfie_path
  ) then perform public.submit_selfie(p_selfie_path); end if;
end;
$$;
revoke all on function public.complete_onboarding_account(text, text, date, text, text, text, double precision, double precision, text, text, text, boolean, text) from public, anon;
grant execute on function public.complete_onboarding_account(text, text, date, text, text, text, double precision, double precision, text, text, text, boolean, text) to authenticated;


create or replace function public.set_my_premium_preferences(p_patch jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_key text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if halal_mode_private.effective_membership_tier(auth.uid()) is distinct from 'premium' then
    raise exception 'Premium filters need Halal Mode Premium' using errcode = '42501';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Preference changes must be an object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('has_children', 'occupations', 'languages', 'education', 'dress', 'ethnicities', 'heritage', 'grew_up', 'diet', 'must_have') then
      raise exception 'Unknown preference: %', v_key using errcode = '22023';
    end if;
    if v_key <> 'must_have' and (
      jsonb_typeof(p_patch->v_key) <> 'array' or jsonb_array_length(p_patch->v_key) > 300
    ) then
      raise exception 'Preference % is invalid', v_key using errcode = '22023';
    end if;
  end loop;
  if p_patch ? 'must_have' then
    if jsonb_typeof(p_patch->'must_have') <> 'object' or exists (
      select 1 from jsonb_object_keys(p_patch->'must_have') as k(key)
      where key not in ('has_children', 'occupations', 'languages', 'education', 'dress', 'ethnicities', 'heritage', 'grew_up', 'diet')
         or jsonb_typeof(p_patch->'must_have'->key) <> 'boolean'
    ) then
      raise exception 'Must-have choices are invalid' using errcode = '22023';
    end if;
  end if;

  update public.private_preferences pp set
    preferred_has_children = case when p_patch ? 'has_children'
      then array(select jsonb_array_elements_text(p_patch->'has_children')) else pp.preferred_has_children end,
    preferred_occupations = case when p_patch ? 'occupations'
      then array(select jsonb_array_elements_text(p_patch->'occupations')) else pp.preferred_occupations end,
    preferred_languages = case when p_patch ? 'languages'
      then array(select jsonb_array_elements_text(p_patch->'languages')) else pp.preferred_languages end,
    preferred_education = case when p_patch ? 'education'
      then array(select jsonb_array_elements_text(p_patch->'education')) else pp.preferred_education end,
    preferred_dress = case when p_patch ? 'dress'
      then array(select jsonb_array_elements_text(p_patch->'dress')) else pp.preferred_dress end,
    preferred_ethnicities = case when p_patch ? 'ethnicities'
      then array(select jsonb_array_elements_text(p_patch->'ethnicities')) else pp.preferred_ethnicities end,
    preferred_heritage_countries = case when p_patch ? 'heritage'
      then array(select jsonb_array_elements_text(p_patch->'heritage')) else pp.preferred_heritage_countries end,
    preferred_grew_up_countries = case when p_patch ? 'grew_up'
      then array(select jsonb_array_elements_text(p_patch->'grew_up')) else pp.preferred_grew_up_countries end,
    preferred_diet = case when p_patch ? 'diet'
      then array(select jsonb_array_elements_text(p_patch->'diet')) else pp.preferred_diet end,
    premium_must_have = case when p_patch ? 'must_have' then p_patch->'must_have' else pp.premium_must_have end
  where pp.user_id = auth.uid();
  if not found then raise exception 'Preferences not found' using errcode = 'P0002'; end if;
end;
$function$;


create or replace function halal_mode_private.premium_filters_allow(p_viewer uuid, p_candidate uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((
    select
      -- Only a Premium member's filters apply; a free member's are kept but unused.
      halal_mode_private.effective_membership_tier(v.id) is distinct from 'premium'
      or (
        (not coalesce((pp.premium_must_have->>'has_children')::boolean, false)
          or cardinality(pp.preferred_has_children) = 0
          or c.has_children is null or c.has_children = 'prefer_not_to_say'
          or c.has_children = any(pp.preferred_has_children))
        and (not coalesce((pp.premium_must_have->>'occupations')::boolean, false)
          or cardinality(pp.preferred_occupations) = 0
          or nullif(c.occupation, '') is null
          or c.occupation = any(pp.preferred_occupations))
        and (not coalesce((pp.premium_must_have->>'languages')::boolean, false)
          or cardinality(pp.preferred_languages) = 0
          or cardinality(coalesce(c.languages_spoken, '{}')) = 0
          or c.languages_spoken && pp.preferred_languages)
        and (not coalesce((pp.premium_must_have->>'education')::boolean, false)
          or cardinality(pp.preferred_education) = 0
          or c.education is null
          or c.education = any(pp.preferred_education))
        and (not coalesce((pp.premium_must_have->>'dress')::boolean, false)
          or cardinality(pp.preferred_dress) = 0
          or c.religious_dress is null
          or c.religious_dress = any(pp.preferred_dress))
        -- Ethnicity and heritage: anyone sharing at least one answer. "Prefer
        -- not to say" is never held against someone.
        and (not coalesce((pp.premium_must_have->>'ethnicities')::boolean, false)
          or cardinality(pp.preferred_ethnicities) = 0
          or cardinality(c.ethnicities) = 0 or 'prefer_not_to_say' = any(c.ethnicities)
          or c.ethnicities && pp.preferred_ethnicities)
        and (not coalesce((pp.premium_must_have->>'heritage')::boolean, false)
          or cardinality(pp.preferred_heritage_countries) = 0
          or cardinality(c.heritage_countries) = 0 or 'prefer_not_to_say' = any(c.heritage_countries)
          or c.heritage_countries && pp.preferred_heritage_countries)
        -- Where they grew up and their diet: anyone sharing at least one answer.
        -- A profile that has not answered is never held against someone.
        and (not coalesce((pp.premium_must_have->>'grew_up')::boolean, false)
          or cardinality(pp.preferred_grew_up_countries) = 0
          or cardinality(c.grew_up_countries) = 0
          or c.grew_up_countries && pp.preferred_grew_up_countries)
        and (not coalesce((pp.premium_must_have->>'diet')::boolean, false)
          or cardinality(pp.preferred_diet) = 0
          or cardinality(c.diet) = 0
          or c.diet && pp.preferred_diet)
      )
    from public.profiles v
    join public.private_preferences pp on pp.user_id = v.id
    join public.profiles c on c.id = p_candidate
    where v.id = p_viewer
  ), true);
$function$;


create or replace function halal_mode_private.halal_cards_is_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private as $$
  select exists (select 1 from public.profiles p where p.id = p_user_id and halal_mode_private.effective_membership_tier(p.id) = 'premium')
$$;


create or replace function halal_mode_private.premium_sees_liker(p_viewer uuid, p_subject uuid)
returns boolean
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select exists (select 1 from public.profiles v where v.id = p_viewer and halal_mode_private.effective_membership_tier(v.id) = 'premium')
     and exists (select 1 from halal_mode_private.liked_you_current(p_viewer) l where l.liker_id = p_subject);
$function$;


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
  select (halal_mode_private.effective_membership_tier(auth.uid()) = 'premium') into v_premium;
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
  perform pg_advisory_xact_lock(hashtextextended(least(v_me, p_liker_id)::text, 1919));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_me, p_liker_id)::text, 1919));
  if halal_mode_private.effective_membership_tier(v_me) <> 'premium' then
    raise exception 'Liking back needs Halal Mode Premium' using errcode = '42501', hint = 'premium_required';
  end if;
  if not exists (select 1 from halal_mode_private.liked_you_current(v_me) l where l.liker_id = p_liker_id) then
    raise exception 'That like is no longer available' using errcode = 'P0002';
  end if;

  if not halal_mode_private.league_pair_stands(v_me, p_liker_id)
     or halal_mode_private.league_pair_passed(v_me, p_liker_id) then
    raise exception 'That like is no longer available' using errcode = 'P0002';
  end if;
  if exists (select 1 from halal_mode_private.owed_connections(v_me)) then
    raise exception 'Answer the questions you owe before continuing' using errcode = '22023';
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

  select l.open_connections into v_cap_me from public.profiles p cross join lateral public.tier_limits(halal_mode_private.effective_membership_tier(p.id)) l where p.id = v_me;
  select l.open_connections into v_cap_them from public.profiles p cross join lateral public.tier_limits(halal_mode_private.effective_membership_tier(p.id)) l where p.id = p_liker_id;
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


create or replace function public.get_my_photo_coach()
returns jsonb
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select jsonb_build_object(
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object('photo', x.photo, 'position', x.at, 'advice', r.advice) order by x.at)
      from unnest(p.photos) with ordinality as x(photo, at)
      join halal_mode_private.photo_coach_reviews r
        on r.user_id = p.id and r.photo_path = x.photo and r.advice is not null
    ), '[]'::jsonb),
    'unreviewed', (
      select count(*)::int from unnest(p.photos) as x(photo)
      where not exists (select 1 from halal_mode_private.photo_coach_reviews r
                        where r.user_id = p.id and r.photo_path = x.photo and r.advice is not null)
    ),
    -- A first look that partly failed stays free until it is finished.
    'firstLookFree', coalesce((select u.first_look_at is null from halal_mode_private.photo_coach_usage u where u.user_id = p.id), true)
      or exists (select 1 from unnest(p.photos) as x(photo)
                 join halal_mode_private.photo_coach_reviews r on r.user_id = p.id and r.photo_path = x.photo
                 where r.advice is null and not r.counted),
    'freeLooksLeft', greatest(0, 3 - coalesce((select u.free_looks_used from halal_mode_private.photo_coach_usage u where u.user_id = p.id), 0)),
    'premium', halal_mode_private.effective_membership_tier(p.id) = 'premium'
  )
  from public.profiles p where p.id = auth.uid();
$function$;


create or replace function public.photo_coach_claim_service(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_token uuid := gen_random_uuid();
  v_tier public.membership_tier;
  v_photos text[];
  v_first boolean;
  v_left int;
  v_photo text;
  v_counted boolean;
  v_claimed text[] := '{}';
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 7401));
  select p.photos, halal_mode_private.effective_membership_tier(p.id) into v_photos, v_tier from public.profiles p where p.id = p_user;
  insert into halal_mode_private.photo_coach_usage (user_id) values (p_user) on conflict do nothing;
  select u.first_look_at is null, 3 - u.free_looks_used into v_first, v_left
  from halal_mode_private.photo_coach_usage u where u.user_id = p_user;
  -- Looks still running hold theirs.
  v_left := v_left - (
    select count(*) from halal_mode_private.photo_coach_reviews r
    where r.user_id = p_user and r.counted and r.advice is null and r.claimed_at > now() - interval '2 minutes'
  );

  foreach v_photo in array coalesce(v_photos, '{}') loop
    select r.counted into v_counted from halal_mode_private.photo_coach_reviews r
    where r.user_id = p_user and r.photo_path = v_photo
      -- A look nobody finished can be taken again after a couple of minutes.
      and r.advice is null and r.claimed_at <= now() - interval '2 minutes';
    if not found then
      continue when exists (select 1 from halal_mode_private.photo_coach_reviews r
                            where r.user_id = p_user and r.photo_path = v_photo);
      v_counted := not v_first;
    end if;
    if v_tier = 'premium' then v_counted := false; end if;
    if v_counted then
      continue when v_left <= 0;
      v_left := v_left - 1;
    end if;
    insert into halal_mode_private.photo_coach_reviews (user_id, photo_path, counted, claim_token)
    values (p_user, v_photo, v_counted, v_token)
    on conflict (user_id, photo_path) do update
    set counted = excluded.counted, claim_token = excluded.claim_token, claimed_at = now();
    v_claimed := v_claimed || v_photo;
  end loop;

  if v_first and cardinality(v_claimed) > 0 then
    update halal_mode_private.photo_coach_usage set first_look_at = now() where user_id = p_user;
  end if;
  return jsonb_build_object('token', v_token, 'photos', to_jsonb(v_claimed));
end;
$function$;


create or replace function halal_mode_private.waiting_connection_candidates(p_member_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public as $$
  with supplied as (
    select distinct member_id
    from unnest(coalesce(p_member_ids, '{}'::uuid[])) member_id
    order by member_id
  ), ranked as (
    select q.user_a, q.user_b, q.matched_at, supplied.member_id,
           row_number() over (
             partition by supplied.member_id
             order by q.matched_at, q.user_a, q.user_b
           ) as member_rank
    from supplied
    join mutual_connection_queue q
      on supplied.member_id in (q.user_a, q.user_b)
    where not exists (
      select 1 from profiles p
      where p.id in (q.user_a, q.user_b) and p.is_paused
    )
      and not exists (
        select 1 from halal_mode_private.account_deletion_requests d
        where d.user_id in (q.user_a, q.user_b) and d.processed_at is null
      )
      and not exists (
        select 1 from profiles p cross join lateral tier_limits(halal_mode_private.effective_membership_tier(p.id)) l
        where p.id in (q.user_a, q.user_b)
          -- Supplied members may be about to free a slot by closing or deleting.
          and not (p.id = any(coalesce(p_member_ids, '{}'::uuid[])))
          and (select count(*) from connections c
               where c.closed_at is null and p.id in (c.user_a, c.user_b)) >= l.open_connections
      )
      and not exists (
      select 1 from connections c where c.user_a = q.user_a and c.user_b = q.user_b
    )
      and not exists (
        select 1 from blocks b
        where (b.blocker_id = q.user_a and b.blocked_id = q.user_b)
           or (b.blocker_id = q.user_b and b.blocked_id = q.user_a)
      )
  ), fair_candidates as (
    select user_a, user_b, min(matched_at) as matched_at
    from ranked
    where member_rank <= 10
    group by user_a, user_b
    order by min(matched_at), user_a, user_b
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('a', q.user_a, 'b', q.user_b)
    order by q.matched_at, q.user_a, q.user_b
  ), '[]'::jsonb)
  from fair_candidates q;

$$;


create or replace function halal_mode_private.promote_waiting_connection_candidates(
  p_member_ids uuid[], p_candidates jsonb
) returns integer
language plpgsql
security definer
set search_path = public as $$
declare
  v_candidates jsonb := p_candidates;
  v_user uuid;
  v_pair record;
  v_cap_a int;
  v_cap_b int;
  v_count_a int;
  v_count_b int;
  v_promoted int := 0;
begin
  -- Remove a bounded batch of terminal rows for hygiene. Candidate selection
  -- also excludes all stale rows, so a backlog larger than this cleanup batch
  -- can never crowd out a real mutual.
  with supplied as (
    select distinct member_id
    from unnest(coalesce(p_member_ids, '{}'::uuid[])) member_id
    order by member_id
  ), stale as (
    select q.user_a, q.user_b
    from mutual_connection_queue q
    join supplied on supplied.member_id in (q.user_a, q.user_b)
    where (
        exists (select 1 from connections c where c.user_a = q.user_a and c.user_b = q.user_b)
        or exists (
          select 1 from blocks b
          where (b.blocker_id = q.user_a and b.blocked_id = q.user_b)
             or (b.blocker_id = q.user_b and b.blocked_id = q.user_a)
        )
      )
    order by q.matched_at, q.user_a, q.user_b
    limit 100
  )
  delete from mutual_connection_queue q
  using stale s
  where q.user_a = s.user_a and q.user_b = s.user_b;

  for v_user in
    select distinct candidate_id
    from jsonb_to_recordset(v_candidates) as candidate(a uuid, b uuid)
    cross join lateral unnest(array[candidate.a, candidate.b]) candidate_id
    union
    select member_id from unnest(coalesce(p_member_ids, '{}'::uuid[])) member_id
    order by candidate_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  end loop;

  for v_pair in
    select candidate.a, candidate.b
    from jsonb_to_recordset(v_candidates) as candidate(a uuid, b uuid)
  loop
    if exists (
      select 1 from blocks b
      where (b.blocker_id = v_pair.a and b.blocked_id = v_pair.b)
         or (b.blocker_id = v_pair.b and b.blocked_id = v_pair.a)
    ) or exists (
      select 1 from connections c where c.user_a = v_pair.a and c.user_b = v_pair.b
    ) then
      delete from mutual_connection_queue
      where user_a = v_pair.a and user_b = v_pair.b;
      continue;
    end if;

    select l.open_connections into v_cap_a
    from profiles p cross join lateral tier_limits(halal_mode_private.effective_membership_tier(p.id)) l
    where p.id = v_pair.a;
    select l.open_connections into v_cap_b
    from profiles p cross join lateral tier_limits(halal_mode_private.effective_membership_tier(p.id)) l
    where p.id = v_pair.b;
    select count(*)::int into v_count_a from connections
    where closed_at is null and (user_a = v_pair.a or user_b = v_pair.a);
    select count(*)::int into v_count_b from connections
    where closed_at is null and (user_a = v_pair.b or user_b = v_pair.b);

    if v_count_a < v_cap_a and v_count_b < v_cap_b
       and not exists (select 1 from profiles p where p.id in (v_pair.a, v_pair.b) and p.is_paused)
       and not exists (select 1 from halal_mode_private.account_deletion_requests d
                       where d.user_id in (v_pair.a, v_pair.b) and d.processed_at is null) then
      insert into connections (user_a, user_b)
      values (v_pair.a, v_pair.b)
      on conflict (user_a, user_b) do nothing;
      if found then v_promoted := v_promoted + 1; end if;
      delete from mutual_connection_queue
      where user_a = v_pair.a and user_b = v_pair.b;
    end if;
  end loop;

  return v_promoted;
end;
$$;


create or replace function public.league_commit_edges_service(p_job jsonb, p_edges jsonb)
returns int
language plpgsql
security definer
set search_path = public, halal_mode_private
set statement_timeout = '30s'
set plan_cache_mode = force_custom_plan
set lock_timeout = '25s'
as $function$
declare
  v_cycle date := (p_job ->> 'cycleDate')::date;
  v_gap int;
  v_count int;
  v_user uuid;
  v_one_way boolean;
begin
  perform halal_mode_private.league_take_lease(p_job);
  select repeat_gap_days into v_gap from halal_mode_private.league_config;
  select j.one_way into v_one_way from halal_mode_private.league_jobs j
  where j.cycle_date = v_cycle and j.wave = (p_job ->> 'wave')::int
    and j.stratum = p_job ->> 'stratum' and j.table_no = (p_job ->> 'tableNo')::int;

  -- The same locks a block, a pause, a pick or a new connection takes, in one order. Whatever else
  -- happens to these people happens wholly before these checks or wholly after this commit.
  for v_user in
    select distinct id from (
      select (e ->> 'a')::uuid as id from jsonb_array_elements(p_edges) e
      union select (e ->> 'b')::uuid from jsonb_array_elements(p_edges) e
    ) members order by id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  end loop;

  -- Everyone once, then every pair from those rows, which is what makes checking 400 pairs quick.
  with proposed as (
    select e.a, e.b, e.score,
      row_number() over (partition by e.a) as seq_a,
      row_number() over (partition by e.b) as seq_b,
      row_number() over (partition by least(e.a, e.b), greatest(e.a, e.b)) as seq_pair
    from jsonb_to_recordset(p_edges) as e(a uuid, b uuid, score numeric)
  ), people as materialized (
    select f as facts, f.id, r.id as round_id, r.opens_at, r.seats,
      seat.seats - seat.used as seats_here,
      -- Out here, so it runs once for each person in the result and not for everyone scanned.
      halal_mode_private.matching_member_eligible(f.id) as consented,
      (select count(*) from public.introductions i where i.round_id = r.id) as holding
    from halal_mode_private.member_matching_facts f
    join public.profiles p on p.id = f.id
    join public.rounds r on r.user_id = f.id and r.cycle_date = v_cycle
    join halal_mode_private.league_seats seat
      on seat.user_id = f.id and seat.cycle_date = v_cycle
     and seat.wave = (p_job ->> 'wave')::int and seat.stratum = p_job ->> 'stratum'
     and seat.table_no = (p_job ->> 'tableNo')::int
    cross join lateral public.tier_limits(halal_mode_private.effective_membership_tier(p.id)) l
    where f.id in (select a from proposed union select b from proposed)
      and (select count(*) from public.connections c
           where c.closed_at is null and (c.user_a = f.id or c.user_b = f.id)) < l.open_connections
      and not p.is_paused
      and r.submitted_at is null
      -- Nothing is added to a set someone has already started looking at.
      and r.opens_at > now()
  ), checked as (
    select pr.a, pr.b, pr.score, pa.round_id as round_a, pb.round_id as round_b,
           case when v_one_way then pa.opens_at else greatest(pa.opens_at, pb.opens_at) end as available_at,
           gen_random_uuid() as intro_a, gen_random_uuid() as intro_b
    from proposed pr
    join people pa on pa.id = pr.a
    join people pb on pb.id = pr.b
    where pa.consented and pb.consented
      and pr.seq_pair = 1
      -- The same rules as matching_pair_accepts, written out: a table commits hundreds at once, and
      -- calling a function for each pair makes this several times slower while it holds member locks.
      and (pa.facts).gender <> (pb.facts).gender
      and halal_mode_private.accepts_row(pa.facts, pb.facts, null)
      and halal_mode_private.accepts_row(pb.facts, pa.facts, null)
      and not exists (select 1 from public.blocks x
                      where (x.blocker_id = pr.a and x.blocked_id = pr.b)
                         or (x.blocker_id = pr.b and x.blocked_id = pr.a))
      and not exists (select 1 from halal_mode_private.member_hides x
                      where (x.hider_id = pr.a and x.hidden_id = pr.b)
                         or (x.hider_id = pr.b and x.hidden_id = pr.a))
      and pa.holding + pr.seq_a <= pa.seats
      and (v_one_way or pb.holding + pr.seq_b <= pb.seats)
      and pr.seq_a <= pa.seats_here
      and (v_one_way or pr.seq_b <= pb.seats_here)
      and not exists (
        select 1 from halal_mode_private.pair_exposure x
        where x.user_low = least(pr.a, pr.b) and x.user_high = greatest(pr.a, pr.b)
          and (x.retired_at is not null or x.cooldown_until > now()
               or x.last_shown_at > now() - make_interval(days => v_gap - 1))
      )
      and not exists (select 1 from halal_mode_private.league_returns x
                      where (x.recipient = pr.a and x.sender = pr.b)
                         or (x.recipient = pr.b and x.sender = pr.a))
      and not exists (select 1 from public.connections x
                      where x.user_a = least(pr.a, pr.b) and x.user_b = greatest(pr.a, pr.b))
      and not exists (select 1 from public.introduction_selections x
                      where x.decision = 'explicit_pass'
                        and ((x.viewer_id = pr.a and x.subject_id = pr.b)
                          or (x.viewer_id = pr.b and x.subject_id = pr.a)))
  ), written as (
    insert into public.introductions (id, round_id, viewer_id, subject_id, reciprocal_id, agreements)
    select intro_a, round_a, a, b, case when v_one_way then null else intro_b end, public.agreement_summary(a, b) from checked
    union all
    select intro_b, round_b, b, a, intro_a, public.agreement_summary(b, a) from checked where not v_one_way
    on conflict (round_id, subject_id) do nothing
    returning 1
  ), spent as (
    update halal_mode_private.league_seats seat
    set used = seat.used + x.n
    from (
      select id, count(*)::int as n from (select a as id from checked union all select b from checked where not v_one_way) y group by id
    ) x
    where seat.user_id = x.id and seat.cycle_date = v_cycle
      and seat.wave = (p_job ->> 'wave')::int and seat.stratum = p_job ->> 'stratum'
      and seat.table_no = (p_job ->> 'tableNo')::int
    returning 1
  ), remembered as (
    insert into halal_mode_private.pair_exposure as pe (
      user_low, user_high, times_shown, seen_by_low, seen_by_high,
      first_reciprocal_score, last_reciprocal_score, last_shown_at, last_round_id
    )
    select least(a, b), greatest(a, b), 1,
           case when not v_one_way or a < b then 1 else 0 end,
           case when not v_one_way or a > b then 1 else 0 end,
           score, score, available_at,
           case when a < b then round_a else round_b end
    from checked
    on conflict (user_low, user_high) do update set
      times_shown = pe.times_shown + 1,
      seen_by_low = pe.seen_by_low + excluded.seen_by_low,
      seen_by_high = pe.seen_by_high + excluded.seen_by_high,
      last_reciprocal_score = excluded.last_reciprocal_score,
      last_shown_at = excluded.last_shown_at,
      last_round_id = excluded.last_round_id
    returning 1
  )
  select (select count(*) from written) / case when v_one_way then 1 else 2 end into v_count;

  update halal_mode_private.league_jobs
  set edges = edges + v_count
  where cycle_date = v_cycle and wave = (p_job ->> 'wave')::int
    and stratum = p_job ->> 'stratum' and table_no = (p_job ->> 'tableNo')::int
    and lease_token = (p_job ->> 'token')::uuid;
  return v_count;
end;
$function$;


create or replace function public.league_commit_rounds_service(p_job jsonb, p_windows jsonb)
returns int
language plpgsql
security definer
set search_path = public, halal_mode_private
set statement_timeout = '30s'
as $function$
declare
  v_count int;
begin
  perform halal_mode_private.league_take_lease(p_job);
  insert into public.rounds (user_id, tier, opens_at, expires_at, cycle_date)
  select w.user_id, halal_mode_private.effective_membership_tier(p.id), w.opens_at, w.expires_at, (p_job ->> 'cycleDate')::date
  from jsonb_to_recordset(p_windows) as w(user_id uuid, opens_at timestamptz, expires_at timestamptz)
  join public.profiles p on p.id = w.user_id
  on conflict (user_id, cycle_date) where cycle_date is not null do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;


create or replace view halal_mode_private.member_matching_facts as
select
  p.id,
  p.gender::text as gender,
  p.marital_status,
  lower(btrim(p.country)) as country_key,
  p.relocation::text as relocation,
  p.latitude,
  p.longitude,
  p.sect,
  p.sect_detail,
  (halal_mode_private.effective_membership_tier(p.id) = 'premium') as is_premium,
  extract(year from age(p.birth_date))::int as age,
  p.religious_practice::text as religious_practice,
  p.timeline::text as timeline,
  p.family_goals::text as family_goals,
  pp.min_age, pp.max_age, pp.min_height_cm, pp.max_height_cm, pp.own_height_cm,
  pp.preferred_builds, pp.own_build, pp.own_build_also,
  pp.preferred_practice::text[] as preferred_practice,
  pp.desired_timeline::text[] as desired_timeline,
  pp.desired_family_goals::text[] as desired_family_goals,
  pp.preferred_sects, pp.preferred_sect_details, pp.max_distance_km,
  coalesce(
    (select array_agg(lower(btrim(c))) from unnest(pp.preferred_countries) as c),
    array[lower(btrim(p.country))]
  ) as preferred_country_keys,
  coalesce(pp.accepted_marital_statuses, array['never_married', 'divorced', 'widowed']::text[]) as accepted_marital_statuses,
  coalesce(pp.must_have, '{}'::jsonb) as must_have,
  p.has_children,
  nullif(p.occupation, '') as occupation,
  p.education,
  p.religious_dress,
  coalesce(p.languages_spoken, '{}') as languages_spoken,
  coalesce(p.ethnicities, '{}') as ethnicities,
  coalesce(p.heritage_countries, '{}') as heritage_countries,
  coalesce(p.grew_up_countries, '{}') as grew_up_countries,
  coalesce(p.diet, '{}') as diet,
  coalesce(pp.premium_must_have, '{}'::jsonb) as premium_must_have,
  coalesce(pp.preferred_has_children, '{}') as preferred_has_children,
  coalesce(pp.preferred_occupations, '{}') as preferred_occupations,
  coalesce(pp.preferred_languages, '{}') as preferred_languages,
  coalesce(pp.preferred_education, '{}') as preferred_education,
  coalesce(pp.preferred_dress, '{}') as preferred_dress,
  coalesce(pp.preferred_ethnicities, '{}') as preferred_ethnicities,
  coalesce(pp.preferred_heritage_countries, '{}') as preferred_heritage_countries,
  coalesce(pp.preferred_grew_up_countries, '{}') as preferred_grew_up_countries,
  coalesce(pp.preferred_diet, '{}') as preferred_diet
from public.profiles p
join public.private_preferences pp on pp.user_id = p.id;


create or replace view halal_mode_private.league_pool as
select p.id, p.gender::text as gender, halal_mode_private.effective_membership_tier(p.id) as tier,
  lower(btrim(p.country)) as country_key, p.latitude, p.longitude, p.high_latitude_fajr_method
from public.profiles p
left join halal_mode_private.league_member_activity a on a.user_id = p.id
cross join halal_mode_private.league_config cfg
cross join lateral public.tier_limits(halal_mode_private.effective_membership_tier(p.id)) l
where halal_mode_private.matching_member_eligible(p.id)
  and coalesce(a.last_seen_at, p.created_at) > now() - make_interval(days => cfg.dormant_after_days)
  and (select count(*) from public.connections c
       where c.closed_at is null and (c.user_a = p.id or c.user_b = p.id)) < l.open_connections;


create or replace function halal_mode_private.apply_membership_entitlement(
  p_user_id uuid,
  p_tier membership_tier,
  p_state entitlement_state,
  p_provider text,
  p_provider_reference_hash text,
  p_expires_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Entitlements require service role' using errcode = '42501';
  end if;
  if (p_state in ('active', 'grace')) <> (p_tier = 'premium') then
    raise exception 'Entitlement state and tier are inconsistent' using errcode = '22023';
  end if;

  -- Entitlement writers serialize separately from the matching locks taken by projection.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 7326));
  insert into member_entitlements (user_id, tier, state, provider, provider_reference_hash, expires_at)
  values (p_user_id, p_tier, p_state, p_provider, p_provider_reference_hash, p_expires_at)
  on conflict (user_id) do update set
    tier = excluded.tier,
    state = excluded.state,
    provider = excluded.provider,
    provider_reference_hash = excluded.provider_reference_hash,
    expires_at = excluded.expires_at,
    updated_at = now();

  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles set tier = halal_mode_private.effective_membership_tier(p_user_id) where id = p_user_id;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;

  insert into audit_events (actor_id, subject_id, event_type, metadata)
  values (null, p_user_id, 'membership_entitlement_applied', jsonb_build_object('tier', p_tier, 'state', p_state));
end;
$$;


create or replace function halal_mode_private.grant_launch_reward(p_user_id uuid, p_months integer)
returns boolean
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
declare
  v_given integer;
  v_current halal_mode_private.member_entitlements%rowtype;
  v_has_current boolean;
  v_from timestamptz;
begin
  if p_months is null or p_months <= 0 then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 7326));
  select months into v_given from halal_mode_private.launch_reward_grants where user_id = p_user_id;
  v_given := coalesce(v_given, 0);
  if p_months <= v_given then
    return false;
  end if;

  select * into v_current from halal_mode_private.member_entitlements where user_id = p_user_id for update;
  v_has_current := found;
  if v_has_current and coalesce(v_current.provider, '') <> 'launch_reward'
     and halal_mode_private.effective_membership_tier(p_user_id) = 'premium' then
    return false;
  end if;
  -- Extra months follow on from a reward still running.
  v_from := case
    when v_has_current and v_current.provider = 'launch_reward' and v_current.state = 'active'
         and v_current.expires_at > now() then v_current.expires_at
    else now() end;

  insert into halal_mode_private.member_entitlements (user_id, tier, state, provider, provider_reference_hash, expires_at)
  values (p_user_id, 'premium', 'active', 'launch_reward', null, v_from + make_interval(months => p_months - v_given))
  on conflict (user_id) do update set
    tier = 'premium', state = 'active', provider = 'launch_reward', provider_reference_hash = null,
    expires_at = excluded.expires_at, updated_at = now();
  -- The profile trigger rejects client-controlled tier changes. This function
  -- is a trusted server path, like the tester Premium switch.
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles set tier = 'premium' where id = p_user_id;

  insert into halal_mode_private.launch_reward_grants (user_id, months)
  values (p_user_id, p_months)
  on conflict (user_id) do update set months = excluded.months, updated_at = now();
  insert into halal_mode_private.audit_events (subject_id, event_type, metadata)
  values (p_user_id, 'launch_reward_granted', jsonb_build_object('months', p_months, 'added', p_months - v_given));
  return true;
end;
$function$;


create or replace function public.set_my_test_premium(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if not halal_mode_private.release_flag_enabled_for('tester_tools', auth.uid()) then
    raise exception 'Testers only' using errcode = '42501';
  end if;
  if not halal_mode_private.release_flag_enabled_for('tester_premium_switch', auth.uid()) then
    raise exception 'Premium is given by an administrator now' using errcode = '42501', hint = 'switch_off';
  end if;
  -- The tier is server controlled; this function is the server.
  perform set_config('app.account_control_rpc', 'true', true);
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 7326));
  if p_enabled then
    -- The switch cannot replace a running purchase, comp or reward.
    if exists (select 1 from halal_mode_private.member_entitlements e
               where e.user_id = auth.uid() and e.provider is distinct from 'tester'
                 and halal_mode_private.effective_membership_tier(auth.uid()) = 'premium') then return; end if;
    insert into halal_mode_private.member_entitlements (user_id, tier, state, provider, updated_at)
    values (auth.uid(), 'premium', 'active', 'tester', now())
    on conflict (user_id) do update
      set tier = 'premium', state = 'active', provider = 'tester', expires_at = null, updated_at = now();
    update public.profiles set tier = 'premium' where id = auth.uid();
  else
    -- Only a tester grant is taken back; a real purchase is never touched.
    delete from halal_mode_private.member_entitlements
    where user_id = auth.uid() and provider = 'tester';
    update public.profiles set tier = 'free'
    where id = auth.uid()
      and not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = auth.uid());
  end if;
end;
$$;


create or replace function public.set_my_marital_status(p_status text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_gender text;
  v_previous text;
begin
  if v_user is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('never_married', 'divorced', 'widowed', 'married') then
    raise exception 'Choose a marital status' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1919));
  select gender::text, marital_status into v_gender, v_previous from public.profiles where id = v_user for update;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  if p_status = 'married' and v_gender <> 'male' then
    raise exception 'That status is not available' using errcode = '22023';
  end if;
  if v_previous is not distinct from p_status then return; end if;
  update public.profiles set marital_status = p_status where id = v_user;
  insert into halal_mode_private.marital_status_log (user_id, status, previous_status)
  values (v_user, p_status, v_previous);
end;
$function$;


create or replace function halal_mode_private.member_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
declare
  v_code text;
  v_email text;
  v_place halal_mode_private.waitlist%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 8626));
  select code into v_code from halal_mode_private.referral_codes where user_id = p_user_id;
  if v_code is not null then
    return v_code;
  end if;

  select halal_mode_private.canonical_email(u.email) into v_email
  from auth.users u
  where u.id = p_user_id and u.email_confirmed_at is not null;

  if v_email is not null and v_email <> '' then
    select * into v_place from halal_mode_private.waitlist
    where email_canonical = v_email
    order by joined_rank nulls last, created_at
    limit 1;
    if found then
      if v_place.referral_code is null or v_place.verified_at is null then
        perform halal_mode_private.waitlist_confirm(v_place.id);
        select * into v_place from halal_mode_private.waitlist where id = v_place.id;
      end if;
      update halal_mode_private.referral_codes
      set user_id = p_user_id
      where waitlist_id = v_place.id and user_id is null;
      if found then
        return v_place.referral_code;
      end if;
    end if;
  end if;

  v_code := halal_mode_private.new_referral_code();
  insert into halal_mode_private.referral_codes (code, user_id) values (v_code, p_user_id);
  return v_code;
end;
$function$;


create or replace function public.claim_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_owner halal_mode_private.referral_codes%rowtype;
  v_email text;
  v_created timestamptz;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  -- Serialize the inbox too: aliases on separate accounts cannot both claim it.
  perform pg_advisory_xact_lock(hashtextextended(
    (select halal_mode_private.canonical_email(email) from auth.users where id = v_uid), 8726));
  if v_code !~ '^HM[A-Z0-9]{8}$' then
    return jsonb_build_object('state', 'invalid');
  end if;
  if exists (select 1 from halal_mode_private.member_referrals where referred_user_id = v_uid) then
    return jsonb_build_object('state', 'already');
  end if;

  select * into v_owner from halal_mode_private.referral_codes where code = v_code;
  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  select halal_mode_private.canonical_email(u.email), u.created_at into v_email, v_created
  from auth.users u where u.id = v_uid;
  if v_owner.user_id = v_uid
     or exists (select 1 from halal_mode_private.waitlist w
                where w.id = v_owner.waitlist_id and w.email_canonical = v_email)
     or exists (select 1 from auth.users o
                where o.id = v_owner.user_id and halal_mode_private.canonical_email(o.email) = v_email) then
    return jsonb_build_object('state', 'own');
  end if;
  if v_created < now() - interval '30 days' then
    return jsonb_build_object('state', 'too_late');
  end if;
  if exists (select 1 from halal_mode_private.member_referrals m
             join auth.users u on u.id = m.referred_user_id
             where m.code = v_code and halal_mode_private.canonical_email(u.email) = v_email) then
    return jsonb_build_object('state', 'already');
  end if;

  insert into halal_mode_private.member_referrals (referred_user_id, code)
  values (v_uid, v_code)
  on conflict (referred_user_id) do nothing;
  if not found then return jsonb_build_object('state', 'already'); end if;
  return jsonb_build_object('state', 'claimed');
end;
$function$;



create or replace function public.photo_coach_save_fenced_service(p_user uuid, p_photo text, p_token uuid, p_advice jsonb, p_model text)
returns boolean
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_counted boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 7401));
  update halal_mode_private.photo_coach_reviews
  set advice = p_advice, model = p_model
  where user_id = p_user and photo_path = p_photo and claim_token = p_token and advice is null
    and claimed_at > now() - interval '2 minutes'
    and exists (select 1 from public.profiles p where p.id = p_user and p_photo = any(p.photos))
  returning counted into v_counted;
  if not found then return false; end if;
  if v_counted then
    update halal_mode_private.photo_coach_usage set free_looks_used = free_looks_used + 1 where user_id = p_user;
  end if;
  return true;
end;
$function$;
revoke all on function public.photo_coach_save_fenced_service(uuid, text, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.photo_coach_save_fenced_service(uuid, text, uuid, jsonb, text) to service_role;

create or replace function public.photo_coach_save_service(p_user uuid, p_photo text, p_token uuid, p_advice jsonb, p_model text)
returns void language plpgsql security definer
set search_path = public, halal_mode_private as $$
begin
  perform public.photo_coach_save_fenced_service(p_user, p_photo, p_token, p_advice, p_model);
end;
$$;


-- These renamed bodies have accumulated in-place patches. Retain all of them.
do $$
declare
  v_name text;
  v_def text;
begin
  foreach v_name in array array[
    'halal_mode_private.submit_round_selections_after_legal_consent(uuid,uuid[])',
    'halal_mode_private.get_current_round_state_before_answer_gate()'
  ] loop
    v_def := pg_get_functiondef(v_name::regprocedure);
    if position('tier_limits(p.tier)' in v_def) = 0 then
      raise exception 'Missing membership capacity check in %', v_name;
    end if;
    execute replace(v_def, 'tier_limits(p.tier)',
      'tier_limits(halal_mode_private.effective_membership_tier(p.id))');
  end loop;
end;
$$;

-- Entitlement triggers project the new state. Do not update the same profile again in a sibling CTE.
create or replace function halal_mode_private.expire_launch_rewards()
returns integer language plpgsql security definer
set search_path = halal_mode_private, public, pg_catalog as $$
declare
  v_ended integer;
begin
  with ended as (
    update halal_mode_private.member_entitlements
    set tier = 'free', state = 'expired', updated_at = now()
    where provider = 'launch_reward' and state = 'active' and expires_at <= now()
    returning user_id
  )
  insert into halal_mode_private.audit_events (subject_id, event_type)
  select user_id, 'launch_reward_expired' from ended;
  get diagnostics v_ended = row_count;
  return v_ended;
end;
$$;

-- Record app-only conversions when readiness is gained, even if the referrer never opens progress.
create or replace function halal_mode_private.mark_completed_member_referral()
returns trigger language plpgsql security definer
set search_path = public, halal_mode_private as $$
declare
  v_user uuid;
begin
  if tg_table_name = 'profiles' then
    v_user := new.id;
  else
    v_user := new.referred_user_id;
  end if;
  if public.profile_is_ready_for_matching(v_user) then
    update halal_mode_private.member_referrals set counted_at = now()
    where referred_user_id = v_user and counted_at is null;
  end if;
  return null;
end;
$$;
revoke all on function halal_mode_private.mark_completed_member_referral() from public, anon, authenticated, service_role;
create trigger profiles_count_completed_member_referral
  after insert or update of first_name, city, country, bio, photos on public.profiles
  for each row execute function halal_mode_private.mark_completed_member_referral();
create trigger member_referrals_count_completed
  after insert on halal_mode_private.member_referrals
  for each row execute function halal_mode_private.mark_completed_member_referral();
update halal_mode_private.member_referrals m set counted_at = now()
where counted_at is null and public.profile_is_ready_for_matching(m.referred_user_id);


create or replace function public.request_demo_round()
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_me uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_limit int;
  v_round uuid;
  v_expires timestamptz := now() + interval '24 hours';
  v_demo record;
  v_demo_round uuid;
  v_intro uuid;
  v_twin uuid;
  v_created int := 0;
begin
  if v_me is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if not halal_mode_private.release_flag_enabled_for('demo_introductions', v_me)
     or halal_mode_private.is_demo_member(v_me) then
    return jsonb_build_object('created', false, 'reason', 'off');
  end if;
  if not halal_mode_private.member_has_current_legal_consents(v_me)
     or not public.profile_is_ready_for_matching(v_me) then
    return jsonb_build_object('created', false, 'reason', 'not_ready');
  end if;

  -- One request at a time per member, so a double tap cannot make two sets.
  perform pg_advisory_xact_lock(hashtextextended(v_me::text, 4471));

  -- A sample set that expired unchosen is closed, so it does not hold the one
  -- open-round slot every member has. A real round is never touched.
  update public.rounds r set submitted_at = r.expires_at
  where r.user_id = v_me and r.submitted_at is null and r.expires_at <= now()
    and exists (select 1 from halal_mode_private.demo_rounds d where d.round_id = r.id);

  if exists (select 1 from public.rounds where user_id = v_me and submitted_at is null) then
    return jsonb_build_object('created', false, 'reason', 'has_round');
  end if;
  -- One set a day, like the real thing, so "come back tomorrow" can be tested too.
  if exists (
    select 1 from public.rounds r
    join halal_mode_private.demo_rounds d on d.round_id = r.id
    where r.user_id = v_me and r.created_at > now() - interval '20 hours'
  ) then
    return jsonb_build_object('created', false, 'reason', 'too_soon');
  end if;

  select * into v_profile from public.profiles where id = v_me;
  select introductions into v_limit from public.tier_limits(halal_mode_private.effective_membership_tier(v_me));

  insert into public.rounds (user_id, tier, opens_at, expires_at)
  values (v_me, halal_mode_private.effective_membership_tier(v_me), now(), v_expires)
  returning id into v_round;
  insert into halal_mode_private.demo_rounds (round_id) values (v_round);

  for v_demo in
    select d.user_id, halal_mode_private.effective_membership_tier(p.id) as tier
    from halal_mode_private.demo_members d
    join public.profiles p on p.id = d.user_id
    where p.gender is distinct from v_profile.gender
      and not halal_mode_private.pair_is_hidden(v_me, d.user_id)
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = v_me and b.blocked_id = d.user_id)
           or (b.blocker_id = d.user_id and b.blocked_id = v_me)
      )
      and not exists (
        select 1 from public.connections c
        where c.user_a = least(v_me, d.user_id) and c.user_b = greatest(v_me, d.user_id)
      )
    order by
      -- New faces first, then whoever has the most room for another match.
      (select count(*) from public.introductions i where i.viewer_id = v_me and i.subject_id = d.user_id),
      (select count(*) from public.connections c
        where c.closed_at is null and (c.user_a = d.user_id or c.user_b = d.user_id)),
      random()
    limit v_limit
  loop
    insert into public.rounds (user_id, tier, opens_at, expires_at, submitted_at)
    values (v_demo.user_id, v_demo.tier, now(), v_expires, now())
    returning id into v_demo_round;
    insert into halal_mode_private.demo_rounds (round_id) values (v_demo_round);

    insert into public.introductions (round_id, viewer_id, subject_id, agreements)
    values (v_round, v_me, v_demo.user_id, public.agreement_summary(v_me, v_demo.user_id))
    returning id into v_intro;
    insert into public.introductions (round_id, viewer_id, subject_id, agreements)
    values (v_demo_round, v_demo.user_id, v_me, public.agreement_summary(v_demo.user_id, v_me))
    returning id into v_twin;
    update public.introductions set reciprocal_id = v_twin where id = v_intro;
    update public.introductions set reciprocal_id = v_intro where id = v_twin;

    -- Most sample members choose the tester back, so the match can be seen;
    -- some do not, so not every choice matches. Decided per pair, so the same
    -- sample member always answers the same tester the same way.
    insert into public.introduction_selections (introduction_id, viewer_id, subject_id, decision, decided_at)
    values (
      v_twin, v_demo.user_id, v_me,
      case when ((hashtextextended(v_me::text || v_demo.user_id::text, 7) % 10) + 10) % 10 < 7
        then 'kept' else 'released' end::selection_decision,
      now()
    );
    v_created := v_created + 1;
  end loop;

  if v_created = 0 then
    delete from public.rounds where id = v_round;
    return jsonb_build_object('created', false, 'reason', 'no_sample_members');
  end if;

  return jsonb_build_object('created', true, 'introductions', v_created);
end;
$$;


create or replace function public.admin_grant_premium(p_email text, p_days integer, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_reason text;
  v_user uuid;
  v_current halal_mode_private.member_entitlements%rowtype;
  v_ends timestamptz;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  if p_days is null or p_days not between 1 and 365 then
    raise exception 'Choose between 1 and 365 days' using errcode = '22023';
  end if;
  select u.id into v_user from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'No account with that email. They need to have signed up first.' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 7326));
  select * into v_current from halal_mode_private.member_entitlements where user_id = v_user for update;
  if found and v_current.state in ('active', 'grace')
     and coalesce(v_current.provider, '') <> 'comp'
     and (v_current.expires_at is null or v_current.expires_at > now()) then
    raise exception 'They already have Premium (%). Wait for it to end.', coalesce(v_current.provider, 'unknown source')
      using errcode = '22023';
  end if;

  v_ends := now() + make_interval(days => p_days);
  insert into halal_mode_private.member_entitlements (user_id, tier, state, provider, provider_reference_hash, expires_at)
  values (v_user, 'premium', 'active', 'comp', null, v_ends)
  on conflict (user_id) do update set
    tier = 'premium', state = 'active', provider = 'comp', provider_reference_hash = null,
    expires_at = excluded.expires_at, updated_at = now();
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles set tier = 'premium' where id = v_user;

  -- A newer grant replaces a running one.
  update halal_mode_private.premium_grants set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = 'replaced by a newer grant'
  where user_id = v_user and revoked_at is null and ends_at > now();
  insert into halal_mode_private.premium_grants (user_id, reason, granted_by, ends_at)
  values (v_user, v_reason, auth.uid(), v_ends);

  perform halal_mode_private.admin_audit('premium.granted', jsonb_build_object(
    'email', lower(btrim(p_email)), 'days', p_days, 'ends_at', v_ends, 'reason', v_reason));
  return jsonb_build_object('ends_at', v_ends);
end;
$function$;


create or replace function public.admin_revoke_premium_grant(p_email text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_reason text;
  v_user uuid;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  select u.id into v_user from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'No account with that email.' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 7326));
  if not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = v_user and e.provider = 'comp') then
    raise exception 'They have no complimentary Premium to remove. A purchase is never removed here.' using errcode = '22023';
  end if;
  delete from halal_mode_private.member_entitlements where user_id = v_user and provider = 'comp';
  perform set_config('app.account_control_rpc', 'true', true);
  update public.profiles set tier = 'free' where id = v_user
    and not exists (select 1 from halal_mode_private.member_entitlements e where e.user_id = v_user);
  update halal_mode_private.premium_grants set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = v_reason
  where user_id = v_user and revoked_at is null;
  perform halal_mode_private.admin_audit('premium.revoked', jsonb_build_object(
    'email', lower(btrim(p_email)), 'reason', v_reason));
  return jsonb_build_object('revoked', true);
end;
$function$;


create or replace function public.claim_mail_fenced_service(p_limit integer default 20, p_daily_limit integer default null, p_claim_token uuid default null, p_provider text default null, p_only_pinned boolean default false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'halal_mode_private', 'extensions', 'pg_catalog', 'vault'
AS $function$
declare
  v_link record;
  v_rows jsonb;
  v_secret text;
  v_daily integer;
  v_room integer;
  v_batch integer := least(greatest(p_limit, 1), 200);
  v_safety bigint[];
  v_other bigint[];
begin
  -- Reserve the rolling budget across concurrent claims.
  perform pg_advisory_xact_lock(224, 1);
  -- How much of today's budget is left (a rolling 24 hours, as the provider
  -- counts). Waitlist mail leaves the last 10 for safety reports.
  if p_daily_limit is not null and p_daily_limit > 10 then
    v_daily := p_daily_limit;
  else
    select daily_limit into v_daily from halal_mode_private.mail_settings;
  end if;
  v_room := case when v_daily is null then v_batch else greatest(0, v_daily - (
    select count(*)::integer from halal_mode_private.mail_outbox
    where (p_provider is null or provider is null or provider = p_provider)
      and (sent_at > now() - interval '24 hours'
        or (sent_at is null and budget_reserved and claimed_until > now()))
  )) end;

  select array_agg(id) into v_safety from (
    select id from halal_mode_private.mail_outbox
    where sent_at is null and attempts < 12
      and (p_claim_token is not null or claim_token is null)
      and ((provider is null and not p_only_pinned) or provider = p_provider)
      and (claimed_until is null or claimed_until < now())
      and kind in ('report', 'moderation')
    order by created_at
    limit least(v_batch, v_room)
    for update skip locked
  ) s;
  select array_agg(id) into v_other from (
    select id from halal_mode_private.mail_outbox
    where sent_at is null and attempts < 12
      and (p_claim_token is not null or claim_token is null)
      and ((provider is null and not p_only_pinned) or provider = p_provider)
      and (claimed_until is null or claimed_until < now())
      and kind not in ('report', 'moderation')
    order by created_at
    limit greatest(0, least(
      v_batch - coalesce(cardinality(v_safety), 0),
      case when v_daily is null then v_batch else v_room - 10 - coalesce(cardinality(v_safety), 0) end
    ))
    for update skip locked
  ) o;
  select decrypted_secret into v_secret from vault.decrypted_secrets
  where name = 'halal_mode_waitlist_tokens' order by created_at desc limit 1;

  -- A delayed email must carry a live capability when it is finally sent.
  if v_secret is not null then
    for v_link in
      select w.id, w.verified_at from halal_mode_private.waitlist w
      where exists (select 1 from halal_mode_private.mail_outbox o
                    where o.id = any(coalesce(v_other, '{}')) and o.ref_id = w.id::text
                      and o.kind in ('waitlist_verification', 'referral_joined'))
        and (w.verification_token_ciphertext is null or w.verification_token_expires_at is null
             or w.verification_token_expires_at <= now())
      order by w.id for update
    loop
      perform halal_mode_private.waitlist_issue_token(v_link.id, case when v_link.verified_at is null then 7 else 30 end);
    end loop;
  end if;

  with claimed as (
    update halal_mode_private.mail_outbox o
    set claimed_until = now() + interval '5 minutes', attempts = o.attempts + 1, claim_token = p_claim_token, provider = coalesce(o.provider, p_provider), budget_reserved = true
    where o.id = any(coalesce(v_safety, '{}') || coalesce(v_other, '{}'))
    returning o.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'provider', c.provider,
    'kind', c.kind,
    'to', c.to_email,
    'locale', c.locale,
    'welcome', case when c.kind = 'waitlist_welcome' then (
      select jsonb_build_object('eligible', coalesce(w.joined_rank <= 10000, false))
      from halal_mode_private.waitlist w
      where w.id::text = c.ref_id
    ) end,
    'verification', case when c.kind in ('waitlist_verification', 'waitlist_welcome', 'referral_joined') then (
      select jsonb_build_object(
        'token', extensions.pgp_sym_decrypt(decode(w.verification_token_ciphertext, 'base64'), v_secret),
        'confirmed', w.verified_at is not null
      )
      from halal_mode_private.waitlist w
      where w.id::text = c.ref_id
        and w.verification_token_ciphertext is not null
        and w.verification_token_expires_at > now()
        and v_secret is not null
        and (c.kind <> 'waitlist_welcome' or (w.verified_at is null and (
          w.referred_by_id is not null or w.referred_code is not null)))
    ) end,
    'progress', case when c.kind = 'referral_joined' then (
      select halal_mode_private.waitlist_progress(w.id)
      from halal_mode_private.waitlist w
      where w.id::text = c.ref_id
    ) end,
    'moderation', case when c.kind = 'moderation' then public.moderation_item_service(c.ref_id::bigint) end,
    'report', case when c.kind = 'report' then (
      select jsonb_build_object(
        'id', r.id, 'reason', r.reason, 'detail', r.detail, 'created_at', r.created_at,
        'reporter_id', r.reporter_id, 'reporter_name', rp.first_name,
        'subject_id', r.subject_id, 'subject_name', sp.first_name,
        'subject_city', sp.city, 'subject_country', sp.country,
        'subject_paused', sp.is_paused,
        'subject_report_count', (select count(*) from public.reports x where x.subject_id = r.subject_id)
      )
      from public.reports r
      left join public.profiles rp on rp.id = r.reporter_id
      left join public.profiles sp on sp.id = r.subject_id
      where r.id::text = c.ref_id
    ) end
  )), '[]'::jsonb) into v_rows
  from claimed c;
  return v_rows;
end;
$function$;


alter table halal_mode_private.account_deletion_requests add column claim_token uuid;

create or replace function public.claim_account_deletion_requests(p_limit integer default 25)
returns table (user_id uuid, photo_paths text[], voice_path text)
language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Deletion finalization requires service role' using errcode = '42501'; end if;
  if p_limit < 1 or p_limit > 100 then raise exception 'Limit must be between 1 and 100' using errcode = '22023'; end if;
  return query
  with candidates as (
    select r.user_id from account_deletion_requests r
    where r.processed_at is null and r.claim_token is null
      and r.requested_at <= now() - interval '30 days'
      and (r.processing_started_at is null or r.processing_started_at < now() - interval '15 minutes')
    order by r.requested_at limit p_limit for update skip locked
  ), claimed as (
    update account_deletion_requests r set processing_started_at = now(), attempts = r.attempts + 1, last_error = null
    from candidates c where r.user_id = c.user_id returning r.user_id
  )
  select c.user_id, p.photos, p.audio_greeting_url from claimed c join public.profiles p on p.id = c.user_id;
end;
$$;

create or replace function public.claim_account_deletion_requests_fenced(p_limit integer default 25)
returns table (user_id uuid, photo_paths text[], voice_path text, claim_token uuid)
language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Deletion finalization requires service role' using errcode = '42501'; end if;
  if p_limit < 1 or p_limit > 100 then raise exception 'Limit must be between 1 and 100' using errcode = '22023'; end if;
  return query
  with candidates as (
    select r.user_id from account_deletion_requests r
    where r.processed_at is null
      and r.requested_at <= now() - interval '30 days'
      and (r.processing_started_at is null or r.processing_started_at < now() - interval '15 minutes')
    order by r.requested_at limit p_limit for update skip locked
  ), claimed as (
    update account_deletion_requests r set processing_started_at = now(), attempts = r.attempts + 1, last_error = null, claim_token = gen_random_uuid()
    from candidates c where r.user_id = c.user_id returning r.user_id, r.claim_token
  )
  select c.user_id, p.photos, p.audio_greeting_url, c.claim_token from claimed c join public.profiles p on p.id = c.user_id;
end;
$$;

create or replace function record_account_deletion_failure(p_user_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Deletion finalization requires service role' using errcode = '42501';
  end if;
  update account_deletion_requests
  set processing_started_at = null, last_error = left(coalesce(p_error, 'Unknown finalization error'), 500)
  where user_id = p_user_id and processed_at is null and claim_token is null;
end;
$$;

create or replace function public.record_account_deletion_failure_fenced(p_user_id uuid, p_error text, p_claim_token uuid default null)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Deletion finalization requires service role' using errcode = '42501';
  end if;
  update account_deletion_requests
  set processing_started_at = null, last_error = left(coalesce(p_error, 'Unknown finalization error'), 500)
  where user_id = p_user_id and processed_at is null and claim_token is not distinct from p_claim_token;
end;
$$;

create or replace function public.renew_account_deletion_claim_service(p_user_id uuid, p_claim_token uuid)
returns boolean language plpgsql security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Deletion finalization requires service role' using errcode = '42501';
  end if;
  update account_deletion_requests set processing_started_at = now()
  where user_id = p_user_id and processed_at is null
    and claim_token = p_claim_token and processing_started_at > now() - interval '15 minutes';
  return found;
end;
$$;
revoke all on function public.claim_account_deletion_requests_fenced(integer),
  public.record_account_deletion_failure_fenced(uuid, text, uuid),
  public.renew_account_deletion_claim_service(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_account_deletion_requests_fenced(integer),
  public.record_account_deletion_failure_fenced(uuid, text, uuid),
  public.renew_account_deletion_claim_service(uuid, uuid) to service_role;


-- Once deletion is scheduled, new uploads cannot appear behind the eraser.
create or replace function public.account_media_upload_allowed()
returns boolean language sql stable security definer
set search_path = public, halal_mode_private as $$
  select auth.uid() is not null and not exists (
    select 1 from halal_mode_private.account_deletion_requests d
    where d.user_id = auth.uid() and d.processed_at is null
  );
$$;
revoke all on function public.account_media_upload_allowed() from public, anon;
grant execute on function public.account_media_upload_allowed() to authenticated;
create policy account_deletion_stops_media_inserts on storage.objects as restrictive
for insert to authenticated with check (
  bucket_id not in ('profile-photos', 'voice-introductions', 'verification-selfies')
  or public.account_media_upload_allowed()
);


create or replace function halal_mode_private.profile_takes_entitlement()
returns trigger language plpgsql security definer
set search_path = public, halal_mode_private, pg_catalog as $$
begin
  if halal_mode_private.effective_membership_tier(new.id) = 'premium' then
    perform set_config('app.account_control_rpc', 'true', true);
    update public.profiles set tier = 'premium' where id = new.id;
  end if;
  return null;
end;
$$;

-- A retained invitation belongs to the account that captured it, even during sign-out.
create or replace function public.claim_referral_code_for_member(p_code text, p_expected_user_id uuid default null)
returns jsonb language plpgsql security definer
set search_path = public, halal_mode_private as $$
begin
  if p_expected_user_id is not null and p_expected_user_id is distinct from auth.uid() then
    raise exception 'The account changed' using errcode = '42501';
  end if;
  return public.claim_referral_code(p_code);
end;
$$;
revoke all on function public.claim_referral_code_for_member(text, uuid) from public, anon;
grant execute on function public.claim_referral_code_for_member(text, uuid) to authenticated;


create or replace function set_my_profile_paused(p_paused boolean)
returns void
language plpgsql
security definer
set search_path = public as $$
begin
  if not p_paused and exists (
    select 1 from halal_mode_private.account_deletion_requests
    where user_id = auth.uid() and processed_at is null
  ) then
    raise exception 'An account pending deletion cannot be resumed' using errcode = '22023';
  end if;
  if not p_paused and exists (
    select 1 from auth.users where id = auth.uid() and banned_until > now()
  ) then
    raise exception 'A restricted account cannot be resumed' using errcode = '42501';
  end if;
  perform set_config('app.account_control_rpc', 'true', true);
  update profiles
  set is_paused = p_paused, updated_at = now()
  where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;
end;
$$;


create or replace function public.complete_onboarding(
  p_name text, p_first_name text, p_birth_date date, p_gender text,
  p_city text, p_country text, p_latitude double precision, p_longitude double precision,
  p_terms_version text, p_privacy_version text
) returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_user_id uuid := auth.uid();
  v_terms_version text;
  v_privacy_version text;
begin
  if v_user_id is null then raise exception 'You must be signed in' using errcode = '42501'; end if;

  lock table halal_mode_private.legal_document_registry in share mode;
  select version into v_terms_version
  from halal_mode_private.legal_document_registry
  where document_type = 'terms' and is_current;
  select version into v_privacy_version
  from halal_mode_private.legal_document_registry
  where document_type = 'privacy' and is_current;
  if v_terms_version is null or v_privacy_version is null
     or p_terms_version is distinct from v_terms_version
     or p_privacy_version is distinct from v_privacy_version then
    raise exception 'Current legal documents must be accepted' using errcode = '22023';
  end if;

  if exists (select 1 from profiles where id = v_user_id and onboarding_complete) then raise exception 'Onboarding is already complete' using errcode = '42501'; end if;
  if p_name is null or p_first_name is null or length(trim(p_name)) not between 2 and 100 or length(trim(p_first_name)) not between 1 and 60 then raise exception 'Please provide your name' using errcode = '22023'; end if;
  if p_birth_date is null or p_birth_date > current_date - interval '18 years' or p_birth_date < current_date - interval '100 years' then raise exception 'You must be between 18 and 100 years old' using errcode = '22023'; end if;
  if p_gender is null or p_gender not in ('male', 'female') then raise exception 'Choose a gender' using errcode = '22023'; end if;
  if p_city is null or p_country is null or length(trim(p_city)) not between 2 and 100 or length(trim(p_country)) not between 2 and 100 then raise exception 'Device location could not be resolved' using errcode = '22023'; end if;
  if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Device coordinates are invalid' using errcode = '22023'; end if;

  perform set_config('app.onboarding_rpc', 'true', true);
  insert into profiles (id, name, first_name, birth_date, gender, city, country, latitude, longitude, onboarding_complete)
  values (v_user_id, trim(p_name), trim(p_first_name), p_birth_date, p_gender::gender, trim(p_city), trim(p_country), p_latitude, p_longitude, true)
  on conflict (id) do update set
    name = excluded.name, first_name = excluded.first_name, birth_date = excluded.birth_date,
    gender = excluded.gender, city = excluded.city, country = excluded.country,
    latitude = excluded.latitude, longitude = excluded.longitude, onboarding_complete = true, updated_at = now()
  where not profiles.onboarding_complete;

  insert into private_preferences (user_id) values (v_user_id) on conflict (user_id) do nothing;
  insert into selection_scores (user_id) values (v_user_id) on conflict (user_id) do nothing;
  insert into halal_mode_private.member_legal_consent_history
    (user_id, document_type, version, acceptance_context)
  select v_user_id, d.document_type, d.version, 'onboarding'
  from halal_mode_private.legal_document_registry d
  where d.is_current
  on conflict (user_id, document_type, version) do nothing;
end;
$$;
