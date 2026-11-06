import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { RTL_LAYOUT } from '@/lib/rtl';
import { alpha, color, radius, space } from '@/theme/tokens';

export interface KindChoiceSheetProps {
  visible: boolean;
  title: string;
  body: string;
  options: { value: string; label: string }[];
  /** The option that needs the member's own words. */
  writeOption?: string;
  placeholder: string;
  maxLength: number;
  /** What the choice will say, shown before it is sent. */
  preview?: (choice: string, note: string) => string | null;
  confirmLabel: string;
  cancelLabel: string;
  /** Whether confirming needs a choice. Without one it simply goes ahead with nothing chosen. */
  choiceRequired: boolean;
  /** A note is optional whatever is chosen, rather than only for the write-your-own option. */
  noteAlways?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: (choice: string | null, note: string) => void;
  onCancel: () => void;
  testID?: string;
}

/** A short choice, some words of the member's own, and a look at what it will say. */
export function KindChoiceSheet({
  visible,
  title,
  body,
  options,
  writeOption,
  placeholder,
  maxLength,
  preview,
  confirmLabel,
  cancelLabel,
  choiceRequired,
  noteAlways,
  busy,
  error,
  onConfirm,
  onCancel,
  testID,
}: KindChoiceSheetProps) {
  const { isRTL } = useI18n();
  const [choice, setChoice] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setChoice(null);
      setNote('');
    }
  }, [visible]);

  const writing = noteAlways || (writeOption !== undefined && choice === writeOption);
  const needsWords = writeOption !== undefined && choice === writeOption && !noteAlways;
  const ready = (!choiceRequired || choice !== null) && (!needsWords || note.trim().length > 0);
  const shown = choice && preview ? preview(choice, note.trim()) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} />
        <View accessibilityViewIsModal testID={testID} style={[styles.card, isRTL && styles.rtl]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text variant="displaySmall" center>{title}</Text>
            <Text variant="bodySmall" center style={styles.body}>{body}</Text>
            <View style={[styles.options, isRTL && styles.optionsRtl]}>
              {options.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={choice === option.value}
                  onPress={() => setChoice(option.value)}
                />
              ))}
            </View>
            {writing ? (
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={placeholder}
                placeholderTextColor={color.inkSoft}
                maxLength={maxLength}
                multiline
                textAlign={isRTL ? 'right' : 'left'}
                style={styles.input}
              />
            ) : null}
            {shown ? (
              <View style={styles.preview}>
                <Text variant="bodySmall">{shown}</Text>
              </View>
            ) : null}
            {error ? <Text variant="caption" center style={styles.error}>{error}</Text> : null}
            <View style={styles.stack}>
              <Button
                testID={testID ? `${testID}-confirm` : undefined}
                label={confirmLabel}
                disabled={!ready || busy}
                onPress={() => onConfirm(choice, note.trim())}
                style={styles.action}
              />
              <Button
                testID={testID ? `${testID}-cancel` : undefined}
                label={cancelLabel}
                variant="secondary"
                disabled={busy}
                onPress={onCancel}
                style={styles.action}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: alpha.scrim, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: { width: '100%', maxWidth: 440, maxHeight: '90%', backgroundColor: color.surface, borderRadius: radius.lg },
  rtl: RTL_LAYOUT,
  content: { padding: space.lg, gap: space.md },
  body: { color: color.inkSoft },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  optionsRtl: { flexDirection: 'row-reverse' },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: alpha.line,
    borderRadius: radius.md,
    padding: space.md,
    color: color.ink,
    textAlignVertical: 'top',
  },
  preview: { backgroundColor: color.sand, borderRadius: radius.md, padding: space.md },
  error: { color: color.halalPinkDeep },
  stack: { gap: space.sm },
  action: { alignSelf: 'stretch' },
});
