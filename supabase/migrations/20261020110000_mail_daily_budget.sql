-- Email that fits the provider's free plan.
--
-- Resend's free plan sends 100 emails a day. Without a limit here, a busy day
-- had the worker send until Resend refused, count each refusal as a failed
-- attempt, and give up on those emails after about a day and a half.
-- Now:
-- - The worker sends at most mail_settings.daily_limit emails in any 24
--   hours (100 to start), oldest first; the rest wait their turn. Waitlist
--   mail leaves the last 10 of the day for safety reports.
-- - If Resend still says no (429: a rate or quota limit), the email waits
--   (a minute for a rate limit, an hour for a quota) and the try is not
--   counted, so nothing is given up because of a limit.
--
-- After upgrading the Resend plan, raise or remove the limit in the SQL editor:
--   update halal_mode_private.mail_settings set daily_limit = 1500;  -- Pro: 50,000 a month
--   update halal_mode_private.mail_settings set daily_limit = null;  -- no limit

create table if not exists halal_mode_private.mail_settings (
  id boolean primary key default true check (id),
  daily_limit integer check (daily_limit is null or daily_limit > 10)
);
insert into halal_mode_private.mail_settings (id, daily_limit) values (true, 100)
on conflict (id) do nothing;
alter table halal_mode_private.mail_settings enable row level security;
revoke all on halal_mode_private.mail_settings from public, anon, authenticated;

create or replace function public.claim_mail_service(p_limit integer default 20)
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
  v_batch integer := least(greatest(p_limit, 1), 50);
  v_safety bigint[];
  v_other bigint[];
begin
  -- How much of today's budget is left (a rolling 24 hours, as the provider
  -- counts). Waitlist mail leaves the last 10 for safety reports.
  select daily_limit into v_daily from halal_mode_private.mail_settings;
  v_room := case when v_daily is null then v_batch else greatest(0, v_daily - (
    select count(*)::integer from halal_mode_private.mail_outbox where sent_at > now() - interval '24 hours'
  )) end;

  select array_agg(id) into v_safety from (
    select id from halal_mode_private.mail_outbox
    where sent_at is null and attempts < 12
      and (claimed_until is null or claimed_until < now())
      and kind in ('report', 'moderation')
    order by created_at
    limit least(v_batch, v_room)
    for update skip locked
  ) s;
  select array_agg(id) into v_other from (
    select id from halal_mode_private.mail_outbox
    where sent_at is null and attempts < 12
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
    set claimed_until = now() + interval '5 minutes', attempts = o.attempts + 1
    where o.id = any(coalesce(v_safety, '{}') || coalesce(v_other, '{}'))
    returning o.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
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
        and (c.kind <> 'waitlist_welcome' or (w.verified_at is null and w.referred_by_id is not null))
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
revoke all on function public.claim_mail_service(int) from public, anon, authenticated;
grant execute on function public.claim_mail_service(int) to service_role;

-- A limit is not a failure: wait and try again without using up an attempt.
create or replace function public.settle_mail_service(p_id bigint, p_ok boolean, p_error text default null)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update halal_mode_private.mail_outbox
  set sent_at = case when p_ok then now() else null end,
      claimed_until = case
        when p_ok then claimed_until
        when p_error like '429%' and p_error ilike '%quota%' then now() + interval '1 hour'
        when p_error like '429%' then now() + interval '1 minute'
        else now() + make_interval(mins => least(360, power(2, greatest(attempts, 1))::integer)) end,
      attempts = case when not p_ok and p_error like '429%' then greatest(attempts - 1, 0) else attempts end,
      last_error = case when p_ok then null else left(p_error, 500) end
  where id = p_id;
$function$;
revoke all on function public.settle_mail_service(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.settle_mail_service(bigint, boolean, text) to service_role;
