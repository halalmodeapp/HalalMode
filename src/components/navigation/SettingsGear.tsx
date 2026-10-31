import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useI18n } from '@/i18n';
import { guardNavigation } from '@/state/unsavedChanges';
import { color } from '@/theme/tokens';

/**
 * Settings, in the top right of every main screen. The gear gives a little
 * under the finger, then turns as the screen opens.
 */
export function SettingsGear() {
  const { t } = useI18n();
  const turn = useSharedValue(0);
  const press = useSharedValue(1);
  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }, { scale: press.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('you.tab.settings')}
      hitSlop={10}
      onPressIn={() => {
        press.value = withSpring(0.84, { damping: 14, stiffness: 300 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 7, stiffness: 220 });
      }}
      onPress={() => {
        void Haptics.selectionAsync();
        turn.value = withSpring(turn.value + 120, { damping: 11, stiffness: 110 });
        // With unsaved changes on Profile or Preferences, this asks first.
        guardNavigation(() => router.push('/settings' as never));
      }}
      style={styles.button}
    >
      <Animated.View style={spin}>
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
          {/* A plain black gear, drawn with a heavy line. */}
          <Circle cx={12} cy={12} r={3.2} stroke={color.ink} strokeWidth={2.4} />
          <Path
            d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"
            stroke={color.ink}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          <Circle cx={12} cy={12} r={6.6} stroke={color.ink} strokeWidth={2.4} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // No circle behind it: just the gear, in the same black as the wordmark.
  button: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
