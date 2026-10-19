import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { RcLength, RcSetting } from '@/halalCards/relationshipChallengeClaude/types';

/**
 * The plan cards' symbols, drawn in code so they are exact and never depend
 * on generated art. Each is always shown beside its word too: nothing relies
 * on shape or colour alone.
 */

const INK = '#2A2622';

export function SunGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={5} fill="#D7A43A" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <Rect key={angle} x={11} y={1} width={2} height={4} rx={1} fill="#D7A43A" transform={`rotate(${angle} 12 12)`} />
      ))}
    </Svg>
  );
}

export function MoonGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 3 A9 9 0 1 0 21 15 A7 7 0 1 1 15 3 Z" fill="#2E4E9E" />
    </Svg>
  );
}

export function SettingGlyph({ setting, size = 20 }: { setting: RcSetting; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {setting === 'outdoors' ? (
        <>
          <Path d="M12 2 L19 14 H5 Z" fill="#5E6B2C" />
          <Rect x={10.5} y={14} width={3} height={7} fill="#6E4A30" />
        </>
      ) : (
        <>
          <Path d="M3 11 L12 3 L21 11 Z" fill="#C5643C" />
          <Rect x={5} y={11} width={14} height={10} fill="#C5643C" />
          <Rect x={10} y={14} width={4} height={7} fill="#F3E6CF" />
        </>
      )}
    </Svg>
  );
}

export function LengthGlyph({ length, size = 20 }: { length: RcLength; size?: number }) {
  const bars = length === 'short' ? 1 : 3;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {[0, 1, 2].map((i) => (
        <Rect key={i} x={3 + i * 7} y={6} width={4} height={12} rx={1.5} fill={i < bars ? INK : 'rgba(42,38,34,0.16)'} />
      ))}
    </Svg>
  );
}
