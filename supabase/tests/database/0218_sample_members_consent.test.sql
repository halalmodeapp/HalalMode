begin;
set local search_path = public, extensions, halal_mode_private;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000021801', 'sample-218@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, onboarding_complete)
values ('00000000-0000-0000-0000-000000021801', 'Sample', 'Sample', '1992-01-01', 'female', 'Madinah', 'Saudi Arabia', true);

-- Registering a sample member makes it consented to the current documents.
insert into halal_mode_private.demo_members (user_id) values ('00000000-0000-0000-0000-000000021801');
select ok(halal_mode_private.member_has_current_legal_consents('00000000-0000-0000-0000-000000021801'),
  'a new sample member holds the current documents and the sensitive-data consent');

-- A new version of the documents does not lock it out.
update halal_mode_private.legal_document_registry set is_current = false where is_current;
insert into halal_mode_private.legal_document_registry (document_type, version, title, effective_date, url, is_current)
values ('terms', '2099-01-01', 'Terms of Service', date '2099-01-01', 'https://halalmo.de/legal/terms', true),
       ('privacy', '2099-01-01', 'Privacy Notice', date '2099-01-01', 'https://halalmo.de/legal/privacy', true);
select ok(halal_mode_private.member_has_current_legal_consents('00000000-0000-0000-0000-000000021801'),
  'and a new version of the documents does not lock it out');

-- A real member is not touched.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000021802', 'real-218@example.test');
insert into profiles (id, name, first_name, birth_date, gender, city, country, onboarding_complete)
values ('00000000-0000-0000-0000-000000021802', 'Real', 'Real', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', true);
select ok(not halal_mode_private.member_has_current_legal_consents('00000000-0000-0000-0000-000000021802'),
  'a real member still has to accept the new version themselves');
select is((select count(*)::int from halal_mode_private.member_legal_consent_history where user_id = '00000000-0000-0000-0000-000000021802'), 0,
  'and nothing is recorded for them');

select * from finish();
rollback;
