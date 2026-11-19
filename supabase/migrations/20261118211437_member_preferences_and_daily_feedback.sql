-- Include the revision with the owner-only read so a draft and its revision
-- always come from the same row version, including changes from older apps.
alter table public.private_preferences add column edit_revision uuid not null default gen_random_uuid();
create function halal_mode_private.bump_preference_revision() returns trigger language plpgsql as $$
begin
  new.edit_revision := gen_random_uuid();
  return new;
end;
$$;
create trigger bump_preference_revision before update on public.private_preferences
for each row execute function halal_mode_private.bump_preference_revision();

create function public.save_my_matching_preferences(p_revision uuid, p_base jsonb,
  p_sects public.sect[], p_details text[], p_premium jsonb, p_statuses text[] default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  current_revision uuid;
begin
  select edit_revision into strict current_revision from private_preferences where user_id = auth.uid() for update;
  if p_revision is distinct from current_revision then
    raise exception 'Preferences changed since this draft was opened' using errcode = '40001';
  end if;
  perform public.update_my_private_preferences(p_base);
  perform public.set_my_preferred_sects(p_sects, p_details);
  if p_statuses is not null then perform public.set_my_marital_preferences(p_statuses); end if;
  if p_premium is not null then perform public.set_my_premium_preferences(p_premium); end if;
  return (select edit_revision from private_preferences where user_id = auth.uid());
end;
$$;
revoke all on function public.save_my_matching_preferences(uuid,jsonb,public.sect[],text[],jsonb,text[]) from public, anon;
grant execute on function public.save_my_matching_preferences(uuid,jsonb,public.sect[],text[],jsonb,text[]) to authenticated;

-- An installed client can still make its courtesy call before submitting. Only
-- the actual submission knows whether the member used the whole pick budget.
create or replace function public.soft_select_introduction(p_introduction_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
end;
$$;

create function halal_mode_private.record_submitted_soft_select(p_round uuid)
returns void language plpgsql set search_path = public, halal_mode_private as $$
declare
  candidate introductions%rowtype;
begin
  -- Use actual accepted picks. Do not count an in-flight pre-migration signal again.
  if not exists (
    select 1 from rounds r cross join lateral tier_limits(r.tier) l
    where r.id = p_round and r.user_id = auth.uid() and r.submitted_at is not null
      and l.keeps = (select count(*) from introductions i join introduction_selections s
        on s.introduction_id = i.id where i.round_id = r.id and s.decision = 'kept')
  ) or exists (select 1 from introductions i join introduction_selections s on s.introduction_id = i.id
    where i.round_id = p_round and s.decision = 'soft_select') then return; end if;

  -- Observations are already keyed by introduction, rounded to five seconds
  -- and capped at two minutes. Two bins of separation keep a tiny difference
  -- across a rounding boundary from counting as a meaningful lead.
  with readings as (
    select i.id, o.profile_seconds,
      lead(o.profile_seconds, 1, 0::smallint) over (order by o.profile_seconds desc, i.id) as runner_up,
      row_number() over (order by o.profile_seconds desc, i.id) as place
    from introductions i join introduction_selections s on s.introduction_id = i.id
    join matching_engagement_observations o on o.introduction_id = i.id
    where i.round_id = p_round and s.decision = 'released' and o.profile_seconds > 0
      and league_card_stands(auth.uid(), i.subject_id)
      and not exists (select 1 from pair_exposure e where e.user_low = least(i.viewer_id,i.subject_id)
        and e.user_high = greatest(i.viewer_id,i.subject_id) and e.explicit_pass_count > 0)
  )
  select i.* into candidate from readings t join introductions i on i.id = t.id
  where t.place = 1 and t.profile_seconds >= 10 and t.profile_seconds - t.runner_up >= 10;
  if not found then return; end if;
  update introduction_selections set decision = 'soft_select' where introduction_id = candidate.id and decision = 'released';
  if found then
    insert into pair_exposure as e (user_low,user_high,soft_select_count)
    values (least(candidate.viewer_id,candidate.subject_id), greatest(candidate.viewer_id,candidate.subject_id), 1)
    on conflict (user_low,user_high) do update set soft_select_count = e.soft_select_count + 1;
  end if;
end;
$$;
revoke all on function halal_mode_private.record_submitted_soft_select(uuid) from public, anon, authenticated;

create table halal_mode_private.round_submission_receipts (
  round_id uuid primary key references public.rounds on delete cascade,
  choices uuid[] not null,
  result jsonb not null
);
alter table halal_mode_private.round_submission_receipts enable row level security;
revoke all on halal_mode_private.round_submission_receipts from public, anon, authenticated;
select cron.schedule('halal-mode-expired-submission-receipts', '21 * * * *',
  $$delete from halal_mode_private.round_submission_receipts q using public.rounds r
    where q.round_id = r.id and r.expires_at <= now()$$);

create or replace function public.submit_round_selections_ranked_with_signals(
  p_round_id uuid,
  p_ordered_introduction_ids uuid[],
  p_engagement jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_ids uuid[] := coalesce(p_ordered_introduction_ids, '{}'::uuid[]);
  v_result jsonb;
  v_subjects uuid[];
  previous halal_mode_private.round_submission_receipts;
  had_legacy_signal boolean;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  perform pg_advisory_xact_lock(hashtextextended(p_round_id::text, 236));
  select receipt.* into previous from halal_mode_private.round_submission_receipts receipt
    join public.rounds r on r.id = receipt.round_id
    where receipt.round_id = p_round_id and r.user_id = auth.uid() and r.expires_at > now();
  if found then
    if previous.choices is distinct from v_ids then
      raise exception 'Round already submitted' using errcode = '22023';
    end if;
    -- Return only earned relationships which are still available to this member.
    return jsonb_build_object(
      'mutualProfileIds', (select coalesce(jsonb_agg(partner order by ord), '[]') from
        jsonb_array_elements_text(previous.result->'mutualProfileIds') with ordinality x(partner,ord)
        where exists (select 1 from connections c where c.closed_at is null
          and (c.user_a,c.user_b) = (least(auth.uid(),partner::uuid),greatest(auth.uid(),partner::uuid)))),
      'waitingMutualProfileIds', (select coalesce(jsonb_agg(partner order by ord), '[]') from
        jsonb_array_elements_text(previous.result->'waitingMutualProfileIds') with ordinality x(partner,ord)
        where exists (select 1 from mutual_connection_queue q
          where (q.user_a,q.user_b) = (least(auth.uid(),partner::uuid),greatest(auth.uid(),partner::uuid))))
    );
  end if;
  if exists (select 1 from halal_mode_private.owed_connection(auth.uid())) then
    raise exception 'Answer the questions you owe before continuing' using errcode = '22023';
  end if;

  select exists (select 1 from introductions i join introduction_selections s on s.introduction_id = i.id
    where i.round_id = p_round_id and i.viewer_id = auth.uid() and s.decision = 'soft_select') into had_legacy_signal;
  v_result := public.submit_round_selections(p_round_id, v_ids);
  perform halal_mode_private.record_selection_ranks(auth.uid(), p_round_id, array(
    select chosen.id from unnest(v_ids) with ordinality as chosen(id, at)
    join public.introduction_selections s on s.introduction_id = chosen.id
    where s.decision = 'kept'
    order by chosen.at
  ));

  select coalesce(array_agg(distinct i.subject_id order by i.subject_id), '{}'::uuid[])
  into v_subjects
  from public.introductions i
  where i.round_id = p_round_id and i.viewer_id = auth.uid();

  if exists (
    select 1 from halal_mode_private.matching_signal_metric_config
    where enabled and metric_key in ('profile_attention', 'bio_attention', 'photo_attention')
  ) then
    perform halal_mode_private.record_matching_engagement(p_round_id, p_engagement);
  end if;
  if not had_legacy_signal then perform halal_mode_private.record_submitted_soft_select(p_round_id); end if;
  if cardinality(v_subjects) > 0 then
    perform halal_mode_private.recompute_matching_signal_estimates(array(
      select distinct member_id from unnest(v_subjects || array[auth.uid()]) member_id order by member_id
    ));
  end if;
  insert into halal_mode_private.round_submission_receipts(round_id,choices,result) values (p_round_id,v_ids,v_result);
  return v_result;
end;
$function$;

-- Use the same eligible pool for counterfactuals as for a real deal.
create or replace function halal_mode_private.member_reach(p_user uuid)
returns table(reach int,wanted int,criterion text,gain int)
language plpgsql stable security definer set search_path = public, halal_mode_private set jit = off as $$
declare
  me member_matching_facts;
  relaxed member_matching_facts;
  others uuid[];
  opt text;
  improvement int;
begin
  select * into me from member_matching_facts where id = p_user;
  select introductions into wanted from public.tier_limits(halal_mode_private.effective_membership_tier(p_user));
  gain := 0;
  -- league_pool enforces matching_member_eligible, capacity and activity.
  select array_agg(f.id) into others from member_matching_facts f join league_pool pool on pool.id = f.id
  where f.gender <> me.gender and accepts_row(f,me,null)
    and not league_pair_passed(p_user,f.id) and not pair_is_hidden(p_user,f.id)
    and not exists (select 1 from blocks b where (b.blocker_id,b.blocked_id) in ((p_user,f.id),(f.id,p_user)))
    and not exists (select 1 from connections c where c.user_a = least(p_user,f.id) and c.user_b = greatest(p_user,f.id))
    and not exists (select 1 from mutual_connection_queue q where q.user_a = least(p_user,f.id) and q.user_b = greatest(p_user,f.id))
    and not exists (select 1 from league_returns r where (r.sender,r.recipient) in ((p_user,f.id),(f.id,p_user)));
  select count(*) into reach from member_matching_facts f where f.id = any(others) and accepts_row(me,f,null);
  if reach < wanted then
    for opt in select key from jsonb_each(me.must_have || case when me.is_premium then me.premium_must_have else '{}'::jsonb end)
               where value = 'true'::jsonb union select 'countries' order by 1 loop
      relaxed := me;
      relaxed.premium_must_have := me.premium_must_have - opt;
      select count(*) - reach into improvement from member_matching_facts f
      where f.id = any(others) and accepts_row(relaxed,f,opt);
      if improvement > gain then gain := improvement; criterion := opt; end if;
    end loop;
  end if;
  return next;
end;
$$;

create or replace function halal_mode_private.league_thin_note(p_round uuid,p_user uuid,p_count int)
returns jsonb language plpgsql security definer set search_path = public, halal_mode_private as $$
declare
  r rounds%rowtype;
  candidate record;
begin
  select * into r from rounds where id = p_round and user_id = p_user;
  if r.cycle_date is null or p_count >= (select introductions from tier_limits(r.tier)) then return null; end if;
  if exists (select 1 from league_seats s join league_jobs j using(cycle_date,wave,stratum,table_no)
    where s.user_id = p_user and s.cycle_date = r.cycle_date and j.status = 'failed') then
    return jsonb_build_object('incomplete',true);
  end if;
  if not exists (select 1 from league_cycles where cycle_date = r.cycle_date and phase = 'sealed') then
    return null;
  end if;
  select * into candidate from member_reach(p_user);
  if candidate.reach <= p_count and candidate.gain > 0 and candidate.criterion is not null then
    return jsonb_build_object('criterion',candidate.criterion);
  end if;
  return null;
end;
$$;
