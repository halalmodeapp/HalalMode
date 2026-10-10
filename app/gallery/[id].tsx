import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionIcon } from '@/components/ui/ActionIcon';
import { Text } from '@/components/ui/Text';
import { SafetyControl } from '@/components/safety/SafetyControl';
import { useI18n } from '@/i18n';
import {
  galleryImagePerformancePolicy,
  galleryListPerformancePolicy,
  galleryRetryKey,
} from '@/lib/galleryPerformancePolicy';
import { getGalleryState, safeGalleryIndex } from '@/lib/galleryState';
import { testIds } from '@/lib/testIds';
import { useRound } from '@/state/round';
import { color, font, layout, radius } from '@/theme/tokens';

export default function GalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { localeTag, isRTL, t } = useI18n();
  const insets = useSafeAreaInsets();
  const { round, refresh, profileOpened, profileClosed } = useRound();
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(0);
  // The app is held to a phone's width on a desktop, so the window is the
  // wrong ruler: sizing each page to it made every photo 1345px wide inside a
  // 560px screen, and only its left edge was ever seen.
  const window = useWindowDimensions();
  const width = Platform.OS === 'web' ? Math.min(window.width, layout.maxContentWidth) : window.width;
  const [stageHeight, setStageHeight] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const frame = photoFrame(width, stageHeight || window.height - 200);
  const introduction = round?.introductions.find((item) => item.id === id);
  const photos = introduction?.profile.photos ?? [];
  const galleryState = getGalleryState(!!introduction, photos.length);
  const safeIndex = safeGalleryIndex(index, photos.length);
  const number = (value: number) => new Intl.NumberFormat(localeTag).format(value);

  // Looking through someone's photos is time spent on them, so it counts under
  // the same introduction. The ledger closes the profile screen's own segment
  // when this opens, and reopens it on the way back, so nothing double-counts.
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      profileOpened(id);
      return () => profileClosed(id);
    }, [id, profileClosed, profileOpened])
  );

  useEffect(() => {
    if (safeIndex !== index) setIndex(safeIndex);
  }, [index, safeIndex]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(safeGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / width), photos.length));
  };

  const goTo = useCallback((next: number) => {
    const target = safeGalleryIndex(next, photos.length);
    listRef.current?.scrollToOffset({ offset: target * width, animated: true });
    setIndex(target);
  }, [photos.length, width]);
  const swipeTo = (distance: number, velocity: number) => {
    const current = safeGalleryIndex(index, photos.length);
    if (distance < -40 || velocity < -500) goTo(Math.min(photos.length - 1, current + 1));
    else if (distance > 40 || velocity > 500) goTo(Math.max(0, current - 1));
  };

  if (!introduction || galleryState !== 'ready') {
    return (
      <GalleryRecovery
        title={galleryState === 'unavailable' ? t('gallery.unavailableTitle') : t('gallery.emptyTitle')}
        message={galleryState === 'unavailable' ? t('gallery.unavailableBody') : t('gallery.emptyBody')}
        onClose={() => router.back()}
        onRetry={galleryState === 'unavailable' ? () => refresh() : undefined}
      />
    );
  }

  return (
    <View style={[styles.backdrop, { paddingTop: insets.top }]}>
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <Pressable
          testID={testIds.gallery.close}
          accessibilityRole="button"
          accessibilityLabel={t('gallery.close')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/daily'))}
          style={styles.close}
          hitSlop={12}
        >
          <ActionIcon name="close" size={18} color={color.white} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {t('gallery.title', { name: introduction.profile.firstName })}
        </Text>
        <SafetyControl
          scope={{ kind: 'introduction', id: introduction.id }}
          memberName={introduction.profile.firstName}
          tone="dark"
          onBlocked={() => void refresh()}
        />
        <View style={styles.counter}>
          <Text style={styles.counterLabel}>
            {number(safeIndex + 1)} / {number(photos.length)}
          </Text>
        </View>
      </View>

      <View style={styles.stage} onLayout={(event) => setStageHeight(event.nativeEvent.layout.height)}>
      <FlatList
        key={`gallery-${width}`}
        style={styles.stage}
        ref={listRef}
        data={photos}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        // Web uses the gesture on each slide so a mouse drag pages reliably;
        // native keeps FlatList's momentum scrolling for touch screens.
        scrollEnabled={!zoomed && Platform.OS !== 'web'}
        // A list only redraws its pages when told something changed. Without
        // this, zooming never reached the page, so it could not be dragged
        // around, and a new stage size never re-fitted the frame.
        extraData={`${zoomed}-${safeIndex}-${stageHeight}-${width}`}
        initialScrollIndex={safeIndex}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        {...galleryListPerformancePolicy}
        renderItem={({ item, index: photoIndex }) => (
          <GallerySlide
            photo={item}
            index={photoIndex}
            width={width}
            frame={frame}
            stageHeight={stageHeight}
            zoomed={zoomed && photoIndex === safeIndex}
            onZoomChange={setZoomed}
            onSwipe={swipeTo}
          />
        )}
      />
      {photos.length > 1 ? (
        <View pointerEvents="box-none" style={styles.navLayer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gallery.photoA11y', { count: number(Math.max(1, safeIndex)) })}
            accessibilityState={{ disabled: safeIndex === 0 }}
            disabled={safeIndex === 0}
            onPress={() => goTo(safeIndex - 1)}
            style={({ pressed }) => [
              styles.navButton,
              safeIndex === 0 && styles.navButtonDisabled,
              pressed && styles.navButtonPressed,
              Platform.OS === 'web' && styles.webButton,
            ]}
          >
            <ActionIcon name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={color.white} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gallery.photoA11y', { count: number(Math.min(photos.length, safeIndex + 2)) })}
            accessibilityState={{ disabled: safeIndex === photos.length - 1 }}
            disabled={safeIndex === photos.length - 1}
            onPress={() => goTo(safeIndex + 1)}
            style={({ pressed }) => [
              styles.navButton,
              safeIndex === photos.length - 1 && styles.navButtonDisabled,
              pressed && styles.navButtonPressed,
              Platform.OS === 'web' && styles.webButton,
            ]}
          >
            <ActionIcon name={isRTL ? 'chevron-back' : 'chevron-forward'} size={22} color={color.white} />
          </Pressable>
        </View>
      ) : null}
      </View>

      <ScrollView
        horizontal
        // Only as tall as the thumbnails. A scroll view grows by default on the
        // web, and this one was taking half the screen from the photo.
        style={styles.thumbStrip}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.thumbs, { paddingBottom: insets.bottom + 20 }]}
      >
        {photos.map((photo, thumbIndex) => (
          <Pressable
            key={photo}
            accessibilityRole="button"
            accessibilityLabel={t('gallery.photoA11y', { count: number(thumbIndex + 1) })}
            onPress={() => goTo(thumbIndex)}
            style={[styles.thumb, thumbIndex === safeIndex && styles.thumbActive]}
          >
            <Image
              source={photo}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function GalleryRecovery({
  title,
  message,
  onClose,
  onRetry,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <View testID={testIds.gallery.recovery} style={styles.backdrop}>
      <View accessibilityRole="alert" style={styles.recovery}>
        <Text variant="displaySmall" center style={styles.recoveryTitle}>{title}</Text>
        <Text variant="bodySmall" center style={styles.recoveryBody}>{message}</Text>
        {onRetry ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.tryAgain')} onPress={onRetry} style={styles.recoveryPrimary}>
            <Text style={styles.recoveryPrimaryLabel}>{t('common.tryAgain')}</Text>
          </Pressable>
        ) : null}
        <Pressable testID={testIds.gallery.close} accessibilityRole="button" accessibilityLabel={t('gallery.close')} onPress={onClose} style={styles.recoveryClose}>
          <Text style={styles.recoveryCloseLabel}>{t('common.close')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * The largest 3:4 frame that fits the space, with a margin all round.
 *
 * Fitted both ways rather than to the width alone, so a short laptop screen
 * shows the whole photo instead of the top two thirds of it.
 */
function photoFrame(width: number, height: number): { width: number; height: number } {
  const margin = 10;
  const availableWidth = Math.max(0, width - margin * 2);
  const availableHeight = Math.max(0, height - margin * 2);
  const frameWidth = Math.min(availableWidth, availableHeight * (3 / 4));
  return { width: frameWidth, height: frameWidth * (4 / 3) };
}

function GallerySlide({
  photo,
  index,
  width,
  frame,
  stageHeight,
  zoomed,
  onZoomChange,
  onSwipe,
}: {
  photo: string;
  index: number;
  width: number;
  frame: { width: number; height: number };
  stageHeight: number;
  zoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
  onSwipe: (distance: number, velocity: number) => void;
}) {
  const { t } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  // Pinch to zoom, drag to look around, double tap (or double click) to jump
  // in and back out. Zoom is clamped to 1-4x and the photo is never dragged
  // past its own edges, so there is no way to lose it off the frame.
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const rotation = useSharedValue(0);

  const clampOffsets = () => {
    'worklet';
    const maxX = (frame.width * (scale.value - 1)) / 2;
    const maxY = (frame.height * (scale.value - 1)) / 2;
    offsetX.value = Math.min(maxX, Math.max(-maxX, offsetX.value));
    offsetY.value = Math.min(maxY, Math.max(-maxY, offsetY.value));
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1, { duration: 200 });
    savedScale.value = 1;
    offsetX.value = withTiming(0, { duration: 200 });
    offsetY.value = withTiming(0, { duration: 200 });
    savedX.value = 0;
    savedY.value = 0;
    runOnJS(onZoomChange)(false);
  };

  // Turns with two fingers while pinching, and springs back upright on
  // release, so a photo is never left crooked.
  const rotate = Gesture.Rotation()
    .onUpdate((event) => {
      rotation.value = event.rotation;
    })
    .onEnd(() => {
      rotation.value = withSpring(0, { damping: 14, stiffness: 180 });
    });

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(4, Math.max(1, savedScale.value * event.scale));
      clampOffsets();
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      runOnJS(onZoomChange)(true);
    });

  // One drag, two meanings, decided by the live zoom level. Zoomed in, it
  // moves the photo around. Zoomed out on the web, it turns the page — a mouse
  // cannot flick a paging list. On a phone the list pages natively, so the drag
  // is only switched on once the photo is zoomed.
  const drag = Gesture.Pan()
    .enabled(Platform.OS === 'web' || zoomed)
    .activeOffsetX([-8, 8])
    .onUpdate((event) => {
      if (scale.value <= 1.01) return;
      offsetX.value = savedX.value + event.translationX;
      offsetY.value = savedY.value + event.translationY;
      clampOffsets();
    })
    .onEnd((event) => {
      if (scale.value > 1.01) {
        savedX.value = offsetX.value;
        savedY.value = offsetY.value;
        return;
      }
      runOnJS(onSwipe)(event.translationX, event.velocityX);
    });

  // Any real movement means this is not a tap, so the drag is released at
  // once instead of waiting to see whether a second tap is coming.
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(10)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
        return;
      }
      scale.value = withTiming(2.5, { duration: 200 });
      savedScale.value = 2.5;
      runOnJS(onZoomChange)(true);
    });

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  return (
    <View style={[styles.slide, { width, height: stageHeight || frame.height + 20 }]}>
      <GestureDetector gesture={Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, rotate, drag))}>
        <View style={frame}>
        {/* The card itself grows, rounded corners and all, past its resting size
            — not just the picture inside a fixed frame. */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.photo, zoomStyle]}>
            <Image
              key={galleryRetryKey(photo, attempt)}
              testID={`gallery-photo-${index + 1}`}
              source={photo}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              transition={200}
              {...galleryImagePerformancePolicy}
              accessibilityIgnoresInvertColors
              onError={() => setFailed(true)}
            />
        </Animated.View>
        </View>
      </GestureDetector>
      {failed ? (
        <View style={styles.errorOverlay} accessibilityRole="alert">
          <Text variant="bodySmall" center style={styles.errorText}>{t('gallery.photoUnavailable')}</Text>
          <Pressable
            testID={`gallery-photo-${index + 1}-retry`}
            accessibilityRole="button"
            accessibilityLabel={t('gallery.retry')}
            onPress={() => {
              setFailed(false);
              setAttempt((current) => current + 1);
            }}
            style={styles.retry}
          >
            <Text style={styles.retryLabel}>{t('gallery.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(14,13,12,0.96)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowRTL: { flexDirection: 'row-reverse' },
  title: { flex: 1, fontFamily: font.bodySemi, fontSize: 13, color: color.white },
  counter: {
    backgroundColor: 'rgba(252,252,251,0.1)',
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  counterLabel: {
    fontFamily: font.body,
    fontSize: 12,
    color: 'rgba(252,252,251,0.62)',
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(252,252,251,0.16)',
    backgroundColor: 'rgba(252,252,251,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stage: { flex: 1, position: 'relative' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 46,
    height: 46,
    marginHorizontal: 14,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,10,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(252,252,251,0.24)',
  },
  navButtonDisabled: { opacity: 0.22 },
  navButtonPressed: { opacity: 0.72, transform: [{ scale: 0.94 }] },
  webButton: { cursor: 'pointer' } as object,
  photo: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: radius.md,
    backgroundColor: 'rgba(14,13,12,0.82)',
  },
  errorText: { color: color.white, maxWidth: 190 },
  retry: {
    minHeight: 44,
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.white,
    paddingHorizontal: 16,
  },
  retryLabel: { color: color.ink, fontFamily: font.bodyBold, fontSize: 11 },

  thumbStrip: { flexGrow: 0, flexShrink: 0 },
  thumbs: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  thumb: {
    width: 44,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    opacity: 0.45,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  thumbActive: { opacity: 1, borderColor: color.goldOnDark },
  recovery: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  recoveryTitle: { color: color.white },
  recoveryBody: { color: 'rgba(252,252,251,0.72)', maxWidth: 300 },
  recoveryPrimary: { minHeight: 48, minWidth: 152, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: color.white, paddingHorizontal: 22 },
  recoveryPrimaryLabel: { color: color.ink, fontFamily: font.bodyBold, fontSize: 11 },
  recoveryClose: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  recoveryCloseLabel: { color: color.white, fontFamily: font.bodySemi, fontSize: 12 },
});
