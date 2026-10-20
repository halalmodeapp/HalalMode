import { COUPLE_WORLD } from './coupleSceneLayers';

/**
 * Camera for the couple cover. The scene lives in the reference illustration's
 * world pixels; the camera picks one scale for the whole world so that it
 * covers the frame, then frames the couple. Because every layer shares this
 * one scale, the man stays seated on his step and the heart stays between the
 * two hands at any aspect ratio.
 *
 * The landing page (site/index.html) expresses the same camera in CSS; keep
 * these constants in step with its --u, focus and --ax/--ay values
 * (tests/coupleScene.test.ts checks them).
 */

/** Slightly more than "cover", for parallax headroom when the frame allows it. */
export const COUPLE_OVERSCAN = 1.035;
/** The point the crop centres on: midway between the couple, at the stairs. */
export const COUPLE_FOCUS = { x: 812, y: 574 } as const;
/** Parallax travel, in world pixels, of a layer at depth 1 at full tilt. */
export const COUPLE_PARALLAX = { x: 14, y: 8 } as const;
/**
 * Phone tilt, meant to be obvious without being pointed out: full effect at
 * `degrees`, layers travel up to `gain` times the hover distance (the deepest
 * full-frame layer, the sky, still stays inside the bleed), and `ease` is how
 * quickly it follows the hand each frame. halalmo.de uses the same numbers.
 */
export const COUPLE_TILT = { degrees: 8, gain: 2.2, ease: 0.16 } as const;

/**
 * Device tilt (gamma, beta deltas in degrees) as screen x/y, for the screen's
 * rotation in degrees: turned sideways, the device's axes swap on screen.
 */
export function tiltOnScreen(gamma: number, beta: number, angle: number) {
  'worklet';
  if (angle === 90) return { x: beta, y: -gamma };
  if (angle === -90 || angle === 270) return { x: -beta, y: gamma };
  if (angle === 180) return { x: -gamma, y: -beta };
  return { x: gamma, y: beta };
}
/**
 * What every crop must keep: both faces, both hands with the heart between
 * them, and where each of them sits. On the narrowest phone heroes the woman's
 * trailing scarf and the man's back may fall outside; nothing else does.
 */
export const COUPLE_SUBJECTS = { left: 470, top: 228, right: 1160, bottom: 940 } as const;

export type CoupleCamera = {
  /** Screen points per world pixel. */
  unit: number;
  /** Screen position of the world origin. */
  left: number;
  top: number;
};

/** Breathing room kept around the subjects when the frame is tight. */
const SUBJECT_PADDING = 12;

export function coupleCamera(width: number, height: number): CoupleCamera {
  const frameWidth = Math.max(1, width);
  const frameHeight = Math.max(1, height);
  // Half of the layers' mirrored bleed may be shown on tall, narrow frames; the
  // other half stays in reserve for parallax travel.
  const reach = COUPLE_WORLD.bleed / 2;
  const cover = Math.max(frameWidth / COUPLE_WORLD.width, frameHeight / COUPLE_WORLD.height) * COUPLE_OVERSCAN;
  const fit = Math.min(
    frameWidth / (COUPLE_SUBJECTS.right - COUPLE_SUBJECTS.left + 2 * SUBJECT_PADDING),
    frameHeight / (COUPLE_SUBJECTS.bottom - COUPLE_SUBJECTS.top + 2 * SUBJECT_PADDING),
  );
  const least = Math.max(frameWidth / (COUPLE_WORLD.width + 2 * reach), frameHeight / (COUPLE_WORLD.height + 2 * reach));
  const unit = Math.max(least, Math.min(cover, fit));
  return {
    unit,
    left: clamp(frameWidth / 2 - COUPLE_FOCUS.x * unit, frameWidth - (COUPLE_WORLD.width + reach) * unit, reach * unit),
    top: clamp(frameHeight / 2 - COUPLE_FOCUS.y * unit, frameHeight - (COUPLE_WORLD.height + reach) * unit, reach * unit),
  };
}

/**
 * The same camera as CSS, sized by container query units of an element with
 * `container-type: size`, so server-rendered HTML is framed correctly before
 * any script measures it. The landing page spells out the same expressions.
 */
export function coupleCameraCss() {
  const reach = COUPLE_WORLD.bleed / 2;
  const { width, height } = COUPLE_WORLD;
  const spanX = COUPLE_SUBJECTS.right - COUPLE_SUBJECTS.left + 2 * SUBJECT_PADDING;
  const spanY = COUPLE_SUBJECTS.bottom - COUPLE_SUBJECTS.top + 2 * SUBJECT_PADDING;
  const cover = `calc(max(100cqw / ${width}, 100cqh / ${height}) * ${COUPLE_OVERSCAN})`;
  const fit = `min(100cqw / ${spanX}, 100cqh / ${spanY})`;
  const least = `max(100cqw / ${width + 2 * reach}, 100cqh / ${height + 2 * reach})`;
  return {
    unit: `max(${least}, min(${cover}, ${fit}))`,
    left: `clamp(calc(100cqw - ${width + reach} * var(--u)), calc(50cqw - ${COUPLE_FOCUS.x} * var(--u)), calc(${reach} * var(--u)))`,
    top: `clamp(calc(100cqh - ${height + reach} * var(--u)), calc(50cqh - ${COUPLE_FOCUS.y} * var(--u)), calc(${reach} * var(--u)))`,
  };
}

/** Screen offset of a layer at `depth` for a normalised tilt of -1..1 on each axis. */
export function coupleParallax(depth: number, tiltX: number, tiltY: number, unit: number) {
  'worklet';
  return {
    x: tiltX * depth * COUPLE_PARALLAX.x * unit,
    y: tiltY * depth * COUPLE_PARALLAX.y * unit,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
