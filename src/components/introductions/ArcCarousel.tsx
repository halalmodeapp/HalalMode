import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

import { ChosenSparkles } from '@/components/introductions/ChosenSparkles';
import { ShineWipe } from '@/components/introductions/ShineWipe';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { computeArcLayout as computeArcLayoutCore } from '@/lib/arcLayout';
import { alpha, color, motion } from '@/theme/tokens';
import type { Introduction } from '@/types';

const ARC_BUTTON = 52;

export interface ArcSlot {
  introduction: Introduction;
  x: number;
  y: number;
  /** Radians. Faces rotate with the arc; the frame counter-rotates. */
  angle: number;
  scale: number;
  opacity: number;
  zIndex: number;
  isActive: boolean;
  size: number;
}

/**
 * Lays the live introductions out along a shallow arc beneath the hero card,
 * or — once the set is larger than five — across two centred rows.
 *
 * This is the geometry from the reference prototype, extracted so it can be
 * unit-tested and reused by the Premium layout without duplication.
 */
export function computeArcLayout(
  live: Introduction[],
  activeId: string
): { slots: ArcSlot[]; isGrid: boolean; stripHeight: number } {
  return computeArcLayoutCore(live, activeId);
}


export interface ArcCarouselProps {
  live: Introduction[];
  activeId: string;
  /** Introductions the member has shown interest in; these wear the gold ring. */
  selectedIds: string[];
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

export function ArcCarousel({
  live,
  activeId,
  selectedIds,
  onSelect,
  onOpen,
}: ArcCarouselProps) {
  const reducedMotion = useReducedMotion();
  const { slots, isGrid, stripHeight } = useMemo(
    () => computeArcLayout(live, activeId),
    [live, activeId]
  );

  const baseTop = isGrid ? slots[0]?.size ?? ARC_BUTTON : ARC_BUTTON * 0.62;
  const top = baseTop + (isGrid ? 30 : 9);

  return (
    <View style={[styles.strip, { height: stripHeight }]}>
      {slots.map((slot) => (
        <ArcFace
          key={slot.introduction.id}
          slot={slot}
          top={top}
          chosen={selectedIds.includes(slot.introduction.id)}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
          onOpen={onOpen}
        />
      ))}
    </View>
  );
}

interface ArcFaceProps {
  slot: ArcSlot;
  top: number;
  chosen: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

const ArcFace = memo(function ArcFace({
  slot,
  top,
  chosen,
  reducedMotion,
  onSelect,
  onOpen,
}: ArcFaceProps) {
  const { t } = useI18n();
  const { introduction, isActive, size } = slot;
  const photo = introduction.profile.photos[0];

  const x = useDerivedValue(
    () => reducedMotion ? slot.x : withSpring(slot.x, motion.arc),
    [reducedMotion, slot.x]
  );
  const y = useDerivedValue(
    () => reducedMotion ? slot.y : withSpring(slot.y, motion.arc),
    [reducedMotion, slot.y]
  );
  const scale = useDerivedValue(
    () => reducedMotion ? slot.scale : withSpring(slot.scale, motion.arc),
    [reducedMotion, slot.scale]
  );
  const rotate = useDerivedValue(
    () => reducedMotion ? slot.angle : withSpring(slot.angle, motion.arc),
    [reducedMotion, slot.angle]
  );

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotateZ: `${rotate.value}rad` },
      { scale: scale.value },
    ],
  }));

  const frameStyle = useAnimatedStyle(() => ({
    // Counter-rotate so the face stays upright while its slot swings.
    transform: [{ rotateZ: `${-rotate.value}rad` }],
  }));

  const handlePress = () => {
    if (isActive) onOpen(introduction.id);
    else onSelect(introduction.id);
  };

  return (
    <Animated.View
      style={[
        styles.slot,
        {
          top,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          opacity: slot.opacity,
          zIndex: slot.zIndex,
        },
        wrapStyle,
      ]}
      pointerEvents={slot.opacity < 0.2 ? 'none' : 'auto'}
    >
      <Animated.View style={[styles.frameWrap, frameStyle]}>
        {chosen ? (
          <ChosenSparkles
            size={size}
            seed={introduction.id}
            reducedMotion={reducedMotion}
          />
        ) : null}

        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={
            isActive
              ? t('daily.openProfileA11y', { name: introduction.profile.firstName })
              : t('daily.centerProfileA11y', { name: introduction.profile.firstName })
          }
          onPress={handlePress}
          style={[
            styles.frame,
            isActive ? styles.frameActive : styles.frameIdle,
            chosen && styles.frameChosen,
          ]}
        >
          <Image
            source={photo}
            style={styles.photo}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
          {/* Idle faces desaturate so the centred one owns the eye. */}
          {!isActive ? <View style={styles.desaturate} /> : null}

          {/* Inside the frame, so the band clips to the circle. */}
          {chosen ? (
            <ShineWipe size={size} reducedMotion={reducedMotion} />
          ) : null}
        </Pressable>

      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  /**
   * Visible, not hidden: the pop burst and the chosen-one sparkles both radiate
   * past the strip's bounds, and clipping them cuts the effect in half. Faces
   * far along the arc fade to zero opacity anyway, so nothing spills.
   */
  strip: { position: 'relative', overflow: 'visible', marginTop: 2 },
  slot: { position: 'absolute', left: '50%' },
  frameWrap: { width: '100%', height: '100%' },
  frame: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: color.sandDeep,
  },
  frameIdle: { borderWidth: 1, borderColor: alpha.lineStrong },
  frameActive: {
    borderWidth: 2,
    borderColor: color.ink,
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  frameChosen: {
    borderWidth: 2,
    borderColor: 'rgba(197,160,84,0.9)',
    shadowColor: '#C5A054',
    shadowOpacity: 0.75,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  photo: { width: '100%', height: '100%' },
  /**
   * RN has no `filter: saturate()`, so a warm scrim stands in. It reads the same
   * at this size: the idle faces recede without going grey and lifeless.
   */
  desaturate: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(239,238,235,0.42)',
  },
});
