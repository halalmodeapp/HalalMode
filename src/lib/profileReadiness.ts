/**
 * What a member must complete before introductions start. The server holds the
 * same rules (profile_is_ready_for_matching, migration 0173) and decides; this
 * copy lets the checklist tick items off while the member is still typing.
 */
export const BIO_MIN_LENGTH = 80;

export interface ProfileReadinessInput {
  firstName?: string | null;
  city?: string | null;
  country?: string | null;
  bio?: string | null;
  photoCount?: number | null;
  languages?: readonly string[] | null;
  education?: string | null;
  hasChildren?: string | null;
  familyGoalsAnswered?: boolean | null;
  religiousDress?: string | null;
  ethnicity?: string | null;
  ownHeightCm?: number | null;
  ownBuild?: string | null;
  /** Unknown (undefined) is treated as saved; only `false` counts as missing. */
  preferencesSaved?: boolean | null;
}

export type ProfileReadinessIssue =
  | 'name' | 'location' | 'bio' | 'photo'
  | 'languages' | 'education' | 'has_children' | 'children_when'
  | 'dress' | 'ethnicity' | 'height' | 'body_type' | 'preferences';

export const READINESS_ISSUES: readonly ProfileReadinessIssue[] = [
  'name', 'location', 'bio', 'photo', 'languages', 'education', 'has_children',
  'children_when', 'dress', 'ethnicity', 'height', 'body_type', 'preferences',
];

export function isReadinessIssue(value: unknown): value is ProfileReadinessIssue {
  return typeof value === 'string' && (READINESS_ISSUES as readonly string[]).includes(value);
}

export function getProfileReadiness(input: ProfileReadinessInput) {
  const missing: ProfileReadinessIssue[] = [];
  const height = Number(input.ownHeightCm);
  if (!input.firstName?.trim()) missing.push('name');
  if (!input.city?.trim() || !input.country?.trim()) missing.push('location');
  if ((input.bio?.trim().length ?? 0) < BIO_MIN_LENGTH) missing.push('bio');
  if ((input.photoCount ?? 0) < 1) missing.push('photo');
  if ((input.languages ?? []).length === 0) missing.push('languages');
  if (!input.education?.trim()) missing.push('education');
  if (!input.hasChildren) missing.push('has_children');
  if (!input.familyGoalsAnswered) missing.push('children_when');
  if (!input.religiousDress) missing.push('dress');
  if (!input.ethnicity) missing.push('ethnicity');
  if (!(height >= 140 && height <= 210)) missing.push('height');
  if (!input.ownBuild?.trim()) missing.push('body_type');
  if (input.preferencesSaved === false) missing.push('preferences');
  return { ready: missing.length === 0, missing };
}

/**
 * The checklist a member sees: a few plain steps rather than thirteen fields.
 * Name and location are set at sign-up, so they appear only when missing.
 */
export type ReadinessStep =
  | 'essentials' | 'photo' | 'bio' | 'details' | 'children' | 'faith' | 'body' | 'preferences';

const STEP_ISSUES: Record<ReadinessStep, readonly ProfileReadinessIssue[]> = {
  essentials: ['name', 'location'],
  photo: ['photo'],
  bio: ['bio'],
  details: ['languages', 'education'],
  children: ['has_children', 'children_when'],
  faith: ['dress', 'ethnicity'],
  body: ['height', 'body_type'],
  preferences: ['preferences'],
};

export function readinessSteps(missing: readonly ProfileReadinessIssue[]) {
  return (Object.keys(STEP_ISSUES) as ReadinessStep[])
    .map((id) => ({ id, done: !STEP_ISSUES[id].some((issue) => missing.includes(issue)) }))
    .filter((step) => step.id !== 'essentials' || !step.done);
}
