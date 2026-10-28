begin;
set local search_path = public, extensions, halal_mode_private;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000021701', 'owner-217@example.test'),
  ('00000000-0000-0000-0000-000000021702', 'member-217@example.test'),
  ('00000000-0000-0000-0000-000000021703', 'buyer-217@example.test'),
  ('00000000-0000-0000-0000-000000021704', 'early-217@example.test');
-- The fourth account has not made a profile yet.
insert into profiles (id, name, first_name, birth_date, gender, city, country, onboarding_complete)
select id, 'P', 'P', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', true
from auth.users where email like '%-217@example.test' and email <> 'early-217@example.test';
insert into halal_mode_private.admin_members (user_id, role) values ('00000000-0000-0000-0000-000000021701', 'owner');
-- Someone who bought Premium.
insert into halal_mode_private.member_entitlements (user_id, tier, state, provider, expires_at)
values ('00000000-0000-0000-0000-000000021703', 'premium', 'active', 'app_store', now() + interval '60 days');

create function pg_temp.as_owner() returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000021701', 'role', 'authenticated', 'aal', 'aal2',
    'amr', jsonb_build_array(
      jsonb_build_object('method', 'oauth', 'timestamp', extract(epoch from now())::bigint - 3600),
      jsonb_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 30))
  )::text, true);
$$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000021702","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$select admin_grant_premium('member-217@example.test', 7, 'I want it')$$, '42501', null, 'a member cannot grant Premium');

select pg_temp.as_owner();
select throws_ok($$select admin_grant_premium('member-217@example.test', 7, '')$$, '22023', null, 'a reason is required');
select throws_ok($$select admin_grant_premium('member-217@example.test', 0, 'press access')$$, '22023', null, 'a grant has to run for at least a day');
select throws_ok($$select admin_grant_premium('member-217@example.test', 400, 'press access')$$, '22023', null, 'and never longer than a year');
select throws_ok($$select admin_grant_premium('buyer-217@example.test', 7, 'press access')$$, '22023', null, 'a purchase is never overwritten');

select lives_ok($$select admin_grant_premium('member-217@example.test', 30, 'press access')$$, 'an owner grants 30 days with a reason');
select ok((select tier from profiles where id = '00000000-0000-0000-0000-000000021702') = 'premium'
  and (select provider from halal_mode_private.member_entitlements where user_id = '00000000-0000-0000-0000-000000021702') = 'comp',
  'the member has Premium, recorded as a complimentary grant');
select ok((select (g ->> 'active')::boolean from jsonb_array_elements(admin_premium_grants()) g where g ->> 'email' = 'member-217@example.test'),
  'and it shows in the list with an end date');

select admin_revoke_premium_grant('member-217@example.test', 'sent by mistake');
select ok((select tier from profiles where id = '00000000-0000-0000-0000-000000021702') = 'free'
  and not exists (select 1 from halal_mode_private.member_entitlements where user_id = '00000000-0000-0000-0000-000000021702'),
  'removing it takes Premium away');
select throws_ok($$select admin_revoke_premium_grant('buyer-217@example.test', 'try it')$$, '22023', null, 'a purchase cannot be removed here');

-- An account with no profile yet can be given Premium, and the profile has it when it appears.
select lives_ok($$select admin_grant_premium('early-217@example.test', 14, 'press, before they sign up fully')$$,
  'Premium can be given to an account that has no profile yet');
insert into profiles (id, name, first_name, birth_date, gender, city, country, onboarding_complete)
values ('00000000-0000-0000-0000-000000021704', 'E', 'E', '1990-01-01', 'male', 'Madinah', 'Saudi Arabia', true);
select is((select tier::text from profiles where id = '00000000-0000-0000-0000-000000021704'), 'premium',
  'and the profile starts out with it');

select * from finish();
rollback;
