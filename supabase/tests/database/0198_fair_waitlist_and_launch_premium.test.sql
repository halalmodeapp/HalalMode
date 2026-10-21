begin;
set local search_path = public, extensions, halal_mode_private;
select plan(20);

-- ---------------------------------------------------------------- one inbox, one place
select is(halal_mode_private.canonical_email(' Pg.Tap+News@GoogleMail.com '), 'pgtap@gmail.com',
  'Gmail ignores dots and +tags, and googlemail.com is gmail.com');
select is(halal_mode_private.canonical_email('first.last+news@outlook.com'), 'first.last@outlook.com',
  'elsewhere only the +tag is dropped');

select public.join_waitlist_now('pgtap.fair.alias@gmail.com', 'London', '25-29', 'en', null);
select is(
  public.join_waitlist_now('pgtapfair.alias+again@gmail.com', 'London', '25-29', 'en', null),
  public.join_waitlist_now('pgtap.fair.other@gmail.com', 'Leeds', '25-29', 'en', null),
  'an alias gets the same reply as anyone'
);
select is(
  (select count(*)::integer from halal_mode_private.waitlist where email_canonical = 'pgtapfairalias@gmail.com'),
  1, 'but takes no second place'
);

-- A referrer cannot credit themselves through an alias.
update halal_mode_private.waitlist set verified_at = now(), referral_code = 'HMFAIRSELF'
where email = 'pgtap.fair.alias@gmail.com';
select public.join_waitlist_now('pgtap.fair.alias+friend@gmail.com', 'London', '25-29', 'en', 'HMFAIRSELF');
select ok(
  (select referred_by_id is null from halal_mode_private.waitlist where email = 'pgtap.fair.alias@gmail.com'),
  'joining with your own code under an alias credits no one'
);

-- ---------------------------------------------------------------- an app member's link
insert into auth.users (id, email, email_confirmed_at, created_at)
values ('00000000-0000-0000-0000-000000019801', 'pgtap.fair.member@example.org', now(), now());
insert into halal_mode_private.referral_codes (code, user_id)
values ('HMFAIRAPP1', '00000000-0000-0000-0000-000000019801');

select public.join_waitlist_now('pgtap.fair.friend@gmail.com', 'Leeds', '30-34', 'en', 'HMFAIRAPP1');
select is(
  (select referred_code from halal_mode_private.waitlist where email = 'pgtap.fair.friend@gmail.com'),
  'HMFAIRAPP1', 'a friend joining from an app member''s link is remembered'
);
select ok(
  (select verification_token_hash is not null from halal_mode_private.waitlist where email = 'pgtap.fair.friend@gmail.com'),
  'and gets a confirm link with their welcome'
);
select halal_mode_private.waitlist_confirm(
  (select id from halal_mode_private.waitlist where email = 'pgtap.fair.friend@gmail.com'));
select is(halal_mode_private.referral_progress('HMFAIRAPP1')->>'referral_count', '1',
  'once confirmed, they count for the app member');

-- Referral links follow one setting, so launch repoints them all at once.
update halal_mode_private.referral_settings set link_base = 'https://halalmo.de/app?ref=';
select is(halal_mode_private.referral_progress('HMFAIRAPP1')->>'referral_url', 'https://halalmo.de/app?ref=HMFAIRAPP1',
  'one update sends every referral link to the app');
update halal_mode_private.referral_settings set link_base = 'https://halalmo.de/?ref=';

-- The member's own inbox cannot claim their own code from the app either.
insert into auth.users (id, email, email_confirmed_at, created_at)
values ('00000000-0000-0000-0000-000000019802', 'pgtap.fair.member+second@example.org', now(), now());
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000019802", "role": "authenticated"}', true);
select is(public.claim_referral_code('HMFAIRAPP1')->>'state', 'own',
  'a second account on the same inbox is the same person');
select set_config('request.jwt.claims', '', true);

-- ---------------------------------------------------------------- the provider's own budget
update halal_mode_private.mail_outbox set sent_at = now() - interval '2 days' where sent_at is null;
update halal_mode_private.mail_outbox set sent_at = now() - interval '2 days' where sent_at > now() - interval '24 hours';
update halal_mode_private.mail_settings set daily_limit = 100;
insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale, sent_at)
select 'waitlist_welcome', 'pgtap-fair-sent-' || n, 'pgtap.fair.sent' || n || '@gmail.com', 'en', now() - interval '1 hour'
from generate_series(1, 95) n;
insert into halal_mode_private.mail_outbox (kind, ref_id, to_email, locale)
select 'waitlist_welcome', 'pgtap-fair-wait-' || n, 'pgtap.fair.wait' || n || '@gmail.com', 'en'
from generate_series(1, 30) n;
select is(jsonb_array_length(public.claim_mail_service(40)), 0,
  'on the free plan''s budget, waitlist mail waits');
select is(jsonb_array_length(public.claim_mail_service(40, 50000)), 30,
  'with the provider''s own quota (SES), it all goes');

-- ---------------------------------------------------------------- launch Premium
insert into auth.users (id, email, email_confirmed_at, created_at)
values ('00000000-0000-0000-0000-000000019803', 'pgtapfair.reward+app@gmail.com', now(), now());
insert into public.profiles (id, name, first_name, birth_date, gender, onboarding_complete)
values ('00000000-0000-0000-0000-000000019803', 'Reward Member', 'Reward', '1994-01-01', 'female', true);
select public.join_waitlist_now('pgtap.fair.reward@gmail.com', 'London', '25-29', 'en', null);
select is(halal_mode_private.launch_reward_months('00000000-0000-0000-0000-000000019803'), 1,
  'a first-10,000 place earns a month, found through any alias of the inbox');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000019803","role":"authenticated"}', true);
select ok(halal_mode_private.grant_launch_reward('00000000-0000-0000-0000-000000019803', 1),
  'the trusted server path grants the month');
select is((select tier from public.profiles where id = '00000000-0000-0000-0000-000000019803'),
  'premium', 'the grant updates the server-controlled profile tier');
select is((select provider from halal_mode_private.member_entitlements
  where user_id = '00000000-0000-0000-0000-000000019803'),
  'launch_reward', 'the entitlement records the launch reward as its source');
select ok(not halal_mode_private.grant_launch_reward('00000000-0000-0000-0000-000000019803', 1),
  'granting the same reward again adds nothing');
select ok(halal_mode_private.grant_launch_reward('00000000-0000-0000-0000-000000019803', 3),
  'reaching a referral tier grants the additional reward');
select ok((select expires_at > now() + interval '85 days'
  from halal_mode_private.member_entitlements where user_id = '00000000-0000-0000-0000-000000019803'),
  'the additional reward extends the existing month to three months total');

update halal_mode_private.member_entitlements set expires_at = now() - interval '1 minute'
where user_id = '00000000-0000-0000-0000-000000019803';
select halal_mode_private.expire_launch_rewards();
select ok(
  (select tier = 'free' from public.profiles where id = '00000000-0000-0000-0000-000000019803'),
  'and it ends on its own'
);

select * from finish();
rollback;
