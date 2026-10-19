import { ScrollView, type ScrollViewProps } from 'react-native';

/**
 * Keeps the native end-of-content rubber-band available even when a screen's
 * content is shorter than its viewport. iOS uses the bounce props; Android
 * uses overScrollMode.
 */
export function StretchScrollView({ children, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      bounces
      alwaysBounceVertical
      overScrollMode="always"
      {...props}
    >
      {children}
    </ScrollView>
  );
}
