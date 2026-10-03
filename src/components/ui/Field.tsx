import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui/Text';
import { alpha, color, font, radius } from '@/theme/tokens';

export interface FieldProps extends TextInputProps {
  label: string;
  /** Validation message from react-hook-form / zod. */
  error?: string;
  containerStyle?: ViewStyle;
}

export function Field({
  label,
  error,
  containerStyle,
  style,
  multiline,
  ...rest
}: FieldProps) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text variant="micro" style={styles.label}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error || undefined}
        aria-invalid={!!error}
        placeholderTextColor={color.whisper}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, error && styles.inputError, style]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Grows to share a row, but never shrinks below its own content: `flex: 1`
  // let a stacked multiline field collapse under the label after it.
  wrap: { gap: 6, flexGrow: 1, flexShrink: 0, flexBasis: 'auto', minWidth: 130 },
  label: { letterSpacing: 2 },
  input: {
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontFamily: font.body,
    fontSize: 16,
    minHeight: 48,
    color: color.ink,
    backgroundColor: color.surface,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top', lineHeight: 21 },
  inputError: { borderColor: '#B3261E', borderWidth: 1.5 },
  // Red and bold: a missing answer should be impossible to scroll past.
  error: { color: '#B3261E', fontFamily: font.bodyBold },
});
