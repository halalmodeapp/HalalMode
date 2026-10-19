import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { RC_ROOM } from '@/halalCards/relationshipChallengeClaude/scene';
import type { RcTimeOfDay } from '@/halalCards/relationshipChallengeClaude/types';

/**
 * Atmosphere, drawn in code so it stays adjustable and never gets baked into
 * the art: a window shaft, a lamp pool at night, a light evening grade and a
 * handful of dust motes. Everything is low opacity, sits under the hotspots
 * and the UI, and holds still when reduced motion is on.
 */

/** Capped for mid-range phones. */
const MOTES = 7;

function Breathing({ children, still, period }: { children: React.ReactNode; still: boolean; period: number }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (still) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(withTiming(0.72, { duration: period, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) })),
      -1
    );
  }, [opacity, period, still]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">{children}</Animated.View>;
}

function Mote({ x, y, delay, scale }: { x: number; y: number; delay: number; scale: number }) {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withDelay(delay, withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [delay, drift]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -24 * scale * drift.value }, { translateX: 10 * scale * drift.value }],
    opacity: 0.25 + 0.35 * drift.value,
  }));
  return <Animated.View pointerEvents="none" style={[styles.mote, { left: x * scale, top: y * scale }, style]} />;
}

export function RoomEffects({ timeOfDay, scale, still }: { timeOfDay: RcTimeOfDay; scale: number; still: boolean }) {
  const night = timeOfDay === 'night';
  const motes = useMemo(
    () => Array.from({ length: MOTES }, (_, i) => ({ x: 380 + ((i * 97) % 300), y: 450 + ((i * 173) % 520), delay: i * 1100 })),
    []
  );
  const viewBox = `0 0 ${RC_ROOM.width} ${RC_ROOM.height}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {night ? (
        <Svg width="100%" height="100%" viewBox={viewBox} style={StyleSheet.absoluteFill}>
          {/* A light evening grade over the shared, un-tinted props. */}
          <Rect x={0} y={0} width={RC_ROOM.width} height={RC_ROOM.height} fill="#0E1838" opacity={0.16} />
        </Svg>
      ) : null}
      <Breathing still={still} period={night ? 5200 : 4200}>
        <Svg width="100%" height="100%" viewBox={viewBox}>
          <Defs>
            <LinearGradient id="rcShaft" x1="0" y1="0" x2="0.3" y2="1">
              <Stop offset="0" stopColor={night ? '#BFD3FF' : '#FFF1CC'} stopOpacity={night ? 0.2 : 0.38} />
              <Stop offset="1" stopColor={night ? '#BFD3FF' : '#FFF1CC'} stopOpacity={0} />
            </LinearGradient>
            <RadialGradient id="rcLamp" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#FFC867" stopOpacity={0.42} />
              <Stop offset="1" stopColor="#FFC867" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Polygon points={night ? '380,360 620,360 770,1060 480,1060' : '360,360 640,360 840,1110 470,1110'} fill="url(#rcShaft)" />
          {night ? <Circle cx={95} cy={1060} r={210} fill="url(#rcLamp)" /> : null}
        </Svg>
      </Breathing>
      {night && !still ? motes.map((mote, i) => <Mote key={i} {...mote} scale={scale} />) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mote: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF6E2' },
});
