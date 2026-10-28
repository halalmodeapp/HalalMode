import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { fetchMyPoolSize } from '@/api/profile';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { alpha, color, radius, space } from '@/theme/tokens';

/** Fewer than this and a member is told, kindly, that their choices are narrow. */
const COMFORTABLE = 20;

/**
 * "About N people match your choices right now": the number of members who
 * could be introduced to this member under every hard rule they have set. It
 * sits with the choices, so turning a Must have on or off is a visible trade.
 */
export function PoolSizeNote() {
  const { t, isRTL } = useI18n();
  const pool = useQuery({ queryKey: queryKeys.poolSize, queryFn: fetchMyPoolSize, staleTime: 30_000 });
  if (pool.data === undefined) return null;
  const count = pool.data;
  const narrow = count < COMFORTABLE;
  return (
    <View
      accessible
      accessibilityRole="summary"
      style={[styles.box, narrow && styles.boxNarrow, isRTL && styles.rtl]}
    >
      <Text variant="label">{t('pool.line', { count })}</Text>
      {narrow ? (
        <Text variant="caption" style={styles.hint}>
          {count === 0 ? t('pool.none') : t('pool.narrow')}
        </Text>
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
