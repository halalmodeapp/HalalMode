import { Asset } from 'expo-asset';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { COUPLE_SCENE_ASSETS } from './coupleLayerAssets';
import { COUPLE_SCENE_LAYERS, COUPLE_SUN, COUPLE_WORLD, type CoupleSceneLayer } from './coupleSceneLayers';
import { COUPLE_PARALLAX, coupleCameraCss } from './coupleSceneLayout';
import { rubberBandOffset } from './coverMotion';

type CoupleCoverSceneProps = {
  width: number;
  height: number;
  active: boolean;
};

const MOTES = [[880, 330, 0, 19], [1010, 290, -4, 23], [1190, 360, -9, 19], [940, 210, -13, 26], [1260, 250, -6, 21], [1080, 400, -16, 24], [800, 250, -11, 28]] as const;

// Same light and motes as the landing page (site/index.html), scoped to this scene.
const SCENE_CSS = `
.hm-couple-rays{position:absolute;border-radius:50%;mix-blend-mode:screen;pointer-events:none;opacity:.5;
background:conic-gradient(from 180deg,rgba(255,244,214,0) 0deg,rgba(255,244,214,.34) 9deg,rgba(255,244,214,0) 17deg,rgba(255,244,214,0) 26deg,rgba(255,244,214,.26) 31deg,rgba(255,244,214,0) 37deg,rgba(255,244,214,0) 49deg,rgba(255,244,214,.38) 58deg,rgba(255,244,214,0) 69deg,rgba(255,244,214,0) 80deg,rgba(255,244,214,.22) 85deg,rgba(255,244,214,0) 92deg,rgba(255,244,214,0) 360deg);
-webkit-mask:radial-gradient(closest-side,#000 6%,rgba(0,0,0,.5) 42%,transparent 92%);mask:radial-gradient(closest-side,#000 6%,rgba(0,0,0,.5) 42%,transparent 92%);
animation:hm-couple-rays 48s ease-in-out infinite alternate}
.hm-couple-glow{position:absolute;border-radius:50%;mix-blend-mode:screen;pointer-events:none;
background:radial-gradient(closest-side,rgba(255,247,222,.62),rgba(255,238,196,.3) 38%,rgba(255,226,160,.1) 66%,rgba(255,226,160,0))}
.hm-couple-mote{position:absolute;border-radius:50%;opacity:0;background:radial-gradient(closest-side,rgba(255,250,232,.95),rgba(255,240,200,0));animation:hm-couple-mote 19s linear infinite}
.hm-couple-scene[data-still] .hm-couple-rays{animation:none}
.hm-couple-scene[data-still] .hm-couple-mote{display:none}
@keyframes hm-couple-rays{from{transform:rotate(-1.4deg)}to{transform:rotate(1.4deg)}}
@keyframes hm-couple-mote{0%{opacity:0;transform:translate3d(0,0,0)}18%{opacity:.75}70%{opacity:.5}100%{opacity:0;transform:translate3d(var(--mx),var(--my),0)}}
@media(prefers-reduced-motion:reduce){.hm-couple-rays{animation:none}.hm-couple-mote{display:none}}
`;

const CAMERA = coupleCameraCss();

/**
 * Web companion to the native cover. The shared world camera is expressed in
 * CSS container units, so the server-rendered page is framed correctly before
 * hydration and resizes need no React work; hover or device tilt only writes
 * --px/--py on the scene, and each layer turns that into its own offset.
 * `width`/`height` are accepted for parity with the native scene.
 */
export function CoupleCoverScene({ active }: CoupleCoverSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const heartHandleRef = useRef<HTMLDivElement>(null);
  const heartOffsetRef = useRef<HTMLDivElement>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const uris = useMemo(() => Object.fromEntries(
    COUPLE_SCENE_LAYERS.map((layer) => [layer.key, Asset.fromModule(COUPLE_SCENE_ASSETS[layer.key]).uri]),
  ) as Record<CoupleSceneLayer['key'], string>, []);
  const motionActive = active && pageVisible && !reducedMotion;
  const lite = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    return Boolean(nav.connection?.saveData) || (nav.hardwareConcurrency || 8) <= 2 || (nav.deviceMemory || 8) <= 2;
  }, []);

  useEffect(() => {
    if (document.getElementById('hm-couple-scene-css')) return;
    const style = document.createElement('style');
    style.id = 'hm-couple-scene-css';
    style.textContent = SCENE_CSS;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setPageVisible(!document.hidden);
      setReducedMotion(motionQuery?.matches ?? false);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    motionQuery?.addEventListener('change', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      motionQuery?.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    const host = sceneRef.current;
    const handle = heartHandleRef.current;
    const offset = heartOffsetRef.current;
    if (!host || !handle || !offset || !active) return;

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let moved = false;

    const onDown = (event: PointerEvent) => {
      if (pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      moved = false;
      handle.dataset.dragging = 'true';
      offset.style.transition = 'none';
      offset.style.transform = 'translate3d(0,0,0)';
      try { handle.setPointerCapture(event.pointerId); } catch { /* window listeners still track it */ }
      event.preventDefault();
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) > 7 || Math.abs(dy) > 7) moved = true;
      const box = host.getBoundingClientRect();
      offset.style.transform = `translate3d(${rubberBandOffset(dx, box.width * 0.22)}px,${rubberBandOffset(dy, box.height * 0.2)}px,0)`;
      event.preventDefault();
    };
    const finish = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      delete handle.dataset.dragging;
      offset.style.transition = 'transform 520ms cubic-bezier(.22,1,.36,1)';
      offset.style.transform = moved ? 'translate3d(0,0,0)' : 'scale(.97)';
      if (!moved) {
        window.setTimeout(() => {
          if (handle.dataset.dragging !== 'true') offset.style.transform = 'scale(1)';
        }, 110);
      }
    };

    handle.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      handle.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [active]);

  useEffect(() => {
    const host = sceneRef.current;
    if (!host) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let baseGamma: number | null = null;
    let baseBeta: number | null = null;
    let permissionRequested = false;

    const write = () => {
      host.style.setProperty('--px', x.toFixed(4));
      host.style.setProperty('--py', y.toFixed(4));
    };
    const step = () => {
      frame = 0;
      x += (targetX - x) * 0.09;
      y += (targetY - y) * 0.09;
      if (Math.abs(targetX - x) < 0.002 && Math.abs(targetY - y) < 0.002) {
        x = targetX;
        y = targetY;
        write();
        return;
      }
      write();
      frame = window.requestAnimationFrame(step);
    };
    const aim = (nextX: number, nextY: number) => {
      targetX = motionActive ? clamp(nextX, -1, 1) : 0;
      targetY = motionActive ? clamp(nextY, -1, 1) : 0;
      if (!frame) frame = window.requestAnimationFrame(step);
    };
    const inside = (event: PointerEvent, box: DOMRect) =>
      event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    const onMove = (event: PointerEvent) => {
      if (!motionActive || event.pointerType === 'touch') return;
      const box = host.getBoundingClientRect();
      if (!inside(event, box)) {
        aim(0, 0);
        return;
      }
      aim(((event.clientX - box.left) / Math.max(1, box.width) - 0.5) * 2, ((event.clientY - box.top) / Math.max(1, box.height) - 0.5) * 2);
    };
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (!motionActive || event.gamma === null || event.beta === null) return;
      baseGamma ??= event.gamma;
      baseBeta ??= event.beta;
      aim((event.gamma - baseGamma) / 18, (event.beta - baseBeta) / 18);
    };
    const requestOrientationPermission = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || permissionRequested || !inside(event, host.getBoundingClientRect())) return;
      const orientation = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
      if (!orientation || typeof orientation.requestPermission !== 'function') return;
      permissionRequested = true;
      void orientation.requestPermission().catch(() => { permissionRequested = false; });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', requestOrientationPermission, { passive: true });
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    aim(0, 0);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', requestOrientationPermission);
      window.removeEventListener('deviceorientation', onOrientation);
      host.style.setProperty('--px', '0');
      host.style.setProperty('--py', '0');
    };
  }, [motionActive]);

  const box = (x: number, y: number, w: number, h: number): CSSProperties => ({
    position: 'absolute', left: u(x), top: u(y), width: u(w), height: u(h),
  });
  const depthStyle = (depth: number): CSSProperties => ({
    transform: `translate3d(calc(var(--px) * ${depth * COUPLE_PARALLAX.x} * var(--u)),calc(var(--py) * ${depth * COUPLE_PARALLAX.y} * var(--u)),0)`,
    willChange: 'transform',
  });
  const backdrop = COUPLE_SCENE_LAYERS[0]!;
  const sunX = COUPLE_SUN.x - backdrop.x;
  const sunY = COUPLE_SUN.y - backdrop.y;

  return (
    <div
      ref={sceneRef}
      className="hm-couple-scene"
      aria-hidden="true"
      data-still={!motionActive || lite ? '' : undefined}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#2F6BD8', pointerEvents: 'none', touchAction: 'pan-y', contain: 'strict', containerType: 'size', ['--px' as string]: 0, ['--py' as string]: 0 }}
    >
      <div style={{ position: 'absolute', ['--u' as string]: CAMERA.unit, left: CAMERA.left, top: CAMERA.top, width: u(COUPLE_WORLD.width), height: u(COUPLE_WORLD.height) }}>
        {COUPLE_SCENE_LAYERS.map((layer) => (
          <div key={layer.key} style={{ ...box(layer.x, layer.y, layer.width, layer.height), ...depthStyle(layer.depth) }}>
            {layer.key === 'heart' ? (
              <div ref={heartHandleRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', cursor: 'grab', touchAction: 'none' }}>
                <div ref={heartOffsetRef} style={{ position: 'absolute', inset: 0, transition: 'transform 520ms cubic-bezier(.22,1,.36,1)' }}>
                  <img src={uris.heart} alt="" draggable={false} decoding="async" style={imageStyle} />
                </div>
              </div>
            ) : (
              <img src={uris[layer.key]} alt="" draggable={false} decoding="async" style={imageStyle} />
            )}
            {layer.key === 'sky' ? (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div className="hm-couple-rays" style={box(sunX - 760, sunY - 760, 1520, 1520)} />
                <div className="hm-couple-glow" style={box(sunX - 230, sunY - 230, 460, 460)} />
                {MOTES.map(([mx, my, delay, duration]) => (
                  <i
                    key={mx}
                    className="hm-couple-mote"
                    style={{
                      ...box(mx - backdrop.x, my - backdrop.y, 7, 7),
                      animationDelay: `${delay}s`,
                      animationDuration: `${duration}s`,
                      ['--mx' as string]: u(-26),
                      ['--my' as string]: u(-70),
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const imageStyle: CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', userSelect: 'none', pointerEvents: 'none',
};

/** A length of `value` world pixels. */
function u(value: number) {
  return `calc(${value} * var(--u))`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
