begin;
set local search_path = public, extensions, halal_mode_private;
select plan(10);

select is(public.waitlist_reward_months(true, 0), 1, 'an eligible verifier gets one month');
select is(public.waitlist_reward_months(true, 2), 1, 'two referrals do not stack on the base month');
select is(public.waitlist_reward_months(false, 0), 0, 'a later verifier gets no automatic month');
select is(public.waitlist_reward_months(false, 3), 3, 'three referrals unlock three months');
select is(public.waitlist_reward_months(true, 5), 6, 'five referrals replace the base month with six');
select is(public.waitlist_reward_months(true, 10), 12, 'ten referrals replace the base month with a year');
select ok(
  not has_table_privilege('anon', 'halal_mode_private.waitlist_referrals', 'SELECT')
  and not has_table_privilege('authenticated', 'halal_mode_private.waitlist_referrals', 'SELECT'),
  'referral rows remain private'
);
select ok(
  -- Retired for the public in 20261020100000; join_waitlist_now replaces it.
  not has_function_privilege('anon', 'public.request_waitlist_verification(text,text,text,text,text)', 'EXECUTE')
  and has_function_privilege('anon', 'public.referral_code_exists(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.verify_waitlist_token(text)', 'EXECUTE'),
  'anonymous callers can validate codes, but cannot read verification state directly'
);
select ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef(
    'public.request_waitlist_verification(text,text,text,text,text)'::regprocedure
  )) > 0,
  'waitlist intake is serialized'
);
select ok(
  position('waitlist_verification' in pg_get_functiondef(
    'public.claim_mail_service(integer)'::regprocedure
  )) > 0,
  'the mail claim includes verification messages'
);

select * from finish();
rollback;
