import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text as RNText, View, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { ILLUSTRATIONS, THUMBNAILS } from '@/halalCards/illustrations';
import { coverCropPosition } from '@/halalCards/imageCrop';
import type { ImageSlot } from '@/halalCards/types';
import { useI18n } from '@/i18n';
import { color, font, radius, space } from '@/theme/tokens';

/**
 * An illustration slot: the generated picture registered in
 * `illustrations.ts`, or a drawn placeholder in the same palette for a slot
 * still waiting for one. Nothing is fetched from the network.
 *
 * Text laid over a picture always sits on a dark gradient, in light ink with a
 * soft shadow, so it stays readable whatever the picture behind it.
 */
export function Illustration({
  image,
  aspectRatio = 4 / 5,
  style,
  rounded = true,
  thumb = false,
  cropZoom,
  tint,
  children,
}: {
  image: ImageSlot;
  aspectRatio?: number;
  style?: ViewStyle;
  rounded?: boolean;
  /** Use the small version, for list tiles. */
  thumb?: boolean;
  /** Extra crop for a small, wide preview where faces should read first. */
  cropZoom?: number;
  /** A colour wash over the picture, for section title cards. */
  tint?: string;
  /** Laid over the bottom of the picture, on a readable scrim. */
  children?: ReactNode;
}) {
  // A thumbnail that fails to load (say, a dev server started before it
  // existed) falls back to the full picture rather than leaving a blank tile.
  const [thumbFailed, setThumbFailed] = useState(false);
  const small = thumb && !thumbFailed ? THUMBNAILS[image.id] : undefined;
  const source = small ?? ILLUSTRATIONS[image.id];
  // Covers are portrait artwork, but the catalogue also shows them in wide
  // tiles. Keep the upper-middle band in view so faces remain the focal point
  // instead of letting object-fit crop around the mathematical centre.
  const contentPosition = image.role === 'cover'
    ? coverCropPosition(aspectRatio, image.focalY)
    : undefined;
  const effectiveZoom = Math.max(
    1,
    cropZoom ?? (thumb && image.role === 'cover' && aspectRatio > 0.84 ? 1.08 : 1),
  );
  const mediaStyle = [
    StyleSheet.absoluteFill,
    effectiveZoom > 1 ? { transform: [{ scale: effectiveZoom }] } : null,
  ] as ImageStyle;

  return (
    <View
      style={[styles.frame, rounded && styles.rounded, { aspectRatio }, style]}
      accessible={!children}
      accessibilityRole="image"
      accessibilityLabel={image.alt}
    >
      <LinearGradient
        colors={[color.sandLight, color.clay, '#E4DCCB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {source ? (
        <Image
          source={source}
          style={mediaStyle}
          contentFit="cover"
          contentPosition={contentPosition}
          transition={200}
          onError={small ? () => setThumbFailed(true) : undefined}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      {tint ? <View style={[StyleSheet.absoluteFill, styles.tint, { backgroundColor: tint }]} /> : null}
      {children ? (
        <>
          <LinearGradient
            colors={['rgba(10,10,10,0)', 'rgba(10,10,10,0.58)', 'rgba(10,10,10,0.9)']}
            locations={[0, 0.42, 1]}
            style={styles.scrim}
          />
          <View style={styles.overlay}>{children}</View>
        </>
      ) : null}
    </View>
  );
}

/** Light, shadowed type for use on top of an Illustration. */
export function OverlayText({
  kind,
  children,
  numberOfLines,
}: {
  kind: 'eyebrow' | 'title' | 'titleLarge' | 'body';
  children: ReactNode;
  numberOfLines?: number;
}) {
  const { isRTL } = useI18n();
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[overlayText.shadow, overlayText[kind], isRTL && overlayText.rtl]}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden', backgroundColor: color.clay, justifyContent: 'flex-end' },
  rounded: { borderRadius: radius.lg },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '78%', pointerEvents: 'none' },
  overlay: { padding: space.lg, gap: 4 },
  // Multiply keeps the drawing's lines and shading under the colour.
  tint: { opacity: 0.62, mixBlendMode: 'multiply', pointerEvents: 'none' },
});

const overlayText = StyleSheet.create<Record<string, TextStyle>>({
  // The web renderer wants one CSS shorthand; phones want the three props.
  shadow:
    Platform.OS === 'web'
      ? ({ textShadow: '0px 1px 8px rgba(0,0,0,0.55)' } as TextStyle)
      : { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  rtl: { fontFamily: font.arabic, letterSpacing: 0, textTransform: 'none', textAlign: 'right', writingDirection: 'rtl' },
  eyebrow: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.goldOnDark,
  },
  title: { fontFamily: font.display, fontSize: 21, lineHeight: 26, color: color.white },
  titleLarge: { fontFamily: font.display, fontSize: 30, lineHeight: 35, color: color.white, letterSpacing: -0.3 },
  body: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: 'rgba(252,252,251,0.92)' },
});
