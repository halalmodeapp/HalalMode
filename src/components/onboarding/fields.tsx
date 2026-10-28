import { type ComponentProps, type RefObject } from 'react';
import { TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { color } from '@/theme/tokens';
import { styles } from './styles';

export function StepHeading({ title, body }: { title: string; body: string }) {
  return (
    <View>
      <Text variant="display" style={styles.title}>{title}</Text>
      <Text variant="body" style={styles.copy}>{body}</Text>
    </View>
  );
}

export function Field({
  label,
  error,
  ...props
}: { label: string; error?: string } & ComponentProps<typeof TextInput>) {
  const { isRTL } = useI18n();
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={color.faintest}
        style={[styles.input, isRTL && styles.inputRTL, error && styles.inputError]}
      />
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}

export function DatePart(
  props: ComponentProps<typeof TextInput> & {
    label: string;
    kind: 'day' | 'month' | 'year';
    inputRef?: RefObject<TextInput | null>;
  }
) {
  const { t, isRTL } = useI18n();
  const { label, kind, inputRef, ...inputProps } = props;
  return (
    <View style={styles.datePart}>
      <Text variant="caption">{label}</Text>
      <TextInput
        {...inputProps}
        ref={inputRef}
        accessibilityLabel={t('onboarding.birthPartLabel', { part: label })}
        keyboardType="number-pad"
        placeholder={kind === 'year' ? 'YYYY' : kind === 'month' ? 'MM' : 'DD'}
        placeholderTextColor={color.faintest}
        style={[styles.input, styles.dateInput, isRTL && styles.inputRTL]}
      />
    </View>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.errorText}
    >
      {message}
    </Text>
  );
}

export function InfoRow({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoMark} />
      <View style={styles.infoText}>
        <Text variant="label">{title}</Text>
        <Text variant="bodySmall">{body}</Text>
      </View>
    </View>
  );
}

export function ReviewRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewLabelRow}>
        <Text variant="caption">{label}</Text>
        {note ? <Text style={styles.privateTag}>{note}</Text> : null}
      </View>
      <Text variant="label" style={styles.reviewValue}>{value}</Text>
    </View>
  );
}
