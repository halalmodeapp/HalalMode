import { useEffect, useRef, useState, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { LTR_LAYOUT, LTR_WEB_PROPS } from '@/lib/rtl';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { color, font, radius } from '@/theme/tokens';

export interface SegmentedProps<T extends string> {
  /** An optional glyph shown before the label, like the tab bar's. */
  options: { value: T; label: string; icon?: string | ((color: string) => ReactNode) }[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
  animated?: boolean;
}

/** The pill-track tab switcher used on the You screen and its Private sub-tabs. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
  animated = false,
}: SegmentedProps<T>) {
  const { isRTL } = useI18n();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = options.findIndex(option => option.value === value);
  const visualIndex = isRTL ? options.length - 1 - index : index;
  const segmentWidth = Math.max(0, (width - 8 - (options.length - 1) * 2) / options.length);
  const left = 4 + visualIndex * (segmentWidth + 2);
  const position = useSharedValue(left);
  const laidOut = useRef(false);
  useEffect(() => {
    if (!animated || width === 0) return;
    position.value = reduced || !laidOut.current ? left : withTiming(left, { duration: 210 });
    laidOut.current = true;
  }, [animated, left, position, reduced, width]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));

  return (
    <View {...(animated ? LTR_WEB_PROPS : {})} style={[styles.track, animated && LTR_LAYOUT, isRTL && styles.rowReverse]} accessibilityRole="tablist" onLayout={animated ? event => setWidth(event.nativeEvent.layout.width) : undefined}>
      {animated && width > 0 ? <Animated.View pointerEvents="none" style={[styles.pill, { width: segmentWidth }, slide]} /> : null}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={testIDPrefix ? `${testIDPrefix}-${option.value}` : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && (!animated || width === 0) && styles.segmentActive]}
          >
            <View style={[styles.labelRow, isRTL && styles.rowReverse]}>
              {typeof option.icon === 'function' ? (
                <SegmentIcon icon={option.icon} active={active} animated={animated} reduced={reduced} />
              ) : option.icon ? (
                <Text style={[styles.icon, active && styles.iconActive]} accessibilityElementsHidden importantForAccessibility="no">
                  {option.icon}
                </Text>
              ) : null}
              <Text style={[styles.label, active && styles.labelActive]}>
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function SegmentIcon({ icon, active, animated, reduced }: {
  icon: (tint: string) => ReactNode;
  active: boolean;
  animated: boolean;
  reduced: boolean;
}) {
  const scale = useSharedValue(1);
  const wasActive = useRef(active);
  useEffect(() => {
    if (animated && !reduced && active && !wasActive.current) {
      scale.value = withSequence(withTiming(1.14, { duration: 90 }), withTiming(1, { duration: 155 }));
    } else if (!active || reduced) {
      scale.value = 1;
    }
    wasActive.current = active;
  }, [active, animated, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {icon(animated ? color.ink : active ? color.gold : color.faint)}
    </Animated.View>
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
  pill: { position: 'absolute', left: 0, top: 4, bottom: 4, borderRadius: radius.pill, backgroundColor: color.surface },
  segmentActive: { backgroundColor: color.surface },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  icon: { fontSize: 13, lineHeight: 16, color: color.faint },
  iconActive: { color: color.gold },
  label: { fontFamily: font.bodyMedium, fontSize: 12, color: color.faint },
  labelActive: { fontFamily: font.bodySemi, color: color.ink },
});
