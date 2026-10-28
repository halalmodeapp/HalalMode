import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useI18n } from '@/i18n';
import { guardNavigation } from '@/state/unsavedChanges';
import { alpha, color } from '@/theme/tokens';

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
      <Animated.Text style={[styles.glyph, spin]}>⚙︎</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha.lineFaint,
  },
  glyph: { fontSize: 17, lineHeight: 20, color: color.ink },
});
