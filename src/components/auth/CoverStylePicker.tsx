import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CoverStyle } from './coverStyle';

type CoverStylePickerProps = {
  value: CoverStyle;
  labels: { label: string; hearts: string; couple: string };
  onChange: (style: CoverStyle) => void;
  fontFamily: string;
};

const OPTIONS: { key: CoverStyle; label: keyof CoverStylePickerProps['labels'] }[] = [
  { key: 'couple', label: 'couple' },
  { key: 'hearts', label: 'hearts' },
];

export function CoverStylePicker({ value, labels, onChange, fontFamily }: CoverStylePickerProps) {
  return (
    <View accessibilityLabel={labels.label} style={styles.group}>
      {OPTIONS.map(({ key, label }) => {
        const selected = value === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={labels[label]}
            accessibilityState={{ selected }}
            onPress={() => onChange(key)}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
          >
            <Text numberOfLines={1} style={[styles.label, { fontFamily }, selected && styles.selectedLabel]}>
              {labels[label]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(184,145,79,0.2)',
    backgroundColor: 'rgba(252,252,251,0.9)',
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  option: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 999 },
  selected: { backgroundColor: '#0A0A0A' },
  pressed: { opacity: 0.72 },
  label: { color: '#3B3934', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  selectedLabel: { color: '#FCFCFB' },
});
