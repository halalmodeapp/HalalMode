import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { HALFTONE, halftonePaths } from './halftoneDots';
import type { CoupleCamera } from './coupleSceneLayout';

/**
 * Halftone dots laid over the couple cover. They stay put on the screen while
 * the picture moves underneath, and are re-rolled a few times a second (still
 * when `active` is off, for reduced motion and background screens).
 */
export function CoupleHalftone({ width, height, camera, active }: {
  width: number;
  height: number;
  camera: CoupleCamera;
  active: boolean;
}) {
  const cyanRef = useRef<Path>(null);
  const magentaRef = useRef<Path>(null);
  const cache = useRef(new Map<number, { cyan: string; magenta: string }>());
  const key = `${width}x${height}@${camera.unit.toFixed(4)}`;
  const lastKey = useRef(key);
  if (lastKey.current !== key) {
    lastKey.current = key;
    cache.current.clear();
  }
  const drawing = (index: number) => {
    let paths = cache.current.get(index);
    if (!paths) {
      paths = halftonePaths(width, height, camera, index);
      cache.current.set(index, paths);
    }
    return paths;
  };
  const resting = useMemo(() => drawing(0), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) return;
    let index = 0;
    const timer = setInterval(() => {
      index = (index + 1) % HALFTONE.drawings;
      const next = drawing(index);
      cyanRef.current?.setNativeProps({ d: next.cyan });
      magentaRef.current?.setNativeProps({ d: next.magenta });
    }, 1000 / HALFTONE.fps);
    return () => clearInterval(timer);
  }, [active, key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (width <= 0 || height <= 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path ref={cyanRef} d={resting.cyan} fill={HALFTONE.cyan} fillOpacity={HALFTONE.opacity} />
        <Path ref={magentaRef} d={resting.magenta} fill={HALFTONE.magenta} fillOpacity={HALFTONE.opacity} />
      </Svg>
    </View>
  );
}
