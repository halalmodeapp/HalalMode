import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { color, layout, radius } from '@/theme/tokens';
import type { Profile } from '@/types';

/** How long the whole reveal takes, start to finish. */
const ENTER_MS = 650;
const HOLD_MS = 900;
const SPREAD_MS = 750;

/**
 * The first look at a new set: every card at once, small and fanned like a
 * hand of cards, before they spread out into the deck. It says "you have five
 * people to look through" before the browsing starts.
 *
 * Plays once per set and then removes itself; the deck underneath is the real
 * interface and is waiting, already in place, when this ends.
 */
export function FanReveal({
  profiles,
  activeIndex,
  onDone,
}: {
  profiles: Profile[];
  activeIndex: number;
  onDone: () => void;
}) {
  const window = useWindowDimensions();
  const width = Platform.OS === 'web' ? Math.min(window.width, layout.maxContentWidth) : window.width;
  const cardWidth = width * 0.36;
  // How much the front card has to grow to become the full-size deck card.
  const growTo = (width - 60) / cardWidth;

  const enter = useSharedValue(0);
  const spread = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
    spread.value = withDelay(
      ENTER_MS + HOLD_MS,
      withTiming(1, { duration: SPREAD_MS, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
  }, [enter, spread, onDone]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: 1 - spread.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
      <View style={styles.centre}>
        {profiles.map((profile, index) => (
          <FanCard
            key={profile.id}
            profile={profile}
            offset={circularOffset(index, activeIndex, profiles.length)}
            cardWidth={cardWidth}
            spreadDistance={width * 0.62}
            growTo={growTo}
            enter={enter}
            spread={spread}
          />
        ))}
      </View>
    </View>
  );
}

/** Where a card sits relative to the lead card, wrapping round: -2..2 for five. */
function circularOffset(index: number, activeIndex: number, count: number): number {
  const half = Math.floor(count / 2);
  return ((index - activeIndex + count + half) % count) - half;
}

function FanCard({
  profile,
  offset,
  cardWidth,
  spreadDistance,
  growTo,
  enter,
  spread,
}: {
  profile: Profile;
  /** Position relative to the card that ends up in front. */
  offset: number;
  cardWidth: number;
  spreadDistance: number;
  growTo: number;
  enter: SharedValue<number>;
  spread: SharedValue<number>;
}) {
  // The lead card sits in the middle of the hand, on top.
  const fanPosition = offset;
  const isFront = offset === 0;

  const style = useAnimatedStyle(() => {
    // Each card arrives a beat after the one before.
    const stagger = Math.min(1, Math.max(0, enter.value * 1.6 - Math.abs(offset) * 0.15));
    const fanX = fanPosition * cardWidth * 0.32;
    const fanY = Math.abs(fanPosition) * 10;
    const fanAngle = fanPosition * 7;

    const s = spread.value;
    const outX = isFront ? 0 : Math.sign(offset) * spreadDistance * (0.75 + Math.abs(offset) * 0.25);
    const x = fanX + (outX - fanX) * s;
    const y = (fanY - 20 * (1 - stagger)) * (1 - s);
    const angle = fanAngle * (1 - s);
    const scale = (0.85 + 0.15 * stagger) * (1 + (isFront ? growTo - 1 : 0.6) * s);

    return {
      opacity: stagger * (isFront ? 1 - Math.max(0, s - 0.85) / 0.15 : 1 - s * 0.9),
      zIndex: isFront ? 100 : 50 - Math.abs(offset),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotateZ: `${angle}deg` },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.card,
        { width: cardWidth, height: cardWidth * (4 / 3), marginLeft: -cardWidth / 2, marginTop: -cardWidth * (2 / 3) },
        style,
      ]}
    >
      <Image
        source={profile.photos[0]}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: color.sand },
  centre: { position: 'absolute', left: '50%', top: '45%' },
  card: {
    position: 'absolute',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.sandDeep,
    borderWidth: 2,
    borderColor: color.white,
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
