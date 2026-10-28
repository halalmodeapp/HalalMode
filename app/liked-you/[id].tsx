import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { fetchLikedYou, likeBack } from '@/api/likedYou';
import { MaritalStatusBadge } from '@/components/introductions/MaritalStatusBadge';
import { LikedYouPhoto } from '@/components/likedYou/LikedYouPhoto';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { occupationLabel } from '@/data/occupations';
import { useI18n } from '@/i18n';
import { RTL_LAYOUT } from '@/lib/rtl';
import { queryKeys } from '@/lib/queryClient';
import { USE_MOCKS } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { radius, space } from '@/theme/tokens';

export default function LikedYouScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, isRTL, language } = useI18n();
  const { tier, setTier } = useSession();
  const premium = tier === 'premium';
  const client = useQueryClient();
  const [outcome, setOutcome] = useState<'matched' | 'waiting' | null>(null);

  const list = useQuery({
    queryKey: [...queryKeys.likedYou, premium],
    queryFn: () => fetchLikedYou(premium),
  });
  const liked = list.data?.find((item) => item.id === id);

  const answer = useMutation({
    mutationFn: () => likeBack(id),
    onSuccess: (status) => {
      setOutcome(status);
      void client.invalidateQueries({ queryKey: queryKeys.likedYou });
      void client.invalidateQueries({ queryKey: queryKeys.connections });
    },
  });

  if (!liked) {
    return (
      <Screen style={isRTL ? styles.rtl : undefined}>
        <View style={styles.missing}>
          <Text variant="bodySmall">{outcome ? t(outcome === 'matched' ? 'likedYou.matched' : 'likedYou.waiting') : t('likedYou.missing')}</Text>
          <Button label={t('common.back')} variant="quiet" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const profile = liked.profile;
  const title = liked.unlocked && profile ? profile.name : t('likedYou.someone');

  return (
    <Screen style={isRTL ? styles.rtl : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader action="back" />
        <LikedYouPhoto liked={liked} style={styles.hero} />
        <Text variant="displaySmall">{title}</Text>
        <Text variant="bodySmall">
          {`${liked.age} · ${liked.city} · ${occupationLabel(liked.occupation, language)}`}
        </Text>
        <MaritalStatusBadge status={liked.maritalStatus} />
        <View style={[styles.chips, isRTL && styles.rowRTL]}>
          {liked.chips.map((chip) => <Chip key={chip} label={chip} />)}
        </View>
        <Text style={styles.bio}>{liked.bio}</Text>

        {liked.unlocked ? (
          <View style={styles.actions}>
            {answer.isError ? <Text variant="bodySmall">{t('common.errorTitle')}</Text> : null}
            <Button label={t('likedYou.likeBack')} loading={answer.isPending} onPress={() => answer.mutate()} />
          </View>
        ) : (
          <Card tone="dark" style={styles.lock}>
            <Text variant="displaySmall">{USE_MOCKS ? t('likedYou.lockedTitle') : t('likedYou.soon')}</Text>
            <Text variant="bodySmall">{t('likedYou.lockedBody')}</Text>
            {USE_MOCKS ? <Button label={t('likedYou.unlockDemo')} variant="onDark" onPress={() => setTier('premium')} /> : null}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  content: { paddingHorizontal: space.gutterWide, paddingBottom: 40, gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hero: { width: '100%', height: 340, borderRadius: radius.card },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowRTL: { flexDirection: 'row-reverse' },
  bio: { lineHeight: 24 },
  actions: { gap: 10, marginTop: 8 },
  lock: { gap: 10, marginTop: 8 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
});
