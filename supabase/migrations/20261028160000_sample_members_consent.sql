-- Sample members always hold the current legal documents.
--
-- The AI summary, the answer comparison and profile photos all need current
-- consent from BOTH people in a connection. A real member re-accepts a new
-- version in the app; a sample member (which is not a person) never does, so
-- every version bump quietly broke the recap for anyone testing with one.
-- Now a sample member accepts each current document the moment it is current.

create or replace function halal_mode_private.consent_sample_members()
returns void
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
begin
  insert into halal_mode_private.member_legal_consent_history (user_id, document_type, version, acceptance_context)
  select d.user_id, r.document_type, r.version, 'reacceptance'
  from halal_mode_private.demo_members d
  join public.profiles p on p.id = d.user_id
  cross join halal_mode_private.legal_document_registry r
  where r.is_current
  on conflict do nothing;

  -- The separate consent for religion and ethnicity (0180).
  update public.profiles p set sensitive_consent_at = now()
  where p.sensitive_consent_at is null
    and exists (select 1 from halal_mode_private.demo_members d where d.user_id = p.id);
end;
$function$;
revoke all on function halal_mode_private.consent_sample_members() from public, anon, authenticated, service_role;

create or replace function halal_mode_private.consent_sample_members_on_new_version()
returns trigger
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
begin
  perform halal_mode_private.consent_sample_members();
  return null;
end;
$function$;
revoke all on function halal_mode_private.consent_sample_members_on_new_version() from public, anon, authenticated, service_role;

drop trigger if exists sample_members_accept_new_version on halal_mode_private.legal_document_registry;
create trigger sample_members_accept_new_version
  after insert or update of is_current on halal_mode_private.legal_document_registry
  for each statement execute function halal_mode_private.consent_sample_members_on_new_version();

-- A sample member registered later starts consented too.
create or replace function halal_mode_private.consent_new_sample_member()
returns trigger
language plpgsql
security definer
set search_path = halal_mode_private, public, pg_catalog
as $function$
begin
  perform halal_mode_private.consent_sample_members();
  return null;
end;
$function$;
revoke all on function halal_mode_private.consent_new_sample_member() from public, anon, authenticated, service_role;

drop trigger if exists new_sample_member_accepts on halal_mode_private.demo_members;
create trigger new_sample_member_accepts
  after insert on halal_mode_private.demo_members
  for each statement execute function halal_mode_private.consent_new_sample_member();

-- Catch up now: the 2026-10-28 documents are already current.
select halal_mode_private.consent_sample_members();
