-- New Terms and Privacy Notice: location kept to about a kilometre, the
-- Halal Mode Bot summary disclosed, answers revealed after all of your own,
-- current interest limits, two-way hiding, and deletion described as it works.
-- Members accept the new versions once; safety actions never wait on that.

update halal_mode_private.legal_document_registry set is_current = false where is_current;

insert into halal_mode_private.legal_document_registry
  (document_type, version, title, effective_date, url, is_current)
values
  ('terms', '2026-10-04', 'Terms of Service', date '2026-10-04', 'https://halalmo.de/terms', true),
  ('privacy', '2026-10-04', 'Privacy Notice', date '2026-10-04', 'https://halalmo.de/privacy', true)
on conflict (document_type, version) do update set is_current = true;
