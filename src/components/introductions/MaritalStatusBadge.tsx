import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { MARITAL_STATUS_KEYS, MARITAL_TONES } from '@/data/marital';
import { useI18n } from '@/i18n';
import { font, space } from '@/theme/tokens';
import type { MaritalStatus } from '@/types';

/**
 * "Marital status" with the declared status as a soft coloured pill under it,
 * on every card and profile from the first introduction. The tints are equal
 * in weight and never a warning colour, so no status reads as a judgement.
 */
export function MaritalStatusBadge({
  status,
  onPhoto = false,
  center = false,
}: {
  status?: MaritalStatus;
  /** On a photo the label turns light so it stays readable. */
  onPhoto?: boolean;
  center?: boolean;
}) {
  const { t, isRTL } = useI18n();
  if (!status) return null;
  const tone = MARITAL_TONES[status];
  return (
    <View
      accessible
      accessibilityLabel={`${t('marital.label')}: ${t(MARITAL_STATUS_KEYS[status])}`}
      style={[styles.wrap, center && styles.center, isRTL && !center && styles.end]}
    >
      <Text variant="micro" style={onPhoto ? styles.labelOnPhoto : undefined}>{t('marital.label')}</Text>
      <View style={[styles.pill, { backgroundColor: onPhoto ? 'rgba(252,252,251,0.92)' : tone.background }]}>
        <Text style={[styles.pillText, { color: tone.text }]}>{t(MARITAL_STATUS_KEYS[status])}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, alignItems: 'flex-start' },
  center: { alignItems: 'center' },
  end: { alignItems: 'flex-end' },
  labelOnPhoto: { color: 'rgba(252,252,251,0.78)' },
  pill: { paddingVertical: 5, paddingHorizontal: space.md, borderRadius: 999 },
  pillText: { fontFamily: font.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
});
