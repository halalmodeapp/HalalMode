begin;
set local search_path = public, extensions, halal_mode_private;
select plan(9);

select ok(
  has_function_privilege('anon', 'public.referral_inviter(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.claim_invite(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.claim_invite(text)', 'EXECUTE'),
  'anyone can see who invited them; only a signed-in account can claim'
);

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-000000020501', 'pgtap.invite.ali@example.test', now()),
  ('00000000-0000-0000-0000-000000020502', 'pgtap.invite.friend@example.test', now()),
  ('00000000-0000-0000-0000-000000020503', 'pgtap.invite.other@gmail.com', now());
insert into public.profiles (id, name, first_name, birth_date, gender) values
  ('00000000-0000-0000-0000-000000020501', 'Ali Member', 'Ali', '1990-01-01', 'male');
insert into halal_mode_private.referral_codes (code, user_id) values
  ('HMINVITE01', '00000000-0000-0000-0000-000000020501');

-- A waitlist referrer with no app account yet.
select public.join_waitlist_now('pgtap.invite.waiter@gmail.com', 'Leeds', '25-29', 'en', null);
update halal_mode_private.waitlist set verified_at = now(), referral_code = 'HMINVITE02'
where email = 'pgtap.invite.waiter@gmail.com';
insert into halal_mode_private.referral_codes (code, waitlist_id)
select 'HMINVITE02', id from halal_mode_private.waitlist where email = 'pgtap.invite.waiter@gmail.com'
on conflict (code) do nothing;

select is(public.referral_inviter('hminvite01')->>'name', 'Ali', 'the invite page shows the inviter''s first name');
select is(public.referral_inviter('HMINVITE02')->>'masked_email', 'p•••@gmail.com', 'or a masked email when there is no name');
select ok(public.referral_inviter('HMINVITE02')::text not like '%pgtap.invite.waiter%', 'never the full email');
select is(public.referral_inviter('HMNOTREAL1')->>'valid', 'false', 'unknown codes are invalid');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020502","role":"authenticated"}', true);
select is(public.claim_invite('HMINVITE01')->>'state', 'claimed', 'a new account claims the invite');
select ok(exists (select 1 from halal_mode_private.member_referrals
  where referred_user_id = '00000000-0000-0000-0000-000000020502' and code = 'HMINVITE01'),
  'and the referral is saved to the account');
select is(public.claim_invite('HMINVITE02')->>'state', 'already', 'a second invite does not replace the first');

-- First referrer wins across the waitlist too.
select public.join_waitlist_now('pgtap.invite.other@gmail.com', 'York', '25-29', 'en', 'HMINVITE02');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000020503","role":"authenticated"}', true);
select is(public.claim_invite('HMINVITE01')->>'state', 'already', 'someone referred on the waitlist keeps that referrer');

select * from finish();
rollback;
