import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useI18n } from '@/i18n';
import { guardNavigation } from '@/state/unsavedChanges';
import { color } from '@/theme/tokens';

/** The gear's outline: eight square-shouldered teeth around a ring. */
const TEETH = 8;
const ROOT = 8.1;
const TIP = 10.7;
function polar(radius: number, degrees: number): string {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return `${(12 + radius * Math.cos(radians)).toFixed(2)} ${(12 + radius * Math.sin(radians)).toFixed(2)}`;
}
const GEAR_PATH = (() => {
  const parts: string[] = [];
  for (let k = 0; k < TEETH; k += 1) {
    const centre = (360 / TEETH) * k;
    parts.push(
      `${k === 0 ? 'M' : 'L'}${polar(ROOT, centre - 13)}`,
      `L${polar(TIP, centre - 8)}`,
      `L${polar(TIP, centre + 8)}`,
      `L${polar(ROOT, centre + 13)}`,
      // Along the root of the gear to the next tooth.
      `A${ROOT} ${ROOT} 0 0 1 ${polar(ROOT, (360 / TEETH) * (k + 1) - 13)}`,
    );
  }
  return `${parts.join(' ')} Z`;
})();

/**
 * Settings, in the top right of every main screen: an outline gear in Halal Gold.
 * It dims a little under the finger and nothing more.
 */
export function SettingsGear() {
  const { t } = useI18n();
  const dim = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: dim.value }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('you.tab.settings')}
      hitSlop={10}
      onPressIn={() => {
        dim.value = withTiming(0.45, { duration: 90 });
      }}
      onPressOut={() => {
        dim.value = withTiming(1, { duration: 140 });
      }}
      onPress={() => {
        void Haptics.selectionAsync();
        // With edits waiting on Profile or Preferences, they are sent first.
        guardNavigation(() => router.push('/settings' as never));
      }}
      style={styles.button}
    >
      <Animated.View style={style}>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <Path d={GEAR_PATH} stroke={color.gold} strokeWidth={2.2} strokeLinejoin="round" />
          <Circle cx={12} cy={12} r={3.9} stroke={color.gold} strokeWidth={2.2} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // No circle behind it: just the gear, in Halal Gold.
  button: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
