import { createElement, useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Dot spacing, in CSS pixels. */
const STEP = 14;
/** The faintest dot, everywhere: just texture. */
const BASE_RADIUS = 0.7;
/** How much a dot grows at the heart of a heart. */
const GROW = 3.4;
const HEARTS = 5;
const FPS = 24;

interface Heart {
  x: number;
  y: number;
  /** Size in pixels at full bloom. */
  size: number;
  born: number;
  /** Seconds from appearing to gone. */
  life: number;
  drift: number;
}

function spawn(width: number, height: number, now: number, stagger = 0): Heart {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: 70 + Math.random() * 110,
    born: now - stagger,
    life: 7 + Math.random() * 6,
    drift: (Math.random() - 0.5) * 6,
  };
}

/** Inside the classic heart curve, how deep: 0 outside, rising toward 1. */
function heartDepth(x: number, y: number): number {
  const a = x * x + y * y - 1;
  const f = a * a * a - x * x * y * y * y;
  return f >= 0 ? 0 : Math.min(1, -f * 3);
}

/**
 * Faint halftone dots across a white screen. Now and then a patch of them
 * swells into a heart and fades away again: you only see it is a heart while
 * it moves. Drawn at about 3% opacity, web only, and still when the member
 * prefers less motion.
 */
export function HalftoneHearts() {
  const reducedMotion = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const element = canvas.current;
    if (Platform.OS !== 'web' || !element) return;
    const context = element.getContext('2d');
    if (!context) return;

    let width = 0;
    let height = 0;
    let hearts: Heart[] = [];
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = element.clientWidth;
      height = element.clientHeight;
      element.width = width * ratio;
      element.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const start = performance.now() / 1000;
    hearts = Array.from({ length: HEARTS }, (_, index) => spawn(width, height, start, (index / HEARTS) * 10));

    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#0A0A0A';
      hearts = hearts.map((heart) => (now - heart.born > heart.life ? spawn(width, height, now) : heart));
      for (let y = STEP / 2; y < height; y += STEP) {
        for (let x = STEP / 2; x < width; x += STEP) {
          let grow = 0;
          for (const heart of hearts) {
            const age = (now - heart.born) / heart.life;
            // Swells in, holds a breath, fades out.
            const bloom = Math.sin(Math.PI * age) ** 2;
            const scale = heart.size * (0.55 + 0.45 * bloom);
            const hx = (x - heart.x) / scale;
            const hy = -(y - (heart.y - heart.drift * age * 10)) / scale + 0.15;
            if (hx * hx + hy * hy > 2.5) continue;
            grow = Math.max(grow, heartDepth(hx * 1.15, hy * 1.15) * bloom);
          }
          const radius = BASE_RADIUS + grow * GROW;
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fill();
        }
      }
    };

    if (reducedMotion) {
      draw(start + 3);
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }

    let frame = 0;
    let last = 0;
    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (time - last < 1000 / FPS || document.hidden) return;
      last = time;
      draw(time / 1000);
    };
    frame = requestAnimationFrame(tick);
    const onResize = () => {
      resize();
      hearts = hearts.map((heart) => ({ ...heart, x: Math.min(heart.x, width), y: Math.min(heart.y, height) }));
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [reducedMotion]);

  if (Platform.OS !== 'web') return null;
  return (
    <View pointerEvents="none" style={styles.layer} aria-hidden>
      {createElement('canvas', { ref: canvas, style: { width: '100%', height: '100%', display: 'block' } })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.035 },
});
