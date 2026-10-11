begin;

set local search_path = public, extensions;
select plan(21);

-- Halal Cards: Premium unlocks a connection, not a person; sealed answers stay
-- sealed until both have answered; a stale state write is refused; a guide
-- entry counts only once the other member agrees.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000019001', 'cards-free-a@example.test'),
  ('00000000-0000-0000-0000-000000019002', 'cards-premium-b@example.test'),
  ('00000000-0000-0000-0000-000000019003', 'cards-outsider@example.test');

-- Tier is server controlled; the profile guard lets this transaction set it.
select set_config('app.account_control_rpc', 'true', true);

insert into profiles (id, name, first_name, birth_date, gender, onboarding_complete, tier)
values
  ('00000000-0000-0000-0000-000000019001', 'Free A', 'Aisha', '1995-01-01', 'female', true, 'free'),
  ('00000000-0000-0000-0000-000000019002', 'Premium B', 'Bilal', '1994-01-01', 'male', true, 'premium'),
  ('00000000-0000-0000-0000-000000019003', 'Outsider', 'Omar', '1993-01-01', 'male', true, 'premium');

insert into halal_mode_private.member_legal_consent_history
  (user_id, document_type, version, acceptance_context)
select u.id, d.document_type, d.version, 'reacceptance'
from (values
  ('00000000-0000-0000-0000-000000019001'::uuid),
  ('00000000-0000-0000-0000-000000019002'::uuid),
  ('00000000-0000-0000-0000-000000019003'::uuid)
) u(id)
cross join halal_mode_private.legal_document_registry d
where d.is_current;
-- 0180: religion and ethnicity also need explicit sensitive-data consent.
update profiles set sensitive_consent_at = now()
where sensitive_consent_at is null
  and id in (select user_id from halal_mode_private.member_legal_consent_history);

insert into connections (id, user_a, user_b, stage) values (
  '00000000-0000-0000-0000-00000001900c',
  '00000000-0000-0000-0000-000000019001',
  '00000000-0000-0000-0000-000000019002',
  'open'
);

-- A second pair still choosing questions: Halal Cards does not exist for them yet.
insert into connections (id, user_a, user_b, stage) values (
  '00000000-0000-0000-0000-00000001901c',
  '00000000-0000-0000-0000-000000019002',
  '00000000-0000-0000-0000-000000019003',
  'answering'
);

-- The free member cannot start anything before the connection is unlocked.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019001","role":"authenticated"}', true);
select throws_ok(
  $$ select public.start_halal_cards_session('00000000-0000-0000-0000-00000001900c', 'lab-rule-one', '{"kind":"lab","cursor":0}') $$,
  '42501', 'Halal Cards needs Premium for this connection',
  'a free member cannot unlock Halal Cards'
);
select is((public.get_halal_cards_access('00000000-0000-0000-0000-00000001900c')->>'unlocked')::boolean, false,
  'the connection starts locked');

-- An outsider cannot see the connection at all.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019003","role":"authenticated"}', true);
select throws_ok(
  $$ select public.get_halal_cards_access('00000000-0000-0000-0000-00000001900c') $$,
  'P0002', 'Connection not found', 'an outsider cannot reach the connection'
);

select throws_ok(
  $$ select public.get_halal_cards_access('00000000-0000-0000-0000-00000001901c') $$,
  'P0002', 'Connection not found', 'Halal Cards waits until the conversation is open'
);

-- The Premium member hosts and so unlocks it.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019002","role":"authenticated"}', true);
create temporary table session_ids (id uuid) on commit drop;
insert into session_ids
select (public.start_halal_cards_session('00000000-0000-0000-0000-00000001900c', 'quiz-know-me', '{"kind":"quiz","cursor":0}')->>'id')::uuid;
select is((select status from halal_mode_private.halal_cards_sessions where id = (select id from session_ids)), 'invited',
  'a new session waits for the invited member');
select throws_ok(
  $$ select public.start_halal_cards_session('00000000-0000-0000-0000-00000001900c', 'quiz-know-me', '{"kind":"quiz","cursor":0}') $$,
  '23505', 'This activity is already open', 'one open game of each activity per couple'
);
select throws_ok(
  format($$ select public.respond_halal_cards_invite(%L, true) $$, (select id from session_ids)),
  '42501', 'Only the invited member can answer an invitation', 'the host cannot accept their own invitation'
);

-- The invitation counts as waiting on the guest.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019001","role":"authenticated"}', true);
select is((public.get_halal_cards_attention()->>'00000000-0000-0000-0000-00000001900c')::int, 1,
  'an invitation shows as waiting for the guest');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019002","role":"authenticated"}', true);

-- The free member joins for free, and may now start activities too.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019001","role":"authenticated"}', true);
select is(public.respond_halal_cards_invite((select id from session_ids), true)->>'status', 'active',
  'the invited member accepts without Premium');
select is((public.get_halal_cards_access('00000000-0000-0000-0000-00000001900c')->>'unlocked')::boolean, true,
  'the connection is unlocked for both');
select is(public.start_halal_cards_session('00000000-0000-0000-0000-00000001900c', 'lab-rule-two', '{"kind":"lab","cursor":0}')->>'mySeat', 'host',
  'the free member can host once unlocked');

-- The double blind.
select is(
  public.submit_halal_cards_answer((select id from session_ids), 'q:km-comfort', '{"guess":2}')->'answers'->'q:km-comfort',
  '{"mine":{"guess":2},"theirReady":false}'::jsonb,
  'an answer alone reveals nothing'
);
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019002","role":"authenticated"}', true);
select is(
  public.get_halal_cards_session((select id from session_ids))->'answers'->'q:km-comfort',
  '{"theirReady":true}'::jsonb,
  'the other member sees only that it is answered'
);
select is(
  public.submit_halal_cards_answer((select id from session_ids), 'q:km-comfort', '{"self":2}')->'answers'->'q:km-comfort',
  '{"mine":{"self":2},"theirs":{"guess":2},"theirReady":true}'::jsonb,
  'answering unseals the other answer'
);
select is(
  public.submit_halal_cards_answer((select id from session_ids), 'q:km-comfort', '{"self":0}')->'answers'->'q:km-comfort'->'mine',
  '{"self":2}'::jsonb,
  'a sealed answer cannot be changed afterwards'
);

-- Versioned state.
select is(
  (public.advance_halal_cards_session((select id from session_ids), 2, '{"kind":"quiz","cursor":1}', false)->>'version')::int, 3,
  'a write from the current version is applied'
);
select throws_ok(
  format($$ select public.advance_halal_cards_session(%L, 2, '{"kind":"quiz","cursor":1}', false) $$, (select id from session_ids)),
  '40001', 'This session has moved on', 'a stale write is refused'
);

-- The guide: proposed by one, agreed by the other.
select public.propose_halal_cards_guide_entry('00000000-0000-0000-0000-00000001900c', 'Bring up small problems early.', 'Rule 1');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019001","role":"authenticated"}', true);
select public.agree_halal_cards_guide_entry((select id from halal_mode_private.halal_cards_guide limit 1));
select is(
  (public.get_halal_cards_guide('00000000-0000-0000-0000-00000001900c')->0->>'agreed')::boolean, true,
  'an entry is agreed once the other member accepts it'
);

select throws_ok(
  $$ select public.propose_halal_cards_guide_entry('00000000-0000-0000-0000-00000001900c', 'Call me on 07700 900123', null) $$,
  '22023', 'Journal entries cannot include contact details', 'the journal refuses contact details'
);

-- Removing is undoable.
select public.remove_halal_cards_guide_entry((select id from halal_mode_private.halal_cards_guide limit 1));
select public.restore_halal_cards_guide_entry((select id from halal_mode_private.halal_cards_guide limit 1));
select is(jsonb_array_length(public.get_halal_cards_guide('00000000-0000-0000-0000-00000001900c')), 1,
  'a removed entry can be put back');

-- A week-old invitation lapses and frees its slot.
update halal_mode_private.halal_cards_sessions set status = 'invited', created_at = now() - interval '8 days'
 where id = (select id from session_ids);
select public.get_halal_cards_summary('00000000-0000-0000-0000-00000001900c');
select is((select status from halal_mode_private.halal_cards_sessions where id = (select id from session_ids)), 'expired',
  'an unanswered invitation expires after a week');

select * from finish();
rollback;
