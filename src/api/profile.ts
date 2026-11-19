import { MOCK_PREFERENCES, MOCK_SELF } from '@/data/mock';
import { requireSupabase, USE_MOCKS } from '@/lib/supabase';
import { hydrateProfileMedia } from '@/api/profileMedia';
import type { MaritalStatus, PrivatePreferences, Profile } from '@/types';
import { DEFAULT_ACCEPTED, MARITAL_STATUSES } from '@/data/marital';
import { isReadinessIssue, type ProfileReadinessIssue } from '@/lib/profileReadiness';
import type { DeviceLocationUpdate } from '@/lib/deviceLocation';
import { profilePatchToRow } from '@/lib/profilePatch';
import { coordsForCityName } from '@/data/cities';
import {
  DEFAULT_HIGH_LATITUDE_FAJR_METHOD,
  type HighLatitudeFajrMethod,
} from '@/lib/prayerTimes';

export interface HighLatitudeFajrSettings {
  isHighLatitude: boolean;
  method: HighLatitudeFajrMethod;
  /** Exact saved profile location, returned only by the owner-only RPC. */
  latitude: number | null;
  longitude: number | null;
}

let mockHighLatitudeFajrMethod: HighLatitudeFajrMethod = DEFAULT_HIGH_LATITUDE_FAJR_METHOD;

export async function fetchMyHighLatitudeFajrSettings(): Promise<HighLatitudeFajrSettings> {
  if (USE_MOCKS) {
    const coords = coordsForCityName(MOCK_SELF.city);
    return {
      isHighLatitude: coords ? Math.abs(coords.latitude) >= 45 : false,
      method: mockHighLatitudeFajrMethod,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    };
  }

  const { data, error } = await requireSupabase().rpc('get_my_high_latitude_fajr_settings');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!row) throw new Error('High-latitude Fajr settings are unavailable.');
  return {
    isHighLatitude: row.is_high_latitude === true,
    method: row.method === 'reference_latitude_45'
      ? 'reference_latitude_45'
      : DEFAULT_HIGH_LATITUDE_FAJR_METHOD,
    latitude: typeof row.latitude === 'number' ? row.latitude : null,
    longitude: typeof row.longitude === 'number' ? row.longitude : null,
  };
}

export async function setMyHighLatitudeFajrMethod(method: HighLatitudeFajrMethod): Promise<void> {
  if (USE_MOCKS) {
    mockHighLatitudeFajrMethod = method;
    return;
  }
  const { error } = await requireSupabase().rpc('set_my_high_latitude_fajr_method', {
    p_method: method,
  });
  if (error) throw error;
}

export interface ProfileReadinessStatus {
  ready: boolean;
  /** Required before introductions start. */
  missing: ProfileReadinessIssue[];
  /** Optional, asked for once there is a match. */
  recommended?: ProfileReadinessIssue[];
}

export async function fetchMyProfileReadiness(): Promise<ProfileReadinessStatus> {
  if (USE_MOCKS) {
    const profile = await fetchMyProfile();
    const { getProfileReadiness } = await import('@/lib/profileReadiness');
    return getProfileReadiness({
      ...profile,
      photoCount: profile.photos.length,
      languages: profile.languagesSpoken,
      familyGoalsAnswered: profile.familyGoalsAnswered,
      ownHeightCm: MOCK_PREFERENCES.ownHeightCm,
      ownBuild: MOCK_PREFERENCES.ownBuild,
    });
  }
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_my_profile_readiness');
  if (error) throw error;
  const payload = (data ?? {}) as Record<string, unknown>;
  const missing = Array.isArray(payload.missing)
    ? payload.missing.filter(isReadinessIssue)
    : [];
  const recommended = Array.isArray(payload.recommended)
    ? payload.recommended.filter(isReadinessIssue)
    : [];
  return { ready: payload.ready === true, missing, recommended };
}

export async function fetchMyProfile(): Promise<Profile> {
  if (USE_MOCKS) return MOCK_SELF;

  const client = requireSupabase();
  const { data, error } = await client.rpc('get_my_profile');
  if (error) throw error;
  return hydrateProfileMedia(profileFromRow(data as Record<string, unknown>));
}

let mockNameAvailableAt: string | null = null;

export async function fetchDisplayNameAvailableAt(): Promise<string | null> {
  if (USE_MOCKS) return mockNameAvailableAt;
  const { data, error } = await requireSupabase().rpc('my_display_name_available_at');
  if (error) throw error;
  return data as string | null;
}

let mockCompletionSeen = false;
export async function claimProfileCompletionMessage(): Promise<boolean> {
  if (USE_MOCKS) {
    if (mockCompletionSeen) return false;
    mockCompletionSeen = true;
    return true;
  }
  const { data, error } = await requireSupabase().rpc('claim_profile_completion_message');
  if (error) throw error;
  return data === true;
}

export async function updateMyProfile(patch: Partial<Profile>): Promise<void> {
  if (USE_MOCKS) {
    if (patch.name !== undefined && patch.name !== MOCK_SELF.name) {
      if (mockNameAvailableAt && Date.parse(mockNameAvailableAt) > Date.now()) throw new Error('Display name cooldown');
      const date = new Date();
      date.setMonth(date.getMonth() + 3);
      mockNameAvailableAt = date.toISOString();
    }
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

/** Your own matching answers: has children, religious dress, ethnicity and heritage. */
export async function setMyProfileDetails(
  details: Pick<Profile, 'hasChildren' | 'religiousDress' | 'ethnicities' | 'heritageCountries'>,
): Promise<void> {
  if (USE_MOCKS) {
    Object.assign(MOCK_SELF, details);
    return;
  }
  const { error } = await requireSupabase().rpc('set_my_profile_details', {
    p_has_children: details.hasChildren ?? null,
    p_religious_dress: details.religiousDress ?? null,
    p_ethnicities: details.ethnicities ?? [],
    p_heritage_countries: details.heritageCountries ?? [],
  });
  if (error) throw error;
}

/** Where you grew up and your diet: shown on your profile. */
export async function setMyLifestyle(answers: Pick<Profile, 'grewUpCountries' | 'diet'>): Promise<void> {
  if (USE_MOCKS) {
    Object.assign(MOCK_SELF, { grewUpCountries: answers.grewUpCountries ?? [], diet: answers.diet ?? [] });
    return;
  }
  const { error } = await requireSupabase().rpc('set_my_lifestyle', {
    p_grew_up: answers.grewUpCountries ?? [],
    p_diet: answers.diet ?? [],
  });
  if (error) throw error;
}

/** A draft is committed against the same revision the member edited. */
export async function saveMyMatchingPreferences(draft: PrivatePreferences, premium: boolean): Promise<string> {
  const { ownHeightCm, ownBuild, ownBuildAlso, ...matching } = draft;
  void [ownHeightCm, ownBuild, ownBuildAlso];
  if (USE_MOCKS) {
    if (draft.editRevision !== MOCK_PREFERENCES.editRevision) throw Object.assign(new Error('Preferences changed'), { code: '40001' });
    const editRevision = String(Number(MOCK_PREFERENCES.editRevision ?? 0) + 1);
    Object.assign(MOCK_PREFERENCES, matching, { editRevision });
    return editRevision;
  }
  const { data, error } = await requireSupabase().rpc('save_my_matching_preferences', {
    p_revision: draft.editRevision ?? null,
    p_base: preferencesPatchToRow(matching),
    p_statuses: draft.acceptedMaritalStatuses ?? null,
    p_sects: draft.preferredSects ?? [],
    p_details: draft.preferredSectDetails ?? [],
    p_premium: premium ? {
      has_children: draft.preferredHasChildren ?? [],
      occupations: draft.preferredOccupations ?? [],
      languages: draft.preferredLanguages ?? [],
      education: draft.preferredEducation ?? [],
      dress: draft.preferredDress ?? [],
      ethnicities: draft.preferredEthnicities ?? [],
      heritage: draft.preferredHeritageCountries ?? [],
      grew_up: draft.preferredGrewUpCountries ?? [],
      diet: draft.preferredDiet ?? [],
      must_have: draft.premiumMustHave ?? {},
    } : null,
  });
  if (error) throw error;
  return data as string;
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
 * definer function that returns matches, never the preference rows themselves.
 */
export async function fetchMyPreferences(): Promise<PrivatePreferences> {
  if (USE_MOCKS) return { ...MOCK_PREFERENCES };

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

export interface MaritalSettings {
  status: MaritalStatus | null;
  /** Private: which statuses this member is open to. Never shown to anyone else. */
  accepted: MaritalStatus[];
}

let mockMaritalSettings: MaritalSettings = { status: 'never_married', accepted: [...DEFAULT_ACCEPTED] };

const asStatuses = (value: unknown): MaritalStatus[] =>
  (Array.isArray(value) ? value : []).filter((item): item is MaritalStatus => MARITAL_STATUSES.includes(item as MaritalStatus));

export interface MyReach {
  /** About how many people can be introduced to this member under their current choices. */
  reach: number;
  /** How many it takes for this member to be sure of a full set every day. */
  wanted: number;
  /** The member's own choice that is costing them the most, when they have too few. */
  criterion: string | null;
}

export async function fetchMyReach(): Promise<MyReach> {
  if (USE_MOCKS) return { reach: 42, wanted: 35, criterion: null };
  const { data, error } = await requireSupabase().rpc('get_my_reach');
  if (error) throw error;
  const row = (data ?? {}) as { reach?: unknown; wanted?: unknown; criterion?: unknown };
  return {
    reach: typeof row.reach === 'number' ? row.reach : 0,
    wanted: typeof row.wanted === 'number' ? row.wanted : 35,
    criterion: typeof row.criterion === 'string' ? row.criterion : null,
  };
}

export async function fetchMyMaritalSettings(): Promise<MaritalSettings> {
  if (USE_MOCKS) return { ...mockMaritalSettings, accepted: MOCK_PREFERENCES.acceptedMaritalStatuses ?? [...DEFAULT_ACCEPTED] };
  const { data, error } = await requireSupabase().rpc('get_my_marital_settings');
  if (error) throw error;
  const row = (data ?? {}) as { status?: string | null; accepted?: unknown };
  return {
    status: MARITAL_STATUSES.includes(row.status as MaritalStatus) ? (row.status as MaritalStatus) : null,
    accepted: asStatuses(row.accepted),
  };
}

export async function setMyMaritalStatus(status: MaritalStatus): Promise<void> {
  if (USE_MOCKS) {
    mockMaritalSettings = { ...mockMaritalSettings, status };
    return;
  }
  const { error } = await requireSupabase().rpc('set_my_marital_status', { p_status: status });
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
    // field, so an unset name arrived on screen as the literal word, ready to
    // be saved as somebody's name the moment they pressed the button.
    name: String(row.name ?? ''),
    firstName: String(row.first_name ?? ''),
    age: typeof row.age === 'number' ? row.age : ageFromDate(String(row.birth_date)),
    gender: row.gender as Profile['gender'],
    maritalStatus: ((row.maritalStatus ?? row.marital_status) as MaritalStatus | null) ?? undefined,
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
    // The column has a default, so a value alone does not mean it was chosen.
    familyGoalsAnswered: row.family_goals_answered === true || row.familyGoalsAnswered === true,
    // Defaults to unstated rather than a sect, so a row written before this
    // column existed never reads as a declaration nobody made.
    sect: (row.sect as Profile['sect'] | null) ?? 'prefer_not_to_say',
    sectDetail: (row.sect_detail as string | null) ?? undefined,
    hasChildren: (row.has_children as Profile['hasChildren'] | null) ?? undefined,
    religiousDress: (row.religious_dress as string | null) ?? undefined,
    ethnicities: (row.ethnicities as string[] | null) ?? [],
    heritageCountries: ((row.heritage_countries ?? row.heritageCountries) as string[] | null) ?? [],
    grewUpCountries: ((row.grew_up_countries ?? row.grewUpCountries) as string[] | null) ?? [],
    diet: ((row.diet) as string[] | null) ?? [],
    languagesSpoken: (row.languages_spoken as string[] | null) ?? [],
    isVerified: Boolean(row.is_verified),
    isPaused: Boolean(row.is_paused),
    audioGreetingUrl: row.audio_greeting_url as string | undefined,
    audioDurationSeconds: row.audio_duration_seconds as number | undefined,
  };
}

function preferencesFromRow(row: Record<string, unknown>): PrivatePreferences {
  return {
    editRevision: row.edit_revision as string | undefined,
    acceptedMaritalStatuses: asStatuses(row.accepted_marital_statuses),
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
    preferredHasChildren: (row.preferred_has_children as string[] | null) ?? [],
    preferredOccupations: (row.preferred_occupations as string[] | null) ?? [],
    preferredLanguages: (row.preferred_languages as string[] | null) ?? [],
    preferredEducation: (row.preferred_education as string[] | null) ?? [],
    preferredDress: (row.preferred_dress as string[] | null) ?? [],
    preferredEthnicities: (row.preferred_ethnicities as string[] | null) ?? [],
    preferredHeritageCountries: (row.preferred_heritage_countries as string[] | null) ?? [],
    preferredGrewUpCountries: (row.preferred_grew_up_countries as string[] | null) ?? [],
    preferredDiet: (row.preferred_diet as string[] | null) ?? [],
    premiumMustHave: (row.premium_must_have as PrivatePreferences['premiumMustHave'] | null) ?? {},
    // Absent means nothing is absolute, which is the safe default: an unreadable
    // or missing map must never silently narrow somebody's pool.
    mustHave:
      (row.must_have as PrivatePreferences['mustHave'] | null) ?? {},
    ownHeightCm: Number(row.own_height_cm ?? 0),
    ownBuild: row.own_build as string | undefined,
    ownBuildAlso: (row.own_build_also as string | null) ?? undefined,
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
    ['ownBuild', 'own_build'],
    ['ownBuildAlso', 'own_build_also'],
  ];
  for (const [property, column] of fields) {
    if (patch[property] !== undefined) row[column] = patch[property];
  }
  if ('own_height_cm' in row && !(Number(row.own_height_cm) > 0)) row.own_height_cm = null;
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
