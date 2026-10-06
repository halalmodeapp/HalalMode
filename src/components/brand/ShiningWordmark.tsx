import { useEffect, useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Wordmark, type WordmarkProps } from '@/components/brand/Wordmark';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The wordmark with the waitlist page's liquid-chrome shine as a small
 * surprise: tap it and the chrome fades in, holds for a second, and fades out.
 *
 * Web only, using the same Paper Design shader, edge map and settings as
 * halalmo.de, masked to the logo's shape. On the phone apps, and for anyone
 * who prefers reduced motion, it is the plain wordmark.
 */
export function ShiningWordmark(props: WordmarkProps) {
  const reducedMotion = useReducedMotion();
  const host = useRef<View>(null);
  const shine = useRef<(() => void) | null>(null);
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
      const image = new Image();
      image.src = '/logo-liquid-metal-map.png';
      await image.decode().catch(() => undefined);
      if (disposed || !image.complete || !image.naturalWidth) return;

      // A layer the size of the logo, cut to its letters by a mask.
      const layer = document.createElement('div');
      Object.assign(layer.style, {
        position: 'absolute', inset: '0', pointerEvents: 'none', opacity: '0', overflow: 'hidden',
        transition: 'opacity .7s ease',
        maskImage: "url('/logo.svg')", maskSize: '100% 100%', maskRepeat: 'no-repeat', maskPosition: 'center',
        webkitMaskImage: "url('/logo.svg')", webkitMaskSize: '100% 100%', webkitMaskRepeat: 'no-repeat', webkitMaskPosition: 'center',
      } as Partial<CSSStyleDeclaration>);
      const mount = document.createElement('div');
      Object.assign(mount.style, { position: 'absolute', inset: '-15.8%' });
      layer.appendChild(mount);
      element.appendChild(layer);

      let shader: { setSpeed: (speed: number) => void; dispose: () => void };
      try {
        shader = new ShaderMount(mount, liquidMetalFragmentShader, {
          u_image: image,
          u_isImage: true,
          u_imageAspectRatio: 988.77 / 139.6,
          u_shape: LiquidMetalShapes.diamond,
          u_colorBack: getShaderColorFromString('#aaaaac'),
          u_colorTint: getShaderColorFromString('#ffffff'),
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
      shine.current = () => {
        timers.splice(0).forEach(clearTimeout);
        shader.setSpeed(1);
        layer.style.transitionDuration = '.15s';
        layer.style.opacity = '1';
        // Hold for a second, then fade out, then stop drawing.
        timers.push(setTimeout(() => {
          layer.style.transitionDuration = '.7s';
          layer.style.opacity = '0';
          timers.push(setTimeout(() => shader.setSpeed(0), 750));
        }, 1000));
      };
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
    <Pressable onPress={() => shine.current?.()} accessibilityRole="image" accessibilityLabel="Halal Mode">
      <View ref={host} style={{ position: 'relative' }}>
        <Wordmark {...props} />
      </View>
    </Pressable>
  );
}
