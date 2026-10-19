import { Asset } from 'expo-asset';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { COUPLE_HEART_PATH } from '@/components/auth/coupleHeart';
import { Wordmark, type WordmarkProps } from '@/components/brand/Wordmark';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';

// The heart of the wordmark, in the logo's own coordinates, as a mask.
const HEART_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 988.77 139.6"><path d="${COUPLE_HEART_PATH}"/></svg>`,
)}")`;

/**
 * The wordmark with the waitlist page's liquid-chrome heart, behaving as it
 * does on halalmo.de: with a mouse the heart is chrome while the pointer is
 * over the logo; a tap turns it chrome, holds for a second, and fades back.
 *
 * Web only, using the same Paper Design shader, edge map and settings as
 * halalmo.de, masked to the heart in the logo. On the phone apps, and for anyone
 * who prefers reduced motion, it is the plain wordmark.
 */
export function ShiningWordmark(props: WordmarkProps) {
  const { brandName } = useI18n();
  const reducedMotion = useReducedMotion();
  const host = useRef<View>(null);
  const shine = useRef<{ on: () => void; off: (after: number) => void } | null>(null);
  const hovering = useRef(false);
  const web = Platform.OS === 'web' && !reducedMotion;

  useEffect(() => {
    if (!web) return;
    const element = host.current as unknown as HTMLElement | null;
    if (!element || typeof document === 'undefined') return;
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const { ShaderMount, liquidMetalFragmentShader, getShaderColorFromString, LiquidMetalShapes, ShaderFitOptions } =
        await import('@paper-design/shaders');
      // Bundled with the app, so it loads on the dev server as well as live.
      const image = new Image();
      image.src = Asset.fromModule(require('../../../site/logo-liquid-metal-map.png')).uri;
      await image.decode().catch(() => undefined);
      if (disposed || !image.complete || !image.naturalWidth) return;

      // A layer the size of the logo, cut to its heart by a mask.
      const layer = document.createElement('div');
      Object.assign(layer.style, {
        position: 'absolute', inset: '0', pointerEvents: 'none', opacity: '0', overflow: 'hidden', isolation: 'isolate',
        transition: 'opacity .7s ease',
        maskImage: HEART_MASK, maskSize: '100% 100%', maskRepeat: 'no-repeat', maskPosition: 'center',
        webkitMaskImage: HEART_MASK, webkitMaskSize: '100% 100%', webkitMaskRepeat: 'no-repeat', webkitMaskPosition: 'center',
      } as Partial<CSSStyleDeclaration>);
      const mount = document.createElement('div');
      // Lifted so the pink chrome reads light, as on halalmo.de (logo-effect.css).
      Object.assign(mount.style, { position: 'absolute', inset: '-15.8%', filter: 'brightness(1.45) saturate(1.05)' });
      layer.appendChild(mount);
      // Its darkest bands become a deep Halal Pink instead of black.
      const deepen = document.createElement('div');
      Object.assign(deepen.style, { position: 'absolute', inset: '0', background: '#A3164A', mixBlendMode: 'lighten', pointerEvents: 'none' });
      layer.appendChild(deepen);
      element.appendChild(layer);

      let shader: { setSpeed: (speed: number) => void; dispose: () => void };
      try {
        shader = new ShaderMount(mount, liquidMetalFragmentShader, {
          u_image: image,
          u_isImage: true,
          u_imageAspectRatio: 988.77 / 139.6,
          u_shape: LiquidMetalShapes.diamond,
          u_colorBack: getShaderColorFromString('#ffffff'), // white base keeps it light
          u_colorTint: getShaderColorFromString('#FC3C6C'), // Halal Pink chrome
          u_repetition: 2.72,
          u_softness: 1,
          u_shiftRed: 0.3,
          u_shiftBlue: 0.3,
          u_distortion: 0.39,
          u_contour: 1,
          u_angle: 70,
          u_fit: ShaderFitOptions.contain,
          u_scale: 0.76,
          u_rotation: 0,
          u_originX: 0.5,
          u_originY: 0.5,
          u_offsetX: 0,
          u_offsetY: 0,
          u_worldWidth: 0,
          u_worldHeight: 0,
        }, { alpha: false, antialias: false }, 0, 0, 2, 300000);
      } catch {
        layer.remove();
        return;
      }

      const timers: ReturnType<typeof setTimeout>[] = [];
      const on = () => {
        timers.splice(0).forEach(clearTimeout);
        shader.setSpeed(1);
        layer.style.transitionDuration = '.15s';
        layer.style.opacity = '1';
      };
      const off = (after: number) => {
        timers.splice(0).forEach(clearTimeout);
        timers.push(setTimeout(() => {
          layer.style.transitionDuration = '.7s';
          layer.style.opacity = '0';
          timers.push(setTimeout(() => shader.setSpeed(0), 750));
        }, after));
      };
      shine.current = { on, off };
      cleanup = () => {
        timers.forEach(clearTimeout);
        shader.dispose();
        layer.remove();
      };
    })();

    return () => {
      disposed = true;
      shine.current = null;
      cleanup();
    };
  }, [web]);

  if (!web) return <Wordmark {...props} />;
  return (
    <Pressable
      onHoverIn={() => { hovering.current = true; shine.current?.on(); }}
      onHoverOut={() => { hovering.current = false; shine.current?.off(0); }}
      onPress={() => {
        if (hovering.current) return;
        shine.current?.on();
        shine.current?.off(1000);
      }}
      accessibilityRole="image"
      accessibilityLabel={brandName}
    >
      <View ref={host} style={{ position: 'relative' }}>
        <Wordmark {...props} />
      </View>
    </Pressable>
  );
}
