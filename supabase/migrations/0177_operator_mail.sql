-- One way to send email: a durable outbox drained by one function through
-- Resend. Reports email the operator at once with quick actions; a waitlist
-- signup gets a welcome. Support mail will use the same queue.
--
-- The database never holds an API key: the send-mail function reads
-- RESEND_API_KEY and OPERATOR_EMAIL from its own secrets. A row that fails is
-- retried (up to 6 times) rather than lost.

create table if not exists halal_mode_private.mail_outbox (
  id bigserial primary key,
  kind text not null check (kind in ('report', 'waitlist_welcome')),
  ref_id text not null,
  to_email text,                      -- null means the operator
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  claimed_until timestamptz,
  attempts smallint not null default 0,
  sent_at timestamptz,
  last_error text
);
create index if not exists mail_outbox_pending on halal_mode_private.mail_outbox (created_at)
  where sent_at is null;
alter table halal_mode_private.mail_outbox enable row level security;
revoke all on halal_mode_private.mail_outbox from public, anon, authenticated;

create or replace function halal_mode_private.queue_report_mail()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into halal_mode_private.mail_outbox (kind, ref_id) values ('report', new.id::text);
  return new;
end;
$function$;

drop trigger if exists reports_mail_operator on public.reports;
create trigger reports_mail_operator after insert on public.reports
  for each row execute function halal_mode_private.queue_report_mail();

create or replace function halal_mode_private.queue_waitlist_mail()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
  values ('waitlist_welcome', new.id::text, new.email, coalesce(nullif(new.locale, ''), 'en'));
  return new;
end;
$function$;

drop trigger if exists waitlist_welcome_mail on halal_mode_private.waitlist;
create trigger waitlist_welcome_mail after insert on halal_mode_private.waitlist
  for each row execute function halal_mode_private.queue_waitlist_mail();

-- The worker's secret, made here and kept in the vault, like the others.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'halal_mode_mail_worker') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'halal_mode_mail_worker');
  end if;
end;
$$;

create or replace function public.verify_mail_worker_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public, vault
as $function$
  select coalesce(p_secret = (
    select decrypted_secret from vault.decrypted_secrets
    where name = 'halal_mode_mail_worker' order by created_at desc limit 1
  ), false);
$function$;

-- Signs the quick-action links. Service role only.
create or replace function public.mail_link_secret_service()
returns text
language sql
stable
security definer
set search_path = public, vault
as $function$
  select decrypted_secret from vault.decrypted_secrets
  where name = 'halal_mode_mail_worker' order by created_at desc limit 1;
$function$;

-- Claims a batch, with what each email needs to be written.
create or replace function public.claim_mail_service(p_limit int default 20)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_rows jsonb;
begin
  with picked as (
    select id from halal_mode_private.mail_outbox
    where sent_at is null and attempts < 6
      and (claimed_until is null or claimed_until < now())
    order by created_at
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  ), claimed as (
    update halal_mode_private.mail_outbox o
    set claimed_until = now() + interval '5 minutes', attempts = o.attempts + 1
    from picked where o.id = picked.id
    returning o.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'kind', c.kind, 'to', c.to_email, 'locale', c.locale,
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

create or replace function public.settle_mail_service(p_id bigint, p_ok boolean, p_error text default null)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update halal_mode_private.mail_outbox
  set sent_at = case when p_ok then now() else null end,
      claimed_until = case when p_ok then claimed_until else null end,
      last_error = case when p_ok then null else left(p_error, 500) end
  where id = p_id;
$function$;

-- A quick action from the email. Ban and suspend also block sign-in, which
-- the function does through the auth admin API.
create or replace function public.apply_report_action_service(p_report_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_subject uuid;
begin
  if p_action not in ('dismiss', 'suspend', 'ban') then
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  select subject_id into v_subject from public.reports where id = p_report_id;
  if v_subject is null then raise exception 'Report not found' using errcode = 'P0002'; end if;
  if p_action in ('suspend', 'ban') then
    update public.profiles set is_paused = true where id = v_subject;
  end if;
  update public.reports set resolved_at = coalesce(resolved_at, now()) where id = p_report_id;
  return jsonb_build_object('subject_id', v_subject, 'action', p_action);
end;
$function$;

revoke all on function public.verify_mail_worker_secret(text) from public, anon, authenticated;
revoke all on function public.mail_link_secret_service() from public, anon, authenticated;
revoke all on function public.claim_mail_service(int) from public, anon, authenticated;
revoke all on function public.settle_mail_service(bigint, boolean, text) from public, anon, authenticated;
revoke all on function public.apply_report_action_service(uuid, text) from public, anon, authenticated;
grant execute on function public.verify_mail_worker_secret(text) to service_role;
grant execute on function public.mail_link_secret_service() to service_role;
grant execute on function public.claim_mail_service(int) to service_role;
grant execute on function public.settle_mail_service(bigint, boolean, text) to service_role;
grant execute on function public.apply_report_action_service(uuid, text) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'halal-mode-send-mail') then
    perform cron.unschedule('halal-mode-send-mail');
  end if;
  perform cron.schedule(
    'halal-mode-send-mail',
    '*/2 * * * *',
    $job$
      select net.http_post(
        url := 'https://ziboxxxiedcqfdgzqgjv.supabase.co/functions/v1/send-mail',
        headers := jsonb_build_object(
          'x-mail-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'halal_mode_mail_worker' order by created_at desc limit 1),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      )
      where exists (select 1 from halal_mode_private.mail_outbox where sent_at is null and attempts < 6);
    $job$
  );
end;
$$;
