import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { color, font } from '@/theme/tokens';

const SPARKLE_COUNT = 16;

/**
 * Deterministic pseudo-random field.
 *
 * Computed once at module scope from a fixed seed, so the arrangement is stable
 * across re-renders but has none of the regularity of an evenly divided ring,
 * which is what made an earlier version read as a rotating spiral.
 *
 * The sparkle positions stay crisp. Keeping the decoration sharp avoids a
 * progressive blur around selected portraits.
 */
interface SparkleField {
  angle: number;
  reach: number;
  innerReach: number;
  fontSize: number;
  delay: number;
  duration: number;
}

function seedFrom(value: string): number {
  let hash = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x85ebca6b);
  }
  return hash | 0;
}

function createSparkleField(identity: string): SparkleField[] {
  let seed = seedFrom(identity);
  const next = () => {
    // xorshift, cheap, and repeatable so the layout never jumps.
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return Math.abs(seed % 10000) / 10000;
  };

  return Array.from({ length: SPARKLE_COUNT }, () => {
    const depthScale = 0.6 + next() * 0.9;

    return {
      angle: next() * Math.PI * 2,
      reach: 0.55 + next() * 0.75,
      innerReach: 0.1 + next() * 0.3,
      fontSize: (7 + next() * 10) * depthScale,
      delay: next() * 3200,
      duration: 1300 + next() * 1600,
    };
  });
}

export function ChosenSparkles({
  size,
  seed,
  reducedMotion,
}: {
  size: number;
  seed: string;
  reducedMotion: boolean;
}) {
  // Well clear of the frame, they radiate outward into the screen rather than
  // hugging the portrait. The strip is `overflow: visible` to allow it.
  const radius = size * 1.35;
  const sparkles = useMemo(() => createSparkleField(seed), [seed]);
  const visibleSparkles = reducedMotion ? sparkles.slice(0, 6) : sparkles;

  return (
    <>
      {visibleSparkles.map((sparkle, index) => (
        <Sparkle
          key={index}
          {...sparkle}
          radius={radius}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  );
}

interface SparkleProps {
  angle: number;
  reach: number;
  innerReach: number;
  fontSize: number;
  delay: number;
  duration: number;
  radius: number;
  reducedMotion: boolean;
}

function Sparkle({
  angle,
  reach,
  innerReach,
  fontSize,
  delay,
  duration,
  radius,
  reducedMotion,
}: SparkleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 0.3;
      return;
    }
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
  }, [delay, duration, progress, reducedMotion]);

  const startX = Math.cos(angle) * radius * innerReach;
  const startY = Math.sin(angle) * radius * innerReach;
  const endX = Math.cos(angle) * radius * reach;
  const endY = Math.sin(angle) * radius * reach;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // Fade up fast, fade out slow, a twinkle, not a blink.
    const envelope = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7;

    return {
      opacity: envelope,
      transform: [
        // Straight radial travel. No rotation, any spin at all reads as a
        // spiral once a dozen of these are moving at once.
        { translateX: startX + (endX - startX) * p },
        { translateY: startY + (endY - startY) * p },
        { scale: 0.45 + 0.75 * p },
      ],
    };
  });

  return (
    <Animated.Text
      pointerEvents="none"
      allowFontScaling={false}
      style={[
        styles.sparkle,
        {
          fontSize,
          lineHeight: fontSize * 1.15,
          marginLeft: -fontSize / 2,
          marginTop: -fontSize * 0.58,
          width: fontSize,
          color: color.goldGlow,
        },
        style,
      ]}
    >
      ✦
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  sparkle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    fontFamily: font.body,
    textAlign: 'center',
  },
});
