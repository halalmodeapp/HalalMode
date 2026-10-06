-- Explicit consent for religion and ethnicity, and the 2026-10-06 documents.
--
-- Religious beliefs and ethnicity are special-category data (UK/EU GDPR
-- Article 9), so accepting the terms is not enough: a member gives a separate,
-- explicit consent, recorded here. A member without it is treated like one who
-- has not accepted the current documents — the app shows the consent screen,
-- and nothing that depends on consent is served.

alter table public.profiles add column if not exists sensitive_consent_at timestamptz;

update public.profiles p set sensitive_consent_at = now()
where sensitive_consent_at is null
  and exists (select 1 from halal_mode_private.demo_members d where d.user_id = p.id);

create or replace function public.record_sensitive_consent()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'You must be signed in' using errcode = '42501'; end if;
  update public.profiles set sensitive_consent_at = now() where id = auth.uid();
end;
$function$;

revoke all on function public.record_sensitive_consent() from public, anon;
grant execute on function public.record_sensitive_consent() to authenticated;

create or replace function halal_mode_private.member_has_current_legal_consents(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = halal_mode_private, public as $$
  select count(*) = 2
    and bool_and(exists (
      select 1
      from halal_mode_private.member_legal_consent_history h
      where h.user_id = p_user_id
        and h.document_type = d.document_type
        and h.version = d.version
    ))
    and exists (select 1 from public.profiles p where p.id = p_user_id and p.sensitive_consent_at is not null)
  from halal_mode_private.legal_document_registry d
  where d.is_current;
$$;

revoke all on function halal_mode_private.member_has_current_legal_consents(uuid)
  from public, anon, authenticated;

update halal_mode_private.legal_document_registry set is_current = false where is_current;
insert into halal_mode_private.legal_document_registry
  (document_type, version, title, effective_date, url, is_current)
values
  ('terms', '2026-10-06', 'Terms of Service', date '2026-10-06', 'https://halalmo.de/app/terms', true),
  ('privacy', '2026-10-06', 'Privacy Notice', date '2026-10-06', 'https://halalmo.de/app/privacy', true)
on conflict (document_type, version) do update set is_current = true;
