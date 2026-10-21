-- A referral is marked when the friend's profile first passes
-- public.profile_is_ready_for_matching. The triggers from 20261021120716 only
-- watched first name, city, country, bio and photos (and the preferences
-- completion time), so a friend whose last step was languages, education,
-- children, family goals, dress, ethnicity, heritage, height or build was
-- never counted. Watch every field the gate reads. The rule itself, and the
-- sticky marker, are unchanged.
drop trigger if exists profiles_count_completed_waitlist_referral on public.profiles;
create trigger profiles_count_completed_waitlist_referral
after insert or update of
  first_name, city, country, bio, photos, gender,
  languages_spoken, education, has_children, family_goals_answered_at,
  religious_dress, ethnicities, heritage_countries
on public.profiles
for each row execute function halal_mode_private.mark_completed_waitlist_referral();

drop trigger if exists preferences_count_completed_waitlist_referral on public.private_preferences;
create trigger preferences_count_completed_waitlist_referral
after insert or update of matching_preferences_completed_at, own_height_cm, own_build
on public.private_preferences
for each row execute function halal_mode_private.mark_completed_waitlist_referral();

-- Anyone who became ready through one of the previously unwatched fields
-- before this migration is credited now, exactly as the original backfill did.
update halal_mode_private.waitlist w
set referral_counted_at = coalesce(w.referral_counted_at, now())
where w.referral_counted_at is null
  and (w.referred_code is not null or w.referred_by_id is not null
    or exists (select 1 from halal_mode_private.waitlist_referrals r where r.referred_id = w.id)
    or exists (select 1 from halal_mode_private.waitlist_code_referrals r where r.referred_id = w.id))
  and exists (
    select 1 from auth.users u
    where halal_mode_private.canonical_email(u.email) = w.email_canonical
      and public.profile_is_ready_for_matching(u.id)
  );
