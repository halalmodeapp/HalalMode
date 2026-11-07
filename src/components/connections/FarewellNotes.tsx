import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';

import { fetchMyFarewells, markFarewellSeen } from '@/api/connections';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { farewellWords } from '@/lib/farewell';
import { queryKeys } from '@/lib/queryClient';
import { RTL_LAYOUT } from '@/lib/rtl';
import { alpha, color, radius, space } from '@/theme/tokens';

/** The kind word someone left when they closed a connection, until it has been read. */
export function FarewellNotes() {
  const { t, isRTL } = useI18n();
  const queryClient = useQueryClient();
  const notes = useQuery({ queryKey: queryKeys.farewells, queryFn: fetchMyFarewells });
  const seen = useMutation({
    mutationFn: markFarewellSeen,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.farewells }),
  });
  if (!notes.data?.length) return null;
  return (
    <View style={styles.list}>
      {notes.data.map((note) => (
        <View key={note.connectionId} style={[styles.card, isRTL && styles.rtl]}>
          <Text variant="label">{note.name ? t('farewell.noteTitle', { name: note.name }) : t('farewell.anonymousTitle')}</Text>
          <Text variant="bodySmall">{farewellWords(note.reason, note.message, t)}</Text>
          <Pressable accessibilityRole="button" onPress={() => seen.mutate(note.connectionId)} style={styles.dismiss}>
            <Text variant="caption" style={styles.dismissLabel}>{t('farewell.noteDismiss')}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm, marginBottom: space.md },
  card: { padding: space.md, gap: space.xs, borderRadius: radius.md, borderWidth: 1, borderColor: alpha.line, backgroundColor: color.sand },
  rtl: RTL_LAYOUT,
  dismiss: { alignSelf: 'flex-start', paddingTop: space.xs },
  dismissLabel: { color: color.inkSoft },
});
