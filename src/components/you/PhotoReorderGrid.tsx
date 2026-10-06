import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { moveItem, slotFromPosition, slotPosition } from '@/lib/reorder';
import { RTL_LAYOUT } from '@/lib/rtl';
import { alpha, color, font, radius } from '@/theme/tokens';

const COLUMNS = 3;
const GAP = 8;
const ASPECT = 4 / 3;
/** Six is the limit, and all six are always shown so the empty ones invite. */
export const MAX_PHOTOS = 6;

/** How a tile settles: quick, with a little overshoot at the end. */
const SETTLE = { damping: 18, stiffness: 260, mass: 0.7 } as const;
/** How a tile swells when picked up. Looser, so the overshoot is visible. */
const LIFT = { damping: 9, stiffness: 210, mass: 0.6 } as const;

export interface PhotoTile {
  /** Stable across a reorder — the storage path where there is one. */
  key: string;
  displayUrl: string;
}

export interface PhotoReorderGridProps {
  photos: readonly PhotoTile[];
  onReorder: (next: PhotoTile[]) => void;
  onRemove: (index: number) => void;
  /** Re-crop a photo already in the gallery. */
  onEdit?: (index: number) => void;
  editLabel?: (position: number) => string;
  /** Tapping an empty slot. */
  onAdd: () => void;
  removeDisabled?: boolean;
  addDisabled?: boolean;
  mainLabel: string;
  removeLabel: (position: number) => string;
  dragHintLabel: string;
  moveEarlierLabel: string;
  moveLaterLabel: string;
  emptyLabel: string;
}

/**
 * The photo gallery: six slots, rearrangeable by dragging.
 *
 * All six are always drawn. An empty one is not absence, it is an invitation —
 * a member who sees two photos and four gaps knows what to do next, where a
 * member who sees two photos and nothing else thinks they are finished.
 *
 * The first photo is the one every other member sees first, so which photo is
 * first is a real decision. Press and hold to pick one up; the others slide
 * aside as it passes, and it drops into the space they leave.
 *
 * The hold is deliberate. This grid sits inside a scrolling form, and a gesture
 * that began on the first pixel of movement would fight the scroll every time
 * somebody swiped past their own photos.
 *
 * Dragging is not usable by everybody, so each tile also carries "move earlier"
 * and "move later" accessibility actions.
 */
export function PhotoReorderGrid({
  photos,
  onReorder,
  onRemove,
  onEdit,
  editLabel,
  onAdd,
  removeDisabled = false,
  addDisabled = false,
  mainLabel,
  removeLabel,
  dragHintLabel,
  moveEarlierLabel,
  moveLaterLabel,
  emptyLabel,
}: PhotoReorderGridProps) {
  const { isRTL } = useI18n();
  const [width, setWidth] = useState(0);
  const container = useRef<View | null>(null);

  /**
   * The order on screen, which during a drag runs ahead of the saved one.
   *
   * Each swap is applied to the latest order through a ref, never to the list
   * this render happened to close over. A gesture keeps the callbacks it started
   * with, so reading the prop there meant every swap after the first was
   * applied to the original list and quietly undid the one before it — drag the
   * third photo to the front and the first two swapped instead.
   *
   * Nothing is saved until the photo is let go. Saving on every swap sent a
   * burst of racing writes for a single drag.
   */
  const [order, setOrder] = useState(() => photos.slice(0, MAX_PHOTOS));
  const orderRef = useRef(order);
  const draggingRef = useRef(false);
  /** The photo in the air, so its landing spot can be marked. */
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const latest = useRef({ photos, onReorder });
  latest.current = { photos, onReorder };

  useEffect(() => {
    if (draggingRef.current) return;
    const next = photos.slice(0, MAX_PHOTOS);
    orderRef.current = next;
    setOrder(next);
  }, [photos]);

  const move = useCallback((from: number, to: number) => {
    if (from === to) return;
    const next = moveItem(orderRef.current, from, to);
    orderRef.current = next;
    setOrder(next);
  }, []);

  /** The order before the drag, to go back to if the photo is let go elsewhere. */
  const orderAtPickUp = useRef(order);

  const pickUp = useCallback((key: string) => {
    draggingRef.current = true;
    orderAtPickUp.current = orderRef.current;
    setDraggingKey(key);
  }, []);

  const drop = useCallback((outside = false) => {
    draggingRef.current = false;
    setDraggingKey(null);
    if (outside) {
      // Let go away from the gallery: nothing moves, everything goes home.
      orderRef.current = orderAtPickUp.current;
      setOrder(orderAtPickUp.current);
      return;
    }
    const final = orderRef.current;
    const saved = latest.current.photos.slice(0, MAX_PHOTOS);
    const unchanged =
      final.length === saved.length && final.every((photo, i) => photo.key === saved[i]?.key);
    if (!unchanged) latest.current.onReorder(final);
  }, []);

  /** One accessible step: move, then save as if it had been dropped. */
  const step = useCallback((from: number, to: number) => {
    move(from, to);
    drop();
  }, [drop, move]);

  const filled = order;
  const cellWidth = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const cellHeight = cellWidth * ASPECT;
  const rows = Math.ceil(MAX_PHOTOS / COLUMNS);
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
   * view, and without a width there is no cell size. A ref to a view on web is
   * the DOM node, which can simply be asked — and watched, so the grid stays
   * right when a window is resized.
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

  const emptySlots = Array.from(
    { length: MAX_PHOTOS - filled.length },
    (_, index) => filled.length + index,
  );

  return (
    <View ref={container} style={[styles.grid, { height }]} onLayout={onLayout}>
      {cellWidth > 0 ? (
        <>
          {emptySlots.map((index) => {
            const at = slotPosition({ index, cellWidth, cellHeight, gap: GAP, columns: COLUMNS, isRTL });
            return (
              <Pressable
                key={`empty-${index}`}
                accessibilityRole="button"
                accessibilityLabel={emptyLabel}
                accessibilityState={{ disabled: addDisabled }}
                disabled={addDisabled}
                onPress={onAdd}
                style={({ pressed }) => [
                  styles.cell,
                  styles.empty,
                  { width: cellWidth, height: cellHeight, left: at.x, top: at.y },
                  pressed && styles.emptyPressed,
                ]}
              >
                <Text style={styles.emptyPlus}>+</Text>
                <Text variant="caption" center style={styles.emptyLabel}>
                  {emptyLabel}
                </Text>
              </Pressable>
            );
          })}

          {/* Where the photo will land if let go now: the others have already
              slid aside, and this marks the gap they left. */}
          {draggingKey !== null && filled.findIndex((photo) => photo.key === draggingKey) >= 0 ? (() => {
            const at = slotPosition({
              index: filled.findIndex((photo) => photo.key === draggingKey),
              cellWidth, cellHeight, gap: GAP, columns: COLUMNS, isRTL,
            });
            return (
              <View
                pointerEvents="none"
                // The + sits in the top tenth, clear of the photo passing over it.
                style={[styles.cell, styles.landing, { width: cellWidth, height: cellHeight, left: at.x, top: at.y, paddingTop: cellHeight * 0.02 }]}
              >
                <Text style={styles.landingPlus}>+</Text>
              </View>
            );
          })() : null}

          {/* Drawn in a fixed order, placed by position. Rendering in the live
              order made React move the dragged photo's element in the page on
              every swap, and a browser cancels a drag whose element moves —
              which is exactly the photo dropping itself mid-drag. */}
          {stableOrder(filled).map((photo) => {
            const index = filled.findIndex((tile) => tile.key === photo.key);
            return (
            <PhotoCell
              key={photo.key}
              photo={photo}
              index={index}
              count={filled.length}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
              isRTL={isRTL}
              onMove={move}
              onPickUp={pickUp}
              onDrop={drop}
              onStep={step}
              onRemove={() => onRemove(index)}
              onEdit={onEdit ? () => onEdit(index) : undefined}
              editLabel={editLabel?.(index + 1)}
              removeDisabled={removeDisabled}
              mainLabel={mainLabel}
              removeLabel={removeLabel}
              dragHintLabel={dragHintLabel}
              moveEarlierLabel={moveEarlierLabel}
              moveLaterLabel={moveLaterLabel}
            />
            );
          })}
        </>
      ) : null}
    </View>
  );
}

/** Tiles sorted by key: an order that never changes while photos are moved. */
function stableOrder(tiles: readonly PhotoTile[]): PhotoTile[] {
  return [...tiles].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

interface PhotoCellProps {
  photo: PhotoTile;
  index: number;
  count: number;
  cellWidth: number;
  cellHeight: number;
  isRTL: boolean;
  onMove: (from: number, to: number) => void;
  onPickUp: (key: string) => void;
  onDrop: (outside?: boolean) => void;
  onStep: (from: number, to: number) => void;
  onRemove: () => void;
  onEdit?: () => void;
  editLabel?: string;
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
  onMove,
  onPickUp,
  onDrop,
  onStep,
  onRemove,
  onEdit,
  editLabel,
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

  // Where this tile sits, and where it sat. The offset below is always measured
  // from its current slot, so both the drag and the shuffle can share it.
  const homeX = useSharedValue(home.x);
  const homeY = useSharedValue(home.y);
  const previousHome = useRef(home);

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const lift = useSharedValue(0);
  const dragging = useSharedValue(false);
  /** Where the tile was when the finger landed on it. */
  const grabbedAtX = useSharedValue(0);
  const grabbedAtY = useSharedValue(0);
  /** The slot this tile has already been moved into during the current drag. */
  const slot = useSharedValue(index);
  /** Where the photo's centre is now, relative to the grid. */
  const centreNowX = useSharedValue(0);
  const centreNowY = useSharedValue(0);
  /** Its slot as of the last render, read by the gesture instead of `index`. */
  const currentIndex = useSharedValue(index);
  useEffect(() => {
    currentIndex.value = index;
  }, [currentIndex, index]);

  /**
   * Slide, rather than jump, when another tile displaces this one.
   *
   * A tile's slot is a plain style, so the moment the array reorders this view
   * is already drawn in its new place. Cancelling that out with an equal and
   * opposite offset and then springing the offset away turns the jump into the
   * movement it should have been.
   */
  useEffect(() => {
    const before = previousHome.current;
    previousHome.current = home;
    homeX.value = home.x;
    homeY.value = home.y;
    if (dragging.value) return;
    if (before.x === home.x && before.y === home.y) return;

    offsetX.value = before.x - home.x;
    offsetY.value = before.y - home.y;
    offsetX.value = withSpring(0, SETTLE);
    offsetY.value = withSpring(0, SETTLE);
  }, [dragging, home, homeX, homeY, offsetX, offsetY]);

  // A finger holds first, so a swipe past the gallery still scrolls the form.
  // A mouse is different: everybody clicks and drags at once, and a long-press
  // gesture fails the instant it moves before its timer — so on the web a few
  // pixels of movement is the whole signal. A scroll wheel never competes.
  //
  // The gesture is built once per drag-relevant setting, never per render. Each
  // swap re-renders this tile with a new index, and handing GestureDetector a
  // fresh gesture mid-drag made the browser end the drag on the spot: the photo
  // dropped before the mouse was let go.
  const key = photo.key;
  const pan = useMemo(() => (Platform.OS === 'web'
    ? Gesture.Pan().minDistance(4)
    : Gesture.Pan().activateAfterLongPress(220))
    .enabled(count > 1)
    .onStart(() => {
      dragging.value = true;
      slot.value = currentIndex.value;
      centreNowX.value = homeX.value + cellWidth / 2;
      centreNowY.value = homeY.value + cellHeight / 2;
      grabbedAtX.value = homeX.value;
      grabbedAtY.value = homeY.value;
      lift.value = withSpring(1, LIFT);
      runOnJS(onPickUp)(key);
    })
    .onUpdate((event) => {
      // Measured from where the finger landed, not from wherever this tile has
      // since been re-slotted to — otherwise it leaps out from under the finger
      // the first time it swaps with a neighbour.
      offsetX.value = grabbedAtX.value - homeX.value + event.translationX;
      offsetY.value = grabbedAtY.value - homeY.value + event.translationY;

      const centreX = grabbedAtX.value + event.translationX + cellWidth / 2;
      const centreY = grabbedAtY.value + event.translationY + cellHeight / 2;
      centreNowX.value = centreX;
      centreNowY.value = centreY;
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
      // More than half a photo beyond the gallery's edge counts as "not here".
      const gridWidth = cellWidth * COLUMNS + GAP * (COLUMNS - 1);
      const gridHeight = cellHeight * Math.ceil(MAX_PHOTOS / COLUMNS) + GAP;
      const outside = centreNowX.value < -cellWidth / 2
        || centreNowX.value > gridWidth + cellWidth / 2
        || centreNowY.value < -cellHeight / 2
        || centreNowY.value > gridHeight + cellHeight / 2;
      dragging.value = false;
      offsetX.value = withSpring(0, SETTLE);
      offsetY.value = withSpring(0, SETTLE);
      lift.value = withSpring(0, SETTLE);
      runOnJS(onDrop)(outside);
    }),
  // Shared values are stable; listing them keeps the linter honest.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [count, cellWidth, cellHeight, isRTL, key, onMove, onPickUp, onDrop]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: 1 + lift.value * 0.07 },
    ],
    zIndex: lift.value > 0 ? 20 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      {/* Two views on purpose. The outer one owns where the tile is and how
          big it is, in plain numbers; the inner one owns the movement. Size and
          position are not animated values and have no business depending on the
          animation runtime being live. */}
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
            onStep(index, index - 1);
          }
          if (event.nativeEvent.actionName === 'moveLater' && index < count - 1) {
            onStep(index, index + 1);
          }
        }}
      >
        <Animated.View style={[styles.surface, animated]}>
          {/* Kept out of the pointer's way. On the web a photo is an <img>, and
              a browser starts its own drag of any image you press on — which
              takes the pointer and the gesture never sees it again. */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Image
              source={photo.displayUrl}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          </View>
          {index === 0 ? (
            <View style={[styles.mainBadge, isRTL && styles.mainBadgeRTL]}>
              <Text style={styles.mainBadgeLabel}>{mainLabel}</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={removeLabel(index + 1)}
            accessibilityState={{ disabled: removeDisabled }}
            disabled={removeDisabled}
            hitSlop={8}
            onPress={onRemove}
            style={[styles.remove, isRTL && styles.removeRTL]}
          >
            <Text style={styles.removeLabel}>×</Text>
          </Pressable>
          {onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={editLabel}
              hitSlop={8}
              onPress={onEdit}
              style={[styles.edit, isRTL && styles.editRTL]}
            >
              <Text style={styles.editLabel}>⤢</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  grid: { marginTop: 14, position: 'relative' },
  cell: { position: 'absolute', top: 0, left: 0 },
  surface: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.clay,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: alpha.lineStrong,
    backgroundColor: color.sandLight,
  },
  emptyPressed: { backgroundColor: color.sand },
  emptyPlus: { fontFamily: font.body, fontSize: 22, color: color.faintest, lineHeight: 24 },
  emptyLabel: { color: color.faintest, paddingHorizontal: 6 },

  landing: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: color.gold,
    backgroundColor: 'rgba(197,160,84,0.16)',
  },
  landingPlus: { fontFamily: font.body, fontSize: 30, lineHeight: 32, color: color.gold },

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
  edit: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10,10,10,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRTL: { right: undefined, left: 6 },
  editLabel: { color: color.white, fontSize: 15, fontFamily: font.body, lineHeight: 18 },
});
