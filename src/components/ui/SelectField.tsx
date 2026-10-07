import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { onDark, useSurfaceTone } from '@/theme/tone';
import { useI18n } from '@/i18n';
import { alpha, color, font, radius } from '@/theme/tokens';

export interface SelectFieldProps {
  label: string;
  /** What the member has chosen, already translated. Empty shows the placeholder. */
  value: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
  containerStyle?: ViewStyle;
  testID?: string;
}

/**
 * Reads as a text field, behaves as a button.
 *
 * Deliberately the same height, border and label as `Field`, so a form that
 * mixes typing and choosing does not look like two forms stitched together.
 * The chevron is the only thing that says "this one opens something".
 */
export function SelectField({
  label,
  value,
  placeholder,
  onPress,
  error,
  containerStyle,
  testID,
}: SelectFieldProps) {
  const { isRTL } = useI18n();
  const chosen = value.length > 0;
  const dark = useSurfaceTone() === 'dark';

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text variant="micro" style={styles.label}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${chosen ? value : placeholder}`}
        accessibilityHint={error || undefined}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          styles.control,
          isRTL && styles.controlRTL,
          dark && styles.controlDark,
          error && styles.controlError,
          pressed && (dark ? styles.controlPressedDark : styles.controlPressed),
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.value, dark && styles.valueDark, !chosen && (dark ? styles.placeholderDark : styles.placeholder)]}
        >
          {chosen ? value : placeholder}
        </Text>
        <Text style={[styles.chevron, isRTL && styles.chevronRTL]}>
          {isRTL ? '‹' : '›'}
        </Text>
      </Pressable>
      {error ? (
        <Text variant="caption" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, flexGrow: 1, flexShrink: 0, flexBasis: 'auto', minWidth: 130 },
  label: { letterSpacing: 2 },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 48,
    backgroundColor: color.surface,
  },
  controlDark: { backgroundColor: 'transparent', borderColor: onDark.lineStrong },
  controlPressedDark: { backgroundColor: onDark.fill },
  valueDark: { color: onDark.ink },
  placeholderDark: { color: onDark.quiet },
  controlRTL: { flexDirection: 'row-reverse' },
  controlPressed: { backgroundColor: color.sandLight },
  controlError: { borderColor: '#B3261E', borderWidth: 1.5 },
  value: { fontFamily: font.body, fontSize: 16, color: color.ink, flexShrink: 1 },
  placeholder: { color: color.whisper },
  chevron: { fontFamily: font.body, fontSize: 20, color: color.faintest, lineHeight: 20 },
  chevronRTL: {},
  // Red and bold: a missing answer should be impossible to scroll past.
  error: { color: '#B3261E', fontFamily: font.bodyBold },
});
