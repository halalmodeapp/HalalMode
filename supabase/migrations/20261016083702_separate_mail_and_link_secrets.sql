-- Keep the cron credential and the moderator-link signing key separate. A
-- worker credential may reach a scheduled function; it must never also mint
-- browser action links.
do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'halal_mode_report_links'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'halal_mode_report_links'
    );
  end if;
end;
$$;

create or replace function public.mail_link_secret_service()
returns text
language sql
stable
security definer
set search_path = public, vault
as $function$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'halal_mode_report_links'
  order by created_at desc
  limit 1;
$function$;

revoke all on function public.mail_link_secret_service() from public, anon, authenticated;
grant execute on function public.mail_link_secret_service() to service_role;
