import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Text } from '@/components/ui/Text';
import { onDark, useSurfaceTone } from '@/theme/tone';
import { useI18n } from '@/i18n';
import { alpha, color, font, radius } from '@/theme/tokens';
import type { MustHaveCriterion, PremiumCriterion } from '@/types';

export interface MustHaveToggleProps {
  criterion: MustHaveCriterion | PremiumCriterion;
  value: boolean;
  onChange: (next: boolean) => void;
}

/**
 * Turns one preference into an absolute.
 *
 * Sits directly beneath the control it governs. Every criterion grades by
 * default, a near match still appears, ranked lower, and this is the only
 * thing that turns one into a hard filter.
 *
 * Whether a criterion is absolute is not the same for everyone: sect is
 * decisive for one family and irrelevant to the next. So the judgement sits
 * with the member who holds it, rather than being decided centrally.
 *
 * Deliberately quiet. Marking several of these narrows a pool very quickly, and
 * a control that invites tapping would make that worse.
 */
export function MustHaveToggle({ criterion, value, onChange }: MustHaveToggleProps) {
  const { t, isRTL } = useI18n();
  const dark = useSurfaceTone() === 'dark';
  const [confirming, setConfirming] = useState(false);

  return (
    <>
    <Pressable
      testID={`must-have-${criterion}`}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={t('filters.mustHaveA11y')}
      accessibilityHint={t('filters.mustHaveHint')}
      // Turning it on asks first: a Must have can shrink the introductions a lot.
      onPress={() => (value ? onChange(false) : setConfirming(true))}
      style={({ pressed }) => [
        styles.row,
        isRTL && styles.rowReverse,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.box, dark && styles.boxDark, value && (dark ? styles.boxCheckedDark : styles.boxChecked)]}>
        {value ? <Text style={[styles.tick, dark && styles.tickDark]}>✓</Text> : null}
      </View>
      <Text style={[styles.label, value && styles.labelChecked, dark && (value ? styles.labelCheckedDark : styles.labelDark)]}>
        {t('filters.mustHave')}
      </Text>
    </Pressable>
    <ConfirmDialog
      visible={confirming}
      title={t('filters.mustHaveConfirmTitle')}
      body={t('filters.mustHaveConfirmBody')}
      confirmLabel={t('filters.mustHaveConfirmYes')}
      cancelLabel={t('filters.mustHaveConfirmNo')}
      onConfirm={() => { setConfirming(false); onChange(true); }}
      onCancel={() => setConfirming(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  rowReverse: { flexDirection: 'row-reverse' },
  pressed: { opacity: 0.6 },
  box: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: color.ink, borderColor: color.ink },
  tick: { color: color.white, fontSize: 10, fontFamily: font.body, lineHeight: 12 },
  label: {
    fontFamily: font.body,
    fontSize: 11.5,
    letterSpacing: 0.2,
    color: color.faintest,
  },
  boxDark: { borderColor: onDark.lineStrong },
  boxCheckedDark: { backgroundColor: color.goldOnDark, borderColor: color.goldOnDark },
  tickDark: { color: color.ink },
  labelDark: { color: onDark.quiet },
  labelCheckedDark: { color: color.goldOnDark },
  labelChecked: { fontFamily: font.bodySemi, color: color.inkSoft },
});

/** Shared so every section spaces its toggle identically. */
export const mustHaveSpacing = StyleSheet.create({
  belowControl: { marginTop: -2, marginBottom: 2, borderRadius: radius.sm },
});
