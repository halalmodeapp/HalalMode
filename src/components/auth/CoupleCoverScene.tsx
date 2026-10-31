import { useEffect, useMemo, type ReactNode } from 'react';
import { Image, PanResponder, StyleSheet, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { TILT_STILL, baselineStep, turnRate } from '@/lib/tiltBaseline';
import { COUPLE_SCENE_ASSETS } from './coupleLayerAssets';
import { COUPLE_SCENE_LAYERS, COUPLE_SUN, COUPLE_WORLD, type CoupleSceneLayer } from './coupleSceneLayers';
import { COUPLE_TILT, coupleCamera, coupleParallax, type CoupleCamera } from './coupleSceneLayout';
import { rubberBandOffset } from './coverMotion';

const COUPLE_HALFTONE_TILE = require('../../../assets/couple-scene/halftone-tile.png');

type CoupleCoverSceneProps = {
  width: number;
  height: number;
  active: boolean;
};

type Tilt = { x: SharedValue<number>; y: SharedValue<number> };

const BACKDROP = COUPLE_SCENE_LAYERS.find((layer) => layer.key === 'sky')!;
/** Broad light shafts, as angles clockwise from straight down, and their half-widths. */
const RAYS = [[9, 4.5], [31, 3], [58, 5.5], [85, 3.5]] as const;
const RAY_LENGTH = 760;
const MOTES = [
  { x: 880, y: 330, delay: 0, duration: 19000 },
  { x: 1010, y: 290, delay: 4000, duration: 23000 },
  { x: 1190, y: 360, delay: 9000, duration: 19000 },
  { x: 1260, y: 250, delay: 6000, duration: 21000 },
  { x: 1080, y: 400, delay: 14000, duration: 24000 },
] as const;

/**
 * The couple cover: separately painted layers placed by a single world camera,
 * each at its own depth. The man, the woman and the heart share the stairs'
 * depth, so tilt moves them together and the couple stays seated on the steps.
 */
export function CoupleCoverScene({ width, height, active }: CoupleCoverSceneProps) {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const float = useSharedValue(0);
  const tilt = useMemo(() => ({ x: tiltX, y: tiltY }), [tiltX, tiltY]);
  const camera = useMemo(() => coupleCamera(width, height), [width, height]);

  const heartPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      dragX.value = 0;
      dragY.value = 0;
      pressScale.value = 0.97;
    },
    onPanResponderMove: (_event, gesture) => {
      dragX.value = rubberBandOffset(gesture.dx, width * 0.22);
      dragY.value = rubberBandOffset(gesture.dy, height * 0.2);
    },
    onPanResponderRelease: () => {
      dragX.value = withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) });
      dragY.value = withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) });
      pressScale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
    },
    onPanResponderTerminate: () => {
      dragX.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) });
      dragY.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) });
      pressScale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
    },
  }), [dragX, dragY, pressScale, width, height]);

  // The heart drifts gently in place, between the two hands.
  useEffect(() => {
    if (!active) {
      cancelAnimation(float);
      float.value = withTiming(0, { duration: 400 });
      return;
    }
    float.value = withRepeat(withTiming(1, { duration: 4800, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(float);
  }, [active, float]);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value + (2 - 5.5 * float.value) * camera.unit },
      { rotate: `${-2.5 + 4.5 * float.value}deg` },
      { scale: pressScale.value },
    ],
  }), [camera.unit]);

  if (width <= 0 || height <= 0) return <View pointerEvents="none" style={styles.scene} />;
  const { unit } = camera;

  return (
    <View pointerEvents="box-none" style={styles.scene}>
      <View pointerEvents="box-none" style={[styles.world, { left: camera.left, top: camera.top, width: COUPLE_WORLD.width * unit, height: COUPLE_WORLD.height * unit }]}>
        {COUPLE_SCENE_LAYERS.map((layer) => (
          <SceneLayer key={layer.key} layer={layer} camera={camera} tilt={tilt}>
            {layer.key === 'heart' ? (
              <Reanimated.View
                {...heartPanResponder.panHandlers}
                pointerEvents="box-only"
                hitSlop={14}
                style={[styles.heart, heartStyle]}
              >
                <Image source={COUPLE_SCENE_ASSETS.heart} fadeDuration={0} resizeMode="stretch" style={styles.image} />
              </Reanimated.View>
            ) : (
              <Image source={COUPLE_SCENE_ASSETS[layer.key]} fadeDuration={0} resizeMode="stretch" style={styles.image} />
            )}
            {layer.key === 'sky' ? <SceneLight camera={camera} active={active} /> : null}
          </SceneLayer>
        ))}
      </View>
      {/* A still halftone texture over the picture: a tiny tile the phone repeats, no animation, no per-frame work. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={COUPLE_HALFTONE_TILE} fadeDuration={0} resizeMode="repeat" style={styles.image} />
      </View>
      {active ? <NativeCoverTiltSensor tiltX={tiltX} tiltY={tiltY} /> : null}
    </View>
  );
}

function SceneLayer({ layer, camera, tilt, children }: {
  layer: CoupleSceneLayer;
  camera: CoupleCamera;
  tilt: Tilt;
  children?: ReactNode;
}) {
  const { unit } = camera;
  const animatedStyle = useAnimatedStyle(() => {
    const offset = coupleParallax(layer.depth, tilt.x.value, tilt.y.value, unit);
    return { transform: [{ translateX: offset.x }, { translateY: offset.y }] };
  }, [layer.depth, unit]);
  return (
    <Reanimated.View
      pointerEvents="box-none"
      style={[styles.layer, {
        left: layer.x * unit,
        top: layer.y * unit,
        width: layer.width * unit,
        height: layer.height * unit,
      }, animatedStyle]}
    >
      {children}
    </Reanimated.View>
  );
}

/** Warm glow and a few broad shafts from the sun, drawn on the sky plate only. */
function SceneLight({ camera, active }: { camera: CoupleCamera; active: boolean }) {
  const { unit } = camera;
  // Positions inside the sky layer's own box.
  const sunX = COUPLE_SUN.x - BACKDROP.x;
  const sunY = COUPLE_SUN.y - BACKDROP.y;
  const rays = RAYS.map(([angle, spread]) => {
    const toPoint = (degrees: number) => {
      const radians = (degrees * Math.PI) / 180;
      return `${(sunX - Math.sin(radians) * RAY_LENGTH).toFixed(1)},${(sunY + Math.cos(radians) * RAY_LENGTH).toFixed(1)}`;
    };
    return `M${sunX},${sunY}L${toPoint(angle - spread)}L${toPoint(angle + spread)}Z`;
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${BACKDROP.width} ${BACKDROP.height}`}>
        <Defs>
          <RadialGradient id="couple-ray" cx={sunX} cy={sunY} r={RAY_LENGTH} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFF4D6" stopOpacity={0.3} />
            <Stop offset="0.45" stopColor="#FFF4D6" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#FFF4D6" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="couple-glow" cx={sunX} cy={sunY} r={230} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFF7DE" stopOpacity={0.55} />
            <Stop offset="0.38" stopColor="#FFEEC4" stopOpacity={0.26} />
            <Stop offset="0.66" stopColor="#FFE2A0" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#FFE2A0" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {rays.map((d) => <Path key={d} d={d} fill="url(#couple-ray)" />)}
        <Path d={`M${sunX - 230},${sunY}a230,230 0 1,0 460,0a230,230 0 1,0 -460,0`} fill="url(#couple-glow)" />
      </Svg>
      {active ? MOTES.map((mote) => (
        <Mote key={mote.x} x={(mote.x - BACKDROP.x) * unit} y={(mote.y - BACKDROP.y) * unit} unit={unit} delay={mote.delay} duration={mote.duration} />
      )) : null}
    </View>
  );
}

/** A single slow dust mote: drifts up and out of the light, then fades. */
function Mote({ x, y, unit, delay, duration }: { x: number; y: number; unit: number; delay: number; duration: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(progress);
  }, [delay, duration, progress]);
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const opacity = t < 0.18 ? (t / 0.18) * 0.75 : t < 0.7 ? 0.75 - ((t - 0.18) / 0.52) * 0.25 : 0.5 * (1 - (t - 0.7) / 0.3);
    return { opacity, transform: [{ translateX: -26 * unit * t }, { translateY: -70 * unit * t }] };
  }, [unit]);
  const size = 6 * unit;
  return <Reanimated.View style={[styles.mote, { left: x, top: y, width: size, height: size, borderRadius: size / 2 }, style]} />;
}

function NativeCoverTiltSensor({ tiltX, tiltY }: { tiltX: SharedValue<number>; tiltY: SharedValue<number> }) {
  const rotation = useAnimatedSensor(SensorType.ROTATION, { interval: 20, adjustToInterfaceOrientation: true });
  const basePitch = useSharedValue<number | null>(null);
  const baseRoll = useSharedValue<number | null>(null);
  const lastAt = useSharedValue(0);
  const lastPitch = useSharedValue(0);
  const lastRoll = useSharedValue(0);
  const movedAt = useSharedValue(0);

  useEffect(() => {
    basePitch.value = null;
    baseRoll.value = null;
    lastAt.value = 0;
    return () => {
      tiltX.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
      tiltY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    };
  }, [basePitch, baseRoll, lastAt, lastPitch, lastRoll, movedAt, tiltX, tiltY]);

  useAnimatedReaction(
    () => ({ pitch: rotation.sensor.value.pitch, roll: rotation.sensor.value.roll }),
    ({ pitch, roll }) => {
      'worklet';
      if (!Number.isFinite(pitch) || !Number.isFinite(roll)) return;
      const now = Date.now();
      const elapsed = lastAt.value === 0 ? 0 : now - lastAt.value;
      lastAt.value = now;
      if (basePitch.value === null || baseRoll.value === null) {
        basePitch.value = pitch;
        baseRoll.value = roll;
        lastPitch.value = pitch;
        lastRoll.value = roll;
        movedAt.value = now;
        return;
      }
      // Real movement keeps the baseline where it is; holding still lets it go.
      const turned = turnRate(
        Math.atan2(Math.sin(pitch - lastPitch.value), Math.cos(pitch - lastPitch.value)),
        Math.atan2(Math.sin(roll - lastRoll.value), Math.cos(roll - lastRoll.value)),
        elapsed,
      );
      lastPitch.value = pitch;
      lastRoll.value = roll;
      if (turned > TILT_STILL.rate) movedAt.value = now;
      const pitchDelta = Math.atan2(Math.sin(pitch - basePitch.value), Math.cos(pitch - basePitch.value));
      const rollDelta = Math.atan2(Math.sin(roll - baseRoll.value), Math.cos(roll - baseRoll.value));
      const degrees = 180 / Math.PI;
      // A small tilt reaches full travel, and travel goes further than hover
      // would; the easing still keeps hand tremor out.
      const { degrees: full, gain, ease } = COUPLE_TILT;
      tiltX.value += (clampNumber((rollDelta * degrees) / full, -gain, gain) - tiltX.value) * ease;
      tiltY.value += (clampNumber((-pitchDelta * degrees) / full, -gain, gain) - tiltY.value) * ease;
      // Held nearly still, the baseline moves to meet the phone and the scene
      // settles back to centre in about a second.
      const settle = baselineStep(elapsed, now - movedAt.value);
      basePitch.value += pitchDelta * settle;
      baseRoll.value += rollDelta * settle;
    },
  );

  return null;
}

function clampNumber(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  scene: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: '#2F6BD8' },
  world: { position: 'absolute', overflow: 'visible' },
  layer: { position: 'absolute', overflow: 'visible' },
  image: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  heart: { ...StyleSheet.absoluteFill, overflow: 'visible' },
  mote: { position: 'absolute', backgroundColor: 'rgba(255,248,226,0.9)' },
});
