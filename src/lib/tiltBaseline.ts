/**
 * How the tilt effects forget the angle a phone is held at.
 *
 * The cards and the sign-in cover tilt with the phone, measured from a baseline
 * taken when the screen opens. Tilting around works as normal. But if the phone
 * is held nearly still at an awkward angle, the baseline moves to meet it and the
 * picture settles back to flat, over about a second. Any real movement stops the
 * settling at once, so tilting around never fights it.
 */
export const TILT_STILL = {
  /** Slower than this, in degrees a second, counts as holding still (hand tremor is a few). */
  rate: 8,
  /** How long it must stay still before the settling starts, in milliseconds. */
  after: 300,
  /** Once started, the time it takes to be back to flat, in milliseconds. */
  settle: 1000,
} as const;

/** How fast the phone is turning, in degrees a second, from how far it turned between two samples. */
export function turnRate(pitchDelta: number, rollDelta: number, dtMs: number): number {
  'worklet';
  if (dtMs <= 0) return 0;
  return (Math.hypot(pitchDelta, rollDelta) * (180 / Math.PI)) / (dtMs / 1000);
}

/**
 * Share of the gap between baseline and phone to close for a sample `dtMs`
 * after the last, given how long ago the phone last really moved. Zero while it
 * is moving or has only just stopped.
 */
export function baselineStep(dtMs: number, sinceMovedMs: number): number {
  'worklet';
  if (sinceMovedMs < TILT_STILL.after) return 0;
  const dt = Math.min(100, Math.max(0, dtMs));
  // An exponential that is about 98% of the way after `settle` milliseconds.
  return 1 - Math.exp((-dt * 4) / TILT_STILL.settle);
}
