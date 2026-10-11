import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { sendMessage } from '@/api/connections';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import { cardsPaths } from '@/halalCards/navigation';
import type { ActivityKind } from '@/halalCards/types';
import { queryKeys } from '@/lib/queryClient';
import { showNotice } from '@/lib/notice';
import { alpha, color, font, radius, space } from '@/theme/tokens';

/**
 * Turns a reveal into conversation: sends a short line about it into the
 * couple's chat, as an ordinary message from this member.
 */
export function DiscussButton({ connectionId, text }: { connectionId: string; text: string }) {
  const copy = useCardsCopy();
  const queryClient = useQueryClient();
  const [sent, setSent] = useState(false);
  const send = useMutation({
    mutationFn: () => sendMessage(connectionId, text),
    onSuccess: () => {
      setSent(true);
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(connectionId) });
    },
    onError: () => showNotice(copy('brand'), copy('actionError')),
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: sent || send.isPending }}
      disabled={sent || send.isPending}
      onPress={() => send.mutate()}
      style={({ pressed }) => [styles.discuss, sent && styles.discussSent, pressed && styles.pressed]}
    >
      <Text style={[styles.discussText, sent && styles.discussTextSent]}>
        {sent ? copy('discussSent') : `💬  ${copy('discuss')}`}
      </Text>
    </Pressable>
  );
}

/** Where to go once something is finished: never a dead end. */
export function FinishActions({
  connectionId,
  kind,
  onReplay,
  solo,
}: {
  connectionId: string;
  kind: ActivityKind;
  onReplay?: () => void;
  solo?: boolean;
}) {
  const copy = useCardsCopy();
  return (
    <View style={styles.finish}>
      {onReplay ? <Button label={copy('replay')} onPress={onReplay} /> : null}
      <Button
        label={copy('playAnother')}
        variant={onReplay ? 'secondary' : 'primary'}
        onPress={() => router.replace(cardsPaths.section(connectionId, kind) as never)}
      />
      {solo ? null : (
        <Button label={copy('backToChat')} variant="secondary" onPress={() => router.replace(cardsPaths.chat(connectionId) as never)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  discuss: {
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: alpha.lineButton,
    backgroundColor: color.surface,
  },
  discussSent: { borderColor: color.goldGlow, backgroundColor: '#FBF6EA' },
  discussText: { fontFamily: font.bodySemi, fontSize: 12, color: color.inkSoft },
  discussTextSent: { color: color.gold },
  finish: { gap: space.sm },
});
