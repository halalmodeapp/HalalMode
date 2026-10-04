-- What a member says about themselves shows on their profile to people they
-- are introduced to or connected with: sect (and madhhab), whether they have
-- children, religious dress and ethnicity, alongside what was already there.
-- Height, weight and body type stay private, as the app has always promised.

create or replace function public.safe_member_profile(p_profile profiles)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_profile.id,
    'name', p_profile.first_name,
    'firstName', p_profile.first_name,
    'age', extract(year from age(p_profile.birth_date)),
    'gender', p_profile.gender,
    'occupation', p_profile.occupation,
    'education', p_profile.education,
    'city', p_profile.city,
    'country', p_profile.country,
    'bio', p_profile.bio,
    'photos', p_profile.photos,
    'chips', p_profile.chips,
    'religiousPractice', p_profile.religious_practice,
    'timeline', p_profile.timeline,
    'relocation', p_profile.relocation,
    'familyGoals', p_profile.family_goals,
    'languagesSpoken', p_profile.languages_spoken,
    'isVerified', p_profile.is_verified,
    'audioGreetingUrl', p_profile.audio_greeting_url,
    'audioDurationSeconds', p_profile.audio_duration_seconds,
    'sect', p_profile.sect,
    'sectDetail', p_profile.sect_detail,
    'hasChildren', p_profile.has_children,
    'religiousDress', p_profile.religious_dress,
    'ethnicity', p_profile.ethnicity
  );
$$;
