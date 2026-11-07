import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanJpeg, cleanPng } from '../supabase/functions/_shared/imageMetadata.ts';

const segment = (marker: number, body: number[]) => [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff, ...body];
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

const jfif = segment(0xe0, ascii('JFIF\0'));
const exif = segment(0xe1, [...ascii('Exif\0\0'), 1, 2, 3, 4]);
const icc = segment(0xe2, [...ascii('ICC_PROFILE\0'), 9]);
const comment = segment(0xfe, ascii('taken at home'));
const frame = segment(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
const scan = [...segment(0xda, [1, 1, 0, 0, 0x3f, 0]), 0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd9];

test('a JPEG loses EXIF and comments and keeps the picture and its colour profile', () => {
  const input = new Uint8Array([0xff, 0xd8, ...jfif, ...exif, ...icc, ...comment, ...frame, ...scan]);
  const cleaned = cleanJpeg(input);
  assert.ok(cleaned);
  assert.deepEqual([...cleaned], [0xff, 0xd8, ...jfif, ...icc, ...frame, ...scan]);
});

test('three magic bytes are not a JPEG', () => {
  assert.equal(cleanJpeg(new Uint8Array([0xff, 0xd8, 0xff])), null);
  assert.equal(cleanJpeg(new Uint8Array([0xff, 0xd8, ...jfif, ...scan])), null, 'no frame before the scan');
  assert.equal(cleanJpeg(new Uint8Array([0xff, 0xd8, ...frame, ...scan.slice(0, -2)])), null, 'no end marker');
});

function chunk(type: string, data: number[]): number[] {
  return [data.length >>> 24, (data.length >> 16) & 0xff, (data.length >> 8) & 0xff, data.length & 0xff, ...ascii(type), ...data, 0, 0, 0, 0];
}
const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

test('a PNG loses its text and EXIF chunks', () => {
  const ihdr = chunk('IHDR', new Array(13).fill(1));
  const idat = chunk('IDAT', [1, 2, 3]);
  const iend = chunk('IEND', []);
  const input = new Uint8Array([...signature, ...ihdr, ...chunk('tEXt', ascii('GPS 51.5')), ...chunk('eXIf', [1]), ...idat, ...iend]);
  assert.deepEqual([...(cleanPng(input) ?? [])], [...signature, ...ihdr, ...idat, ...iend]);
  assert.equal(cleanPng(new Uint8Array([...signature, ...idat, ...iend])), null, 'IHDR must come first');
  assert.equal(cleanPng(new Uint8Array([...signature, ...ihdr, ...idat])), null, 'IEND must end it');
});
