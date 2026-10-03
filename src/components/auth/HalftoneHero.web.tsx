import { Asset } from 'expo-asset';
import { useEffect, useRef } from 'react';

import { SPRITE, createEngine } from './heartsEngine';
import { CELL, INK, PAPER, dotRadius, inkFromPixels, photoFrame } from './heroLook';

const HERO = require('../../../assets/branding/landing-hero.webp');
const HEART = require('../../../assets/branding/chrome-heart.png');


/**
 * The landing page's chrome hearts over its halftone photo. The photo is made of
 * gold dots that stay faint until a heart moves through them: the wake the
 * hearts leave swells the dots into the picture behind, then fades back.
 * Drag a heart to toss it. The simulation lives in heartsEngine.ts.
 */
export function HalftoneHero() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = wrap.current;
    const target = canvas.current;
    const context = target?.getContext('2d');
    if (!host || !target || !context) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const engine = createEngine();

    let photo: HTMLImageElement | null = null;
    let sprite: HTMLImageElement | null = null;
    /** Per-dot ink, 0..1, from the photo. */
    let ink = new Float32Array(0);
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let last = 0;
    let cancelled = false;

    const samplePhoto = () => {
      if (!photo || !width) return;
      const cols = engine.cols;
      const rows = engine.rows;
      const sample = document.createElement('canvas');
      sample.width = cols;
      sample.height = rows;
      const sampler = sample.getContext('2d', { willReadFrequently: true });
      if (!sampler) return;
      const frame = photoFrame(cols, rows, photo.naturalWidth, photo.naturalHeight);
      sampler.drawImage(photo, frame.left, frame.top, frame.width, frame.height);
      ink = inkFromPixels(sampler.getImageData(0, 0, cols, rows).data, cols * rows);
    };

    const resize = () => {
      const nextWidth = host.clientWidth;
      const nextHeight = host.clientHeight;
      if (!nextWidth || !nextHeight) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = nextWidth;
      height = nextHeight;
      target.width = Math.round(width * dpr);
      target.height = Math.round(height * dpr);
      engine.resize(width, height, CELL);
      samplePhoto();
    };

    const drawDots = () => {
      const { cols, rows, wake, halo } = engine;
      context.fillStyle = `rgba(${INK},.62)`;
      context.beginPath();
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const r = dotRadius(ink[k] ?? 0, wake[k]! + halo[k]!);
          if (r < 0.3) continue;
          const x = i * CELL + CELL / 2;
          const y = j * CELL + CELL / 2;
          context.moveTo(x + r, y);
          context.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      context.fill();
    };

    const drawHearts = (now: number) => {
      if (!sprite) return;
      const order = engine.hearts.slice().sort((a, b) => a.size - b.size);
      for (const h of order) {
        const f = engine.frameOf(h);
        const sx = (f % SPRITE.columns) * SPRITE.frameWidth;
        const sy = Math.floor(f / SPRITE.columns) * SPRITE.frameHeight;
        const bobX = reduceMotion ? 0 : Math.sin(now * 0.00055 + h.phase * 1.7) * 4;
        const bobY = reduceMotion ? 0 : Math.sin(now * 0.00085 + h.phase) * 7;
        const sway = reduceMotion ? 0 : Math.sin(now * 0.0007 + h.phase * 0.9) * 0.03;
        context.save();
        context.translate(h.x + bobX, h.y + bobY);
        const grow = h.held ? 1.07 : 1;
        context.scale(grow, grow);
        context.rotate(h.squashAxis);
        context.scale(1 - h.squash, 1 + h.squash * 0.6);
        context.rotate(-h.squashAxis);
        context.rotate(h.angle + sway);
        context.shadowColor = 'rgba(24,34,56,.22)';
        context.shadowBlur = 26;
        context.shadowOffsetY = 18;
        const drawnHeight = (h.size * SPRITE.frameHeight) / SPRITE.frameWidth;
        context.drawImage(sprite, sx, sy, SPRITE.frameWidth, SPRITE.frameHeight, -h.size / 2, -drawnHeight / 2, h.size, drawnHeight);
        context.restore();
      }
    };

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (document.hidden || !width) return;
      const dt = Math.min(2.5, (now - last) / 16.667 || 1);
      last = now;
      engine.step(dt);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      drawDots();
      drawHearts(now);
      target.style.opacity = '1';
    };

    // Pointer: grab, drag, toss. Listen on the window so the logo and language
    // button laid over the hero don't swallow the touch.
    const local = (e: PointerEvent) => {
      const box = host.getBoundingClientRect();
      return { x: e.clientX - box.left, y: e.clientY - box.top };
    };
    const isControl = (el: EventTarget | null) =>
      el instanceof Element && !!el.closest('button,a,input,select,textarea,[role="button"],[role="menuitem"]');
    const onDown = (e: PointerEvent) => {
      if (isControl(e.target)) return;
      const { x, y } = local(e);
      if (!engine.grab(x, y, performance.now())) return;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      if (e.pointerType === 'mouse') e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e);
      if (engine.dragging) {
        engine.drag(x, y, performance.now());
      } else if (e.pointerType === 'mouse') {
        document.body.style.cursor = !isControl(e.target) && engine.pick(x, y) ? 'grab' : '';
      }
    };
    const onUp = () => {
      if (!engine.dragging) return;
      engine.release(performance.now());
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const load = (source: number, onLoad: (img: HTMLImageElement) => void) => {
      const img = new window.Image();
      img.onload = () => !cancelled && onLoad(img);
      img.src = Asset.fromModule(source).uri;
    };
    load(HERO, (img) => { photo = img; samplePhoto(); });
    load(HEART, (img) => { sprite = img; });

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    last = performance.now();
    frame = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0, background: PAPER, overflow: 'hidden' }}>
      <canvas
        ref={canvas}
        aria-hidden
        style={{ width: '100%', height: '100%', display: 'block', opacity: 0, transition: 'opacity .8s ease', touchAction: 'pan-y' }}
      />
    </div>
  );
}
