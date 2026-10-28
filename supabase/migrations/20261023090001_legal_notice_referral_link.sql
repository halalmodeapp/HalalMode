-- Privacy notice 2026-10-23: a new section, "Your referral link", says that
-- anyone who opens a member's referral link sees their first name, or their
-- email address while they have no name (public.referral_inviter), and that
-- we record who joined through the link. Members are asked to accept the
-- updated notice through the existing consent flow.
update halal_mode_private.legal_document_registry set is_current = false where is_current;
insert into halal_mode_private.legal_document_registry
  (document_type, version, title, effective_date, url, is_current)
values
  ('terms', '2026-10-23', 'Terms of Service', date '2026-10-23', 'https://halalmo.de/legal/terms', true),
  ('privacy', '2026-10-23', 'Privacy Notice', date '2026-10-23', 'https://halalmo.de/legal/privacy', true)
on conflict (document_type, version) do update set
  title = excluded.title,
  effective_date = excluded.effective_date,
  url = excluded.url,
  is_current = true;
