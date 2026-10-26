/**
 * What Luna's look at a selfie or a profile photo means for the member.
 *
 * Pure functions with no imports, so the rules can be tested without Deno or
 * a model. The model only reports what it sees; every decision is made here.
 *
 * The rules lean toward doing nothing. A photo comes off the profile only when
 * it is plainly a picture of a screen or a print, or an image that is not a
 * photograph at all. A different face from the selfie goes to a person to
 * judge, never straight to removal, because faces change with lighting, age,
 * hair and angle, and a wrong removal costs a real member their profile.
 */

export interface SelfieReading {
  /** How many faces the camera shows. */
  face_count: number;
  face_clearly_visible: boolean;
  /** A photo of a monitor, phone or TV, or a printed picture. */
  shows_screen_or_print: boolean;
  /** An illustration, render or AI-made image rather than a camera capture. */
  not_a_camera_photo: boolean;
  confidence: number;
}

export interface PhotoReading {
  shows_screen_or_print: boolean;
  /** A screenshot, poster, cartoon, illustration or AI-made image. */
  not_a_camera_photo: boolean;
  /** A face is visible; false for a photo with no face, which is allowed. */
  face_visible: boolean;
  /** Same person as the member's selfie, or unsure, or not compared. */
  same_person_as_selfie: 'yes' | 'no' | 'unsure' | 'not_compared';
  confidence: number;
}

export type Decision = 'allow' | 'remove' | 'review';
export interface Verdict {
  decision: Decision;
  reason: string;
}

/** Below this the model is guessing; a person decides instead. */
export const MIN_CONFIDENCE = 0.55;
/** A mismatched face goes to review only when the model is fairly sure. */
export const MISMATCH_CONFIDENCE = 0.7;

export const SELFIE_SCHEMA = {
  type: 'object',
  properties: {
    face_count: { type: 'integer' },
    face_clearly_visible: { type: 'boolean' },
    shows_screen_or_print: { type: 'boolean' },
    not_a_camera_photo: { type: 'boolean' },
    confidence: { type: 'number' },
  },
  required: ['face_count', 'face_clearly_visible', 'shows_screen_or_print', 'not_a_camera_photo', 'confidence'],
  additionalProperties: false,
} as const;

export const PHOTO_SCHEMA = {
  type: 'object',
  properties: {
    shows_screen_or_print: { type: 'boolean' },
    not_a_camera_photo: { type: 'boolean' },
    face_visible: { type: 'boolean' },
    same_person_as_selfie: { type: 'string', enum: ['yes', 'no', 'unsure', 'not_compared'] },
    confidence: { type: 'number' },
  },
  required: ['shows_screen_or_print', 'not_a_camera_photo', 'face_visible', 'same_person_as_selfie', 'confidence'],
  additionalProperties: false,
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Null when the model refused or returned something that is not the schema. */
export function parseSelfieReading(text: string): SelfieReading | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const { face_count, face_clearly_visible, shows_screen_or_print, not_a_camera_photo, confidence } = value;
  if (
    typeof face_count !== 'number' || !Number.isInteger(face_count) || face_count < 0 || face_count > 50
    || typeof face_clearly_visible !== 'boolean'
    || typeof shows_screen_or_print !== 'boolean'
    || typeof not_a_camera_photo !== 'boolean'
    || typeof confidence !== 'number' || !(confidence >= 0 && confidence <= 1)
  ) return null;
  return { face_count, face_clearly_visible, shows_screen_or_print, not_a_camera_photo, confidence };
}

export function parsePhotoReading(text: string): PhotoReading | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const { shows_screen_or_print, not_a_camera_photo, face_visible, same_person_as_selfie, confidence } = value;
  if (
    typeof shows_screen_or_print !== 'boolean'
    || typeof not_a_camera_photo !== 'boolean'
    || typeof face_visible !== 'boolean'
    || (same_person_as_selfie !== 'yes' && same_person_as_selfie !== 'no'
      && same_person_as_selfie !== 'unsure' && same_person_as_selfie !== 'not_compared')
    || typeof confidence !== 'number' || !(confidence >= 0 && confidence <= 1)
  ) return null;
  return { shows_screen_or_print, not_a_camera_photo, face_visible, same_person_as_selfie, confidence };
}

/**
 * remove: the selfie is rejected and the member is asked to retake it.
 * review: a person looks. allow: verified.
 */
export function decideSelfie(reading: SelfieReading | null): Verdict {
  if (!reading) return { decision: 'review', reason: 'Luna gave no usable reading of the selfie.' };
  if (reading.shows_screen_or_print) {
    return { decision: 'remove', reason: 'The selfie is a picture of a screen or a printed photo.' };
  }
  if (reading.not_a_camera_photo) {
    return { decision: 'remove', reason: 'The selfie is not a camera photo.' };
  }
  if (reading.face_count === 0 || !reading.face_clearly_visible) {
    return { decision: 'remove', reason: 'No face is clearly visible in the selfie.' };
  }
  if (reading.face_count > 1) {
    return { decision: 'remove', reason: 'More than one face is in the selfie.' };
  }
  if (reading.confidence < MIN_CONFIDENCE) {
    return { decision: 'review', reason: `Luna was unsure about the selfie (${Math.round(reading.confidence * 100)}%).` };
  }
  return { decision: 'allow', reason: 'Selfie verified: one live face.' };
}

export function decidePhoto(reading: PhotoReading | null): Verdict {
  // No reading is not evidence against the member: the photo already passed
  // the harm check, so it stays.
  if (!reading) return { decision: 'allow', reason: 'Luna gave no usable reading; photo kept.' };
  if (reading.confidence >= MIN_CONFIDENCE && reading.shows_screen_or_print) {
    return { decision: 'remove', reason: 'The photo is a picture of a screen or a printed photo.' };
  }
  if (reading.confidence >= MIN_CONFIDENCE && reading.not_a_camera_photo) {
    return { decision: 'remove', reason: 'The photo is a screenshot, illustration or generated image, not a camera photo.' };
  }
  if (
    reading.face_visible
    && reading.same_person_as_selfie === 'no'
    && reading.confidence >= MISMATCH_CONFIDENCE
  ) {
    return { decision: 'review', reason: 'The face does not appear to match the selfie.' };
  }
  const compared = reading.same_person_as_selfie === 'yes' ? 'matches the selfie' : 'no mismatch found';
  return { decision: 'allow', reason: `Real photo; ${compared}.` };
}
