import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { moveItem, slotFromPosition, slotPosition } from '@/lib/reorder';
import { RTL_LAYOUT } from '@/lib/rtl';
import { color, font, radius } from '@/theme/tokens';

const COLUMNS = 3;
const GAP = 8;
const ASPECT = 4 / 3;

export interface PhotoTile {
  /** Stable across a reorder — the storage path where there is one. */
  key: string;
  displayUrl: string;
}

export interface PhotoReorderGridProps {
  photos: readonly PhotoTile[];
  onReorder: (next: PhotoTile[]) => void;
  onRemove: (index: number) => void;
  removeDisabled?: boolean;
  mainLabel: string;
  removeLabel: (position: number) => string;
  dragHintLabel: string;
  moveEarlierLabel: string;
  moveLaterLabel: string;
}

/**
 * The photo gallery, rearrangeable by dragging.
 *
 * The first photo is the one every other member sees first, so which photo is
 * first is a real decision — and until now the only way to change it was to
 * delete photos and upload them again in a different order.
 *
 * Press and hold to pick one up. The hold is deliberate: this grid sits inside
 * a scrolling form, and a gesture that begins on the first pixel of movement
 * would fight the scroll every time somebody swiped past their own photos.
 *
 * Dragging is not usable by everybody, so each tile also carries "move earlier"
 * and "move later" accessibility actions. A screen reader reaches the same
 * arrangement by a different road.
 */
export function PhotoReorderGrid({
  photos,
  onReorder,
  onRemove,
  removeDisabled = false,
  mainLabel,
  removeLabel,
  dragHintLabel,
  moveEarlierLabel,
  moveLaterLabel,
}: PhotoReorderGridProps) {
  const { isRTL } = useI18n();
  const [width, setWidth] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const container = useRef<View | null>(null);

  const cellWidth = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const cellHeight = cellWidth * ASPECT;
  const rows = Math.max(1, Math.ceil(photos.length / COLUMNS));
  // A provisional height until the first measurement, so the gallery reserves
  // roughly the right space instead of collapsing and then shoving the rest of
  // the form down a moment later.
  const height = cellHeight > 0 ? rows * cellHeight + (rows - 1) * GAP : rows * 160;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  /**
   * On web, measure the element itself.
   *
   * `onLayout` is how a React Native view is told its own size, and on a device
   * it arrives. In the browser neither it nor `measure()` ever fired for this
   * view, and without a width there is no cell size, so nothing rendered at
   * all. A ref to a view on web is the DOM node, which can simply be asked —
   * and watched, so the grid stays right when a window is resized.
   */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof ResizeObserver === 'undefined') return;
    const node = container.current as unknown as HTMLElement | null;
    if (!node?.getBoundingClientRect) return;

    const read = () => {
      const measured = node.getBoundingClientRect().width;
      if (measured > 0) setWidth((current) => (current === measured ? current : measured));
    };

    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const commit = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      onReorder(moveItem(photos, from, to));
    },
    [onReorder, photos],
  );

  return (
    <View ref={container} style={[styles.grid, { height }]} onLayout={onLayout}>
      {cellWidth > 0
        ? photos.map((photo, index) => (
            <PhotoCell
              key={photo.key}
              photo={photo}
              index={index}
              count={photos.length}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
              isRTL={isRTL}
              isActive={activeKey === photo.key}
              onPickUp={() => setActiveKey(photo.key)}
              onDrop={() => setActiveKey(null)}
              onMove={commit}
              onRemove={() => onRemove(index)}
              removeDisabled={removeDisabled}
              mainLabel={mainLabel}
              removeLabel={removeLabel}
              dragHintLabel={dragHintLabel}
              moveEarlierLabel={moveEarlierLabel}
              moveLaterLabel={moveLaterLabel}
            />
          ))
        : null}
    </View>
  );
}

interface PhotoCellProps {
  photo: PhotoTile;
  index: number;
  count: number;
  cellWidth: number;
  cellHeight: number;
  isRTL: boolean;
  isActive: boolean;
  onPickUp: () => void;
  onDrop: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  removeDisabled: boolean;
  mainLabel: string;
  removeLabel: (position: number) => string;
  dragHintLabel: string;
  moveEarlierLabel: string;
  moveLaterLabel: string;
}

function PhotoCell({
  photo,
  index,
  count,
  cellWidth,
  cellHeight,
  isRTL,
  isActive,
  onPickUp,
  onDrop,
  onMove,
  onRemove,
  removeDisabled,
  mainLabel,
  removeLabel,
  dragHintLabel,
  moveEarlierLabel,
  moveLaterLabel,
}: PhotoCellProps) {
  const home = useMemo(
    () => slotPosition({ index, cellWidth, cellHeight, gap: GAP, columns: COLUMNS, isRTL }),
    [cellHeight, cellWidth, index, isRTL],
  );

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const lifted = useSharedValue(0);
  // The slot this tile has already been moved into during the current drag, so
  // the same swap is not committed on every frame.
  const slot = useSharedValue(index);

  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .enabled(count > 1)
    .onStart(() => {
      slot.value = index;
      lifted.value = withTiming(1, { duration: 140 });
      runOnJS(onPickUp)();
    })
    .onUpdate((event) => {
      dragX.value = event.translationX;
      dragY.value = event.translationY;

      const centreX = home.x + event.translationX + cellWidth / 2;
      const centreY = home.y + event.translationY + cellHeight / 2;
      const next = slotFromPosition({
        centreX,
        centreY,
        cellWidth,
        cellHeight,
        gap: GAP,
        columns: COLUMNS,
        count,
        isRTL,
      });

      if (next !== slot.value) {
        const from = slot.value;
        slot.value = next;
        runOnJS(onMove)(from, next);
      }
    })
    .onFinalize(() => {
      // The array has already been rearranged, so this tile's home has moved
      // with it. Springing the offset back to zero lands it in its new slot.
      dragX.value = withSpring(0, { damping: 20, stiffness: 220 });
      dragY.value = withSpring(0, { damping: 20, stiffness: 220 });
      lifted.value = withTiming(0, { duration: 160 });
      runOnJS(onDrop)();
    });

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: 1 + lifted.value * 0.06 },
    ],
    zIndex: lifted.value > 0 ? 20 : 1,
    shadowOpacity: lifted.value * 0.28,
  }));

  return (
    <GestureDetector gesture={pan}>
      {/* Two views on purpose. The outer one owns where the tile is and how
          big it is, in plain numbers; the inner one owns the drag. Size and
          position are not animated values and have no business depending on
          the animation runtime being live. */}
      <View
        style={[
          styles.cell,
          { width: cellWidth, height: cellHeight, left: home.x, top: home.y },
        ]}
        accessibilityRole="image"
        accessibilityLabel={index === 0 ? `${mainLabel}. ${dragHintLabel}` : dragHintLabel}
        accessibilityActions={[
          { name: 'moveEarlier', label: moveEarlierLabel },
          { name: 'moveLater', label: moveLaterLabel },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'moveEarlier' && index > 0) {
            onMove(index, index - 1);
          }
          if (event.nativeEvent.actionName === 'moveLater' && index < count - 1) {
            onMove(index, index + 1);
          }
        }}
      >
        <Animated.View style={[styles.surface, animated]}>
          <Image
            source={photo.displayUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
          {index === 0 ? (
            <View style={[styles.mainBadge, isRTL && styles.mainBadgeRTL]}>
              <Text style={styles.mainBadgeLabel}>{mainLabel}</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={removeLabel(index + 1)}
            accessibilityState={{ disabled: removeDisabled }}
            disabled={removeDisabled || isActive}
            hitSlop={8}
            onPress={onRemove}
            style={[styles.remove, isRTL && styles.removeRTL]}
          >
            <Text style={styles.removeLabel}>×</Text>
          </Pressable>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  grid: { marginTop: 14, position: 'relative' },
  surface: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.clay,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  cell: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.clay,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  mainBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: color.ink,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  mainBadgeRTL: { left: undefined, right: 7 },
  mainBadgeLabel: {
    fontFamily: font.bodyBold,
    fontSize: 8,
    letterSpacing: 1.4,
    color: color.white,
  },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(10,10,10,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeRTL: { right: undefined, left: 6 },
  removeLabel: { color: color.white, fontSize: 15, fontFamily: font.body, lineHeight: 17 },
});
