import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { Seat } from '@/halalCards/types';
import type { RcView } from '@/halalCards/relationshipChallengeClaude/engine';
import { rcPose } from '@/halalCards/relationshipChallengeClaude/engine';
import {
  RC_CHARACTER_SPOTS,
  RC_LAYERS,
  RC_ROOM,
  RC_ROOM_LAYOUT,
  RC_SOLVED_SWAPS,
  characterAssetId,
  placedRect,
  rcAsset,
  type RcPlacement,
} from '@/halalCards/relationshipChallengeClaude/scene';
import type { RcClaudeState, RcHotspot, RcScenario } from '@/halalCards/relationshipChallengeClaude/types';
import { color, font } from '@/theme/tokens';
import { rcClaudeAssets } from './assetSource';
import { RoomEffects } from './RoomEffects';

/**
 * The room, drawn back to front from the scene manifest: plate, window,
 * rug, furniture, objects, characters (sorted by the y of their feet),
 * foreground occlusion, then code-driven light, then the hotspots.
 *
 * Everything is placed in 1000 × 1500 room units and scaled to the width the
 * screen gives it. Hit rectangles come from the scenario data, never from
 * image alpha.
 */

interface Props {
  scenario: RcScenario;
  state: RcClaudeState;
  view: RcView;
  mySeat: Seat;
  partnerName: string;
  youLabel: string;
  width: number;
  reducedMotion: boolean;
  /** The hotspot open in the inspect panel, highlighted. */
  focused?: string | null;
  spotLabel: (hotspot: RcHotspot) => string;
  onHotspot: (hotspot: RcHotspot) => void;
  /** Development builds label placeholder art. */
  showPlaceholderLabels?: boolean;
  placeholderLabel?: string;
  /** A picture of the room only: no hotspots, no name tags. */
  decorative?: boolean;
}

const MIN_TARGET = 44;

/** Shown for the moment before the plate paints, so the first frame is already the right time of day. */
const BACKDROP = { morning: '#EFDCBF', night: '#1E3A4C' } as const;

function Layer({ placement, scale, solved, label }: { placement: RcPlacement; scale: number; solved: boolean; label?: string }) {
  const assetId = solved ? (RC_SOLVED_SWAPS[placement.assetId] ?? placement.assetId) : placement.assetId;
  const rect = placedRect({ ...placement, assetId });
  const source = rcClaudeAssets.resolve(assetId);
  const priority = rcAsset(assetId).preload === 'critical' ? 'high' : 'normal';
  const box = { left: rect.x * scale, top: rect.y * scale, width: rect.width * scale, height: rect.height * scale };
  return (
    <View pointerEvents="none" style={[styles.abs, box]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="fill" transition={0} priority={priority} />
      {placement.tint ? (
        <Image
          source={source}
          style={[StyleSheet.absoluteFill, { opacity: placement.tint.opacity }]}
          tintColor={placement.tint.color}
          contentFit="fill"
          transition={0}
        />
      ) : null}
      {label ? <RNText style={styles.devLabel} numberOfLines={1}>{label}</RNText> : null}
    </View>
  );
}

function Pulse({ size, tone, still }: { size: number; tone: 'idle' | 'ping'; still: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: tone === 'ping' ? 900 : 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [still, t, tone]);
  const style = useAnimatedStyle(() => ({
    opacity: still ? 0.8 : 0.9 - 0.9 * t.value,
    transform: [{ scale: still ? 1 : 0.7 + 0.6 * t.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulse,
        { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2 },
        tone === 'ping' ? styles.pulsePing : null,
        style,
      ]}
    />
  );
}

export function RoomStage(props: Props) {
  const { scenario, state, view, mySeat, width, reducedMotion, focused, showPlaceholderLabels } = props;
  const scale = width / RC_ROOM.width;
  const height = RC_ROOM.height * scale;
  const layout = RC_ROOM_LAYOUT[scenario.timeOfDay];
  const byLayer = (layer: string) => layout.filter((placement) => rcAsset(placement.assetId).layer === layer);
  const label = (assetId: string) =>
    showPlaceholderLabels && rcClaudeAssets.isPlaceholder(assetId) ? assetId.replace('rc_claude_', '') : undefined;

  // Characters, depth-sorted by where their feet are.
  const seats: Seat[] = ['host', 'guest'];
  const characters = seats
    .map((seat) => ({ seat, spot: RC_CHARACTER_SPOTS[seat], assetId: characterAssetId(state.cast[seat], rcPose(view, seat)) }))
    .sort((a, b) => a.spot.y - b.spot.y);

  // The partner's latest ping, if it is still recent.
  const partner: Seat = mySeat === 'host' ? 'guest' : 'host';
  const ping = view.pings[partner];
  const pingFresh = ping && state.log.length - ping.at <= 4 ? ping.hotspotId : null;

  return (
    // Not an image role: that would hide the hotspot buttons from screen readers.
    <View style={[styles.stage, { width, height, backgroundColor: BACKDROP[scenario.timeOfDay] }]} accessibilityLabel={props.placeholderLabel}>
      {RC_LAYERS.filter((layer) => layer !== 'character' && layer !== 'foreground' && layer !== 'effect' && layer !== 'ui').map((layer) =>
        byLayer(layer).map((placement) => (
          <Layer
            key={`${layer}-${placement.assetId}`}
            placement={placement}
            scale={scale}
            solved={view.solved}
            label={label(placement.assetId)}
          />
        ))
      )}

      {characters.map(({ seat, spot, assetId }) => {
        const asset = rcAsset(assetId);
        const left = (spot.x - asset.anchor.x * asset.size.width) * scale;
        const top = (spot.y - asset.anchor.y * asset.size.height) * scale;
        return (
          <View key={seat} pointerEvents="none" style={[styles.abs, { left, top, width: asset.size.width * scale, height: asset.size.height * scale }]}>
            <Image source={rcClaudeAssets.resolve(assetId)} style={StyleSheet.absoluteFill} contentFit="fill" transition={0} priority="high" />
            {props.decorative ? null : <View style={[styles.nameTag, seat === mySeat ? styles.nameTagMine : null]}>
              <RNText style={[styles.nameText, seat === mySeat ? styles.nameTextMine : null]} numberOfLines={1}>
                {seat === mySeat ? props.youLabel : props.partnerName}
              </RNText>
            </View>}
          </View>
        );
      })}

      {byLayer('foreground').map((placement) => (
        <Layer key={`fg-${placement.assetId}`} placement={placement} scale={scale} solved={view.solved} label={label(placement.assetId)} />
      ))}

      <RoomEffects timeOfDay={scenario.timeOfDay} scale={scale} still={reducedMotion} />

      {(props.decorative ? [] : scenario.hotspots).map((hotspot) => {
        const b = hotspot.interactionBounds;
        const w = Math.max(MIN_TARGET, b.width * scale);
        const h = Math.max(MIN_TARGET, b.height * scale);
        const cx = (b.x + b.width / 2) * scale;
        const cy = (b.y + b.height / 2) * scale;
        const discovered = view.discovered.includes(hotspot.id);
        const collected = hotspot.clueId !== 'final' && view.collected.includes(hotspot.clueId);
        const isFocused = focused === hotspot.id;
        return (
          <Pressable
            key={hotspot.id}
            accessibilityRole="button"
            accessibilityLabel={props.spotLabel(hotspot)}
            onPress={() => props.onHotspot(hotspot)}
            style={({ pressed, hovered }) => [
              styles.abs,
              styles.hotspot,
              { left: cx - w / 2, top: cy - h / 2, width: w, height: h },
              (pressed || hovered || isFocused) && styles.hotspotActive,
            ]}
          >
            <View style={[styles.abs, { left: (hotspot.position.x * scale) - (cx - w / 2), top: (hotspot.position.y * scale) - (cy - h / 2) }]}>
              {pingFresh === hotspot.id ? <Pulse size={64} tone="ping" still={reducedMotion} /> : null}
              {!discovered ? <Pulse size={30} tone="idle" still={reducedMotion} /> : null}
              {collected || (hotspot.clueId === 'final' && view.solved) ? <View style={styles.check} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: 'relative', overflow: 'hidden', borderRadius: 18, backgroundColor: '#EFDCBF', alignSelf: 'center' },
  abs: { position: 'absolute' },
  hotspot: { borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  hotspotActive: { borderColor: 'rgba(252,252,251,0.9)', backgroundColor: 'rgba(252,252,251,0.12)' },
  pulse: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(252,252,251,0.95)', backgroundColor: 'rgba(252,252,251,0.18)' },
  pulsePing: { borderColor: color.halalPink, borderWidth: 3, backgroundColor: 'rgba(252,60,108,0.16)' },
  check: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 7,
    backgroundColor: color.gold,
    borderWidth: 2,
    borderColor: color.white,
  },
  nameTag: {
    position: 'absolute',
    bottom: -18,
    alignSelf: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(252,252,251,0.86)',
    maxWidth: 110,
  },
  nameTagMine: { backgroundColor: color.ink },
  nameText: { fontFamily: font.bodySemi, fontSize: 10, color: color.ink },
  nameTextMine: { color: color.white },
  devLabel: {
    position: 'absolute',
    left: 2,
    top: 2,
    fontSize: 8,
    color: '#0A0A0A',
    backgroundColor: 'rgba(255,240,120,0.85)',
    paddingHorizontal: 2,
  },
});
