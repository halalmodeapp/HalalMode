import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { color } from '@/theme/tokens';

type CoupleCoverBackgroundProps = {
  width: number;
  height: number;
};

/** Responsive editorial backdrop. Geometry is recalculated for the actual hero aspect ratio. */
export function CoupleCoverBackground({ width, height }: CoupleCoverBackgroundProps) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const center = w / 2;
  const archRadius = Math.min(w * 0.47, h * 0.52);
  const archLeft = center - archRadius;
  const archRight = center + archRadius;
  const archTop = h * 0.04;
  const archSpring = archTop + archRadius;
  const archBottom = h * 0.91;
  const archPath = [
    `M ${archLeft} ${archBottom}`,
    `L ${archLeft} ${archSpring}`,
    `A ${archRadius} ${archRadius} 0 0 1 ${archRight} ${archSpring}`,
    `L ${archRight} ${archBottom} Z`,
  ].join(' ');
  const duneRadius = Math.min(h * 0.43, w * 0.35);
  const plantScale = Math.min(w * 0.15 / 120, h * 0.29 / 180);
  const plantY = h * 0.66;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <Rect x={0} y={0} width={w} height={h} fill={color.sand} />
      <Circle cx={w * 0.015} cy={h * 0.72} r={duneRadius} fill={color.coverDune} />
      <Circle cx={w * 0.985} cy={h * 0.72} r={duneRadius} fill={color.coverDune} />
      <Path d={archPath} fill={color.surface} />
      <Rect x={0} y={h * 0.88} width={w} height={h * 0.12} fill={color.coverGround} />
      <PlantSilhouette x={w * 0.035} y={plantY} scale={plantScale} />
      <PlantSilhouette x={w * 0.965 - 120 * plantScale} y={plantY} scale={plantScale} mirrored />
    </Svg>
  );
}

function PlantSilhouette({ x, y, scale, mirrored = false }: { x: number; y: number; scale: number; mirrored?: boolean }) {
  const transform = mirrored
    ? `translate(${x + 120 * scale} ${y}) scale(${-scale} ${scale})`
    : `translate(${x} ${y}) scale(${scale})`;
  return (
    <G transform={transform}>
      <Path d="M60 151 C58 125 56 94 59 58 M59 118 C43 101 32 84 29 64 M59 104 C77 88 87 69 89 48 M58 81 C46 66 43 48 46 31 M61 68 C68 51 69 34 65 18" fill="none" stroke="#3D5B4D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
      <Path d="M58 94 C34 94 18 79 13 57 C36 58 54 70 58 94Z M62 83 C64 59 80 43 101 38 C99 62 85 78 62 83Z M57 67 C39 58 31 42 33 23 C51 31 61 46 57 67Z M64 55 C64 36 74 21 91 13 C94 33 83 49 64 55Z" fill="#567769" stroke="#3D5B4D" strokeLinejoin="round" strokeWidth="1.5" />
      <Path d="M18 59 C34 62 47 72 56 89 M99 40 C84 47 73 59 64 80 M35 26 C46 34 53 45 56 62 M89 16 C78 25 70 37 65 52" fill="none" stroke="#89A091" strokeLinecap="round" strokeWidth="2.2" />
      <Path d="M44 148 L76 148 L71 178 Q60 184 49 178 Z" fill="#A47749" stroke="#805B39" strokeLinejoin="round" strokeWidth="1.5" />
      <Rect x="39" y="145" width="42" height="9" rx="4" fill="#C09159" stroke="#805B39" strokeWidth="1.5" />
      <Path d="M48 159 L72 159" fill="none" stroke="#C09159" strokeLinecap="round" strokeWidth="2" />
    </G>
  );
}
