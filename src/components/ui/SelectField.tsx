import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
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
          error && styles.controlError,
          pressed && styles.controlPressed,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.value, !chosen && styles.placeholder]}
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
  wrap: { gap: 6, flex: 1, minWidth: 130 },
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
  controlRTL: { flexDirection: 'row-reverse' },
  controlPressed: { backgroundColor: color.sandLight },
  controlError: { borderColor: 'rgba(163,58,58,0.55)' },
  value: { fontFamily: font.body, fontSize: 16, color: color.ink, flexShrink: 1 },
  placeholder: { color: color.whisper },
  chevron: { fontFamily: font.body, fontSize: 20, color: color.faintest, lineHeight: 20 },
  chevronRTL: {},
  error: { color: '#8B2929' },
});
