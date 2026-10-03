-- The app speaks sixteen languages now (2026-10-03), so a written summary can
-- be in any of them, not only English and Arabic.
alter table public.connection_summaries
  drop constraint if exists connection_summaries_language_check;
alter table public.connection_summaries
  add constraint connection_summaries_language_check
  check (language in ('en','ar','ur','fa','hi','id','ms','bn','fr','tr','ha','am','so','es','ru','zh-Hans'));
