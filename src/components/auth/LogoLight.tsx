import { StyleSheet, View, type DimensionValue } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Eased falloff, matching the landing page's shadow behind the white logo. */
const STOPS = [
  [0, 0.58], [0.18, 0.55], [0.3, 0.49], [0.41, 0.41], [0.51, 0.32],
  [0.61, 0.23], [0.71, 0.14], [0.81, 0.07], [0.91, 0.02], [1, 0],
] as const;

/**
 * Soft shade behind the white wordmark: darkest in the top-left corner, then an
 * elliptical fade that ends exactly at its own right and bottom edges, so it
 * reads as shade on the illustration rather than a panel behind the logo.
 * `mirrored` anchors it top-right, for layouts that flip the header in RTL.
 */
export function LogoLight({ width, maxWidth, height, mirrored = false }: {
  width: DimensionValue;
  maxWidth?: number;
  height: number;
  mirrored?: boolean;
}) {
  return (
    <View pointerEvents="none" style={[styles.corner, mirrored ? styles.right : styles.left, { width, maxWidth, height }]}>
      <Svg width="100%" height="100%">
        <Defs>
          {/* In bounding-box units a radius of 1 is an ellipse that reaches the
              far edges exactly, whatever the box's proportions. */}
          <RadialGradient id="logo-light" cx={mirrored ? 1 : 0} cy={0} r={1} fx={mirrored ? 1 : 0} fy={0}>
            {STOPS.map(([offset, opacity]) => (
              <Stop key={offset} offset={offset} stopColor="#0A0A0A" stopOpacity={opacity} />
            ))}
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#logo-light)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', top: 0 },
  left: { left: 0 },
  right: { right: 0 },
});
