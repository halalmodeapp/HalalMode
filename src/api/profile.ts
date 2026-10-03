import { MOCK_PREFERENCES, MOCK_SELF } from '@/data/mock';
import { requireSupabase, USE_MOCKS } from '@/lib/supabase';
import { hydrateProfileMedia } from '@/api/profileMedia';
import type { PrivatePreferences, Profile } from '@/types';
import type { ProfileReadinessIssue } from '@/lib/profileReadiness';
import type { DeviceLocationUpdate } from '@/lib/deviceLocation';
import { profilePatchToRow } from '@/lib/profilePatch';

export interface ProfileReadinessStatus {
  ready: boolean;
  missing: ProfileReadinessIssue[];
}

export async function fetchMyProfileReadiness(): Promise<ProfileReadinessStatus> {
  if (USE_MOCKS) {
    const profile = await fetchMyProfile();
    const { getProfileReadiness } = await import('@/lib/profileReadiness');
    return getProfileReadiness({ ...profile, photoCount: profile.photos.length });
  }
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_my_profile_readiness');
  if (error) throw error;
  const payload = (data ?? {}) as Record<string, unknown>;
  const missing = Array.isArray(payload.missing)
    ? payload.missing.filter((item): item is ProfileReadinessIssue =>
      item === 'name' || item === 'location' || item === 'bio' || item === 'photo' || item === 'preferences'
    )
    : [];
  return { ready: payload.ready === true, missing };
}

export async function fetchMyProfile(): Promise<Profile> {
  if (USE_MOCKS) return MOCK_SELF;

  const client = requireSupabase();
  const { data, error } = await client.rpc('get_my_profile');
  if (error) throw error;
  return hydrateProfileMedia(profileFromRow(data as Record<string, unknown>));
}

export async function updateMyProfile(patch: Partial<Profile>): Promise<void> {
  if (USE_MOCKS) {
    Object.assign(MOCK_SELF, patch);
    return;
  }

  const client = requireSupabase();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('You must be signed in to update your profile.');

  // Never trust a caller-provided id for the target row. RLS and the database
  // trigger also enforce this boundary, but the client should be correct too.
  const changes = profilePatchToRow(patch);
  if (Object.keys(changes).length === 0) return;
  const { error } = await client.rpc('update_my_profile', { p_patch: changes });
  if (error) throw error;
}

/** Sect and its tradition are saved together so they can never disagree. */
export async function setMySect(sect: Profile['sect'], detail: string | undefined): Promise<void> {
  if (USE_MOCKS) {
    Object.assign(MOCK_SELF, { sect, sectDetail: detail });
    return;
  }
  const { error } = await requireSupabase().rpc('set_my_sect', {
    p_sect: sect,
    p_detail: detail ?? null,
  });
  if (error) throw error;
}

/** Traditions must sit under a chosen sect; the server checks that too. */
export async function setMyPreferredSects(
  sects: PrivatePreferences['preferredSects'],
  details: string[],
): Promise<void> {
  if (USE_MOCKS) {
    Object.assign(MOCK_PREFERENCES, { preferredSects: sects, preferredSectDetails: details });
    return;
  }
  const { error } = await requireSupabase().rpc('set_my_preferred_sects', {
    p_sects: sects,
    p_details: details,
  });
  if (error) throw error;
}

/** Location changes are accepted only from the explicit device-location flow. */
export async function updateMyLocation(location: DeviceLocationUpdate): Promise<void> {
  if (USE_MOCKS) {
    Object.assign(MOCK_SELF, { city: location.city, country: location.country });
    return;
  }

  const client = requireSupabase();
  const { error } = await client.rpc('update_my_location', {
    p_city: location.city,
    p_country: location.country,
    p_latitude: location.latitude,
    p_longitude: location.longitude,
  });
  if (error) throw error;
}

/**
 * Private preferences never leave the owner's session. RLS restricts this table
 * to `auth.uid() = user_id`, and the matcher reads it only inside a security-
 * definer function that returns matches — never the preference rows themselves.
 */
export async function fetchMyPreferences(): Promise<PrivatePreferences> {
  if (USE_MOCKS) return MOCK_PREFERENCES;

  const client = requireSupabase();
  const { data, error } = await client.rpc('get_my_private_preferences');
  if (error) throw error;
  return preferencesFromRow(data as Record<string, unknown>);
}

export async function updateMyPreferences(
  patch: Partial<PrivatePreferences>
): Promise<void> {
  if (USE_MOCKS) {
    Object.assign(MOCK_PREFERENCES, patch);
    return;
  }

  const client = requireSupabase();
  const changes = preferencesPatchToRow(patch);
  if (Object.keys(changes).length === 0) return;
  const { error } = await client.rpc('update_my_private_preferences', { p_patch: changes });
  if (error) throw error;
}

function profileFromRow(raw: Record<string, unknown>): Profile {
  // get_my_profile answers in camelCase (it shares safe_member_profile with
  // what other members see), while older reads were snake_case. Reading only
  // one spelling silently turned practice, languages and sect into blanks
  // after every reload, so a saved change looked as if it had never happened.
  const row: Record<string, unknown> = {
    ...raw,
    first_name: raw.first_name ?? raw.firstName,
    birth_date: raw.birth_date ?? raw.birthDate,
    religious_practice: raw.religious_practice ?? raw.religiousPractice,
    family_goals: raw.family_goals ?? raw.familyGoals,
    languages_spoken: raw.languages_spoken ?? raw.languagesSpoken,
    is_verified: raw.is_verified ?? raw.isVerified,
    is_paused: raw.is_paused ?? raw.isPaused,
    audio_greeting_url: raw.audio_greeting_url ?? raw.audioGreetingUrl,
    audio_duration_seconds: raw.audio_duration_seconds ?? raw.audioDurationSeconds,
    sect_detail: raw.sect_detail ?? raw.sectDetail,
  };
  return {
    id: String(row.id),
    // `String(null)` is the word "null" and `String(undefined)` is the word
    // "undefined". Both columns are nullable, and both are edited in a text
    // field — so an unset name arrived on screen as the literal word, ready to
    // be saved as somebody's name the moment they pressed the button.
    name: String(row.name ?? ''),
    firstName: String(row.first_name ?? ''),
    age: typeof row.age === 'number' ? row.age : ageFromDate(String(row.birth_date)),
    gender: row.gender as Profile['gender'],
    occupation: String(row.occupation ?? ''),
    education: row.education as string | undefined,
    city: String(row.city ?? ''),
    country: String(row.country ?? ''),
    bio: String(row.bio ?? ''),
    photos: (row.photos as string[] | null) ?? [],
    chips: (row.chips as string[] | null) ?? [],
    religiousPractice: row.religious_practice as Profile['religiousPractice'],
    timeline: row.timeline as Profile['timeline'],
    relocation: row.relocation as Profile['relocation'],
    familyGoals: row.family_goals as Profile['familyGoals'],
    // Defaults to unstated rather than a sect, so a row written before this
    // column existed never reads as a declaration nobody made.
    sect: (row.sect as Profile['sect'] | null) ?? 'prefer_not_to_say',
    sectDetail: (row.sect_detail as string | null) ?? undefined,
    languagesSpoken: (row.languages_spoken as string[] | null) ?? [],
    isVerified: Boolean(row.is_verified),
    isPaused: Boolean(row.is_paused),
    audioGreetingUrl: row.audio_greeting_url as string | undefined,
    audioDurationSeconds: row.audio_duration_seconds as number | undefined,
  };
}

function preferencesFromRow(row: Record<string, unknown>): PrivatePreferences {
  return {
    minAge: Number(row.min_age),
    maxAge: Number(row.max_age),
    minHeightCm: Number(row.min_height_cm),
    maxHeightCm: Number(row.max_height_cm),
    preferredBuilds: (row.preferred_builds as string[] | null) ?? [],
    preferredCountries: (row.preferred_countries as string[] | null) ?? [],
    maxDistanceKm: Number(row.max_distance_km),
    preferredPractice: (row.preferred_practice as PrivatePreferences['preferredPractice'] | null) ?? [],
    desiredTimeline: (row.desired_timeline as PrivatePreferences['desiredTimeline'] | null) ?? [],
    desiredFamilyGoals:
      (row.desired_family_goals as PrivatePreferences['desiredFamilyGoals'] | null) ?? [],
    preferredSects: (row.preferred_sects as PrivatePreferences['preferredSects'] | null) ?? [],
    preferredSectDetails: (row.preferred_sect_details as string[] | null) ?? [],
    // Absent means nothing is absolute, which is the safe default: an unreadable
    // or missing map must never silently narrow somebody's pool.
    mustHave:
      (row.must_have as PrivatePreferences['mustHave'] | null) ?? {},
    ownHeightCm: Number(row.own_height_cm ?? 0),
    ownWeightKg: row.own_weight_kg as number | undefined,
    ownBuild: row.own_build as string | undefined,
  };
}

function preferencesPatchToRow(
  patch: Partial<PrivatePreferences>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const fields: [keyof PrivatePreferences, string][] = [
    ['minAge', 'min_age'],
    ['maxAge', 'max_age'],
    ['minHeightCm', 'min_height_cm'],
    ['maxHeightCm', 'max_height_cm'],
    ['preferredBuilds', 'preferred_builds'],
    ['preferredCountries', 'preferred_countries'],
    ['maxDistanceKm', 'max_distance_km'],
    ['preferredPractice', 'preferred_practice'],
    ['desiredTimeline', 'desired_timeline'],
    ['desiredFamilyGoals', 'desired_family_goals'],
    ['preferredSects', 'preferred_sects'],
    ['mustHave', 'must_have'],
    ['ownHeightCm', 'own_height_cm'],
    ['ownWeightKg', 'own_weight_kg'],
    ['ownBuild', 'own_build'],
  ];
  for (const [property, column] of fields) {
    if (patch[property] !== undefined) row[column] = patch[property];
  }
  // A height or weight nobody entered is read as 0, and the server rightly
  // refuses a 0 cm member: every preferences save failed until one was typed.
  // Unentered is sent as unentered.
  for (const column of ['own_height_cm', 'own_weight_kg']) {
    if (column in row && !(Number(row[column]) > 0)) row[column] = null;
  }
  return row;
}

function ageFromDate(value: string): number {
  const birthDate = new Date(value);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}
