import Svg, { Circle, Path } from 'react-native-svg';

const SIZE = 15;

/** A head and shoulders, outlined. */
export function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
      <Circle cx={12} cy={7.5} r={5} />
      <Path d="M2.5 23.5c0-5.8 4.3-9.5 9.5-9.5s9.5 3.7 9.5 9.5" strokeLinecap="round" />
    </Svg>
  );
}

/** Three slider rails, each with a ringed knob at a different place. */
export function PreferencesIcon({ color }: { color: string }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
      <Path d="M1 4h3.2M9.8 4H23M1 12h14.2M19.8 12H23M1 20h7.2M12.8 20H23" />
      <Circle cx={7} cy={4} r={2.8} />
      <Circle cx={17} cy={12} r={2.8} />
      <Circle cx={10} cy={20} r={2.8} />
    </Svg>
  );
}
