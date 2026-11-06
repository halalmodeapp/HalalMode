import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { fetchMyReach } from '@/api/profile';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { narrowingCriterionKey } from '@/lib/narrowingCriterion';
import { queryKeys } from '@/lib/queryClient';
import { alpha, color, radius, space } from '@/theme/tokens';

/** Fewer than a day's set, and some days could bring nobody at all. */
const FEWER_THAN_A_SET = 5;

/**
 * "About N people match your choices right now": the number of members who
 * could be introduced to this member under every hard rule they have set. It
 * sits with the choices, so turning a Must have on or off is a visible trade, and
 * too few says plainly what that will mean and which choice to loosen first.
 */
export function PoolSizeNote() {
  const { t, isRTL } = useI18n();
  const pool = useQuery({ queryKey: queryKeys.poolSize, queryFn: fetchMyReach, staleTime: 30_000 });
  if (pool.data === undefined) return null;
  const { reach: count, wanted, criterion } = pool.data;
  const narrow = count < wanted;
  const loosen = narrowingCriterionKey(criterion);
  return (
    <View
      accessible
      accessibilityRole="summary"
      style={[styles.box, narrow && styles.boxNarrow, isRTL && styles.rtl]}
    >
      <Text variant="label">{t('pool.line', { count })}</Text>
      {narrow ? (
        <Text variant="caption" style={styles.hint}>
          {count === 0 ? t('pool.none') : count < FEWER_THAN_A_SET ? t('pool.fewNone') : t('pool.few')}
        </Text>
      ) : null}
      {narrow && loosen ? (
        <Text variant="caption" style={styles.hint}>{t('pool.loosen', { criterion: t(loosen) })}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: alpha.line,
    backgroundColor: color.sand,
    gap: 4,
  },
  boxNarrow: { borderColor: color.gold },
  rtl: { alignItems: 'flex-end' },
  hint: { color: color.inkSoft },
});
