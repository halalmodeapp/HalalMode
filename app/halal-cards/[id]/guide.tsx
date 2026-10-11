import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { fetchConnection } from '@/api/connections';
import { PlayCard } from '@/components/halalCards/CardParts';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { GUIDE_HERO } from '@/halalCards/content/images';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import { useGuide } from '@/halalCards/hooks';
import { backOr, cardsPaths } from '@/halalCards/navigation';
import type { GuideEntry } from '@/halalCards/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { alpha, color, font, layout, radius, space } from '@/theme/tokens';

/**
 * The couple's own Relationship Guide: lessons and agreements both of them
 * chose to keep, from any activity or written in their own words.
 */
export default function GuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const copy = useCardsCopy();
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState('');
  const connection = useQuery({ queryKey: queryKeys.connection(id), queryFn: () => fetchConnection(id) });
  const { query, propose, agree, remove } = useGuide(id);

  if (query.isPending || connection.isPending) {
    return (
      <Screen>
        <LoadingState label={copy('loading')} />
      </Screen>
    );
  }
  if (query.isError || !connection.data) {
    return (
      <Screen>
        <ScreenHeader onAction={() => backOr(cardsPaths.hub(id))} />
        <ErrorState title={copy('errorTitle')} message={copy('errorBody')} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  const name = connection.data.profile.firstName;
  const agreed = query.data.filter((entry) => entry.agreed);
  const pending = query.data.filter((entry) => !entry.agreed);

  return (
    <Screen>
      <ScreenHeader onAction={() => backOr(cardsPaths.hub(id))} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.column}>
            <Illustration image={GUIDE_HERO} aspectRatio={4 / 5} style={styles.hero}>
              <OverlayText kind="eyebrow">{copy('brandWith', { name })}</OverlayText>
              <OverlayText kind="titleLarge">{copy('guide')}</OverlayText>
              <OverlayText kind="body">{copy('guideBlurb')}</OverlayText>
            </Illustration>

            <PlayCard tone="gold">
              {agreed.length ? (
                agreed.map((entry, index) => (
                  <Animated.View
                    key={entry.id}
                    layout={reducedMotion ? undefined : LinearTransition}
                    entering={reducedMotion ? undefined : FadeInDown.delay(index * 50)}
                    style={styles.entry}
                  >
                    <Text style={styles.number}>{index + 1}</Text>
                    <View style={styles.flexText}>
                      <Text style={styles.entryText}>{entry.text}</Text>
                      {entry.source ? <Text variant="caption">{copy('guideFrom', { source: entry.source })}</Text> : null}
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${copy('guideRemove')}: ${entry.text}`} onPress={() => remove.mutate(entry.id)} hitSlop={8}>
                      <Text style={styles.remove}>×</Text>
                    </Pressable>
                  </Animated.View>
                ))
              ) : (
                <Text variant="body">{copy('guideEmpty')}</Text>
              )}
            </PlayCard>

            {pending.length ? (
              <View style={styles.pending}>
                {pending.map((entry) => (
                  <PendingEntry
                    key={entry.id}
                    entry={entry}
                    name={name}
                    onAgree={() => agree.mutate(entry.id)}
                    onRemove={() => remove.mutate(entry.id)}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.add}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={copy('guideAddPlaceholder')}
                placeholderTextColor={color.whisper}
                style={styles.input}
                maxLength={280}
                multiline
              />
              <Button
                label={copy('guideAdd')}
                disabled={draft.trim().length < 3}
                loading={propose.isPending}
                onPress={() => propose.mutate({ text: draft.trim(), source: null }, { onSuccess: () => setDraft('') })}
              />
              <Text variant="caption" center>{copy('guideHow')}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function PendingEntry({ entry, name, onAgree, onRemove }: { entry: GuideEntry; name: string; onAgree: () => void; onRemove: () => void }) {
  const copy = useCardsCopy();
  const { isRTL } = useI18n();
  const theirs = entry.proposedBySeat === 'them';
  return (
    <View style={[styles.pendingCard, theirs && styles.pendingTheirs]}>
      <Text variant="micro">{theirs ? copy('guideTheyProposed', { name }) : copy('guideYouProposed', { name })}</Text>
      <Text style={styles.entryText}>{entry.text}</Text>
      <View style={[styles.pendingActions, isRTL && styles.rowReverse]}>
        <Button label={copy('guideRemove')} variant="quiet" block={false} onPress={onRemove} />
        {theirs ? <Button label={copy('guideAgree')} variant="gold" block={false} onPress={onAgree} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 60 },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.gutter,
    gap: space.xl,
  },
  hero: { borderRadius: radius.hero },
  entry: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(138,106,52,0.25)',
  },
  number: { fontFamily: font.display, fontSize: 22, lineHeight: 26, color: color.gold, minWidth: 22 },
  flexText: { flex: 1, gap: 2 },
  entryText: { fontFamily: font.display, fontSize: 16, lineHeight: 23, color: color.ink },
  remove: { fontSize: 20, color: color.faint, paddingHorizontal: 4 },
  pending: { gap: space.md },
  pendingCard: { padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: alpha.line, borderStyle: 'dashed', gap: space.sm },
  pendingTheirs: { borderStyle: 'solid', borderColor: color.goldGlow, backgroundColor: '#FBF6EA' },
  pendingActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: space.md },
  rowReverse: { flexDirection: 'row-reverse' },
  add: { gap: space.md },
  input: {
    minHeight: 72,
    borderRadius: radius.md,
    backgroundColor: color.sandLight,
    padding: space.md,
    fontFamily: font.body,
    fontSize: 14,
    color: color.ink,
    textAlignVertical: 'top',
  },
});
