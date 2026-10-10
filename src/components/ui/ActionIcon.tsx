import Svg, { Circle, Path } from 'react-native-svg';

export type ActionIconName =
  | 'close'
  | 'chevron-back'
  | 'chevron-forward'
  | 'ellipsis-horizontal'
  | 'refresh';

export function ActionIcon({
  name,
  color,
  size = 20,
}: {
  name: ActionIconName;
  color: string;
  size?: number;
}) {
  if (name === 'ellipsis-horizontal') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Circle cx={5} cy={12} r={1.7} />
        <Circle cx={12} cy={12} r={1.7} />
        <Circle cx={19} cy={12} r={1.7} />
      </Svg>
    );
  }

  if (name === 'refresh') {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M20 11a8 8 0 1 0 2 5.3" />
        <Path d="M20 5v6h-6" />
      </Svg>
    );
  }

  const path = name === 'close'
    ? 'M18 6 6 18M6 6l12 12'
    : name === 'chevron-back'
      ? 'm15 18-6-6 6-6'
      : 'm9 18 6-6-6-6';

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={path} />
    </Svg>
  );
}
