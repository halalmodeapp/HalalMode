/**
 * How the tilt effects forget the angle a phone is held at.
 *
 * The cards and the sign-in cover tilt with the phone, measured from a baseline
 * taken when the screen opens. Left fixed, holding the phone at an angle keeps
 * the picture tilted for as long as it is held. So the baseline slowly follows
 * the phone, and the picture eases back to flat at whatever angle it is held.
 * A quick turn still shows fully; it settles over a few seconds.
 */

/** Time constant of the settling, in milliseconds: about 63% of the way back after this long. */
export const TILT_BASELINE_TAU_MS = 2500;

/** Share of the gap between baseline and phone to close for a sample `dtMs` after the last. */
export function baselineStep(dtMs: number): number {
  'worklet';
  const dt = Math.min(100, Math.max(0, dtMs));
  return 1 - Math.exp(-dt / TILT_BASELINE_TAU_MS);
}
