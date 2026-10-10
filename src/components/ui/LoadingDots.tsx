import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color } from '@/theme/tokens';

/** Three small dots that rise and fade in turn: something is on its way. */
export function LoadingDots({ tint = color.gold }: { tint?: string }) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((index) => <Dot key={index} delay={index * 160} tint={tint} />)}
    </View>
  );
}

function Dot({ delay, tint }: { delay: number; tint: string }) {
  const reducedMotion = useReducedMotion();
  const phase = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    phase.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 360 }), withTiming(0, { duration: 360 })), -1),
    );
  }, [delay, phase, reducedMotion]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + phase.value * 0.65,
    transform: [{ translateY: -phase.value * 3 }],
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: tint }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
