import { Asset } from 'expo-asset';
import { useEffect, useRef } from 'react';

const HERO = require('../../../assets/branding/landing-hero.webp');

/** Cream paper and gold ink, as on halalmo.de. */
const PAPER = '#F1ECE2';
const INK = [122, 90, 44] as const;
/** Dot spacing in CSS pixels. */
const CELL = 4;
/** Where the two faces are in the photo, as fractions of its width and height. */
const FOCUS = { x: 0.74, y: 0.33 };
/** How much closer than "cover" to frame the faces. */
const ZOOM = 1.35;

/**
 * The landing page's photo, redrawn as gold halftone dots so the sign-in feels
 * like the same place. The landing page does this with a WebGL shader; a flat
 * 2D canvas gives the same look without the moving parts.
 */
export function HalftoneHero() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = wrap.current;
    const target = canvas.current;
    if (!host || !target) return;
    let image: HTMLImageElement | null = null;
    let cancelled = false;

    const draw = () => {
      if (!image || cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      target.width = Math.round(width * dpr);
      target.height = Math.round(height * dpr);
      const context = target.getContext('2d');
      if (!context) return;

      // Sample the photo at one pixel per dot, framed on the two faces.
      const cols = Math.ceil(width / CELL);
      const rows = Math.ceil(height / CELL);
      const sample = document.createElement('canvas');
      sample.width = cols;
      sample.height = rows;
      const sampler = sample.getContext('2d', { willReadFrequently: true });
      if (!sampler) return;
      const scale = Math.max(cols / image.naturalWidth, rows / image.naturalHeight) * ZOOM;
      const drawnWidth = image.naturalWidth * scale;
      const drawnHeight = image.naturalHeight * scale;
      const clamp = (value: number, min: number) => Math.min(0, Math.max(min, value));
      const left = clamp(cols / 2 - FOCUS.x * drawnWidth, cols - drawnWidth);
      const top = clamp(rows / 2 - FOCUS.y * drawnHeight, rows - drawnHeight);
      sampler.drawImage(image, left, top, drawnWidth, drawnHeight);
      const pixels = sampler.getImageData(0, 0, cols, rows).data;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = PAPER;
      context.fillRect(0, 0, width, height);
      context.fillStyle = `rgb(${INK.join(',')})`;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = (row * cols + col) * 4;
          const light = (0.299 * pixels[i]! + 0.587 * pixels[i + 1]! + 0.114 * pixels[i + 2]!) / 255;
          // Highlights stay paper; shadows fill the cell.
          const ink = Math.min(1, Math.max(0, (1 - light - 0.12) * 1.45));
          const size = CELL * Math.sqrt(ink);
          if (size < 0.35) continue;
          context.fillRect(col * CELL + (CELL - size) / 2, row * CELL + (CELL - size) / 2, size, size);
        }
      }
      target.style.opacity = '1';
    };

    const asset = Asset.fromModule(HERO);
    const img = new window.Image();
    img.onload = () => { image = img; draw(); };
    img.src = asset.uri;

    const observer = new ResizeObserver(() => draw());
    observer.observe(host);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0, background: PAPER, overflow: 'hidden' }}>
      <canvas
        ref={canvas}
        aria-hidden
        style={{ width: '100%', height: '100%', display: 'block', opacity: 0, transition: 'opacity .8s ease' }}
      />
    </div>
  );
}
