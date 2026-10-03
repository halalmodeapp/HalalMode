/**
 * Chrome hearts you can grab and toss, and the wake they leave behind. A port
 * of site/hearts.js (the halalmo.de waitlist) with the DOM taken out, so any
 * renderer can draw it: call `step` once per frame, then read `hearts`, `wake`
 * and `halo`.
 */

export const SPRITE = { frameWidth: 314, frameHeight: 313, columns: 4 } as const;

const SIZES = [1.1, 0.88];
const SPOTS = [
  [0.38, 0.4],
  [0.64, 0.62],
] as const;

export type Heart = {
  /** Drawn width, and collision radius. */
  size: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Tilt: resting angle, current angle, angular velocity. */
  restAngle: number;
  angle: number;
  spin: number;
  /** Idle bob phase. */
  phase: number;
  /** Squash: amount, velocity, and the axis it squashes along. */
  squash: number;
  squashVelocity: number;
  squashAxis: number;
  /** Recent movement while held, so dragging in place still leaves a wake. */
  moved: number;
  /** Tap animation timeline, 0..1 (1 = idle). */
  tap: number;
  held: boolean;
  /** How far the held heart is pressed, 0..1. */
  press: number;
};

export type Engine = ReturnType<typeof createEngine>;

export function createEngine() {
  let width = 1;
  let height = 1;
  let cell = 6;
  let cols = 0;
  let rows = 0;
  let wake = new Float32Array(0);
  let scratch = new Float32Array(0);
  let halo = new Float32Array(0);
  const hearts: Heart[] = [];
  let grabbed: { heart: Heart; dx: number; dy: number; startX: number; startY: number; startedAt: number; moved: number } | null = null;
  let trail: { x: number; y: number; t: number }[] = [];

  const baseSize = () => Math.max(44, Math.min(width, height * 1.1) * (width <= 860 ? 0.36 : 0.24));

  function seat(heart: Heart, index: number) {
    heart.size = baseSize() * (SIZES[index] ?? 1);
    heart.radius = heart.size * 0.4;
    const spot = SPOTS[index] ?? SPOTS[0];
    heart.x = width * spot[0];
    heart.y = height * spot[1];
  }

  function resize(nextWidth: number, nextHeight: number, nextCell: number) {
    width = nextWidth;
    height = nextHeight;
    cell = nextCell;
    cols = Math.ceil(width / cell);
    rows = Math.ceil(height / cell);
    wake = new Float32Array(cols * rows);
    scratch = new Float32Array(cols * rows);
    halo = new Float32Array(cols * rows);
    if (!hearts.length) {
      for (let i = 0; i < SIZES.length; i++) {
        const tilt = i ? 0.14 : -0.14;
        const heart: Heart = {
          size: 0, radius: 0, x: 0, y: 0, vx: 0, vy: 0,
          restAngle: tilt, angle: tilt, spin: 0, phase: i * 2.3,
          squash: 0, squashVelocity: 0, squashAxis: 0, moved: 0, tap: 1, held: false, press: 0,
        };
        seat(heart, i);
        hearts.push(heart);
      }
      return;
    }
    hearts.forEach((heart, i) => {
      heart.size = baseSize() * (SIZES[i] ?? 1);
      heart.radius = heart.size * 0.4;
      if (!heart.vx && !heart.vy && !heart.held) seat(heart, i);
      heart.x = Math.min(width - heart.radius, Math.max(heart.radius, heart.x));
      heart.y = Math.min(height - heart.radius, Math.max(heart.radius, heart.y));
    });
  }

  function squeeze(heart: Heart, amount: number, axis: number) {
    heart.squashAxis = axis;
    heart.squashVelocity += Math.min(0.1, amount * 0.12);
  }

  /** The wake: dots swell where a heart has recently moved, then settle slowly. */
  function stepWake(dt: number) {
    const decay = Math.pow(0.976, dt);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const here = wake[k]!;
        const l = i > 0 ? wake[k - 1]! : here;
        const r = i < cols - 1 ? wake[k + 1]! : here;
        const u = j > 0 ? wake[k - cols]! : here;
        const d = j < rows - 1 ? wake[k + cols]! : here;
        scratch[k] = (here * 0.6 + (l + r + u + d) * 0.1) * decay;
      }
    }
    [wake, scratch] = [scratch, wake];

    for (const heart of hearts) {
      const speed = Math.max(Math.hypot(heart.vx, heart.vy), heart.moved * 0.55);
      const amp = Math.min(1, speed / 9) * 0.85 + (heart.held ? 0.18 : 0) + (heart.tap < 1 ? 0.55 * Math.sin(heart.tap * Math.PI) : 0);
      if (amp < 0.02) continue;
      const sigma = heart.radius * 0.62;
      const reach = Math.ceil((sigma * 2.6) / cell);
      const ci = Math.round(heart.x / cell);
      const cj = Math.round(heart.y / cell);
      for (let j = Math.max(0, cj - reach); j <= Math.min(rows - 1, cj + reach); j++) {
        for (let i = Math.max(0, ci - reach); i <= Math.min(cols - 1, ci + reach); i++) {
          const dx = i * cell + cell / 2 - heart.x;
          const dy = j * cell + cell / 2 - heart.y;
          const k = j * cols + i;
          wake[k] = Math.min(1, wake[k]! + amp * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)) * 0.6);
        }
      }
    }

    // A faint resting halo, so the photo hints at itself around each heart.
    halo.fill(0);
    for (const heart of hearts) {
      const s2 = 2 * heart.radius * heart.radius * 0.75;
      const reach = Math.ceil((heart.radius * 2.6) / cell);
      const ci = Math.round(heart.x / cell);
      const cj = Math.round(heart.y / cell);
      for (let j = Math.max(0, cj - reach); j <= Math.min(rows - 1, cj + reach); j++) {
        for (let i = Math.max(0, ci - reach); i <= Math.min(cols - 1, ci + reach); i++) {
          const dx = i * cell + cell / 2 - heart.x;
          const dy = j * cell + cell / 2 - heart.y;
          const k = j * cols + i;
          halo[k] = Math.min(0.3, halo[k]! + 0.2 * Math.exp(-(dx * dx + dy * dy) / s2));
        }
      }
    }
  }

  function stepHearts(dt: number) {
    for (const h of hearts) {
      if (!h.held) {
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        const speed = Math.hypot(h.vx, h.vy);
        h.vx *= Math.pow(0.985, dt);
        h.vy *= Math.pow(0.985, dt);
        // Friction: hearts only move when you throw them.
        if (speed < 0.05) { h.vx = 0; h.vy = 0; }
        let impact = 0;
        let axis = 0;
        if (h.x < h.radius) { if (-h.vx > impact) { impact = -h.vx; axis = 0; } if (h.vx < 0) h.vx = -h.vx * 0.9; h.x += (h.radius - h.x) * 0.3; }
        if (h.x > width - h.radius) { if (h.vx > impact) { impact = h.vx; axis = 0; } if (h.vx > 0) h.vx = -h.vx * 0.9; h.x -= (h.x - (width - h.radius)) * 0.3; }
        if (h.y < h.radius) { if (-h.vy > impact) { impact = -h.vy; axis = Math.PI / 2; } if (h.vy < 0) h.vy = -h.vy * 0.9; h.y += (h.radius - h.y) * 0.3; }
        if (h.y > height - h.radius) { if (h.vy > impact) { impact = h.vy; axis = Math.PI / 2; } if (h.vy > 0) h.vy = -h.vy * 0.9; h.y -= (h.y - (height - h.radius)) * 0.3; }
        if (impact > 1.2) squeeze(h, impact / 9, axis);
      }
      // Pendulum tilt.
      h.spin += (-(h.angle - h.restAngle) * 0.012 - h.spin * 0.03) * dt;
      h.angle += h.spin * dt;
      if (h.tap < 1) h.tap = Math.min(1, h.tap + (dt * 3) / 38);
      h.press += (Number(h.held) - h.press) * Math.min(1, dt * 0.22);
      h.moved *= Math.pow(0.88, dt);
      h.squashVelocity += (-h.squash * 0.12 - h.squashVelocity * 0.09) * dt;
      h.squash = Math.min(0.42, Math.max(-0.42, h.squash + h.squashVelocity * dt));
    }

    for (let i = 0; i < hearts.length; i++) {
      for (let j = i + 1; j < hearts.length; j++) {
        const a = hearts[i]!;
        const b = hearts[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const min = a.radius + b.radius;
        if (dist >= min) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = min - dist;
        const ma = a.held ? 1e6 : a.radius * a.radius;
        const mb = b.held ? 1e6 : b.radius * b.radius;
        const total = ma + mb;
        a.x -= nx * overlap * (mb / total);
        a.y -= ny * overlap * (mb / total);
        b.x += nx * overlap * (ma / total);
        b.y += ny * overlap * (ma / total);
        const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (approach >= 0) continue;
        const impulse = (-(1 + 0.92) * approach) / (1 / ma + 1 / mb);
        if (!a.held) { a.vx -= (impulse * nx) / ma; a.vy -= (impulse * ny) / ma; }
        if (!b.held) { b.vx += (impulse * nx) / mb; b.vy += (impulse * ny) / mb; }
        const force = -approach / 9;
        if (force > 0.12) {
          const axis = Math.atan2(ny, nx);
          squeeze(a, force, axis);
          squeeze(b, force, axis);
          a.spin += (Math.random() - 0.5) * 0.03;
          b.spin += (Math.random() - 0.5) * 0.03;
        }
      }
    }
  }

  function step(dt: number) {
    stepHearts(dt);
    stepWake(dt);
  }

  /** Which sprite frame to draw: relaxed (0) through fully squeezed (7). */
  function frameOf(h: Heart) {
    if (h.press > 0.02) return Math.round(6 * h.press);
    if (h.tap >= 1) return 0;
    const u = h.tap < 0.5 ? h.tap / 0.5 : 1 - (h.tap - 0.5) / 0.5;
    return Math.round(7 * u);
  }

  function pick(x: number, y: number) {
    let best: Heart | null = null;
    let bestDist = Infinity;
    for (const h of hearts) {
      const d = Math.hypot(x - h.x, y - h.y);
      if (d < h.radius * 1.25 && d < bestDist) { bestDist = d; best = h; }
    }
    return best;
  }

  /** Start dragging the heart under (x, y), if there is one. */
  function grab(x: number, y: number, now: number) {
    const heart = pick(x, y);
    if (!heart) return false;
    heart.held = true;
    heart.vx = 0;
    heart.vy = 0;
    grabbed = { heart, dx: heart.x - x, dy: heart.y - y, startX: x, startY: y, startedAt: now, moved: 0 };
    trail = [{ x, y, t: now }];
    return true;
  }

  function drag(x: number, y: number, now: number) {
    if (!grabbed) return;
    const { heart } = grabbed;
    const ox = heart.x;
    const oy = heart.y;
    heart.x += (x + grabbed.dx - heart.x) * 0.6;
    heart.y += (y + grabbed.dy - heart.y) * 0.6;
    heart.moved = Math.max(heart.moved, Math.hypot(heart.x - ox, heart.y - oy));
    grabbed.moved = Math.max(grabbed.moved, Math.hypot(x - grabbed.startX, y - grabbed.startY));
    trail.push({ x, y, t: now });
    while (trail.length > 2 && now - trail[0]!.t > 90) trail.shift();
  }

  function release(now: number) {
    if (!grabbed) return;
    const { heart } = grabbed;
    const tap = grabbed.moved < 8 && now - grabbed.startedAt < 500;
    grabbed = null;
    heart.held = false;
    const a = trail[0]!;
    const z = trail[trail.length - 1]!;
    const span = Math.max(16, z.t - a.t);
    let vx = ((z.x - a.x) / span) * 16.667;
    let vy = ((z.y - a.y) / span) * 16.667;
    const speed = Math.hypot(vx, vy);
    const cap = 38;
    if (speed > cap) { vx *= cap / speed; vy *= cap / speed; }
    trail = [];
    if (tap) {
      heart.vx = 0;
      heart.vy = 0;
      heart.spin += (Math.random() - 0.5) * 0.05;
      return;
    }
    heart.vx = vx;
    heart.vy = vy;
    heart.squashVelocity += 0.05;
    heart.spin += vx * 0.004;
  }

  return {
    hearts,
    resize,
    step,
    pick,
    grab,
    drag,
    release,
    frameOf,
    get cols() { return cols; },
    get rows() { return rows; },
    get cell() { return cell; },
    get wake() { return wake; },
    get halo() { return halo; },
    get dragging() { return grabbed !== null; },
  };
}
