import {
  AlphaType,
  Canvas,
  ColorType,
  Picture,
  Skia,
  useImage,
  type SkImage,
  type SkPicture,
} from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { SPRITE, createEngine } from './heartsEngine';
import { CELL, INK, PAPER, dotRadius, inkFromPixels, photoFrame } from './heroLook';

const HERO = require('../../../assets/branding/landing-hero.webp');
const HEART = require('../../../assets/branding/chrome-heart.png');

const DOT_COLOR = Skia.Color(`rgba(${INK},.62)`);

/**
 * On phones: the chrome hearts over the halftone photo, drawn with Skia. Same
 * simulation and look as the web build (HalftoneHero.web.tsx): the photo is gold
 * dots that stay faint until a heart's wake swells them. Drag a heart to toss it.
 */
export function HalftoneHero() {
  const photo = useImage(HERO);
  const sprite = useImage(HEART);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const picture = useSharedValue<SkPicture>(emptyPicture());
  const engine = useRef(createEngine()).current;
  const ink = useRef(new Float32Array(0));
  const box = useRef({ width: 0, height: 0 });
  const drawn = useRef(false);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  // Re-grid the engine and re-sample the photo whenever the size or photo changes.
  useEffect(() => {
    if (!size.width || !size.height) return;
    box.current = size;
    engine.resize(size.width, size.height, CELL);
    if (photo) ink.current = samplePhoto(photo, engine.cols, engine.rows);
  }, [size, photo, engine]);

  useEffect(() => {
    if (!sprite || !size.width || !size.height) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(2.5, (now - last) / 16.667 || 1);
      last = now;
      engine.step(dt);
      picture.value = record(engine, ink.current, sprite, box.current.width, box.current.height, now);
      drawn.current = true;
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [sprite, size, engine, picture]);

  // A touch only becomes ours if it lands on a heart; anything else scrolls the page.
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) =>
        engine.grab(event.nativeEvent.locationX, event.nativeEvent.locationY, performance.now()),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (event) =>
        engine.drag(event.nativeEvent.locationX, event.nativeEvent.locationY, performance.now()),
      onPanResponderRelease: () => engine.release(performance.now()),
      onPanResponderTerminate: () => engine.release(performance.now()),
    }),
  ).current;

  return (
    <View style={styles.fill} onLayout={onLayout} {...responder.panHandlers}>
      <Canvas style={styles.fill} pointerEvents="none">
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}

function emptyPicture() {
  const recorder = Skia.PictureRecorder();
  recorder.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return recorder.finishRecordingAsPicture();
}

/** Downsample the photo to one pixel per dot, framed on the two faces. */
function samplePhoto(photo: SkImage, cols: number, rows: number) {
  const surface = Skia.Surface.MakeOffscreen(cols, rows);
  if (!surface) return new Float32Array(0);
  const frame = photoFrame(cols, rows, photo.width(), photo.height());
  surface
    .getCanvas()
    .drawImageRect(
      photo,
      Skia.XYWHRect(0, 0, photo.width(), photo.height()),
      Skia.XYWHRect(frame.left, frame.top, frame.width, frame.height),
      Skia.Paint(),
    );
  surface.flush();
  const pixels = surface
    .makeImageSnapshot()
    .readPixels(0, 0, { width: cols, height: rows, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul });
  return pixels ? inkFromPixels(pixels, cols * rows) : new Float32Array(0);
}

/** One frame: paper, the photo's dots (swollen where the wake is), then the hearts. */
function record(
  engine: ReturnType<typeof createEngine>,
  ink: Float32Array,
  sprite: SkImage,
  width: number,
  height: number,
  now: number,
) {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
  const paper = Skia.Paint();
  paper.setColor(Skia.Color(PAPER));
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paper);

  const { cols, rows, wake, halo } = engine;
  const dots = Skia.Path.Make();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const r = dotRadius(ink[k] ?? 0, wake[k]! + halo[k]!);
      if (r < 0.3) continue;
      dots.addCircle(i * CELL + CELL / 2, j * CELL + CELL / 2, r);
    }
  }
  const ink$ = Skia.Paint();
  ink$.setAntiAlias(true);
  ink$.setColor(DOT_COLOR);
  canvas.drawPath(dots, ink$);

  const shadowed = Skia.Paint();
  shadowed.setAntiAlias(true);
  shadowed.setImageFilter(Skia.ImageFilter.MakeDropShadow(0, 18, 13, 13, Skia.Color('rgba(24,34,56,.22)'), null));
  const source = (f: number) =>
    Skia.XYWHRect(
      (f % SPRITE.columns) * SPRITE.frameWidth,
      Math.floor(f / SPRITE.columns) * SPRITE.frameHeight,
      SPRITE.frameWidth,
      SPRITE.frameHeight,
    );
  const order = engine.hearts.slice().sort((a, b) => a.size - b.size);
  for (const h of order) {
    const bobX = Math.sin(now * 0.00055 + h.phase * 1.7) * 4;
    const bobY = Math.sin(now * 0.00085 + h.phase) * 7;
    const sway = Math.sin(now * 0.0007 + h.phase * 0.9) * 0.03;
    const drawnHeight = (h.size * SPRITE.frameHeight) / SPRITE.frameWidth;
    const deg = (rad: number) => (rad * 180) / Math.PI;
    canvas.save();
    canvas.translate(h.x + bobX, h.y + bobY);
    const grow = h.held ? 1.07 : 1;
    canvas.scale(grow, grow);
    canvas.rotate(deg(h.squashAxis), 0, 0);
    canvas.scale(1 - h.squash, 1 + h.squash * 0.6);
    canvas.rotate(-deg(h.squashAxis), 0, 0);
    canvas.rotate(deg(h.angle + sway), 0, 0);
    canvas.drawImageRect(
      sprite,
      source(engine.frameOf(h)),
      Skia.XYWHRect(-h.size / 2, -drawnHeight / 2, h.size, drawnHeight),
      shadowed,
    );
    canvas.restore();
  }
  return recorder.finishRecordingAsPicture();
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
