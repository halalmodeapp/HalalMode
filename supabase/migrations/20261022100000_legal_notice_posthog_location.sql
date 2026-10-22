-- Privacy notice 2026-10-22: PostHog's usage counts are hosted in the United
-- States (the notice said the EU), and the website's cookie-free visit counts
-- are named under Cloudflare. Members are asked to accept the corrected notice
-- through the existing consent flow.
update halal_mode_private.legal_document_registry set is_current = false where is_current;
insert into halal_mode_private.legal_document_registry
  (document_type, version, title, effective_date, url, is_current)
values
  ('terms', '2026-10-22', 'Terms of Service', date '2026-10-22', 'https://halalmo.de/legal/terms', true),
  ('privacy', '2026-10-22', 'Privacy Notice', date '2026-10-22', 'https://halalmo.de/legal/privacy', true)
on conflict (document_type, version) do update set
  title = excluded.title,
  effective_date = excluded.effective_date,
  url = excluded.url,
  is_current = true;
