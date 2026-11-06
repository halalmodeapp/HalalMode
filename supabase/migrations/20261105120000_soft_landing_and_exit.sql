-- Two ways of leaving kindly and honestly.

-- Closing a connection says why, gently, with quick reasons or the member's own words. Going numb is
-- worse than being let down, so the other person always gets a kind word rather than a disappearance.
create table halal_mode_private.connection_farewells (
  connection_id uuid primary key references public.connections (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('fit', 'goals', 'timing', 'family', 'spark', 'someone', 'step_back', 'other')),
  message text check (char_length(message) <= 300),
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index connection_farewells_unseen_idx on halal_mode_private.connection_farewells (to_user) where seen_at is null;
revoke all on halal_mode_private.connection_farewells from public, anon, authenticated;

create function public.close_connection_with_farewell(p_connection_id uuid, p_reason text, p_message text default null)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_other uuid;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  if coalesce(p_reason, '') not in ('fit', 'goals', 'timing', 'family', 'spark', 'someone', 'step_back', 'other') then
    raise exception 'Choose a reason' using errcode = '22023';
  end if;
  if p_reason = 'other' and v_message is null then
    raise exception 'Write a few words' using errcode = '22023';
  end if;
  if char_length(v_message) > 300 then
    raise exception 'Keep it under 300 characters' using errcode = '22023';
  end if;
  if v_message is not null and halal_mode_private.message_contains_contact(v_message) then
    raise exception 'A closing note cannot include contact details' using errcode = '22023';
  end if;

  select case when c.user_a = auth.uid() then c.user_b else c.user_a end into v_other
  from public.connections c
  where c.id = p_connection_id and c.closed_at is null and auth.uid() in (c.user_a, c.user_b);

  perform halal_mode_private.close_connection_after_legal_consent(p_connection_id);

  insert into halal_mode_private.connection_farewells (connection_id, from_user, to_user, reason, message)
  values (p_connection_id, auth.uid(), v_other, p_reason, case when p_reason = 'other' then v_message end);
end;
$function$;

-- Farewells the member has not read yet.
create function public.get_my_farewells()
returns jsonb
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'connectionId', f.connection_id,
    'name', p.first_name,
    'reason', f.reason,
    'message', f.message
  ) order by f.created_at), '[]'::jsonb)
  from halal_mode_private.connection_farewells f
  join public.profiles p on p.id = f.from_user
  where f.to_user = auth.uid() and f.seen_at is null
    and not exists (select 1 from public.blocks b
                    where (b.blocker_id = f.to_user and b.blocked_id = f.from_user)
                       or (b.blocker_id = f.from_user and b.blocked_id = f.to_user))
    and not exists (select 1 from halal_mode_private.member_hides h
                    where (h.hider_id = f.to_user and h.hidden_id = f.from_user)
                       or (h.hider_id = f.from_user and h.hidden_id = f.to_user))
    and not exists (select 1 from halal_mode_private.account_deletion_requests d where d.user_id = f.from_user);
$function$;

create function public.mark_farewell_seen(p_connection_id uuid)
returns void
language sql
security definer
set search_path = public, halal_mode_private
as $function$
  update halal_mode_private.connection_farewells
  set seen_at = now()
  where connection_id = p_connection_id and to_user = auth.uid() and seen_at is null;
$function$;

revoke all on function public.close_connection_with_farewell(uuid, text, text), public.get_my_farewells(),
  public.mark_farewell_seen(uuid) from public, anon;
grant execute on function public.close_connection_with_farewell(uuid, text, text), public.get_my_farewells(),
  public.mark_farewell_seen(uuid) to authenticated;

-- Why someone is leaving, and above all whether they got married. It keeps no link to the person and
-- only coarse facts about them, so it outlives their account: this is how the app learns whether it is
-- doing its job. The mark only stops one account answering twice. It goes with the account and says
-- nothing about the answer.
create table halal_mode_private.exit_answers (
  reason text not null check (reason in ('married', 'engaged', 'met_here', 'met_elsewhere', 'no_matches', 'not_right', 'break', 'privacy', 'other')),
  note text check (char_length(note) <= 500),
  gender text,
  country text,
  stayed text not null check (stayed in ('under_a_month', 'one_to_six_months', 'over_six_months')),
  ever_connected boolean not null,
  week date not null
);
create table halal_mode_private.exit_answer_marks (
  user_id uuid primary key references public.profiles (id) on delete cascade
);
revoke all on halal_mode_private.exit_answers, halal_mode_private.exit_answer_marks from public, anon, authenticated;

create function public.record_exit_answer(p_reason text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into halal_mode_private.exit_answer_marks (user_id) values (auth.uid()) on conflict do nothing;
  if not found then return; end if;
  insert into halal_mode_private.exit_answers (reason, note, gender, country, stayed, ever_connected, week)
  select p_reason, left(nullif(btrim(coalesce(p_note, '')), ''), 500), p.gender::text, p.country,
         case when p.created_at > now() - interval '1 month' then 'under_a_month'
              when p.created_at > now() - interval '6 months' then 'one_to_six_months'
              else 'over_six_months' end,
         exists (select 1 from public.connections c where auth.uid() in (c.user_a, c.user_b)),
         date_trunc('week', now())::date
  from public.profiles p where p.id = auth.uid();
end;
$function$;
revoke all on function public.record_exit_answer(text, text) from public, anon;
grant execute on function public.record_exit_answer(text, text) to authenticated;

-- Marriages are the number that matters, so the admin screen shows it.
create function halal_mode_private.patch_stats(p_find text, p_replace text)
returns void language plpgsql as $$
declare
  v_def text := replace(pg_get_functiondef('public.admin_match_stats(integer)'::regprocedure), chr(13), '');
begin
  if position(p_find in v_def) = 0 then raise exception 'patch: anchor not found: %', p_find; end if;
  execute replace(v_def, p_find, p_replace);
end;
$$;
select halal_mode_private.patch_stats(
  '''daily_matches'', (',
  '''leaving'', (
        select coalesce(jsonb_object_agg(x.reason, x.n), ''{}''::jsonb)
        from (select e.reason, count(*) as n from halal_mode_private.exit_answers e
              where e.week >= v_since::date group by e.reason) x
      ),
      ''daily_matches'', ('
);
drop function halal_mode_private.patch_stats(text, text);

-- Halal Bot: gentle, honest advice on a member's own photos. The first look is free, covering every
-- photo they have. After that each new photo uses one of three free looks, and Premium has no such limit.
create table halal_mode_private.photo_coach_reviews (
  user_id uuid not null references public.profiles (id) on delete cascade,
  photo_path text not null,
  -- Null while the look is being written.
  advice jsonb,
  model text,
  -- Whether this look uses one of the three. Decided when first claimed, so a retry keeps it.
  counted boolean not null default false,
  claim_token uuid,
  claimed_at timestamptz not null default now(),
  primary key (user_id, photo_path)
);
create table halal_mode_private.photo_coach_usage (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  first_look_at timestamptz,
  free_looks_used int not null default 0
);
revoke all on halal_mode_private.photo_coach_reviews, halal_mode_private.photo_coach_usage from public, anon, authenticated;

-- What a member has been told about their current photos, and how many looks they have left.
create function public.get_my_photo_coach()
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
    'premium', p.tier = 'premium'
  )
  from public.profiles p where p.id = auth.uid();
$function$;
revoke all on function public.get_my_photo_coach() from public, anon;
grant execute on function public.get_my_photo_coach() to authenticated;

-- Claims the photos a worker should look at for this member, within what they are allowed. The free looks
-- are held at this moment, so they cannot be spent twice by swapping photos while a look is running.
create function public.photo_coach_claim_service(p_user uuid)
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
  select p.photos, p.tier into v_photos, v_tier from public.profiles p where p.id = p_user;
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

-- Saves a look, only if that claim still holds it. Only a finished look uses anything up, so a failure
-- costs the member nothing.
create function public.photo_coach_save_service(p_user uuid, p_photo text, p_token uuid, p_advice jsonb, p_model text)
returns void
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
  returning counted into v_counted;
  if v_counted then
    update halal_mode_private.photo_coach_usage set free_looks_used = free_looks_used + 1 where user_id = p_user;
  end if;
end;
$function$;

revoke all on function public.photo_coach_claim_service(uuid), public.photo_coach_save_service(uuid, text, uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.photo_coach_claim_service(uuid), public.photo_coach_save_service(uuid, text, uuid, jsonb, text)
  to service_role;
