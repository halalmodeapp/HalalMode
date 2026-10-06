import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { RTL_LAYOUT } from '@/lib/rtl';
import { color, radius, shadow, space } from '@/theme/tokens';

/** Photos are shown 3:4 everywhere, so they are cropped 3:4. */
const ASPECT = 3 / 4;
const MAX_ZOOM = 4;

interface PhotoCropSheetProps {
  /** The photo to crop; the sheet is hidden while this is null. */
  uri: string | null;
  onDone: (croppedUri: string) => void;
  onCancel: () => void;
}

/**
 * Crop and position a photo before it is saved: drag to move, pinch or use the
 * slider to zoom. The frame is the 3:4 shape the photo is shown in, and the
 * centre of it is what the round profile circle shows.
 */
export function PhotoCropSheet({ uri, onDone, onCancel }: PhotoCropSheetProps) {
  const { t, isRTL } = useI18n();
  const window = useWindowDimensions();
  const frameWidth = Math.min(300, window.width - 80);
  const frameHeight = frameWidth / ASPECT;

  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // The real size, from the decoded image: pickers do not always report it.
  useEffect(() => {
    setSize(null);
    setZoom(1);
    setFailed(false);
    scale.value = 1;
    x.value = 0;
    y.value = 0;
    if (!uri) return;
    let live = true;
    ImageManipulator.manipulate(uri).renderAsync()
      .then((image) => { if (live) setSize({ width: image.width, height: image.height }); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [uri, scale, x, y]);

  // How big the image is drawn at zoom 1: just covering the frame.
  const cover = size ? Math.max(frameWidth / size.width, frameHeight / size.height) : 1;
  const drawnWidth = (size?.width ?? 0) * cover;
  const drawnHeight = (size?.height ?? 0) * cover;

  const clamp = (value: number, limit: number) => {
    'worklet';
    return Math.min(Math.max(value, -limit), limit);
  };
  const settle = () => {
    'worklet';
    x.value = clamp(x.value, (drawnWidth * scale.value - frameWidth) / 2);
    y.value = clamp(y.value, (drawnHeight * scale.value - frameHeight) / 2);
  };

  const pan = Gesture.Pan()
    .onStart(() => { startX.value = x.value; startY.value = y.value; })
    .onUpdate((event) => {
      x.value = startX.value + event.translationX;
      y.value = startY.value + event.translationY;
      settle();
    });
  const pinch = Gesture.Pinch()
    .onStart(() => { startScale.value = scale.value; })
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(startScale.value * event.scale, 1), MAX_ZOOM);
      settle();
    })
    .onEnd(() => { runOnJS(setZoom)(Math.round(scale.value * 10) / 10); });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  const changeZoom = (value: number) => {
    setZoom(value);
    scale.value = value;
    settle();
  };

  const save = async () => {
    if (!uri || !size) return;
    setSaving(true);
    try {
      // Frame → source pixels. The image is centred in the frame, then moved
      // by (x, y) and scaled about its centre.
      const factor = cover * scale.value;
      const width = Math.min(size.width, frameWidth / factor);
      const height = Math.min(size.height, frameHeight / factor);
      const originX = Math.max(0, Math.min(size.width - width, (size.width - width) / 2 - x.value / factor));
      const originY = Math.max(0, Math.min(size.height - height, (size.height - height) / 2 - y.value / factor));
      const rendered = await ImageManipulator.manipulate(uri)
        .crop({ originX: Math.round(originX), originY: Math.round(originY), width: Math.round(width), height: Math.round(height) })
        .renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
      onDone(saved.uri);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={uri !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.scrim}>
        <View accessibilityViewIsModal style={[styles.card, isRTL && styles.rtl]}>
          <Text variant="displaySmall" center>{t('profile.cropTitle')}</Text>
          <Text variant="caption" center style={styles.hint}>{t('profile.cropHint')}</Text>

          <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
            {size && uri ? (
              <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
                <Animated.View style={[styles.fill, styles.center]}>
                  <Animated.View style={[{ width: drawnWidth, height: drawnHeight }, imageStyle]} pointerEvents="none">
                    <Image source={uri} style={styles.fill} contentFit="fill" accessibilityIgnoresInvertColors />
                  </Animated.View>
                </Animated.View>
              </GestureDetector>
            ) : failed ? (
              <Text variant="caption" center>{t('profile.cropError')}</Text>
            ) : (
              <ActivityIndicator color={color.ink} />
            )}
            {/* Where the round profile circle will fall. */}
            <View pointerEvents="none" style={[styles.circle, { width: frameWidth - 4, height: frameWidth - 4, borderRadius: frameWidth }]} />
          </View>

          <View style={styles.zoom}>
            <Slider
              min={1}
              max={MAX_ZOOM}
              step={0.1}
              value={zoom}
              onChange={changeZoom}
              accessibilityLabel={t('profile.cropZoom')}
            />
          </View>

          <View style={styles.stack}>
            <Button label={t('profile.cropSave')} onPress={() => void save()} disabled={!size || saving} style={styles.action} />
            <Button label={t('common.cancel')} variant="secondary" onPress={onCancel} style={styles.action} />
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  scrim: { flex: 1, backgroundColor: 'rgba(10,10,10,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    ...shadow.modal,
  },
  hint: { marginTop: 6, marginBottom: space.md, color: color.muted },
  frame: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: color.clay, alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  center: { alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' },
  zoom: { alignSelf: 'stretch', marginTop: space.md, paddingHorizontal: space.sm },
  stack: { alignSelf: 'stretch', gap: 10, marginTop: space.md },
  action: { alignSelf: 'stretch' },
});
