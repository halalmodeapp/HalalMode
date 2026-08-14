/**
 * How large a profile photo is allowed to be by the time it leaves the phone.
 *
 * A modern phone camera hands you roughly 4032x3024 and four megabytes, and a
 * member may add six of those. Stored and served untouched that is 24MB per
 * member, paid for twice — once to keep and once every time somebody looks.
 * Nothing on screen is ever more than a phone's width, so all but a fraction of
 * those pixels are downloaded and thrown away.
 *
 * 1600px on the longest edge covers a full-bleed photo on the densest phone
 * screen sold, and JPEG at 0.8 is the quality where the next step down starts
 * to show on skin and the step up mostly buys file size. Together they turn a
 * four megabyte photo into roughly three hundred kilobytes.
 */
export const PHOTO_MAX_EDGE = 1600;

/** 0-1. Below about 0.7 JPEG blocking becomes visible on faces. */
export const PHOTO_JPEG_QUALITY = 0.8;

/**
 * The size to resize to, or null when the photo is already small enough.
 *
 * Only the long edge is given so the aspect ratio is preserved by the
 * manipulator rather than recomputed here — a rounded pair of dimensions is how
 * a photo ends up a pixel off square and very slightly stretched.
 */
export function photoResizeTarget(
  width: number,
  height: number,
  maxEdge: number = PHOTO_MAX_EDGE,
): { width: number } | { height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    // An unreadable size is not a reason to refuse the upload. Leaving it
    // alone costs storage; guessing a size could stretch somebody's face.
    return null;
  }

  if (width <= maxEdge && height <= maxEdge) return null;

  return width >= height ? { width: maxEdge } : { height: maxEdge };
}
