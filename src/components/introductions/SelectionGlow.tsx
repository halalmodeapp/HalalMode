import { StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/** A gold edge and soft, wavy light that stays inside a selected portrait. */
export function SelectionGlow({
  identity,
  shape = 'circle',
}: {
  identity: string;
  shape?: 'circle' | 'card';
}) {
  const id = `selection-${identity.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const border = `${id}-edge`;
  const halo = `${id}-halo`;
  const bottom = `${id}-bottom`;
  const cornerRadius = shape === 'circle' ? 50 : 7;

  return (
    <Svg
      pointerEvents="none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <LinearGradient id={border} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F8E3A8" />
          <Stop offset="0.48" stopColor="#C9953D" />
          <Stop offset="1" stopColor="#FFF0C3" />
        </LinearGradient>
        <RadialGradient id={halo} cx="50%" cy="50%" r="72%">
          <Stop offset="0.57" stopColor="#F8D990" stopOpacity="0" />
          <Stop offset="0.84" stopColor="#E7BD68" stopOpacity="0.08" />
          <Stop offset="1" stopColor="#F7D990" stopOpacity="0.3" />
        </RadialGradient>
        <LinearGradient id={bottom} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F8D990" stopOpacity="0" />
          <Stop offset="0.55" stopColor="#E8BE70" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#F5D48D" stopOpacity="0.62" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="100" height="100" rx={cornerRadius} fill={`url(#${halo})`} />
      <Path
        d="M0 67 C16 60 27 73 43 68 C60 62 75 57 100 68 V100 H0 Z"
        fill={`url(#${bottom})`}
      />
      <Rect
        x="1.5"
        y="1.5"
        width="97"
        height="97"
        rx={cornerRadius - 1.5}
        fill="none"
        stroke="#F2D38F"
        strokeOpacity="0.3"
        strokeWidth="5"
      />
      <Rect
        x="1.5"
        y="1.5"
        width="97"
        height="97"
        rx={cornerRadius - 1.5}
        fill="none"
        stroke={`url(#${border})`}
        strokeWidth="2.2"
      />
    </Svg>
  );
}
