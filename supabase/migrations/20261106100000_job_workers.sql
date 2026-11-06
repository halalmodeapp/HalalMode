-- Fence worker results while keeping the deployed RPC signatures available.

alter table halal_mode_private.moderation_queue add column claim_token uuid;

alter table halal_mode_private.matching_photo_analysis_queue add column claim_token uuid;

alter table halal_mode_private.mail_outbox add column claim_token uuid;
alter table halal_mode_private.mail_outbox add column budget_reserved boolean not null default false;
alter table halal_mode_private.mail_outbox add column provider text check (provider in ('ses', 'resend')); 

alter table halal_mode_private.notification_outbox add column claim_token uuid;

create or replace function public.settle_moderation_fenced_service(p_id bigint, p_decision text, p_reason text, p_claim_token uuid default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v halal_mode_private.moderation_queue%rowtype;
begin
  update halal_mode_private.moderation_queue
  set decided_at = now(), decision = p_decision, reason = left(p_reason, 500)
  where id = p_id and decided_at is null
    and claim_token is not distinct from p_claim_token
  returning * into v;
  if v.id is null then return; end if;

  if v.kind = 'photo' and p_decision = 'remove' then
    update public.profiles set photos = array_remove(photos, v.ref) where id = v.user_id;
    perform halal_mode_private.add_member_notice(v.user_id, 'photo_removed');
  end if;

  if v.kind = 'selfie' then
    update halal_mode_private.selfie_files
    set purge_after = now() + case p_decision when 'remove' then interval '1 day' else interval '30 days' end
    where path = v.ref and purged_at is null;
    update halal_mode_private.member_selfies
    set status = case p_decision when 'allow' then 'verified' when 'remove' then 'rejected' else 'review' end,
        reason = left(p_reason, 500), decided_at = now()
    where user_id = v.user_id and path = v.ref;
    if p_decision = 'remove' then
      perform halal_mode_private.add_member_notice(v.user_id, 'selfie_rejected');
    elsif p_decision = 'allow' then
      -- Photos checked before there was a selfie to compare with are checked
      -- again, so every photo on the profile has met the selfie.
      insert into halal_mode_private.moderation_queue (user_id, kind, ref)
      select v.user_id, 'photo', ph from public.profiles pr, unnest(coalesce(pr.photos, '{}')) as ph
      where pr.id = v.user_id;
    end if;
  end if;

  if p_decision in ('remove', 'review') then
    insert into halal_mode_private.mail_outbox (kind, ref_id) values ('moderation', v.id::text);
  end if;
end;
$function$;

revoke all on function public.settle_moderation_fenced_service(bigint, text, text, uuid) from public, anon, authenticated;
grant execute on function public.settle_moderation_fenced_service(bigint, text, text, uuid) to service_role;

create or replace function public.settle_moderation_service(p_id bigint, p_decision text, p_reason text)
returns void
language sql security definer set search_path = public as $$
  select public.settle_moderation_fenced_service(p_id, p_decision, p_reason, null);
$$;

create or replace function public.release_moderation_fenced_service(p_id bigint, p_claim_token uuid default null)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update halal_mode_private.moderation_queue set claimed_until = null where id = p_id and decided_at is null
    and claim_token is not distinct from p_claim_token;
$function$;

revoke all on function public.release_moderation_fenced_service(bigint, uuid) from public, anon, authenticated;
grant execute on function public.release_moderation_fenced_service(bigint, uuid) to service_role;

create or replace function public.release_moderation_service(p_id bigint)
returns void
language sql security definer set search_path = public as $$
  select public.release_moderation_fenced_service(p_id, null);
$$;

create or replace function public.claim_moderation_fenced_service(p_limit int default 10, p_claim_token uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v record;
  v_rows jsonb;
begin
  -- A dead worker's final attempt goes to a person instead of disappearing.
  for v in select q.id, q.claim_token from halal_mode_private.moderation_queue q
    where q.decided_at is null and q.attempts >= 4
      and (q.claimed_until is null or q.claimed_until < now())
    order by q.created_at limit 25 for update skip locked
  loop
    perform public.settle_moderation_fenced_service(v.id, 'review', 'Automatic checks exhausted; needs review.', v.claim_token);
  end loop;
  with picked as (
    select id from halal_mode_private.moderation_queue
    where decided_at is null and attempts < 4
      and (p_claim_token is not null or claim_token is null)
      and (claimed_until is null or claimed_until < now())
    order by created_at
    limit greatest(1, least(p_limit, 25))
    for update skip locked
  ), claimed as (
    update halal_mode_private.moderation_queue q
    set claimed_until = now() + interval '5 minutes', attempts = q.attempts + 1, claim_token = p_claim_token
    from picked where q.id = picked.id
    returning q.id, q.user_id, q.kind, q.ref
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'user_id', c.user_id, 'kind', c.kind, 'ref', c.ref,
    -- Skip a photo already removed, a bio already replaced, or a selfie
    -- the member has since retaken.
    'current', case c.kind
      when 'photo' then c.ref = any(coalesce(p.photos, '{}'))
      when 'selfie' then exists (
        select 1 from halal_mode_private.member_selfies s where s.user_id = c.user_id and s.path = c.ref)
      else c.ref = p.bio end,
    'gender', p.gender
  )), '[]'::jsonb)
  into v_rows
  from claimed c join public.profiles p on p.id = c.user_id;
  return v_rows;
end;
$function$;

revoke all on function public.claim_moderation_fenced_service(integer, uuid) from public, anon, authenticated;
grant execute on function public.claim_moderation_fenced_service(integer, uuid) to service_role;

create or replace function public.claim_moderation_service(p_limit int default 10)
returns jsonb
language sql security definer set search_path = public as $$
  select public.claim_moderation_fenced_service(p_limit, null);
$$;

create or replace function public.claim_matching_photo_analysis_fenced_service(p_limit integer default 3, p_claim_token uuid default null)
returns jsonb
language sql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
  with enabled as (
    select exists (
      select 1 from halal_mode_private.matching_signal_metric_config
      where metric_key = 'luna_presentation' and matching_signal_metric_config.enabled
    ) as yes
  ), picked as (
    select q.photo_hash
    from halal_mode_private.matching_photo_analysis_queue q
    cross join enabled
    where enabled.yes and q.attempts < 5
      and (p_claim_token is not null or q.claim_token is null)
      and (q.claimed_until is null or q.claimed_until < now())
      and exists (
        select 1 from public.profiles p
        where p.id = q.owner_id and q.storage_path = any(coalesce(p.photos, '{}'::text[]))
          and halal_mode_private.member_has_current_legal_consents(p.id)
      )
    order by q.created_at
    limit greatest(1, least(coalesce(p_limit, 3), 5))
    for update of q skip locked
  ), claimed as (
    update halal_mode_private.matching_photo_analysis_queue q
    set claimed_until = now() + interval '5 minutes', attempts = q.attempts + 1, claim_token = p_claim_token
    from picked where q.photo_hash = picked.photo_hash
    returning q.photo_hash, q.owner_id, q.storage_path
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'photo_hash', photo_hash, 'owner_id', owner_id, 'storage_path', storage_path
  )), '[]'::jsonb)
  from claimed;
$function$;

revoke all on function public.claim_matching_photo_analysis_fenced_service(integer, uuid) from public, anon, authenticated;
grant execute on function public.claim_matching_photo_analysis_fenced_service(integer, uuid) to service_role;

create or replace function public.claim_matching_photo_analysis_service(p_limit integer default 3)
returns jsonb
language sql security definer set search_path = public as $$
  select public.claim_matching_photo_analysis_fenced_service(p_limit, null);
$$;

create or replace function public.release_matching_photo_analysis_fenced_service(p_photo_hash text, p_claim_token uuid default null)
returns void
language sql
security definer
set search_path = halal_mode_private
as $function$
  update halal_mode_private.matching_photo_analysis_queue
  set claimed_until = null
  where photo_hash = p_photo_hash and claim_token is not distinct from p_claim_token;
$function$;

revoke all on function public.release_matching_photo_analysis_fenced_service(text, uuid) from public, anon, authenticated;
grant execute on function public.release_matching_photo_analysis_fenced_service(text, uuid) to service_role;

create or replace function public.release_matching_photo_analysis_service(p_photo_hash text)
returns void
language sql security definer set search_path = public as $$
  select public.release_matching_photo_analysis_fenced_service(p_photo_hash, null);
$$;

create or replace function public.complete_matching_photo_analysis_fenced_service(
  p_photo_hash text,
  p_owner_id uuid,
  p_storage_path text,
  p_features jsonb,
  p_model_id text,
  p_analysis_version text,
  p_claim_token uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
declare
  v_saved boolean := false;
begin
  if (auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'Photo analysis is an internal service' using errcode = '42501';
  end if;
  -- Hold ownership through the result write and dequeue.
  perform 1 from halal_mode_private.matching_photo_analysis_queue q
  where q.photo_hash = p_photo_hash and q.owner_id = p_owner_id
    and q.storage_path = p_storage_path
    and q.claim_token is not distinct from p_claim_token
  for update;
  if not found then return false; end if;
  if not exists (
    select 1 from halal_mode_private.matching_signal_metric_config
    where metric_key = 'luna_presentation' and enabled
  ) then
    delete from halal_mode_private.matching_photo_analysis_queue where photo_hash = p_photo_hash;
    return false;
  end if;
  if p_storage_path is null or p_photo_hash is distinct from encode(extensions.digest(p_storage_path, 'sha256'), 'hex')
     or p_features is null or jsonb_typeof(p_features) <> 'object'
     or length(coalesce(p_model_id, '')) not between 1 and 80
     or length(coalesce(p_analysis_version, '')) not between 1 and 80 then
    raise exception 'Photo analysis payload is invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_owner_id and p_storage_path = any(coalesce(p.photos, '{}'::text[]))
      and halal_mode_private.member_has_current_legal_consents(p.id)
  ) then
    delete from halal_mode_private.matching_photo_analysis_queue
    where photo_hash = p_photo_hash and owner_id = p_owner_id;
    return false;
  end if;
  if (select count(*) from jsonb_object_keys(p_features)) <> 4
     or not (p_features ?& array['clarity', 'lighting', 'framing', 'background_distraction']) then
    raise exception 'Photo presentation fields are incomplete' using errcode = '22023';
  end if;

  insert into halal_mode_private.matching_photo_presentations
    (photo_hash, owner_id, clarity, lighting, framing, background_distraction, model_id, analysis_version)
  values (
    p_photo_hash, p_owner_id,
    (p_features ->> 'clarity')::numeric,
    (p_features ->> 'lighting')::numeric,
    (p_features ->> 'framing')::numeric,
    (p_features ->> 'background_distraction')::numeric,
    p_model_id, p_analysis_version
  )
  on conflict (photo_hash) do update set
    owner_id = excluded.owner_id,
    clarity = excluded.clarity,
    lighting = excluded.lighting,
    framing = excluded.framing,
    background_distraction = excluded.background_distraction,
    model_id = excluded.model_id,
    analysis_version = excluded.analysis_version,
    analyzed_at = now();

  delete from halal_mode_private.matching_photo_analysis_queue
  where photo_hash = p_photo_hash and owner_id = p_owner_id;
  perform halal_mode_private.recompute_matching_signal_estimates(array[p_owner_id]);
  v_saved := true;
  return v_saved;
end;
$function$;

revoke all on function public.complete_matching_photo_analysis_fenced_service(text, uuid, text, jsonb, text, text, uuid) from public, anon, authenticated;
grant execute on function public.complete_matching_photo_analysis_fenced_service(text, uuid, text, jsonb, text, text, uuid) to service_role;

create or replace function public.complete_matching_photo_analysis_service(
  p_photo_hash text,
  p_owner_id uuid,
  p_storage_path text,
  p_features jsonb,
  p_model_id text,
  p_analysis_version text
) returns boolean
language sql security definer set search_path = public as $$
  select public.complete_matching_photo_analysis_fenced_service(p_photo_hash, p_owner_id, p_storage_path, p_features, p_model_id, p_analysis_version, null);
$$;

create or replace function public.claim_mail_fenced_service(p_limit integer default 20, p_daily_limit integer default null, p_claim_token uuid default null, p_provider text default null, p_only_pinned boolean default false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'halal_mode_private', 'extensions', 'pg_catalog', 'vault'
AS $function$
declare
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

revoke all on function public.claim_mail_fenced_service(integer, integer, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_mail_fenced_service(integer, integer, uuid, text, boolean) to service_role;

create or replace function public.claim_mail_service(p_limit integer default 20, p_daily_limit integer default null)
 RETURNS jsonb
 language sql security definer set search_path = public as $$
  select public.claim_mail_fenced_service(p_limit, p_daily_limit, null, null, false);
$$;

create or replace function public.settle_mail_fenced_service(p_id bigint, p_ok boolean, p_error text default null, p_claim_token uuid default null)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update halal_mode_private.mail_outbox
  set budget_reserved = false,
      sent_at = case when p_ok then now() else null end,
      claimed_until = case
        when p_ok then claimed_until
        when p_error like '429%' and p_error ilike '%quota%' then now() + interval '1 hour'
        when p_error like '429%' then now() + interval '1 minute'
        else now() + make_interval(mins => least(360, power(2, greatest(attempts, 1))::integer)) end,
      attempts = case when not p_ok and p_error like '429%' then greatest(attempts - 1, 0) else attempts end,
      last_error = case when p_ok then null else left(p_error, 500) end
  where id = p_id and sent_at is null
    and (p_claim_token is null or budget_reserved)
    and claim_token is not distinct from p_claim_token;
$function$;

revoke all on function public.settle_mail_fenced_service(bigint, boolean, text, uuid) from public, anon, authenticated;
grant execute on function public.settle_mail_fenced_service(bigint, boolean, text, uuid) to service_role;

create or replace function public.settle_mail_service(p_id bigint, p_ok boolean, p_error text default null)
returns void
language sql security definer set search_path = public as $$
  select public.settle_mail_fenced_service(p_id, p_ok, p_error, null);
$$;

create or replace function public.claim_notifications_fenced_service(p_limit integer default 100, p_claim_token uuid default null)
returns table (id bigint, user_id uuid, kind text, payload jsonb, push_token text, platform text, locale text)
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Sending notifications requires service role' using errcode = '42501';
  end if;

  -- "Your set is ready" twelve hours late is noise, not news.
  update halal_mode_private.notification_outbox o
  set sent_at = now(), last_error = 'expired', claimed_until = null
  where o.sent_at is null and o.attempts < 5 and o.created_at < now() - interval '12 hours';

  return query
  with due as (
    select o.id
    from halal_mode_private.notification_outbox o
    where o.sent_at is null
      and o.send_after <= now()
      and o.attempts < 5
      and (p_claim_token is not null or o.claim_token is null)
      and (o.claimed_until is null or o.claimed_until < now())
    order by o.send_after
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    for update skip locked
  ), claimed as (
    update halal_mode_private.notification_outbox o
    -- Held for five minutes: an overlapping run skips it, and a run that dies
    -- mid-send releases it for a retry rather than stranding it.
    set attempts = o.attempts + 1, claim_token = p_claim_token, claimed_until = now() + interval '5 minutes'
    from due where o.id = due.id
    returning o.id, o.user_id, o.kind, o.payload
  )
  select c.id, c.user_id, c.kind, c.payload, d.push_token, d.platform, d.locale
  from claimed c
  join halal_mode_private.notification_devices d
    on d.user_id = c.user_id and d.notifications_enabled and d.push_token is not null;
end;
$$;

revoke all on function public.claim_notifications_fenced_service(integer, uuid) from public, anon, authenticated;
grant execute on function public.claim_notifications_fenced_service(integer, uuid) to service_role;

create or replace function public.claim_notifications_service(p_limit integer default 100)
returns table (id bigint, user_id uuid, kind text, payload jsonb, push_token text, platform text, locale text)
language sql security definer set search_path = public as $$
  select * from public.claim_notifications_fenced_service(p_limit, null);
$$;

create or replace function public.settle_notifications_fenced_service(
  p_sent bigint[],
  p_failed jsonb default '[]'::jsonb,
  p_dead_tokens text[] default '{}'::text[],
  p_claim_token uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Settling notifications requires service role' using errcode = '42501';
  end if;

  if p_sent is not null and array_length(p_sent, 1) is not null then
    update halal_mode_private.notification_outbox
    set sent_at = now(), last_error = null, claimed_until = null
    where id = any(p_sent) and sent_at is null
      and claim_token is not distinct from p_claim_token;
  end if;

  update halal_mode_private.notification_outbox o
  set last_error = left(f.error, 300),
      claimed_until = null,
      send_after = now() + make_interval(mins => 2 * o.attempts * o.attempts)
  from jsonb_to_recordset(coalesce(p_failed, '[]'::jsonb)) as f(id bigint, error text)
  where o.id = f.id and o.sent_at is null
    and o.claim_token is not distinct from p_claim_token;

  -- Only the rejected token is retired; the member's other phones keep working.
  if p_dead_tokens is not null and array_length(p_dead_tokens, 1) is not null then
    update halal_mode_private.notification_devices d
    set push_token = null, notifications_enabled = false
    where d.push_token = any(p_dead_tokens)
      and exists (select 1 from halal_mode_private.notification_outbox o
        where o.user_id = d.user_id and o.claim_token is not distinct from p_claim_token
          and (o.id = any(coalesce(p_sent, '{}'::bigint[]))
            or exists (select 1 from jsonb_to_recordset(coalesce(p_failed, '[]'::jsonb)) f(id bigint) where f.id = o.id)));
  end if;
end;
$$;

revoke all on function public.settle_notifications_fenced_service(bigint[], jsonb, text[], uuid) from public, anon, authenticated;
grant execute on function public.settle_notifications_fenced_service(bigint[], jsonb, text[], uuid) to service_role;

create or replace function public.settle_notifications_service(
  p_sent bigint[],
  p_failed jsonb default '[]'::jsonb,
  p_dead_tokens text[] default '{}'::text[]
)
returns void
language sql security definer set search_path = public as $$
  select public.settle_notifications_fenced_service(p_sent, p_failed, p_dead_tokens, null);
$$;

create or replace function halal_mode_private.check_marital_status_changes()
returns integer
language plpgsql
security definer
set search_path to 'public', 'halal_mode_private'
as $function$
declare
  s halal_mode_private.marital_alert_settings%rowtype;
  r record;
  v_queue bigint;
  v_count integer := 0;
begin
  perform pg_advisory_xact_lock(224, 2);
  select * into s from halal_mode_private.marital_alert_settings where id;
  for r in
    select cur.id as cur_id, cur.user_id, cur.status as new_status, cur.changed_at as switched_at,
           prev.changed_at as married_since
    from halal_mode_private.marital_status_log cur
    join lateral (
      select p.* from halal_mode_private.marital_status_log p
      where p.user_id = cur.user_id and p.id < cur.id order by p.id desc limit 1
    ) prev on true
    where cur.alerted_at is null
      and cur.status <> 'married' and prev.status = 'married'
      -- still their latest status, held long enough
      and not exists (select 1 from halal_mode_private.marital_status_log n where n.user_id = cur.user_id and n.id > cur.id)
      and cur.changed_at <= now() - make_interval(hours => s.stay_hours)
      -- and they had settled as married before switching
      and cur.changed_at - prev.changed_at >= make_interval(days => s.settled_days)
      -- and are not flipping back and forth
      and (
        select count(*) from halal_mode_private.marital_status_log b
        where b.user_id = cur.user_id and b.id < cur.id and b.previous_status is not null
          and b.changed_at > cur.changed_at - make_interval(days => s.flip_days)
      ) <= s.max_prior_changes
  loop
    insert into halal_mode_private.moderation_queue (user_id, kind, ref, decided_at, decision, reason)
    values (
      r.user_id, 'marital', 'marital:' || r.cur_id, now(), 'review',
      'Was currently married for ' || greatest(1, round(extract(epoch from (r.switched_at - r.married_since)) / 86400))::int
        || ' days, then switched to ' || replace(r.new_status, '_', ' ') || ' and has stayed there.')
    returning id into v_queue;
    insert into halal_mode_private.mail_outbox (kind, ref_id) values ('moderation', v_queue::text);
    update halal_mode_private.marital_status_log set alerted_at = now() where id = r.cur_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
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
    select b.path from (
      select path from halal_mode_private.photo_blurs
      union select name from storage.objects where bucket_id = 'profile-photos-blurred'
    ) b
    where not exists (select 1 from public.profiles p where b.path = any(coalesce(p.photos, '{}'::text[])))
    limit greatest(1, least(p_limit, 200))
  ) b;
$function$;

create or replace function halal_mode_private.queue_matching_photo_analysis_backfill(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private, extensions
as $function$
declare
  v_queued integer := 0;
begin
  if not exists (
    select 1 from halal_mode_private.matching_signal_metric_config
    where metric_key = 'luna_presentation' and enabled
  ) then
    raise exception 'Enable Luna presentation analysis before queuing images' using errcode = '55000';
  end if;

  with candidates as (
    select p.id as owner_id, photo.photo_path,
      encode(extensions.digest(photo.photo_path, 'sha256'), 'hex') as photo_hash
    from public.profiles p
    cross join lateral unnest(coalesce(p.photos, '{}'::text[])) photo(photo_path)
    where photo.photo_path not like 'https://%'
      and halal_mode_private.member_has_current_legal_consents(p.id)
      and not exists (select 1 from halal_mode_private.demo_members d where d.user_id = p.id)
      and not exists (
        select 1 from halal_mode_private.matching_photo_presentations existing
        where existing.photo_hash = encode(extensions.digest(photo.photo_path, 'sha256'), 'hex')
      )
      and not exists (
        select 1 from halal_mode_private.matching_photo_analysis_queue queued
        where (queued.attempts < 5 or queued.claimed_until > now())
          and queued.photo_hash = encode(extensions.digest(photo.photo_path, 'sha256'), 'hex')
      )
    order by p.id, photo.photo_path
    limit greatest(1, least(coalesce(p_limit, 20), 50))
  ), inserted as (
    insert into halal_mode_private.matching_photo_analysis_queue
      (photo_hash, owner_id, storage_path)
    select photo_hash, owner_id, photo_path from candidates
    on conflict (photo_hash) do update set attempts = 0, claimed_until = null, claim_token = gen_random_uuid()
    where matching_photo_analysis_queue.attempts >= 5
      and (matching_photo_analysis_queue.claimed_until is null or matching_photo_analysis_queue.claimed_until < now())
    returning 1
  )
  select count(*)::integer into v_queued from inserted;
  return v_queued;
end;
$function$;

create or replace function public.admin_mark_reviewed(p_id bigint, p_reason text, p_verdict text default null)
returns jsonb
language plpgsql
security definer
set search_path = halal_mode_private, pg_catalog
as $function$
declare
  v_reason text;
  v_user uuid;
  v halal_mode_private.moderation_queue%rowtype;
begin
  perform halal_mode_private.require_admin(true);
  v_reason := halal_mode_private.admin_reason(p_reason);
  select * into v from halal_mode_private.moderation_queue
  where id = p_id and decision = 'review' and reviewed_at is null
  for update;
  if v.id is null then
    raise exception 'That item is not waiting for review' using errcode = 'P0001';
  end if;
  if v.kind = 'selfie' then
    if p_verdict is null or p_verdict not in ('verified', 'rejected') then
      raise exception 'Choose verified or rejected for this selfie' using errcode = '22023';
    end if;
    -- Reuse settlement so retention, notices and photo rechecks stay identical. A selfie since
    -- replaced has nothing left to decide, so it is only marked reviewed.
    if exists (select 1 from halal_mode_private.member_selfies s where s.user_id = v.user_id and s.path = v.ref) then
      update halal_mode_private.moderation_queue set decided_at = null, claim_token = null where id = p_id;
      perform public.settle_moderation_service(p_id, case p_verdict when 'verified' then 'allow' else 'remove' end, v_reason);
    end if;
  end if;
  update halal_mode_private.moderation_queue set reviewed_at = now(), reviewed_by = auth.uid() where id = p_id;
  v_user := v.user_id;
  perform halal_mode_private.admin_audit('review.done', jsonb_build_object(
    'item', p_id, 'verdict', p_verdict, 'member', left(v_user::text, 8), 'reason', v_reason));
  return jsonb_build_object('changed', true);
end;
$function$;
-- Old summary workers cannot delete or replace a claim made by a new worker.
alter table public.connection_summaries add column claim_token uuid;

create or replace function halal_mode_private.guard_summary_claim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Cascading account erasure must still remove the cache.
  if tg_op = 'DELETE' and not exists (select 1 from connections where id = old.connection_id) then return old; end if;
  if old.claim_token is not null and old.claim_token::text is distinct from
     nullif(current_setting('app.summary_claim_token', true), '') then
    raise exception 'Summary claim changed' using errcode = '40001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function halal_mode_private.guard_summary_claim() from public, anon, authenticated, service_role;
create trigger guard_summary_claim before update or delete on public.connection_summaries
for each row execute function halal_mode_private.guard_summary_claim();

create or replace function public.claim_connection_summary_service(
  p_connection_id uuid, p_viewer_id uuid, p_language text, p_claim_token uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_token uuid := coalesce(p_claim_token, gen_random_uuid());
  v_claim uuid;
begin
  if not coalesce((get_connection_summary_data_service(p_connection_id, p_viewer_id, p_language)->>'allowed')::boolean, false) then
    return null;
  end if;
  perform set_config('app.summary_claim_token', coalesce((select claim_token::text from connection_summaries
    where connection_id = p_connection_id and language = p_language), ''), true);
  insert into connection_summaries (connection_id, language, body, claim_token)
  values (p_connection_id, p_language, '…', v_token)
  on conflict (connection_id, language) do update
    set created_at = now(), claim_token = v_token
    where connection_summaries.body = '…' and connection_summaries.created_at < now() - interval '2 minutes'
  returning claim_token into v_claim;
  return v_claim;
end;
$$;

create or replace function public.settle_connection_summary_service(
  p_connection_id uuid, p_viewer_id uuid, p_language text, p_body text default null, p_claim_token uuid default null
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  perform 1 from connection_summaries where connection_id = p_connection_id and language = p_language
    and claim_token is not distinct from p_claim_token and body = '…' for update;
  if not found then return false; end if;
  perform set_config('app.summary_claim_token', coalesce(p_claim_token::text, ''), true);
  if p_body is null or not coalesce((get_connection_summary_data_service(p_connection_id, p_viewer_id, p_language)->>'allowed')::boolean, false) then
    delete from connection_summaries where connection_id = p_connection_id and language = p_language;
    return false;
  end if;
  update connection_summaries set body = p_body where connection_id = p_connection_id and language = p_language;
  return true;
end;
$$;
revoke all on function public.claim_connection_summary_service(uuid, uuid, text, uuid),
  public.settle_connection_summary_service(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_connection_summary_service(uuid, uuid, text, uuid),
  public.settle_connection_summary_service(uuid, uuid, text, text, uuid) to service_role;

create or replace function halal_mode_private.try_enqueue_notification(
  p_user_id uuid,
  p_kind text,
  p_payload jsonb default '{}'::jsonb,
  p_delay interval default interval '0'
) returns boolean
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
begin
  if p_user_id is null then return false; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || p_kind, 224));

  if exists (
    select 1 from halal_mode_private.notification_muted_kinds m
    where m.user_id = p_user_id and m.kind = p_kind
  ) then
    return false;
  end if;

  -- No device, no consent, nothing to do.
  if not exists (
    select 1 from halal_mode_private.notification_devices d
    where d.user_id = p_user_id and d.notifications_enabled and d.push_token is not null
  ) then
    return false;
  end if;

  if exists (
    select 1 from halal_mode_private.notification_outbox o
    where o.user_id = p_user_id and o.kind = p_kind and o.sent_at is null and o.attempts < 5
  ) then
    return false;
  end if;

  insert into halal_mode_private.notification_outbox (user_id, kind, payload, send_after)
  values (p_user_id, p_kind, coalesce(p_payload, '{}'::jsonb), now() + coalesce(p_delay, interval '0'));
  return true;
exception when others then
  -- Queuing must never fail the event that caused it. A match is more
  -- important than telling someone about it.
  return false;
end;
$$;

revoke all on function halal_mode_private.try_enqueue_notification(uuid, text, jsonb, interval) from public, anon, authenticated, service_role;

create or replace function halal_mode_private.enqueue_notification(
  p_user_id uuid, p_kind text, p_payload jsonb default '{}'::jsonb, p_delay interval default interval '0'
) returns void language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  perform halal_mode_private.try_enqueue_notification(p_user_id, p_kind, p_payload, p_delay);
end;
$$;

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
  perform pg_advisory_xact_lock(224, 3);
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
    if not halal_mode_private.try_enqueue_notification(r.member_id, 'liked_you') then continue; end if;
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
    if not halal_mode_private.try_enqueue_notification(r.user_id, 'waiting_on_you') then continue; end if;
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
    if not halal_mode_private.try_enqueue_notification(r.user_id, 'quiet_match') then continue; end if;
    update halal_mode_private.retention_nudges
    set sent_count = sent_count + 1, last_sent_at = now()
    where user_id = r.user_id and kind = 'quiet_match' and ref = r.ref;
    v_queued := v_queued + 1;
  end loop;

  return v_queued;
end;
$function$;

create or replace function halal_mode_private.queue_recap_reminders()
returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  r record;
  v_queued integer := 0;
begin
  perform pg_advisory_xact_lock(224, 3);
  insert into halal_mode_private.retention_nudges (user_id, kind, ref)
  select u.user_id, 'recap_ready', c.id
  from public.connections c
  cross join lateral (values (c.user_a), (c.user_b)) as u(user_id)
  where c.closed_at is null and c.stage = 'recap'
  on conflict (user_id, kind, ref) do nothing;

  delete from halal_mode_private.retention_nudges n
  where n.kind = 'recap_ready'
    and not exists (select 1 from public.connections c where c.id = n.ref and c.closed_at is null and c.stage = 'recap');

  for r in
    select n.user_id, n.ref
    from halal_mode_private.retention_nudges n
    join public.profiles m on m.id = n.user_id
    where n.kind = 'recap_ready' and n.sent_count < 2 and halal_mode_private.is_waking_hour(m.longitude)
      and ((n.sent_count = 0 and n.first_seen <= now() - interval '24 hours')
        or (n.sent_count = 1 and n.last_sent_at <= now() - interval '72 hours'))
  loop
    if not halal_mode_private.try_enqueue_notification(r.user_id, 'recap_ready') then continue; end if;
    update halal_mode_private.retention_nudges
    set sent_count = sent_count + 1, last_sent_at = now()
    where user_id = r.user_id and kind = 'recap_ready' and ref = r.ref;
    v_queued := v_queued + 1;
  end loop;
  return v_queued;
end;
$function$;

create or replace function halal_mode_private.queue_round_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  r record;
  v_queued integer := 0;
begin
  perform pg_advisory_xact_lock(224, 3);
  for r in
    select rd.id as round_id, rd.user_id
    from public.rounds rd
    join public.profiles m on m.id = rd.user_id
    where rd.submitted_at is null
      and rd.opens_at <= now()
      and rd.expires_at > now() + interval '1 hour'
      and rd.expires_at <= now() + interval '3 hours'
      and not m.is_paused
      and halal_mode_private.is_waking_hour(m.longitude)
      and exists (select 1 from public.introductions i where i.round_id = rd.id)
      and not exists (select 1 from halal_mode_private.retention_nudges n
                      where n.user_id = rd.user_id and n.kind = 'round_expiring' and n.ref = rd.id)
  loop
    if not halal_mode_private.try_enqueue_notification(r.user_id, 'round_expiring') then continue; end if;
    insert into halal_mode_private.retention_nudges (user_id, kind, ref, sent_count, last_sent_at)
    values (r.user_id, 'round_expiring', r.round_id, 1, now())
    on conflict (user_id, kind, ref) do nothing;
    v_queued := v_queued + 1;
  end loop;
  return v_queued;
end;
$function$;

create or replace function public.admin_retry_worker(p_queue text, p_id bigint, p_reason text)
returns boolean language plpgsql security definer set search_path = public, halal_mode_private as $$
begin
  perform halal_mode_private.require_admin(true);
  perform halal_mode_private.admin_reason(p_reason);
  if p_queue = 'mail' then
    update halal_mode_private.mail_outbox set attempts = 0, claimed_until = null, claim_token = gen_random_uuid()
    where id = p_id and sent_at is null and attempts >= 12 and (claimed_until is null or claimed_until < now());
  elsif p_queue = 'push' then
    update halal_mode_private.notification_outbox set attempts = 0, claimed_until = null, claim_token = gen_random_uuid(), send_after = now()
    where id = p_id and sent_at is null and attempts >= 5 and created_at > now() - interval '12 hours'
      and (claimed_until is null or claimed_until < now());
  else
    raise exception 'Unknown queue' using errcode = '22023';
  end if;
  if not found then return false; end if;
  perform halal_mode_private.admin_audit('worker.retry', jsonb_build_object('queue', p_queue, 'id', p_id, 'reason', p_reason));
  return true;
end;
$$;
revoke all on function public.admin_retry_worker(text, bigint, text) from public, anon;
grant execute on function public.admin_retry_worker(text, bigint, text) to authenticated;

create or replace function public.admin_system_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
declare
  v_jobs jsonb := '[]'::jsonb;
  v_replies jsonb := '{}'::jsonb;
begin
  perform halal_mode_private.require_admin(false);

  if to_regclass('cron.job_run_details') is not null then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object(
        'job', j.jobname, 'schedule', j.schedule, 'active', j.active,
        'runs_24h', (select count(*) from cron.job_run_details d where d.jobid = j.jobid and d.start_time > now() - interval '24 hours'),
        'failed_24h', (select count(*) from cron.job_run_details d where d.jobid = j.jobid and d.start_time > now() - interval '24 hours' and d.status = 'failed'),
        'last_run', (select max(d.start_time) from cron.job_run_details d where d.jobid = j.jobid),
        'last_error', (select left(d.return_message, 160) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'failed' order by d.start_time desc limit 1)
      ) order by j.jobname), '[]'::jsonb)
      from cron.job j
    $q$ into v_jobs;
  end if;

  if to_regclass('net._http_response') is not null then
    execute $q$
      select jsonb_build_object(
        'total_24h', count(*),
        'ok_24h', count(*) filter (where r.status_code between 200 and 299),
        'failed_24h', count(*) filter (where r.status_code is null or r.status_code >= 400 or r.timed_out),
        'recent_failures', coalesce((
          select jsonb_agg(jsonb_build_object('at', f.created, 'status', f.status_code, 'timed_out', f.timed_out, 'message', left(coalesce(f.error_msg, f.content), 160)) order by f.created desc)
          from (
            select * from net._http_response x
            where x.created > now() - interval '24 hours' and (x.status_code is null or x.status_code >= 400 or x.timed_out)
            order by x.created desc limit 5
          ) f
        ), '[]'::jsonb)
      )
      from net._http_response r where r.created > now() - interval '24 hours'
    $q$ into v_replies;
  end if;

  return jsonb_build_object(
    'jobs', v_jobs,
    'workers', v_replies,
    'push', (
      select jsonb_build_object(
        'sent_24h', count(*) filter (where o.sent_at > now() - interval '24 hours'),
        'waiting', count(*) filter (where o.sent_at is null and o.attempts < 5),
        'failed', count(*) filter (where o.sent_at is null and o.attempts >= 5),
        'failed_24h', count(*) filter (where o.sent_at is null and o.attempts >= 5 and o.created_at > now() - interval '24 hours'),
        'last_error', (select left(x.last_error, 160) from halal_mode_private.notification_outbox x where x.last_error is not null order by x.created_at desc limit 1)
      )
      from halal_mode_private.notification_outbox o
    ),
    'email', (
      select jsonb_build_object(
        'sent_24h', count(*) filter (where m.sent_at > now() - interval '24 hours'),
        'waiting', count(*) filter (where m.sent_at is null and m.attempts < 12),
        'failed', count(*) filter (where m.sent_at is null and m.attempts >= 12),
        'last_error', (select left(x.last_error, 160) from halal_mode_private.mail_outbox x where x.last_error is not null order by x.created_at desc limit 1)
      )
      from halal_mode_private.mail_outbox m
    ),
    'matching', (
      select jsonb_build_object(
        'runs_7d', count(*),
        'failed_7d', count(*) filter (where coalesce(r.failed_jobs, 0) > 0),
        'failed_tables_7d', coalesce(sum(r.failed_jobs), 0),
        'last_error', (select x.last_error from halal_mode_private.league_cycles x where x.last_error is not null order by x.started_at desc limit 1),
        'recent_failed_tables', coalesce((
          select jsonb_agg(jsonb_build_object('cycle_date', f.cycle_date, 'failed_jobs', f.failed_jobs,
            'last_error', f.last_error) order by f.cycle_date desc)
          from (select * from halal_mode_private.league_cycles x
                where x.started_at > now() - interval '7 days' and x.failed_jobs > 0
                order by x.cycle_date desc limit 7) f
        ), '[]'::jsonb)
      )
      from halal_mode_private.league_cycles r where r.started_at > now() - interval '7 days'
    ),
    'report_action_claims', (select coalesce(jsonb_agg(jsonb_build_object(
      'report', c.report_id, 'action', c.action, 'claimed_at', c.claimed_at) order by c.claimed_at), '[]'::jsonb)
      from halal_mode_private.report_action_claims c),
    'account_actions', (select coalesce(jsonb_agg(jsonb_build_object(
      'member', left(j.user_id::text, 8), 'action', j.action, 'claimed_at', j.claimed_at,
      'report', j.report_id) order by j.claimed_at), '[]'::jsonb)
      from halal_mode_private.admin_action_jobs j where j.completed_at is null),
    'photo_analysis', (select jsonb_build_object(
      'exhausted', count(*) filter (where attempts >= 5),
      'waiting', count(*) filter (where attempts < 5)) from halal_mode_private.matching_photo_analysis_queue),
    'moderation', (
      select jsonb_build_object(
        'waiting', count(*) filter (where q.decided_at is null and q.attempts < 4),
        'stuck', count(*) filter (where q.decided_at is null and q.attempts >= 4)
      )
      from halal_mode_private.moderation_queue q
    )
  );
end;
$function$;
-- An unfinished Auth action keeps its original deadline and blocks a different action.
create table halal_mode_private.admin_action_jobs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  action text not null check (action in ('suspend', 'ban', 'unban', 'dismiss')),
  actor_id uuid not null,
  reason text not null,
  claim_token uuid not null,
  claimed_at timestamptz not null default now(),
  ban_until timestamptz,
  completed_at timestamptz
);
alter table halal_mode_private.admin_action_jobs enable row level security;
revoke all on halal_mode_private.admin_action_jobs from public, anon, authenticated;

create or replace function public.claim_admin_action_service(
  p_user_id uuid, p_action text, p_actor uuid, p_reason text,
  p_report_id uuid default null, p_claim_token uuid default null
) returns jsonb language plpgsql security definer set search_path = public, halal_mode_private as $$
declare
  v halal_mode_private.admin_action_jobs%rowtype;
  v_token uuid := coalesce(p_claim_token, gen_random_uuid());
begin
  if auth.role() <> 'service_role' or not exists (
    select 1 from halal_mode_private.admin_members where user_id = p_actor and role = 'owner'
  ) then raise exception 'Owner service action required' using errcode = '42501'; end if;
  perform halal_mode_private.admin_reason(p_reason);
  if p_action not in ('suspend', 'ban', 'unban', 'dismiss')
     or (p_report_id is null and p_action = 'dismiss')
     or (p_report_id is not null and p_action = 'unban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 2244));
  select * into v from halal_mode_private.admin_action_jobs where user_id = p_user_id for update;
  if found and v.completed_at is null then
    if v.action <> p_action or v.report_id is distinct from p_report_id
       or v.claimed_at > now() - interval '10 minutes' then
      raise exception 'Another account action is already in progress' using errcode = 'P0001';
    end if;
    -- Reclaim only the same intent. Its duration never restarts on retry.
    update halal_mode_private.admin_action_jobs set claim_token = v_token, claimed_at = now(), actor_id = p_actor, reason = p_reason
    where user_id = p_user_id returning * into v;
  else
    if p_report_id is not null then
      if not exists (select 1 from public.reports where id = p_report_id and subject_id = p_user_id and resolved_at is null) then
        raise exception 'Report not found' using errcode = 'P0002';
      end if;
      perform public.claim_report_action_service(p_report_id, p_action);
    end if;
    insert into halal_mode_private.admin_action_jobs (user_id, report_id, action, actor_id, reason, claim_token, ban_until)
    values (p_user_id, p_report_id, p_action, p_actor, p_reason, v_token,
      case p_action when 'suspend' then now() + interval '168 hours' when 'ban' then now() + interval '876000 hours' end)
    on conflict (user_id) do update set report_id = excluded.report_id, action = excluded.action,
      actor_id = excluded.actor_id, reason = excluded.reason, claim_token = excluded.claim_token,
      claimed_at = now(), ban_until = excluded.ban_until, completed_at = null
    returning * into v;
  end if;
  return jsonb_build_object('claim_token', v.claim_token, 'subject_id', v.user_id, 'ban_until', v.ban_until);
end;
$$;

create or replace function public.complete_admin_action_service(p_user_id uuid, p_claim_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public, halal_mode_private as $$
declare
  v halal_mode_private.admin_action_jobs%rowtype;
  v_result jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 2244));
  select * into v from halal_mode_private.admin_action_jobs
  where user_id = p_user_id and claim_token = p_claim_token and completed_at is null for update;
  if not found then raise exception 'Account action claim changed' using errcode = '40001'; end if;
  perform set_config('app.admin_action_token', p_claim_token::text, true);
  if v.report_id is null then
    v_result := public.apply_admin_member_action_service(v.user_id, v.action, v.actor_id, v.reason);
  else
    v_result := public.apply_admin_report_action_service(v.report_id, v.action, v.actor_id, v.reason);
  end if;
  update halal_mode_private.admin_action_jobs set completed_at = now() where user_id = p_user_id;
  return v_result;
end;
$$;
revoke all on function public.claim_admin_action_service(uuid, text, uuid, text, uuid, uuid),
  public.complete_admin_action_service(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_admin_action_service(uuid, text, uuid, text, uuid, uuid),
  public.complete_admin_action_service(uuid, uuid) to service_role;

create or replace function public.apply_admin_member_action_service(
  p_user_id uuid, p_action text, p_actor uuid, p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private, pg_catalog
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Member action requires service role' using errcode = '42501';
  end if;
  if not exists (select 1 from halal_mode_private.admin_members where user_id = p_actor and role = 'owner') then
    raise exception 'Only an owner can act on accounts' using errcode = '42501';
  end if;
  if p_action not in ('suspend', 'ban', 'unban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  if exists (select 1 from halal_mode_private.admin_action_jobs j
    where j.user_id = p_user_id and j.completed_at is null
      and j.claim_token::text is distinct from nullif(current_setting('app.admin_action_token', true), '')) then
    raise exception 'Another account action is already in progress' using errcode = 'P0001';
  end if;
  -- Hidden while suspended or banned; shown again when unbanned.
  update public.profiles set is_paused = (p_action <> 'unban') where id = p_user_id;
  insert into halal_mode_private.admin_audit_log (actor_id, action, detail)
  values (p_actor, 'member.' || p_action, jsonb_build_object(
    'member', left(p_user_id::text, 8), 'reason', halal_mode_private.admin_reason(p_reason)));
  return jsonb_build_object('action', p_action, 'member', left(p_user_id::text, 8));
end;
$function$;

create or replace function public.apply_report_action_service(p_report_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_subject uuid;
  v_reporter uuid;
begin
  if p_action not in ('dismiss', 'suspend', 'ban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;

  select subject_id, reporter_id
    into v_subject, v_reporter
    from public.reports
    where id = p_report_id
      and resolved_at is null
    for update;
  if not found then
    if exists (select 1 from public.reports where id = p_report_id) then
      raise exception 'Report already resolved' using errcode = 'P0001';
    end if;
    raise exception 'Report not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from halal_mode_private.admin_action_jobs j
    where j.user_id = v_subject and j.completed_at is null
      and j.claim_token::text is distinct from nullif(current_setting('app.admin_action_token', true), '')) then
    raise exception 'Another account action is already in progress' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from halal_mode_private.report_action_claims c
    where c.report_id = p_report_id and c.action = p_action
  ) then
    raise exception 'Report action was not claimed' using errcode = '42501';
  end if;

  if p_action in ('suspend', 'ban') then
    update public.profiles set is_paused = true where id = v_subject;
  end if;
  update public.reports set resolved_at = now() where id = p_report_id;
  delete from halal_mode_private.report_action_claims where report_id = p_report_id;
  perform halal_mode_private.add_member_notice(
    v_reporter,
    case when p_action = 'dismiss' then 'report_reviewed' else 'report_actioned' end
  );
  return jsonb_build_object('subject_id', v_subject, 'action', p_action);
end;
$function$;

create or replace function public.claim_report_action_service(
  p_report_id uuid,
  p_action text
)
returns uuid
language plpgsql
security definer
set search_path = public, halal_mode_private
as $$
declare
  v_subject uuid;
  v_claim_action text;
  v_claimed_at timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Report action requires service role' using errcode = '42501';
  end if;
  if p_action not in ('dismiss', 'suspend', 'ban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;

  select subject_id into v_subject
  from public.reports
  where id = p_report_id and resolved_at is null
  for update;
  if not found then
    if exists (select 1 from public.reports where id = p_report_id) then
      raise exception 'Report already resolved' using errcode = 'P0001';
    end if;
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  if exists (select 1 from halal_mode_private.admin_action_jobs j
    where j.user_id = v_subject and j.completed_at is null) then
    raise exception 'Another account action is already in progress' using errcode = 'P0001';
  end if;

  select action, claimed_at into v_claim_action, v_claimed_at
  from halal_mode_private.report_action_claims
  where report_id = p_report_id;
  if found then
    if v_claim_action <> p_action then
      raise exception 'Another report action is already in progress' using errcode = 'P0001';
    end if;
    if v_claimed_at > now() - interval '10 minutes' then
      raise exception 'Another report action is already in progress' using errcode = 'P0001';
    end if;
    delete from halal_mode_private.report_action_claims where report_id = p_report_id;
  end if;

  insert into halal_mode_private.report_action_claims (report_id, action, subject_id)
  values (p_report_id, p_action, v_subject);
  return v_subject;
end;
$$;

create or replace function public.release_report_action_service(
  p_report_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Report action requires service role' using errcode = '42501';
  end if;
  delete from halal_mode_private.report_action_claims
  where report_id = p_report_id and action = p_action
    and not exists (select 1 from halal_mode_private.admin_action_jobs j where j.report_id = p_report_id and j.completed_at is null);
end;
$$;
