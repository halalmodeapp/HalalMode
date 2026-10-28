import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { color, font, radius } from '@/theme/tokens';

export interface SegmentedProps<T extends string> {
  /** An optional glyph shown before the label, like the tab bar's. */
  options: { value: T; label: string; icon?: string | ((color: string) => ReactNode) }[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
}

/** A small pop when a segment becomes the chosen one (not on first show). */
function Pop({ active, children }: { active: boolean; children: ReactNode }) {
  const scale = useSharedValue(1);
  const shown = useRef(false);
  useEffect(() => {
    if (!shown.current) {
      shown.current = true;
      return;
    }
    if (active) scale.value = withSequence(withTiming(0.88, { duration: 80 }), withSpring(1, { damping: 6, stiffness: 260 }));
  }, [active, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** The pill-track tab switcher used on the You screen and its Private sub-tabs. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: SegmentedProps<T>) {
  const { isRTL } = useI18n();
  return (
    <View style={[styles.track, isRTL && styles.rowReverse]} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={testIDPrefix ? `${testIDPrefix}-${option.value}` : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Pop active={active}>
            <View style={[styles.labelRow, isRTL && styles.rowReverse]}>
              {typeof option.icon === 'function' ? (
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {option.icon(active ? color.gold : color.faint)}
                </View>
              ) : option.icon ? (
                <Text style={[styles.icon, active && styles.iconActive]} accessibilityElementsHidden importantForAccessibility="no">
                  {option.icon}
                </Text>
              ) : null}
              <Text style={[styles.label, active && styles.labelActive]}>
                {option.label}
              </Text>
            </View>
            </Pop>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: 'row-reverse' },
  track: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: color.sand,
    borderRadius: radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: color.surface },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  icon: { fontSize: 13, lineHeight: 16, color: color.faint },
  iconActive: { color: color.gold },
  label: { fontFamily: font.bodyMedium, fontSize: 12, color: color.faint },
  labelActive: { fontFamily: font.bodySemi, color: color.ink },
});
