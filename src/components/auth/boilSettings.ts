/**
 * Line boil on the couple cover, as chosen on the live page. On phones it is a
 * held-frame jitter: each layer nudges by a fraction of a point and settles,
 * fps times a second, cycling through a few "drawings". The web build uses the
 * shader boil in site/scene-warp.js with the same numbers.
 */
export const BOIL = { amount: 0.5, fps: 8, drawings: 6 } as const;

/** A repeatable pseudo-random value in -1..1 for a drawing and a layer. */
export function boilNoise(drawing: number, layer: number, axis: number): number {
  'worklet';
  const x = Math.sin(drawing * 127.1 + layer * 311.7 + axis * 74.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}
