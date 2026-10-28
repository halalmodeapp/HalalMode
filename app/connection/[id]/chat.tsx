import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileImage as Image } from '@/components/ui/ProfileImage';
import {
  getProfilePhotoSource,
  type ProfilePhotoSource,
} from '@/data/demoProfilePhotos';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  closeConnection,
  fetchConnection,
  fetchMessagesPage,
  markMessagesRead,
  sendMessage,
} from '@/api/connections';
import { AudioGreeting } from '@/components/introductions/AudioGreeting';
import { ChatCardsBanner } from '@/components/halalCards/ChatCardsBanner';
import { SafetyControl } from '@/components/safety/SafetyControl';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Screen } from '@/components/ui/Screen';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Text } from '@/components/ui/Text';
import { showNotice } from '@/lib/notice';
import { shuffledOpeners } from '@/data/openers';
import { useI18n } from '@/i18n';
import { cardsCopy } from '@/halalCards/copy';
import { HUB_HERO } from '@/halalCards/content/images';
import { useCardsAttention } from '@/halalCards/hooks';
import { ILLUSTRATIONS, THUMBNAILS } from '@/halalCards/illustrations';
import { cardsPaths } from '@/halalCards/navigation';
import { queryKeys } from '@/lib/queryClient';
import { mergeMessages } from '@/lib/mergeMessages';
import { clearPrivateMediaCache } from '@/lib/privateMediaCache';
import { trackProductEvent } from '@/lib/analytics';
import { enqueueMessage, getPendingMessages, removePendingMessage } from '@/lib/messageOutbox';
import { retryAllInOrder } from '@/lib/retryPolicy';
import { USE_MOCKS } from '@/lib/supabase';
import { testIds } from '@/lib/testIds';
import { useAuth } from '@/state/auth';
import { useFeatureFlags } from '@/state/featureFlags';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { alpha, color, font, radius, space } from '@/theme/tokens';
import type { ChatMessage } from '@/types';
import type { MessagePage } from '@/api/connections';
import { RTL_LAYOUT } from '@/lib/rtl';

type ConversationItem =
  | { kind: 'day'; id: string; date: string }
  | { kind: 'message'; id: string; message: ChatMessage; isLastOutgoing: boolean };

const CARDS_ROW_IMAGE = THUMBNAILS[HUB_HERO.id] ?? ILLUSTRATIONS[HUB_HERO.id];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isRTL, language, t } = useI18n();
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const visible = isFocused && foreground;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const { inChatVoiceNotes, liveCalling } = useFeatureFlags();
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<ConversationItem>>(null);
  const shouldScrollToEndRef = useRef(true);
  const lastMarkedIncomingIdRef = useRef<string | null>(null);
  const markingIncomingIdRef = useRef<string | null>(null);
  const [draft, setDraft] = useState('');
  const [callState, setCallState] = useState<
    'calling' | 'connected' | 'unavailable' | null
  >(null);
  const [now, setNow] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [retryFailed, setRetryFailed] = useState(false);
  const outboxMemberId = USE_MOCKS ? 'mock' : user?.id;
  const cardsWaiting = useCardsAttention().data?.[id] ?? 0;
  const cardsRowShine = useSharedValue(-1);

  useEffect(() => {
    cancelAnimation(cardsRowShine);
    cardsRowShine.value = -1;
    if (reducedMotion || !visible) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      timer = setTimeout(() => {
        if (stopped) return;
        cardsRowShine.value = withSequence(
          withTiming(1, { duration: 850, easing: Easing.inOut(Easing.cubic) }),
          withTiming(-1, { duration: 0 }),
        );
        schedule();
      }, 20_000 + Math.floor(Math.random() * 10_001));
    };
    schedule();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      cancelAnimation(cardsRowShine);
      cardsRowShine.value = -1;
    };
  }, [cardsRowShine, reducedMotion, visible]);

  const cardsRowShineStyle = useAnimatedStyle(() => ({
    opacity: cardsRowShine.value < -0.99 ? 0 : 1,
    transform: [
      { translateX: -96 + (cardsRowShine.value + 1) * 112 },
      { skewX: '-18deg' },
    ],
  }));

  const refreshPendingCount = useCallback(async () => {
    if (!outboxMemberId) {
      setPendingCount(0);
      return;
    }
    setPendingCount((await getPendingMessages(outboxMemberId, id)).length);
  }, [id, outboxMemberId]);

  const connectionQuery = useQuery({
    queryKey: queryKeys.connection(id),
    queryFn: () => fetchConnection(id),
  });

  const messagesQuery = useQuery({
    queryKey: queryKeys.messages(id),
    queryFn: () => fetchMessagesPage(id),
    // Conversation is the one place freshness matters.
    staleTime: 0,
    refetchInterval: visible ? 5_000 : false,
  });
  const connection = connectionQuery.data;
  const messages = useMemo(
    () => messagesQuery.data?.messages ?? [],
    [messagesQuery.data]
  );

  useEffect(() => {
    if (!visible) return;
    void markMessagesRead(id).then(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
    }).catch(() => {});
  }, [id, queryClient, visible]);

  useEffect(() => {
    if (!visible) return;
    const newestUnread = [...messages].reverse().find((message) => message.sender === 'them' && !message.readAt);
    if (!newestUnread
        || newestUnread.id === lastMarkedIncomingIdRef.current
        || newestUnread.id === markingIncomingIdRef.current) return;
    markingIncomingIdRef.current = newestUnread.id;
    void markMessagesRead(id)
      .then(() => {
        lastMarkedIncomingIdRef.current = newestUnread.id;
        void queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
      })
      .catch(() => {})
      .finally(() => {
        if (markingIncomingIdRef.current === newestUnread.id) markingIncomingIdRef.current = null;
      });
  }, [id, messages, queryClient, visible]);

  useEffect(() => setNow(Date.now()), []);
  useEffect(() => { void refreshPendingCount(); }, [refreshPendingCount]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      if (!outboxMemberId) throw new Error('Your session is not ready to send a message.');
      const pending = await enqueueMessage(outboxMemberId, id, text);
      setDraft('');
      try {
        const message = await sendMessage(id, text, pending.id);
        // Delivery is already durable server-side. A local cleanup failure must
        // not turn it into a false send error; the idempotency key makes a later
        // cleanup retry safe.
        void removePendingMessage(outboxMemberId, pending.id).catch(() => {});
        return message;
      } finally {
        void refreshPendingCount();
      }
    },
    onSuccess: (message) => {
      trackProductEvent('message_sent');
      shouldScrollToEndRef.current = true;
      queryClient.setQueryData<MessagePage>(queryKeys.messages(id), (current) => ({
        messages: mergeMessages(current?.messages ?? [], [message]),
        hasMore: current?.hasMore ?? false,
        ...(current?.nextCursor ? { nextCursor: current.nextCursor } : {}),
      }));
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    },
  });

  const loadEarlier = useMutation({
    mutationFn: () => {
      const cursor = messagesQuery.data?.nextCursor;
      if (!cursor) throw new Error('No earlier messages are available.');
      return fetchMessagesPage(id, cursor);
    },
    onMutate: () => { shouldScrollToEndRef.current = false; },
    onSuccess: (page) => {
      queryClient.setQueryData<MessagePage>(queryKeys.messages(id), (current) => ({
        messages: mergeMessages(page.messages, current?.messages ?? []),
        hasMore: page.hasMore,
        ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
      }));
    },
  });

  const retryPending = useMutation({
    mutationFn: async () => {
      if (!outboxMemberId) throw new Error('Your session is not ready to send a message.');
      const pending = await getPendingMessages(outboxMemberId, id);
      return retryAllInOrder(pending, async (item) => {
        const message = await sendMessage(id, item.body, item.id);
        void removePendingMessage(outboxMemberId, item.id).catch(() => {});
        return message;
      });
    },
    onMutate: () => setRetryFailed(false),
    onSuccess: ({ delivered, failedCount }) => {
      queryClient.setQueryData<MessagePage>(queryKeys.messages(id), (current) => ({
        messages: mergeMessages(current?.messages ?? [], delivered),
        hasMore: current?.hasMore ?? false,
        ...(current?.nextCursor ? { nextCursor: current.nextCursor } : {}),
      }));
      setRetryFailed(failedCount > 0);
    },
    onError: () => setRetryFailed(true),
    onSettled: () => { void refreshPendingCount(); },
  });

  const close = useMutation({
    mutationFn: () => closeConnection(id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: queryKeys.messages(id) });
      queryClient.removeQueries({ queryKey: queryKeys.connection(id) });
      queryClient.removeQueries({ queryKey: ['private-media'] });
      await clearPrivateMediaCache();
      void queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      router.replace('/(tabs)/connections');
    },
    onError: () => {
      showNotice(t('chat.closeErrorTitle'), t('chat.closeErrorBody'));
    },
  });

  // Our own dialog: Alert with buttons never appears in a browser, so closing
  // a conversation on the web silently did nothing.
  const [closeAsk, setCloseAsk] = useState(false);
  const confirmClose = () => setCloseAsk(true);

  const conversation = useMemo<ConversationItem[]>(() => {
    const lastOutgoingId = [...messages].reverse().find((message) => message.sender === 'me')?.id;
    return messages.flatMap((message, index) => {
      const day = dayKey(message.createdAt);
      const items: ConversationItem[] = [];
      if (index === 0 || day !== dayKey(messages[index - 1]?.createdAt ?? '')) {
        items.push({ kind: 'day', id: `day-${day}`, date: message.createdAt });
      }
      items.push({
        kind: 'message',
        id: message.id,
        message,
        isLastOutgoing: message.id === lastOutgoingId,
      });
      return items;
    });
  }, [messages]);

  if (connectionQuery.isPending || messagesQuery.isPending) {
    return (
      <Screen>
        <LoadingState label={t('chat.loading')} />
      </Screen>
    );
  }

  if (
    connectionQuery.isError ||
    messagesQuery.isError ||
    !connection
  ) {
    return (
      <Screen>
        <ErrorState
          title={t('chat.errorTitle')}
          message={t('chat.errorBody')}
          onRetry={() => {
            void connectionQuery.refetch();
            void messagesQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  const lastMessage = messages[messages.length - 1];
  // Two quiet days after talking has started: offer a friendly opener.
  const quiet = !!lastMessage && now > 0 && now - new Date(lastMessage.createdAt).getTime() > 2 * 86400_000;
  const answered = connection.questions.length;
  const days = Math.max(
    1,
    Math.round((now - new Date(connection.createdAt).getTime()) / 86400_000)
  );

  return (
    <Screen style={isRTL ? styles.rtl : undefined}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={[styles.header, isRTL && styles.rowRTL]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chat.backA11y')}
            onPress={() => router.replace('/(tabs)/connections')}
            hitSlop={12}
            style={styles.backButton}
          >
            <Text style={styles.backGlyph}>{isRTL ? '→' : '←'}</Text>
          </Pressable>

          {/* Their photo and name open their profile and photos, any time after matching. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chat.profileA11y', { name: connection.profile.firstName })}
            onPress={() => router.push(`/connection/${id}/profile`)}
            style={[styles.headerWho, isRTL && styles.rowRTL]}
          >
            <Image
              source={getProfilePhotoSource(connection.profile.id, connection.profile.photos, 0)}
              storagePath={connection.profile.photoMedia?.[0]?.storagePath}
              style={styles.avatar}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />

            <View style={styles.headerText}>
              <Text variant="label" numberOfLines={1}>{connection.profile.firstName}</Text>
              <Text variant="caption" numberOfLines={1}>
                {t('chat.headerMeta', { days, count: answered })}
              </Text>
            </View>
          </Pressable>

          {liveCalling ? (
          <Pressable
            testID={testIds.chat.call}
            accessibilityRole="button"
            accessibilityLabel={t('chat.callA11y', { name: connection.profile.firstName })}
            onPress={() => setCallState('calling')}
            style={styles.callButton}
          >
            <Text style={styles.callGlyph}>☎</Text>
          </Pressable>
          ) : null}

          <SafetyControl
            scope={{ kind: 'connection', id }}
            memberName={connection.profile.firstName}
          />

          <Pressable
            testID={testIds.chat.retry}
            accessibilityRole="button"
            accessibilityLabel={t('chat.closeA11y')}
            accessibilityState={{ busy: close.isPending }}
            disabled={close.isPending}
            onPress={confirmClose}
            style={styles.pauseButton}
          >
            <Text style={styles.pauseLabel} numberOfLines={2}>{t('chat.pause')}</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cardsCopy(language, 'chatOpenA11y', { name: connection.profile.firstName })}
          onPress={() => router.push(cardsPaths.hub(id) as never)}
          style={({ pressed }) => [styles.cardsRow, isRTL && styles.rowRTL, pressed && styles.cardsRowPressed]}
        >
          <Text style={styles.cardsGlyph}>✦</Text>
          <Text style={styles.cardsLabel} numberOfLines={1}>{t('halalCards.chatRow')}</Text>
          {CARDS_ROW_IMAGE ? (
            <View style={styles.cardsThumbShell} pointerEvents="none">
              <Image
                source={CARDS_ROW_IMAGE}
                style={styles.cardsThumbImage}
                contentFit="cover"
                contentPosition={{ top: '23%', left: '50%' }}
                accessibilityIgnoresInvertColors
                accessible={false}
              />
              <Animated.View style={[styles.cardsThumbShine, cardsRowShineStyle]} />
            </View>
          ) : null}
          {cardsWaiting ? (
            <View style={styles.cardsBadge} accessibilityLabel={t('halalCards.badgeA11y', { count: cardsWaiting })}>
              <Text style={styles.cardsBadgeText}>{cardsWaiting}</Text>
            </View>
          ) : null}
          <Text style={styles.cardsChevron}>{isRTL ? '‹' : '›'}</Text>
        </Pressable>

        <FlatList
          ref={listRef}
          data={conversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (!shouldScrollToEndRef.current) return;
            listRef.current?.scrollToEnd({ animated: false });
          }}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            // Keep a conversation anchored only while the member is already
            // reading its newest messages; never pull them away from history.
            shouldScrollToEndRef.current =
              contentSize.height - contentOffset.y - layoutMeasurement.height < 64;
          }}
          scrollEventThrottle={32}
          ListHeaderComponent={
            messagesQuery.data?.hasMore ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('chat.loadEarlier')}
                accessibilityState={{ busy: loadEarlier.isPending }}
                disabled={loadEarlier.isPending}
                onPress={() => loadEarlier.mutate()}
                style={styles.loadEarlier}
              >
                <Text variant="caption" style={styles.loadEarlierLabel}>
                  {loadEarlier.isPending ? t('common.loading') : t('chat.loadEarlier')}
                </Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={messagesQuery.isPending ? null : <OpenerHint />}
          renderItem={({ item }) =>
            item.kind === 'day' ? (
              <DayMarker date={item.date} />
            ) : (
              <Bubble message={item.message} isLastOutgoing={item.isLastOutgoing} />
            )
          }
        />

        {quiet && !draft ? <QuietNudge onUse={setDraft} /> : null}

        <ChatCardsBanner connectionId={id} partnerName={connection.profile.firstName} />

        {pendingCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chat.retryPending', { count: pendingCount })}
            accessibilityState={{ busy: retryPending.isPending }}
            disabled={retryPending.isPending}
            onPress={() => retryPending.mutate()}
            style={styles.pendingNotice}
          >
            <Text variant="caption" style={styles.pendingNoticeText}>
              {t('chat.pendingMessages', { count: pendingCount })}
            </Text>
            <Text variant="caption" style={styles.pendingRetryText}>
              {retryPending.isPending ? t('common.loading') : t('chat.retryPending', { count: pendingCount })}
            </Text>
          </Pressable>
        ) : null}
        {retryFailed ? (
          <Text accessibilityRole="alert" variant="caption" style={styles.sendError}>
            {t('chat.retrySomeFailed')}
          </Text>
        ) : null}


        <View style={styles.composer}>
          <TextInput
            testID={testIds.chat.composer}
            accessibilityLabel={t('chat.messageA11y')}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={color.whisper}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          {inChatVoiceNotes ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chat.recordUnavailable')}
            onPress={() =>
              showNotice(t('chat.voiceTitle'), t('chat.voiceBody'))
            }
            style={styles.recordButton}
          >
            <Text style={styles.recordGlyph}>●</Text>
          </Pressable>
          ) : null}
          <Pressable
            testID={testIds.chat.send}
            accessibilityRole="button"
            accessibilityLabel={t('chat.sendA11y')}
            disabled={!draft.trim() || send.isPending}
            onPress={() => send.mutate(draft.trim())}
            style={[styles.sendButton, !draft.trim() && styles.sendButtonIdle]}
          >
            <Text style={styles.sendGlyph}>→</Text>
          </Pressable>
        </View>
        {send.isError ? (
          <Text accessibilityRole="alert" variant="caption" style={styles.sendError}>
            {t('chat.sendError')}
          </Text>
        ) : null}
      </KeyboardAvoidingView>

      <CallOverlay
        visible={callState !== null}
        state={callState}
        name={connection.profile.firstName}
        photo={getProfilePhotoSource(connection.profile.id, connection.profile.photos, 0)}
        onConnected={() => setCallState('connected')}
        onEnd={() => setCallState(null)}
      />
      <ConfirmDialog
        visible={closeAsk}
        title={t('chat.closeTitle')}
        body={t('chat.closeBody', { name: connection?.profile.firstName ?? '' })}
        confirmLabel={t('chat.closeConfirm')}
        cancelLabel={t('chat.keep')}
        onConfirm={() => {
          setCloseAsk(false);
          close.mutate();
        }}
        onCancel={() => setCloseAsk(false)}
      />
    </Screen>
  );
}

function Bubble({
  message,
  isLastOutgoing,
}: {
  message: ChatMessage;
  isLastOutgoing: boolean;
}) {
  const mine = message.sender === 'me';

  if (message.voiceUrl) {
    return (
      <View
        style={[
          styles.bubble,
          mine ? styles.bubbleMine : styles.bubbleTheirs,
          styles.voiceBubble,
        ]}
      >
        <AudioGreeting
          durationSeconds={message.voiceDurationSeconds ?? 12}
          url={message.voiceUrl}
          compact
          onDark={mine}
        />

        <MessageMeta message={message} mine={mine} isLastOutgoing={isLastOutgoing} />
      </View>
    );
  }

  return (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
        {message.text}
      </Text>
      <MessageMeta message={message} mine={mine} isLastOutgoing={isLastOutgoing} />
    </View>
  );
}

function MessageMeta({
  message,
  mine,
  isLastOutgoing,
}: {
  message: ChatMessage;
  mine: boolean;
  isLastOutgoing: boolean;
}) {
  const { localeTag } = useI18n();
  return (
    <View style={[styles.messageMeta, mine && styles.messageMetaMine]}>
      <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>
        {formatTime(message.createdAt, localeTag)}
      </Text>
      {mine ? (
        <Text style={[styles.tick, isLastOutgoing && message.readAt && styles.tickRead]}>
          {message.readAt ? '✓✓' : '✓'}
        </Text>
      ) : null}
    </View>
  );
}

function DayMarker({ date }: { date: string }) {
  const { localeTag, t } = useI18n();
  return (
    <View style={styles.dayMarker}>
      <Text style={styles.dayMarkerLabel}>{formatDay(date, localeTag, t('chat.today'), t('chat.yesterday'))}</Text>
    </View>
  );
}

function CallOverlay({
  visible,
  state,
  name,
  photo,
  onConnected,
  onEnd,
}: {
  visible: boolean;
  state: 'calling' | 'connected' | 'unavailable' | null;
  name: string;
  photo: ProfilePhotoSource;
  onConnected: () => void;
  onEnd: () => void;
}) {
  const { isRTL, t } = useI18n();
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  useEffect(() => {
    if (state !== 'calling') return;
    const timer = setTimeout(onConnected, 1100);
    return () => clearTimeout(timer);
  }, [onConnected, state]);
  useEffect(() => {
    if (visible) return;
    setMuted(false);
    setSpeakerOn(false);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onEnd}
      accessibilityViewIsModal
    >
      <View style={[styles.callScreen, isRTL && styles.rtl]} accessibilityViewIsModal>
        <Text variant="microAccent">
          {state === 'unavailable' ? t('chat.call.private') : t('chat.call.preview')}
        </Text>
        <Image
          source={photo}
          style={styles.callAvatar}
          contentFit="cover"
          accessibilityLabel={name}
        />
        <Text variant="displaySmall" style={styles.callName}>
          {name}
        </Text>
        <Text variant="bodySmall" style={styles.callStatus} accessibilityRole="alert">
          {state === 'unavailable'
            ? t('chat.call.unavailable')
            : state === 'calling'
              ? t('chat.call.calling')
              : t('chat.call.connected')}
        </Text>
        {state === 'unavailable' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chat.call.back')}
            onPress={onEnd}
            style={styles.callUnavailableAction}
          >
            <Text style={styles.callUnavailableLabel}>{t('chat.call.back')}</Text>
          </Pressable>
        ) : (
          <View style={[styles.callActions, isRTL && styles.rowRTL]}>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel={t('chat.call.mute')}
              accessibilityState={{ checked: muted }}
              onPress={() => setMuted((current) => !current)}
              style={[styles.callUtility, muted && styles.callUtilityActive]}
            >
              <Text style={styles.callUtilityGlyph}>◉</Text>
              <Text style={styles.callUtilityLabel}>{t('chat.call.mute')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('chat.call.endA11y')}
              onPress={onEnd}
              style={styles.endCall}
            >
              <Text style={styles.endCallGlyph}>☎</Text>
            </Pressable>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel={t('chat.call.speaker')}
              accessibilityState={{ checked: speakerOn }}
              onPress={() => setSpeakerOn((current) => !current)}
              style={[styles.callUtility, speakerOn && styles.callUtilityActive]}
            >
              <Text style={styles.callUtilityGlyph}>◌</Text>
              <Text style={styles.callUtilityLabel}>{t('chat.call.speaker')}</Text>
            </Pressable>
          </View>
        )}
        <Text variant="caption" center style={styles.callNote}>
          {state === 'unavailable'
            ? t('chat.call.unavailableNote')
            : t('chat.call.previewNote')}
        </Text>
      </View>
    </Modal>
  );
}

function dayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatTime(value: string, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(value)
  );
}

function formatDay(value: string, localeTag: string, todayLabel: string, yesterdayLabel: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(value) === dayKey(today.toISOString())) return todayLabel;
  if (dayKey(value) === dayKey(yesterday.toISOString())) return yesterdayLabel;
  return new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'short' }).format(date);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rtl: RTL_LAYOUT,
  rowRTL: { flexDirection: 'row-reverse' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space.xl,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: alpha.lineFaint,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.sandDeep,
    borderWidth: 1,
    borderColor: alpha.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: { fontFamily: font.body, fontSize: 15, color: color.inkSoft },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  headerWho: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  // Compact so the name always has room, even on a 360 pt phone.
  pauseButton: {
    minHeight: 44,
    maxWidth: 98,
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  pauseLabel: {
    fontFamily: font.body,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 0.3,
    textAlign: 'center',
    textTransform: 'uppercase',
    color: color.muted,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callGlyph: { fontFamily: font.body, fontSize: 16, color: color.inkSoft },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space.xl,
    paddingVertical: 6,
    backgroundColor: color.ink,
  },
  cardsRowPressed: { opacity: 0.88 },
  cardsGlyph: { fontSize: 17, color: color.goldOnDark },
  cardsLabel: { flex: 1, fontFamily: font.bodySemi, fontSize: 15.5, letterSpacing: 0.25, color: color.white },
  cardsThumbShell: {
    width: 94,
    height: 56,
    borderRadius: 9,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: alpha.onDarkLine,
    backgroundColor: color.clay,
  },
  cardsThumbImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    transform: [{ scale: 1.55 }],
  },
  cardsThumbShine: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    left: 0,
    width: 24,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  cardsBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: color.goldGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsBadgeText: { fontFamily: font.bodyBold, fontSize: 11, color: '#3A2C10' },
  cardsChevron: { fontSize: 18, color: alpha.onDarkStrong },
  messages: { flexGrow: 1, paddingHorizontal: space.xl, paddingVertical: 16, gap: 10 },
  loadEarlier: { alignSelf: 'center', paddingHorizontal: space.md, paddingVertical: space.sm },
  loadEarlierLabel: { color: color.ink, textDecorationLine: 'underline' },
  pendingNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginHorizontal: space.xl, marginBottom: space.xs, padding: space.sm, borderRadius: radius.md, backgroundColor: color.sand },
  pendingNoticeText: { flex: 1, color: color.inkSoft },
  pendingRetryText: { color: color.ink, textDecorationLine: 'underline' },
  dayMarker: { alignItems: 'center', paddingVertical: 5 },
  dayMarkerLabel: {
    borderRadius: radius.pill,
    backgroundColor: color.sand,
    paddingVertical: 5,
    paddingHorizontal: 11,
    fontFamily: font.bodyMedium,
    fontSize: 12,
    color: color.muted,
  },
  bubble: { maxWidth: '78%', paddingVertical: 13, paddingHorizontal: 15 },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: color.sand,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: color.ink,
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  voiceBubble: { minWidth: 210 },
  bubbleText: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 21,
    color: color.inkSoft,
  },
  bubbleTextMine: { color: color.white },
  messageMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  messageMetaMine: { justifyContent: 'flex-end' },
  messageTime: { fontFamily: font.body, fontSize: 11, color: color.faint },
  messageTimeMine: { color: 'rgba(252,252,251,0.58)' },
  tick: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: -2, color: 'rgba(252,252,251,0.48)' },
  tickRead: { color: color.goldOnDark },

  quietWrap: { paddingHorizontal: space.xl, paddingBottom: 6 },
  quietActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  quietUse: { fontFamily: font.bodyBold, fontSize: 13, color: color.ink },
  quietDismiss: { fontFamily: font.body, fontSize: 14, color: color.faint },
  openerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  botCard: {
    maxWidth: 340,
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(184,145,79,0.45)',
    backgroundColor: 'rgba(197,160,84,0.08)',
  },
  botName: { fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: color.gold },
  botLead: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.muted },
  opener: { fontFamily: font.display, fontStyle: 'italic', fontSize: 16, lineHeight: 23, color: color.ink },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: space.xl,
    paddingTop: 14,
    paddingBottom: 20,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 17,
    fontFamily: font.body,
    fontSize: 15,
    color: color.ink,
  },
  recordButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDisabled: { opacity: 0.35 },
  recordGlyph: { fontFamily: font.body, fontSize: 15, color: color.inkSoft },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonIdle: { opacity: 0.3 },
  sendGlyph: { fontFamily: font.body, fontSize: 15, color: color.white },
  sendError: {
    paddingHorizontal: space.xl,
    paddingBottom: 8,
    textAlign: 'center',
    color: color.inkSoft,
  },

  callScreen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: color.ink,
    paddingTop: 86,
    paddingHorizontal: 30,
  },
  callAvatar: { width: 152, height: 152, borderRadius: 76, marginTop: 42 },
  callName: { marginTop: 25, color: color.white, fontSize: 27 },
  callStatus: { marginTop: 9, color: 'rgba(252,252,251,0.7)' },
  callActions: {
    marginTop: 'auto',
    marginBottom: 42,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  callUnavailableAction: {
    marginTop: 36,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: color.white,
    paddingVertical: 14,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  callUnavailableLabel: {
    color: color.ink,
    fontFamily: font.bodyBold,
    fontSize: 12,
  },
  callUtility: { alignItems: 'center', justifyContent: 'center', gap: 8, width: 68, minHeight: 68, borderRadius: 34 },
  callUtilityActive: { backgroundColor: 'rgba(252,252,251,0.14)' },
  callUtilityGlyph: { fontFamily: font.body, fontSize: 22, color: color.white },
  callUtilityLabel: { fontFamily: font.bodyMedium, fontSize: 12, color: 'rgba(252,252,251,0.76)' },
  endCall: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CB4242',
  },
  endCallGlyph: { fontFamily: font.body, fontSize: 24, color: color.white, transform: [{ rotate: '135deg' }] },
  callNote: { position: 'absolute', bottom: 15, left: 40, right: 40, color: 'rgba(252,252,251,0.44)' },
});

/**
 * One ice-breaker in an empty conversation, picked at random and left alone.
 *
 * It is set apart as the app speaking, in its own card with its own name, so
 * nobody mistakes it for a message from the other person.
 */
/** After two quiet days the same assistant offers an opener to put in the box. */
function QuietNudge({ onUse }: { onUse: (text: string) => void }) {
  const { language, t } = useI18n();
  const [opener] = useState(() => shuffledOpeners(language)[0]);
  const [dismissed, setDismissed] = useState(false);
  if (!opener || dismissed) return null;
  return (
    <View style={styles.quietWrap}>
      <View style={styles.botCard}>
        <Text style={styles.botName}>✦ {t('chat.botName')}</Text>
        <Text style={styles.botLead}>{t('chat.quietTitle')}</Text>
        <Text style={styles.opener}>“{opener}”</Text>
        <View style={styles.quietActions}>
          <Pressable accessibilityRole="button" onPress={() => onUse(opener)} hitSlop={8}>
            <Text style={styles.quietUse}>{t('chat.useOpener')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.dismiss')} onPress={() => setDismissed(true)} hitSlop={8}>
            <Text style={styles.quietDismiss}>✕</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function OpenerHint() {
  const { language, t } = useI18n();
  const [opener] = useState(() => shuffledOpeners(language)[0]);
  if (!opener) return null;
  return (
    <View style={styles.openerWrap} pointerEvents="none">
      <Animated.View entering={FadeIn.duration(500)} style={styles.botCard}>
        <Text style={styles.botName}>✦ {t('chat.botName')}</Text>
        <Text style={styles.botLead}>{t('chat.botSuggest')}</Text>
        <Text style={styles.opener}>“{opener}”</Text>
      </Animated.View>
    </View>
  );
}
