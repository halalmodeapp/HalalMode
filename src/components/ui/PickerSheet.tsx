import { FlashList } from '@shopify/flash-list';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { optionLabel, searchGroups, type CatalogGroup } from '@/data/catalogOption';
import { useI18n } from '@/i18n';
import { RTL_LAYOUT } from '@/lib/rtl';
import { alpha, color, font, layout, radius, space } from '@/theme/tokens';

export interface PickerSheetProps {
  visible: boolean;
  groups: readonly CatalogGroup[];
  /** Stored ids, not labels. */
  selected: readonly string[];
  onChange: (next: string[]) => void;
  onClose: () => void;
  selectionMode?: 'single' | 'multiple';
  /** Multiple mode only: further taps are ignored once this many are chosen. */
  maxSelected?: number;
  title: string;
  eyebrow: string;
  searchLabel: string;
  applyLabel?: string;
  /** Lets the member choose nothing at all, for a field that is optional. */
  clearLabel?: string;
  testID?: string;
}

type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'option'; key: string; id: string; label: string };

/**
 * A long list, made findable.
 *
 * The same sheet serves professions, education, and anything else with more
 * options than a member should have to scroll past. Grouped, because two
 * hundred flat entries is a wall; searchable, because the group a member
 * expects is not always the group a list-maker chose.
 *
 * Selecting in single mode closes the sheet straight away. Making somebody
 * tap their answer and then tap "Apply" is a confirmation of something they
 * can already see they did.
 */
export function PickerSheet({
  visible,
  groups,
  selected,
  onChange,
  onClose,
  selectionMode = 'single',
  maxSelected,
  title,
  eyebrow,
  searchLabel,
  applyLabel,
  clearLabel,
  testID,
}: PickerSheetProps) {
  const { t, isRTL, language } = useI18n();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<readonly string[]>(selected);
  const isSingle = selectionMode === 'single';

  useEffect(() => {
    if (visible) {
      setPending(selected);
      setSearch('');
    }
  }, [selected, visible]);

  const rows = useMemo<Row[]>(() => {
    const filtered = searchGroups(groups, search, language);
    const flat: Row[] = [];
    for (const group of filtered) {
      flat.push({
        kind: 'header',
        key: `h:${group.id}`,
        label: optionLabel(group, language),
      });
      for (const option of group.options) {
        flat.push({
          kind: 'option',
          key: `o:${option.id}`,
          id: option.id,
          label: optionLabel(option, language),
        });
      }
    }
    return flat;
  }, [groups, language, search]);

  const optionCount = rows.filter((row) => row.kind === 'option').length;

  const choose = (id: string) => {
    if (isSingle) {
      onChange([id]);
      onClose();
      return;
    }
    setPending((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (maxSelected !== undefined && current.length >= maxSelected) return current;
      return [...current, id];
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={[styles.scrim, isRTL && styles.rtl]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />

        <Animated.View
          entering={FadeInDown.duration(280)}
          style={styles.sheet}
          accessibilityViewIsModal
          testID={testID}
        >
          <View style={styles.head}>
            <View style={[styles.headTop, isRTL && styles.rowReverse]}>
              <View style={styles.headText}>
                <Text variant="microAccent">{eyebrow}</Text>
                <Text variant="displaySmall" style={styles.headTitle}>
                  {title}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('picker.close')}
                onPress={onClose}
                style={styles.close}
              >
                <Text style={styles.closeGlyph}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              accessibilityLabel={searchLabel}
              value={search}
              onChangeText={setSearch}
              placeholder={searchLabel}
              placeholderTextColor={color.whisper}
              autoCorrect={false}
              style={[styles.search, isRTL && styles.searchRTL]}
            />

            <Text variant="caption" style={styles.resultLabel}>
              {t('picker.shown', { count: optionCount })}
            </Text>
          </View>

          <FlashList
            data={rows}
            keyExtractor={(row) => row.key}
            getItemType={(row) => row.kind}
            style={styles.list}
            contentContainerStyle={styles.rows}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (item.kind === 'header') {
                return (
                  <Text variant="micro" style={[styles.groupLabel, isRTL && styles.textRTL]}>
                    {item.label}
                  </Text>
                );
              }
              const isSelected = pending.includes(item.id);
              return (
                <Pressable
                  accessibilityRole={isSingle ? 'radio' : 'checkbox'}
                  accessibilityState={
                    isSingle ? { selected: isSelected } : { checked: isSelected }
                  }
                  accessibilityLabel={item.label}
                  onPress={() => choose(item.id)}
                  style={[styles.row, isRTL && styles.rowReverse, isSelected && styles.rowSelected]}
                >
                  <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                    {item.label}
                  </Text>
                  <View style={[styles.dot, isSelected && styles.dotSelected]}>
                    {isSelected ? <Text style={styles.tick}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text variant="bodySmall" center style={styles.noResults}>
                {t('picker.noResults')}
              </Text>
            }
          />

          <View style={[styles.foot, { paddingBottom: insets.bottom + 20 }]}>
            {clearLabel ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={clearLabel}
                onPress={() => {
                  onChange([]);
                  onClose();
                }}
                style={styles.clear}
              >
                <Text style={styles.clearLabel}>{clearLabel}</Text>
              </Pressable>
            ) : null}
            {!isSingle ? (
              <Button
                label={applyLabel ?? t('picker.apply', { count: pending.length })}
                onPress={() => {
                  onChange([...pending]);
                  onClose();
                }}
              />
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  rowReverse: { flexDirection: 'row-reverse' },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
  scrim: { flex: 1, backgroundColor: alpha.scrim, justifyContent: 'flex-end' },
  sheet: {
    // A Modal renders outside the navigator, so it does not inherit the app's
    // width. Without this it fills the whole monitor.
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },

  head: {
    padding: space.gutter,
    borderBottomWidth: 1,
    borderBottomColor: alpha.lineFaint,
  },
  headTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headText: { flexShrink: 1 },
  headTitle: { marginTop: 7 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { fontFamily: font.body, fontSize: 13, color: color.inkSoft },

  search: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(10,10,10,0.12)',
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: font.body,
    fontSize: 12.5,
    color: color.ink,
    backgroundColor: color.sandLight,
  },
  searchRTL: { textAlign: 'right', writingDirection: 'rtl' },
  resultLabel: { marginTop: 10 },

  rows: { padding: space.gutter },
  list: { flexGrow: 1, flexShrink: 1 },
  groupLabel: { marginTop: 18, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: alpha.line,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rowSelected: { borderColor: color.ink, backgroundColor: color.sand },
  rowLabel: { fontFamily: font.body, fontSize: 12.5, color: color.inkSoft, flexShrink: 1 },
  rowLabelSelected: { fontFamily: font.bodySemi, color: color.ink },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelected: { backgroundColor: color.ink, borderColor: color.ink },
  tick: { color: color.white, fontSize: 10, fontFamily: font.body },
  noResults: { paddingVertical: 30 },

  foot: {
    paddingHorizontal: space.gutter,
    paddingTop: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: alpha.lineFaint,
  },
  clear: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  clearLabel: { fontFamily: font.bodySemi, fontSize: 11, color: color.faintest },
});
