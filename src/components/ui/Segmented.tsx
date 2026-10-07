import type { ReactNode } from 'react';
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
