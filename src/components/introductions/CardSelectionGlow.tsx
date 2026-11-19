import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius } from '@/theme/tokens';

/** The card's own 3px gold border sits outside this layer. */
const CARD_BORDER = 3;
const MOTE_COUNT = 18;

interface Mote {
  x: number; // 0..1 across the bottom edge
  size: number;
  rise: number; // share of the card's height it travels
  drift: number; // sideways sway, in px
  delay: number;
  duration: number;
}

function motesFor(identity: string): Mote[] {
  let seed = 0x2545f491;
  for (let i = 0; i < identity.length; i += 1) seed = Math.imul(seed ^ identity.charCodeAt(i), 0x9e3779b1);
  const next = () => {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return Math.abs(seed % 10000) / 10000;
  };
  return Array.from({ length: MOTE_COUNT }, () => ({
    x: 0.04 + next() * 0.92,
    size: 2 + next() * 3.2,
    rise: 0.18 + next() * 0.3,
    drift: (next() - 0.5) * 18,
    delay: next() * 2600,
    duration: 2200 + next() * 1800,
  }));
}

/**
 * The selected deck card: a fine highlight that follows the card's own rounded
 * edge, a gold wash rising from the bottom, and gold motes drifting up out of
 * that wash. Everything is sized from the card itself, so nothing is stretched.
 */
export function CardSelectionGlow({
  identity,
  animate,
}: {
  identity: string;
  /** Motes move only on the card in front, and never with reduced motion. */
  animate: boolean;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const motes = useMemo(() => motesFor(identity), [identity]);
  const inner = radius.hero - CARD_BORDER;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.layer, { borderRadius: inner }]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== box.width || height !== box.height) setBox({ width, height });
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(245,212,141,0)', 'rgba(232,190,112,0.16)', 'rgba(245,212,141,0.5)']}
        locations={[0.5, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />
      {box.height > 0
        ? motes.map((mote, index) => (
            <MoteDot key={index} mote={mote} box={box} animate={animate} />
          ))
        : null}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.edge, { borderRadius: inner }]}
      />
    </View>
  );
}

function MoteDot({
  mote,
  box,
  animate,
}: {
  mote: Mote;
  box: { width: number; height: number };
  animate: boolean;
}) {
  const progress = useSharedValue(animate ? 0 : 0.35);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(progress);
      progress.value = 0.35;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      mote.delay,
      withRepeat(withTiming(1, { duration: mote.duration, easing: Easing.out(Easing.quad) }), -1, false),
    );
    return () => cancelAnimation(progress);
  }, [animate, mote.delay, mote.duration, progress]);

  const rise = box.height * mote.rise;
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p < 0.15 ? p / 0.15 : p > 0.7 ? Math.max(0, (1 - p) / 0.3) : 1,
      transform: [
        { translateY: -rise * p },
        { translateX: Math.sin(p * Math.PI * 1.6) * mote.drift },
        { scale: 1 - p * 0.45 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.mote,
        {
          left: mote.x * box.width - mote.size / 2,
          bottom: 2,
          width: mote.size,
          height: mote.size,
          borderRadius: mote.size / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 3, overflow: 'hidden' },
  edge: { borderWidth: 1.5, borderColor: 'rgba(255,240,195,0.7)' },
  mote: {
    position: 'absolute',
    backgroundColor: '#F7DC9A',
    shadowColor: '#F2C76A',
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
