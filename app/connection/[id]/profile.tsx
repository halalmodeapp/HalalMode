import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { fetchConnection } from '@/api/connections';
import { AudioGreeting } from '@/components/introductions/AudioGreeting';
import { MaritalStatusBadge } from '@/components/introductions/MaritalStatusBadge';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { SafetyControl } from '@/components/safety/SafetyControl';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { ProfileImage as Image } from '@/components/ui/ProfileImage';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { getProfilePhotoGallery, getProfilePhotoSource } from '@/data/demoProfilePhotos';
import { occupationLabel } from '@/data/occupations';
import { useI18n } from '@/i18n';
import { profileDetailLines } from '@/lib/profileDetails';
import { queryKeys } from '@/lib/queryClient';
import { RTL_LAYOUT } from '@/lib/rtl';
import { alpha, color, radius, space } from '@/theme/tokens';

/**
 * Someone you are connected with: their photos and profile, as they were
 * introduced, reachable from the chat's name and photo at any time.
 */
export default function ConnectionProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isRTL, language, localeTag, t } = useI18n();
  const window = useWindowDimensions();
  const connectionQuery = useQuery({ queryKey: queryKeys.connection(id), queryFn: () => fetchConnection(id) });
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState(false);
  const heroList = useRef<FlatList<number>>(null);

  if (connectionQuery.isPending) {
    return <Screen><LoadingState label={t('chat.loading')} /></Screen>;
  }
  const connection = connectionQuery.data;
  if (connectionQuery.isError || !connection) {
    return (
      <Screen>
        <ErrorState title={t('chat.errorTitle')} message={t('chat.errorBody')} onRetry={() => void connectionQuery.refetch()} />
      </Screen>
    );
  }

  const { profile } = connection;
  const count = Math.max(1, getProfilePhotoGallery(profile.id, profile.photos).length);
  const pages = Array.from({ length: count }, (_, i) => i);
  const width = Math.min(window.width, 560);
  const heroHeight = Math.round(width * 1.15);
  const number = (value: number) => new Intl.NumberFormat(localeTag).format(value);
  const photo = (i: number) => ({
    source: getProfilePhotoSource(profile.id, profile.photos, i),
    storagePath: profile.photoMedia?.[i]?.storagePath,
  });
  const goTo = (next: number) => {
    const target = Math.min(count - 1, Math.max(0, next));
    heroList.current?.scrollToOffset({ offset: target * width, animated: true });
    setIndex(target);
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.min(count - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width))));
  };
  const details = profileDetailLines(profile, t, language);

  return (
    <Screen style={isRTL ? styles.rtl : undefined}>
        <ScreenHeader
          action="back"
          trailing={<SafetyControl scope={{ kind: 'connection', id }} memberName={profile.firstName} />}
        />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={[styles.hero, { width, height: heroHeight }]}>
          <FlatList
            ref={heroList}
            data={pages}
            keyExtractor={(page) => String(page)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            getItemLayout={(_data, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel={t('intro.photosA11y', { name: profile.firstName })}
                onPress={() => setViewer(true)}
                style={{ width, height: heroHeight }}
              >
                <Image {...photo(item)} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
              </Pressable>
            )}
          />
          {count > 1 ? (
            <View style={styles.counter} pointerEvents="none">
              <Text style={styles.counterText}>{`${number(index + 1)} / ${number(count)}`}</Text>
            </View>
          ) : null}
        </View>

        {count > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.thumbs, isRTL && styles.rowRTL]}>
            {pages.map((page) => (
              <Pressable
                key={page}
                accessibilityRole="button"
                accessibilityState={{ selected: page === index }}
                onPress={() => goTo(page)}
                style={[styles.thumb, page === index && styles.thumbActive]}
              >
                <Image {...photo(page)} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.body}>
          <Text variant="displaySmall">{profile.name}</Text>
          <Text variant="bodySmall">
            {`${number(profile.age)} · ${profile.city} · ${occupationLabel(profile.occupation, language)}`}
          </Text>
          <MaritalStatusBadge status={profile.maritalStatus} />
          <View style={[styles.chips, isRTL && styles.rowRTL]}>
            {profile.chips.map((chip) => <Chip key={chip} label={chip} />)}
          </View>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          {profile.audioDurationSeconds ? (
            <View style={styles.section}>
              <Text variant="label">{t('intro.audio')}</Text>
              <AudioGreeting
                durationSeconds={profile.audioDurationSeconds}
                url={profile.audioGreetingUrl}
                storagePath={profile.audioGreetingStoragePath}
              />
            </View>
          ) : null}
          {details.length > 0 ? (
            <View style={styles.section}>
              <Text variant="micro">{t('intro.about', { name: profile.firstName })}</Text>
              {details.map((line) => (
                <View key={line.label} style={[styles.detailRow, isRTL && styles.rowRTL]}>
                  <Text variant="bodySmall">{line.label}</Text>
                  <Text variant="label" style={styles.detailValue}>{line.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={viewer} animationType="fade" transparent onRequestClose={() => setViewer(false)}>
        <View style={styles.viewer}>
          <FlatList
            data={pages}
            keyExtractor={(page) => String(page)}
            horizontal
            pagingEnabled
            initialScrollIndex={index}
            getItemLayout={(_data, i) => ({ length: window.width, offset: window.width * i, index: i })}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) =>
              setIndex(Math.min(count - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / window.width))))}
            renderItem={({ item }) => (
              <View style={{ width: window.width, height: window.height, justifyContent: 'center' }}>
                <Image {...photo(item)} style={{ width: window.width, height: window.height * 0.8 }} contentFit="contain" accessibilityIgnoresInvertColors />
              </View>
            )}
          />
          <View style={styles.viewerClose}>
            <Button label={t('common.back')} variant="onDark" onPress={() => setViewer(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  rowRTL: { flexDirection: 'row-reverse' },
  content: { paddingBottom: 40, alignItems: 'center' },
  hero: { backgroundColor: color.clay, overflow: 'hidden' },
  counter: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(10,10,10,0.55)',
  },
  counterText: { color: color.white, fontSize: 12, fontWeight: '600' },
  thumbs: { gap: 8, paddingHorizontal: space.gutter, paddingVertical: 12 },
  thumb: { width: 54, height: 54, borderRadius: radius.card - 6, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', backgroundColor: color.clay },
  thumbActive: { borderColor: color.ink },
  body: { width: '100%', maxWidth: 560, paddingHorizontal: space.gutter, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bio: { lineHeight: 24 },
  section: { gap: 8, marginTop: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: alpha.line },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  viewer: { flex: 1, backgroundColor: 'rgba(10,10,10,0.96)', justifyContent: 'center' },
  viewerClose: { position: 'absolute', bottom: 40, left: 24, right: 24 },
});
