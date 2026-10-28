import { COUPLE_TONE } from './coupleTone';
import { COUPLE_WORLD } from './coupleSceneLayers';
import type { CoupleCamera } from './coupleSceneLayout';

/**
 * Halftone dots over the couple cover on phones, in the look of the site's
 * Paper shader: cyan and magenta ink dots, re-rolled a few times a second, laid
 * over the live scene at low opacity. The phone has no shader here, so the dots
 * are drawn as vector circles whose size and tint follow the scene's colours.
 */
export const HALFTONE = {
  fps: 6,
  drawings: 6,
  cyan: '#00B3FF',
  magenta: '#FC4F9D',
  /** How much of each ink shows. The site uses 0.1 with a shader blend; plain alpha needs more. */
  opacity: 0.26,
  /** Dot spacing, in points, never finer than this. */
  minCell: 5.5,
  /** Roughly how many dots one ink may use. */
  dotBudget: 3600,
  /** Each dot strays from its grid point by up to this share of a cell. */
  stray: 0.22,
  /** Each dot's size varies by up to this share. */
  sizeVary: 0.18,
} as const;

/** One byte per channel, three per cell, read from the generated base64 once. */
let tone: Uint8Array | null = null;
function toneBytes(): Uint8Array {
  if (tone) return tone;
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const text = COUPLE_TONE.data;
  const out = new Uint8Array(Math.floor((text.length * 3) / 4));
  let bits = 0;
  let value = 0;
  let at = 0;
  for (let i = 0; i < text.length; i++) {
    const code = table.indexOf(text[i]!);
    if (code < 0) continue;
    value = (value << 6) | code;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[at++] = (value >> bits) & 255;
    }
  }
  tone = out.subarray(0, at);
  return tone;
}

/** The scene's colour at a world position, 0..255 each, with the nearest cell's value. */
export function sceneColor(worldX: number, worldY: number): [number, number, number] {
  const bytes = toneBytes();
  const column = Math.min(COUPLE_TONE.width - 1, Math.max(0, Math.floor((worldX / COUPLE_WORLD.width) * COUPLE_TONE.width)));
  const row = Math.min(COUPLE_TONE.height - 1, Math.max(0, Math.floor((worldY / COUPLE_WORLD.height) * COUPLE_TONE.height)));
  const at = (row * COUPLE_TONE.width + column) * 3;
  return [bytes[at]!, bytes[at + 1]!, bytes[at + 2]!];
}

/** Dot spacing for a frame: fine on a phone, coarser on a big screen to stay light. */
export function halftoneCell(width: number, height: number): number {
  return Math.max(HALFTONE.minCell, Math.sqrt((Math.max(1, width) * Math.max(1, height)) / HALFTONE.dotBudget));
}

/** A repeatable value in 0..1 for a drawing, a dot and a slot. */
function roll(drawing: number, i: number, j: number, slot: number): number {
  const x = Math.sin(drawing * 91.7 + i * 12.9898 + j * 78.233 + slot * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

function circle(path: string[], x: number, y: number, r: number) {
  const radius = r.toFixed(2);
  const diameter = (r * 2).toFixed(2);
  path.push(`M${(x - r).toFixed(2)},${y.toFixed(2)}a${radius},${radius} 0 1,0 ${diameter},0a${radius},${radius} 0 1,0 -${diameter},0`);
}

/**
 * The two inks' dots for one drawing, as SVG path data. Cyan sits on the grid;
 * magenta on the grid shifted half a cell each way, so the two never stack.
 * A dot's size follows how much of its ink the scene's colour holds there.
 */
export function halftonePaths(width: number, height: number, camera: CoupleCamera, drawing: number): { cyan: string; magenta: string } {
  const cell = halftoneCell(width, height);
  const columns = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;
  const cyan: string[] = [];
  const magenta: string[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      for (let ink = 0; ink < 2; ink++) {
        const shift = ink === 0 ? 0 : 0.5;
        const x = (i + 0.5 + shift) * cell + (roll(drawing, i, j, ink * 2) - 0.5) * 2 * HALFTONE.stray * cell;
        const y = (j + 0.5 + shift) * cell + (roll(drawing, i, j, ink * 2 + 1) - 0.5) * 2 * HALFTONE.stray * cell;
        if (x < 0 || y < 0 || x > width || y > height) continue;
        const [r, g] = sceneColor((x - camera.left) / camera.unit, (y - camera.top) / camera.unit);
        // Cyan ink absorbs red, magenta absorbs green. A little of each is
        // always there (the site's "flood"), more where the scene calls for it.
        const amount = ink === 0 ? 1 - r / 255 : 1 - g / 255;
        const share = Math.min(0.85, 0.22 + 0.7 * amount);
        const radius = cell * 0.5 * share * (1 + (roll(drawing, i, j, 5 + ink) - 0.5) * 2 * HALFTONE.sizeVary);
        if (radius < 0.35) continue;
        circle(ink === 0 ? cyan : magenta, x, y, radius);
      }
    }
  }
  return { cyan: cyan.join(''), magenta: magenta.join('') };
}
