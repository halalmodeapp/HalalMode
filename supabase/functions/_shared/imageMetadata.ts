/**
 * Checks that a JPEG or PNG is built the way a real image is, and returns it without the parts that
 * can say where and when a photo was taken or on which device (EXIF, XMP, comments, text chunks).
 * Returns null when the structure is broken, so three magic bytes are no longer enough to pass.
 *
 * This walks the file's structure; it does not decode pixels. The phone has already re-encoded the
 * photo, and this makes the server hold that line for every client.
 */

const JPEG_SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function startsWithAscii(bytes: Uint8Array, at: number, text: string): boolean {
  for (let i = 0; i < text.length; i += 1) if (bytes[at + i] !== text.charCodeAt(i)) return false;
  return true;
}

export function cleanJpeg(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const kept: Uint8Array[] = [bytes.subarray(0, 2)];
  let at = 2;
  let sawFrame = false;
  while (at < bytes.length) {
    if (bytes[at] !== 0xff) return null;
    while (bytes[at] === 0xff && at < bytes.length) at += 1;
    const marker = bytes[at];
    at += 1;
    if (marker === undefined) return null;
    if (marker === 0xd9) return null; // An end before any image data.
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue;
    if (at + 2 > bytes.length) return null;
    const length = (bytes[at]! << 8) | bytes[at + 1]!;
    if (length < 2 || at + length > bytes.length) return null;
    const segment = bytes.subarray(at - 2, at + length);
    if (marker === 0xda) {
      // Scan data runs to the end marker. Everything from here is the picture itself.
      if (!sawFrame) return null;
      if (bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;
      kept.push(new Uint8Array([0xff, marker]), bytes.subarray(at, bytes.length));
      return join(kept);
    }
    if (JPEG_SOF.has(marker)) sawFrame = true;
    const isApp = marker >= 0xe1 && marker <= 0xef;
    const isIcc = marker === 0xe2 && startsWithAscii(bytes, at + 2, 'ICC_PROFILE');
    // APP1 to APP15 hold EXIF, XMP and maker notes. Only the colour profile is kept, and comments go.
    if (!(isApp && !isIcc) && marker !== 0xfe) kept.push(new Uint8Array([0xff, marker]), segment.subarray(2));
    at += length;
  }
  return null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_DROPPED = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

export function cleanPng(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 8 || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) return null;
  const kept: Uint8Array[] = [bytes.subarray(0, 8)];
  let at = 8;
  let first = true;
  while (at + 12 <= bytes.length) {
    const length = ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
    const end = at + 12 + length;
    if (end > bytes.length) return null;
    const type = String.fromCharCode(bytes[at + 4]!, bytes[at + 5]!, bytes[at + 6]!, bytes[at + 7]!);
    if (first && type !== 'IHDR') return null;
    first = false;
    if (!PNG_DROPPED.has(type)) kept.push(bytes.subarray(at, end));
    at = end;
    if (type === 'IEND') return at === bytes.length ? join(kept) : null;
  }
  return null;
}

function join(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
