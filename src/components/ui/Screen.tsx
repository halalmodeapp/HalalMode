import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useBreakpoint } from '@/theme/breakpoints';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HalftoneHearts } from '@/components/ui/HalftoneHearts';
import { color } from '@/theme/tokens';

export interface ScreenProps {
  /** Optional so a screen can render its bare surface while data loads. */
  children?: ReactNode;
  /** Leave room for the floating tab bar. */
  withTabBar?: boolean;
  /** Dark screens (the match reveal's "Interest sent" overlay) invert the base. */
  dark?: boolean;
  style?: ViewStyle;
}

/** Tab bar height plus its bottom breathing room, from the reference's 82px rail. */
export const TAB_BAR_SPACE = 82;

export function Screen({ children, withTabBar, dark, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  // On wider screens the tab bar floats as an island with space beneath it,
  // so content keeps that much more clearance or the island sits on it.
  const islandLift = useBreakpoint() === 'phone' ? 0 : 24;

  return (
    <View
      style={[
        styles.base,
        dark && styles.dark,
        {
          paddingTop: insets.top,
          paddingBottom: withTabBar ? TAB_BAR_SPACE + islandLift + insets.bottom : insets.bottom,
        },
        style,
      ]}
    >
      {/* Faint pulsing hearts in the white, behind everything. */}
      {dark ? null : <HalftoneHearts />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: color.surface },
  dark: { backgroundColor: color.ink },
});
