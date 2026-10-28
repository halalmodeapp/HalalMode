import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fetchLikedYou } from '@/api/likedYou';
import { LikedYouPhoto } from '@/components/likedYou/LikedYouPhoto';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { useSession } from '@/state/session';
import { alpha, color, radius } from '@/theme/tokens';

/**
 * "They liked you": people who chose this member in an introduction and were
 * not chosen back. Shown above the connections, and not at all when empty.
 */
export function LikedYouTray() {
  const { t, isRTL } = useI18n();
  const { tier } = useSession();
  const premium = tier === 'premium';
  const query = useQuery({ queryKey: [...queryKeys.likedYou, premium], queryFn: () => fetchLikedYou(premium) });
  const items = query.data ?? [];
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="micro">{t('likedYou.title')}</Text>
      <Text variant="bodySmall" style={styles.hint}>{t('likedYou.hint')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, isRTL && styles.rowRTL]}
      >
        {items.map((liked) => (
          <Pressable
            key={liked.id}
            accessibilityRole="button"
            accessibilityLabel={t('likedYou.tileA11y', { age: liked.age, city: liked.city })}
            onPress={() => router.push(`/liked-you/${liked.id}` as never)}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <LikedYouPhoto liked={liked} style={styles.photo} />
            <Text variant="label" numberOfLines={1} style={styles.tileName}>
              {liked.unlocked && liked.profile ? liked.profile.firstName : t('likedYou.someone')}
            </Text>
            <Text variant="caption" tone="label" numberOfLines={1}>{`${liked.age} · ${liked.city}`}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, paddingBottom: 6 },
  hint: { marginTop: 2 },
  row: { gap: 12, paddingTop: 10, paddingBottom: 4 },
  rowRTL: { flexDirection: 'row-reverse' },
  tile: {
    width: 118,
    gap: 3,
    borderWidth: 1,
    borderColor: alpha.line,
    borderRadius: radius.card,
    padding: 8,
    backgroundColor: color.surface,
  },
  pressed: { borderColor: 'rgba(10,10,10,0.35)' },
  photo: { width: '100%', height: 118, borderRadius: radius.card - 4 },
  tileName: { marginTop: 4 },
});
