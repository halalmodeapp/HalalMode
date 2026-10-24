/**
 * Line boil on the couple cover, as chosen on the live page. On phones it is a
 * held-frame jitter: each layer nudges by a fraction of a point and settles,
 * fps times a second, cycling through a few "drawings". The web build uses the
 * shader boil in site/scene-warp.js with the same numbers.
 */
export const BOIL = { amount: 0.5, fps: 8, drawings: 6 } as const;

/**
 * The jitter in points for a scene drawn at `unit` points per world pixel.
 * Following the picture's size exactly would leave a phone with a boil under a
 * device pixel, so it eases instead: the chosen amount at full size (unit 1),
 * about 0.44 on a tablet and 0.38 on a phone, easing down gradually in between.
 * Same curve as BOIL_AMOUNT_EASE in site/scene-warp.js.
 */
export function boilPoints(unit: number): number {
  const scale = Math.min(1.5, Math.max(0.1, unit));
  return BOIL.amount * Math.pow(scale, 0.2);
}

/** A repeatable pseudo-random value in -1..1 for a drawing and a layer. */
export function boilNoise(drawing: number, layer: number, axis: number): number {
  'worklet';
  const x = Math.sin(drawing * 127.1 + layer * 311.7 + axis * 74.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}
