/** The look of the sign-in hero, shared by the web and phone renderers. */

/** Cream paper and gold ink, as on halalmo.de. */
export const PAPER = '#F1ECE2';
export const INK = '138,106,52';
/** Dot spacing in CSS pixels / dp. */
export const CELL = 5;
/** Where the two faces are in the photo, as fractions of its width and height. */
export const FOCUS = { x: 0.74, y: 0.33 };
/** How much closer than "cover" to frame the faces. */
export const ZOOM = 1.35;
/** Dot radius as a fraction of CELL: the faint resting dot, and the largest one. */
export const DOT_BASE = 0.12;
export const DOT_FULL = 0.56;

/** Where to draw the photo on a cols x rows sample so the faces fill the frame. */
export function photoFrame(cols: number, rows: number, imageWidth: number, imageHeight: number) {
  const scale = Math.max(cols / imageWidth, rows / imageHeight) * ZOOM;
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const clamp = (value: number, min: number) => Math.min(0, Math.max(min, value));
  return {
    left: clamp(cols / 2 - FOCUS.x * width, cols - width),
    top: clamp(rows / 2 - FOCUS.y * height, rows - height),
    width,
    height,
  };
}

/** Per-dot ink, 0..1, from RGBA pixels: highlights stay paper, shadows fill the cell. */
export function inkFromPixels(pixels: ArrayLike<number>, count: number) {
  const ink = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    const light = (0.299 * pixels[k * 4]! + 0.587 * pixels[k * 4 + 1]! + 0.114 * pixels[k * 4 + 2]!) / 255;
    ink[k] = Math.min(1, Math.max(0, (1 - light - 0.12) * 1.45));
  }
  return ink;
}

/**
 * Radius of one dot. Where the photo is dark the dot grows toward full size as
 * `reveal` rises; where it is light it stays a pinprick, so only the picture
 * shows through the hearts' wake.
 */
export function dotRadius(ink: number, reveal: number) {
  const base = CELL * DOT_BASE;
  return base + Math.min(1, reveal) * Math.max(0, Math.sqrt(ink) * CELL * DOT_FULL - base);
}
