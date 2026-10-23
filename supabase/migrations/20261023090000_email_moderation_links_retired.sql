-- Report emails no longer carry links that act on their own.
--
-- Until now each report email had Suspend, Ban and Dismiss links signed with
-- the report-link secret. report-action honoured them with no session, so
-- anyone who could read the operator inbox (a forwarded email, a shared
-- laptop) could suspend or ban a member for 14 days with no second factor,
-- and apply_report_action_service wrote nothing to the admin activity log.
--
-- The email now points to Reports in the admin panel, where every action
-- needs the admin's authenticator code and is logged in the same transaction
-- (apply_admin_report_action_service). report-action refuses calls that do
-- not come from the panel. These two functions served only the old links, so
-- nobody, the service role included, may call them any more. Their bodies
-- stay, so earlier contracts that read them still hold.

revoke all on function public.apply_report_action_service(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.mail_link_secret_service() from public, anon, authenticated, service_role;
