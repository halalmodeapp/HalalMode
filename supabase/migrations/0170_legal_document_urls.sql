-- halalmo.de/terms and /privacy serve the landing page; the documents live in
-- the web app. Point "Open document" where the words actually are.
update halal_mode_private.legal_document_registry
set url = 'https://halalmo.de/app/' || document_type
where url in ('https://halalmo.de/terms', 'https://halalmo.de/privacy');
