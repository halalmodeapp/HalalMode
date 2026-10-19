import { Asset } from 'expo-asset';
import { useEffect, useMemo, useRef, useState } from 'react';

import '../../../site/scene.css';
import { COUPLE_SCENE_ASSETS } from './coupleLayerAssets';
import { COUPLE_SCENE_LAYERS } from './coupleSceneLayers';
import { COUPLE_SCENE_MARKUP } from './coupleSceneMarkup';
import { rubberBandOffset } from './coverMotion';

type CoupleCoverSceneProps = {
  width: number;
  height: number;
  active: boolean;
};

/**
 * The waitlist page's cover, adapted to the sign-up screen. There is one
 * scene: its markup (generated into coupleSceneMarkup.ts by
 * scripts/build-couple-scene.py), its styles (site/scene.css: camera, light,
 * dust motes, heart float) and its breeze (site/scene-warp.js) all come from
 * halalmo.de. This component only supplies the bundled image URLs, sizes the
 * scene to its frame, and wires the same hover / tilt parallax and heart drag.
 * The halftone texture (site/halftone-src.js) is shared too. The speech
 * bubbles stay on the waitlist page.
 * `width`/`height` are accepted for parity with the native scene.
 */
export function CoupleCoverScene({ active }: CoupleCoverSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const markup = useMemo(() => COUPLE_SCENE_LAYERS.reduce(
    (html, layer) => html.split(`/img/scene/${layer.file}`).join(Asset.fromModule(COUPLE_SCENE_ASSETS[layer.key]).uri),
    COUPLE_SCENE_MARKUP,
  ), []);
  const motionActive = active && pageVisible && !reducedMotion;
  const lite = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    return Boolean(nav.connection?.saveData) || (nav.hardwareConcurrency || 8) <= 2 || (nav.deviceMemory || 8) <= 2;
  }, []);

  // The shared styles read these flags from the document, as on the site.
  useEffect(() => {
    const root = document.documentElement;
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setPageVisible(!document.hidden);
      setReducedMotion(motionQuery?.matches ?? false);
      root.dataset.pageHidden = String(document.hidden);
    };
    sync();
    if (lite) root.dataset.sceneLite = '';
    document.addEventListener('visibilitychange', sync);
    motionQuery?.addEventListener('change', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      motionQuery?.removeEventListener('change', sync);
      delete root.dataset.pageHidden;
      delete root.dataset.sceneLite;
    };
  }, [lite]);

  // The breeze: the waitlist page's puppet warp, started on this scene.
  useEffect(() => {
    const host = sceneRef.current;
    if (!host || !motionActive || lite) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    void import('../../../site/scene-warp.js').then(({ startSceneWarp }) => {
      if (!cancelled) stop = startSceneWarp(host);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [motionActive, lite]);

  // The waitlist page's halftone texture (site/halftone-src.js), same settings.
  useEffect(() => {
    const host = sceneRef.current;
    if (!host || !active) return;
    let halftone: { stop(): void } | null = null;
    let cancelled = false;
    void import('../../../site/halftone-src.js').then(({ startHalftone }) => {
      if (!cancelled) halftone = startHalftone(host, { still: lite || reducedMotion });
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      halftone?.stop();
    };
  }, [active, lite, reducedMotion]);

  // Drag the heart; it springs back when let go.
  useEffect(() => {
    const host = sceneRef.current;
    const handle = host?.querySelector<HTMLElement>('[data-heart-drag]');
    const offset = handle?.querySelector<HTMLElement>('.scene-heart-offset');
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
      offset.style.transition = '';
      offset.style.transform = moved ? 'translate3d(0,0,0)' : 'scale(.97)';
      if (!moved) {
        window.setTimeout(() => {
          if (handle.dataset.dragging !== 'true') offset.style.transform = '';
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

  // Hover or device tilt only writes --px/--py; each layer moves by its depth.
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

  return (
    <div
      ref={sceneRef}
      id="cover-couple"
      data-app=""
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden', isolation: 'isolate', background: '#2F6BD8',
        pointerEvents: 'none', touchAction: 'pan-y', contain: 'strict', containerType: 'size',
        ['--px' as string]: 0, ['--py' as string]: 0, ['--sy' as string]: 0,
      }}
    >
      <div className="scene-world" dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
