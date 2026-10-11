import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import { useGuide } from '@/halalCards/hooks';
import type { GuideSuggestion } from '@/halalCards/types';
import { useI18n } from '@/i18n';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/**
 * A lesson the couple may keep. Saving suggests it to the other member; it
 * joins the Relationship Guide only when they agree too, so the guide holds
 * what both actually chose.
 */
export function GuideSuggestions({
  connectionId,
  suggestions,
  source,
  partnerName,
}: {
  connectionId: string;
  suggestions: GuideSuggestion[];
  source: string;
  partnerName: string;
}) {
  const copy = useCardsCopy();
  const { isRTL } = useI18n();
  const { query, propose, agree } = useGuide(connectionId);
  if (!suggestions.length) return null;

  const entryFor = (text: string) =>
    query.data?.find((entry) => entry.text.trim().toLowerCase() === text.trim().toLowerCase());

  return (
    <View style={styles.list}>
      {suggestions.map((suggestion) => {
        const entry = entryFor(suggestion.text);
        const state = !entry
          ? 'new'
          : entry.agreed
            ? 'agreed'
            : entry.proposedBySeat === 'me'
              ? 'proposed'
              : 'theirs';
        const label =
          state === 'agreed'
            ? copy('guideAgreed')
            : state === 'proposed'
              ? copy('guideSaved', { name: partnerName })
              : state === 'theirs'
                ? copy('guideAgree')
                : copy('guideSave');
        return (
          <View key={suggestion.id} style={[styles.row, isRTL && styles.rowReverse]}>
            <Text style={styles.text}>{suggestion.text}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${suggestion.text}`}
              disabled={state === 'agreed' || state === 'proposed' || propose.isPending || agree.isPending}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (state === 'theirs' && entry) agree.mutate(entry.id);
                else propose.mutate({ text: suggestion.text, source });
              }}
              style={[styles.button, state === 'agreed' && styles.buttonDone, state === 'proposed' && styles.buttonWaiting]}
            >
              <Text style={[styles.buttonText, state === 'agreed' && styles.buttonTextDone]}>
                {state === 'agreed' ? '✓ ' : state === 'new' ? '+ ' : ''}
                {label}
              </Text>
            </Pressable>
          </View>
        );
      })}
      <Text variant="caption">{copy('guideHow')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: alpha.line,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  text: { flex: 1, fontFamily: font.display, fontSize: 15, lineHeight: 21, color: color.ink },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.goldGlow,
    maxWidth: 150,
  },
  buttonWaiting: { borderColor: alpha.line },
  buttonDone: { backgroundColor: color.goldGlow, borderColor: color.goldGlow },
  buttonText: { fontFamily: font.bodySemi, fontSize: 11, color: color.gold, textAlign: 'center' },
  buttonTextDone: { color: '#3A2C10' },
});
