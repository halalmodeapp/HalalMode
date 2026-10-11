import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { respondCardsInvite } from '@/api/halalCards';
import { Text } from '@/components/ui/Text';
import { findActivity } from '@/halalCards/content';
import { useCardsCopy } from '@/halalCards/copy';
import { useCardsSummary } from '@/halalCards/hooks';
import { cardsPaths } from '@/halalCards/navigation';
import { CUE_PRIORITY, sessionCue } from '@/halalCards/status';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { LeftToRight, useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { showNotice } from '@/lib/notice';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/**
 * Halal Cards inside the conversation: an invitation to accept, or a game
 * waiting on this member. Shows the one that most needs attention and stays
 * out of the way otherwise.
 */
export function ChatCardsBanner({ connectionId, partnerName }: { connectionId: string; partnerName: string }) {
  const copy = useCardsCopy();
  const { isRTL } = useI18n();
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const sessions = useCardsSummary(connectionId);

  const respond = useMutation({
    // Accepting from the chat: the session starts on its first card, owed by both.
    mutationFn: (input: { sessionId: string; accept: boolean }) =>
      respondCardsInvite(input.sessionId, input.accept, input.accept ? 'both' : null),
    onSuccess: (session, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cardsSessions(connectionId) });
      if (input.accept) router.push(cardsPaths.play(connectionId, session.id) as never);
    },
    onError: () => showNotice(copy('brand'), copy('actionError')),
  });

  const ranked = (sessions.data ?? [])
    .map((session) => ({ session, activity: findActivity(session.activityId) }))
    .map((item) => ({ ...item, cue: sessionCue(item.session) }))
    .filter((item) => item.activity && (item.cue === 'invited_you' || item.cue === 'your_turn' || item.cue === 'awaiting_accept'))
    .sort((left, right) => CUE_PRIORITY[left.cue] - CUE_PRIORITY[right.cue]);
  const top = ranked[0];
  if (!top?.activity) return null;
  const { session, activity, cue } = top;

  const open = () => router.push(cardsPaths.play(connectionId, session.id) as never);
  const line =
    cue === 'invited_you'
      ? copy('invitedYou', { name: partnerName })
      : cue === 'your_turn'
        ? copy('yourTurn')
        : copy('waitingAccept', { name: partnerName });

  return (
    <LeftToRight>
    <Animated.View entering={reducedMotion ? undefined : FadeInDown.springify().damping(18)} style={styles.card}>
      <View style={[styles.row, isRTL && styles.rowReverse]}>
        <View style={styles.mark}>
          <Text style={styles.markGlyph}>✦</Text>
        </View>
        <View style={styles.text}>
          <Text style={styles.eyebrow}>{copy('brand')} · {line}</Text>
          <Text style={styles.title} numberOfLines={1}>{activity.title}</Text>
        </View>
      </View>
      {cue === 'invited_you' ? (
        <View style={[styles.actions, isRTL && styles.rowReverse]}>
          <Pressable
            accessibilityRole="button"
            disabled={respond.isPending}
            onPress={() => respond.mutate({ sessionId: session.id, accept: false })}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>{copy('decline')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={respond.isPending}
            onPress={() => respond.mutate({ sessionId: session.id, accept: true })}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>{copy('accept')}</Text>
          </Pressable>
        </View>
      ) : cue === 'your_turn' ? (
        <Pressable accessibilityRole="button" onPress={open} style={[styles.primary, styles.single]}>
          <Text style={styles.primaryText}>{copy('resume')}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
    </LeftToRight>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.gutter,
    marginBottom: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.ink,
    gap: space.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowReverse: { flexDirection: 'row-reverse' },
  mark: {
    width: 34,
    height: 44,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: color.goldOnDark,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  markGlyph: { color: color.goldOnDark, fontSize: 16 },
  text: { flex: 1, gap: 2 },
  eyebrow: { fontFamily: font.bodySemi, fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase', color: color.goldOnDark },
  title: { fontFamily: font.display, fontSize: 17, color: color.white },
  actions: { flexDirection: 'row', gap: space.sm },
  primary: {
    flex: 1,
    backgroundColor: color.white,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  single: { flex: 0, alignSelf: 'stretch' },
  primaryText: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: color.ink },
  secondary: {
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: alpha.onDarkLine,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: alpha.onDarkStrong },
});
