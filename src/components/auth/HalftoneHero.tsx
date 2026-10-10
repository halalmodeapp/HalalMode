import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { SPRITE, createEngine, type Heart } from './heartsEngine';
import { CELL, INK, PAPER, dotRadius, photoFrame } from './heroLook';
import { PHOTO_LUMINANCE, PHOTO_LUMINANCE_HEIGHT, PHOTO_LUMINANCE_WIDTH } from './heroPhotoInk';

const HEART = require('../../../assets/branding/chrome-heart.png');
const HEART_ASPECT = SPRITE.frameHeight / SPRITE.frameWidth;

type HeroSize = { width: number; height: number };
type HeartFrame = {
  id: number;
  x: number;
  y: number;
  size: number;
  height: number;
  angle: number;
  squashAxis: number;
  squash: number;
  grow: number;
  spriteFrame: number;
};
type DrawingFrame = { dots: string; hearts: HeartFrame[] };

const EMPTY_FRAME: DrawingFrame = { dots: '', hearts: [] };

/** Native canvas-free version of the interactive halftone hero. */
export function HalftoneHero() {
  const photoInk = useRef(new Float32Array(0));
  const engineRef = useRef<ReturnType<typeof createEngine> | null>(null);
  if (!engineRef.current) engineRef.current = createEngine();
  const engine = engineRef.current;
  const [size, setSize] = useState<HeroSize>({ width: 0, height: 0 });
  const [restingDots, setRestingDots] = useState('');
  const [drawing, setDrawing] = useState<DrawingFrame>(EMPTY_FRAME);
  const cell = getCellSize(size);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => current.width === width && current.height === height ? current : { width, height });
  };

  useEffect(() => {
    if (!size.width || !size.height) return;
    engine.resize(size.width, size.height, cell);
    photoInk.current = samplePhoto(engine.cols, engine.rows);
    setRestingDots(dotsPath(engine, photoInk.current, false));
    setDrawing(EMPTY_FRAME);
  }, [engine, size.width, size.height, cell]);

  useEffect(() => {
    if (!size.width || !size.height) return;
    let animationFrame = 0;
    let last = performance.now();

    const loop = (now: number) => {
      animationFrame = requestAnimationFrame(loop);
      const elapsed = Math.max(0, now - last);
      last = now;
      engine.step(Math.min(2.5, elapsed / 16.667 || 1));
      setDrawing({
        dots: dotsPath(engine, photoInk.current, true),
        hearts: engine.hearts
          .slice()
          .sort((a, b) => a.size - b.size)
          .map((heart, id) => heartFrame(heart, id, now, engine.frameOf(heart))),
      });
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [engine, size.width, size.height]);

  const responder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: (event) =>
        engine.grab(event.nativeEvent.locationX, event.nativeEvent.locationY, performance.now()),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (event) =>
        engine.drag(event.nativeEvent.locationX, event.nativeEvent.locationY, performance.now()),
      onPanResponderRelease: () => engine.release(performance.now()),
      onPanResponderTerminate: () => engine.release(performance.now()),
    }),
    [engine],
  );

  return (
    <View style={[styles.fill, styles.paper]} onLayout={onLayout} {...responder.panHandlers}>
      {size.width > 0 && size.height > 0 && (
        <Svg
          pointerEvents="none"
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={styles.fill}
        >
          <Path d={restingDots} fill={`rgba(${INK},.62)`} />
          <Path d={drawing.dots} fill={`rgba(${INK},.62)`} fillRule="nonzero" />
        </Svg>
      )}
      {drawing.hearts.map((heart) => <HeartSprite key={heart.id} heart={heart} />)}
    </View>
  );
}

function HeartSprite({ heart }: { heart: HeartFrame }) {
  const column = heart.spriteFrame % SPRITE.columns;
  const row = Math.floor(heart.spriteFrame / SPRITE.columns);
  const spriteWidth = heart.size * SPRITE.columns;
  const spriteHeight = heart.height * SPRITE.rows;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.heart,
        {
          left: heart.x - heart.size / 2,
          top: heart.y - heart.height / 2,
          width: heart.size,
          height: heart.height,
          transform: [
            { scale: heart.grow },
            { rotate: `${heart.squashAxis}rad` },
            { scaleX: 1 - heart.squash },
            { scaleY: 1 + heart.squash * 0.6 },
            { rotate: `${-heart.squashAxis}rad` },
            { rotate: `${heart.angle}rad` },
          ],
        },
      ]}
    >
      <View style={[styles.spriteWindow, { width: heart.size, height: heart.height }]}>
        <Image
          source={HEART}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            width: spriteWidth,
            height: spriteHeight,
            left: -column * heart.size,
            top: -row * heart.height,
          }}
        />
      </View>
    </View>
  );
}

function heartFrame(heart: Heart, id: number, now: number, spriteFrame: number): HeartFrame {
  const bobX = Math.sin(now * 0.00055 + heart.phase * 1.7) * 4;
  const bobY = Math.sin(now * 0.00085 + heart.phase) * 7;
  const sway = Math.sin(now * 0.0007 + heart.phase * 0.9) * 0.03;
  return {
    id,
    x: heart.x + bobX,
    y: heart.y + bobY,
    size: heart.size,
    height: heart.size * HEART_ASPECT,
    angle: heart.angle + sway,
    squashAxis: heart.squashAxis,
    squash: heart.squash,
    grow: heart.held ? 1.07 : 1,
    spriteFrame,
  };
}

function getCellSize(size: HeroSize) {
  if (!size.width || !size.height) return CELL;
  // Keep a fine, face-resolving grid on phones; larger views scale cell size
  // with area so vector drawing stays light on tablets and landscape screens.
  const targetCountCell = Math.sqrt((size.width * size.height) / 5200);
  return Math.max(size.width < 520 ? 5.5 : CELL, targetCountCell);
}

function samplePhoto(cols: number, rows: number) {
  const samples = new Float32Array(cols * rows);
  const frame = photoFrame(cols, rows, PHOTO_LUMINANCE_WIDTH, PHOTO_LUMINANCE_HEIGHT);

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const sourceX = clamp(((i + 0.5 - frame.left) / frame.width) * PHOTO_LUMINANCE_WIDTH, 0, PHOTO_LUMINANCE_WIDTH - 1);
      const sourceY = clamp(((j + 0.5 - frame.top) / frame.height) * PHOTO_LUMINANCE_HEIGHT, 0, PHOTO_LUMINANCE_HEIGHT - 1);
      const left = Math.floor(sourceX);
      const top = Math.floor(sourceY);
      const right = Math.min(PHOTO_LUMINANCE_WIDTH - 1, left + 1);
      const bottom = Math.min(PHOTO_LUMINANCE_HEIGHT - 1, top + 1);
      const fx = sourceX - left;
      const fy = sourceY - top;
      const upper = PHOTO_LUMINANCE[top * PHOTO_LUMINANCE_WIDTH + left]! * (1 - fx)
        + PHOTO_LUMINANCE[top * PHOTO_LUMINANCE_WIDTH + right]! * fx;
      const lower = PHOTO_LUMINANCE[bottom * PHOTO_LUMINANCE_WIDTH + left]! * (1 - fx)
        + PHOTO_LUMINANCE[bottom * PHOTO_LUMINANCE_WIDTH + right]! * fx;
      const light = (upper * (1 - fy) + lower * fy) / 255;
      // Give midtones enough contrast to resolve the faces from the quiet
      // paper texture, especially on a phone held at normal viewing distance.
      samples[j * cols + i] = clamp((1 - light - 0.12) * 1.45, 0, 1);
    }
  }
  return samples;
}

function dotsPath(engine: ReturnType<typeof createEngine>, ink: Float32Array, includeWake: boolean) {
  const { cols, rows, wake, halo } = engine;
  const path: string[] = [];
  const cell = engine.cell;

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const baseRadius = dotRadius(ink[k] ?? 0, 0, cell);
      const radius = includeWake
        ? dotRadius(ink[k] ?? 0, Math.min(1, wake[k]! + halo[k]!), cell)
        : baseRadius;
      // Draw only the growing edge over the faint resting dots. Quantizing to
      // tenths and dropping small changes made dots visibly pop as they grew.
      if (radius < 0.3 || (includeWake && radius - baseRadius <= 0.01)) continue;
      const x = i * cell + cell / 2;
      const y = j * cell + cell / 2;
      const r = radius.toFixed(2);
      const diameter = (radius * 2).toFixed(2);
      path.push(`M${(x - radius).toFixed(2)},${y.toFixed(2)}a${r},${r} 0 1,0 ${diameter},0a${r},${r} 0 1,0 -${diameter},0`);
      if (includeWake) {
        const inner = baseRadius.toFixed(2);
        const innerDiameter = (baseRadius * 2).toFixed(2);
        path.push(`M${(x - baseRadius).toFixed(2)},${y.toFixed(2)}a${inner},${inner} 0 1,1 ${innerDiameter},0a${inner},${inner} 0 1,1 -${innerDiameter},0`);
      }
    }
  }
  return path.join('');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  paper: { backgroundColor: PAPER },
  heart: {
    position: 'absolute',
    overflow: 'visible',
    shadowColor: 'rgba(24,34,56,0.22)',
    shadowOpacity: 0.22,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  spriteWindow: { overflow: 'hidden' },
});
