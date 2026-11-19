import { Asset } from 'expo-asset';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileImage as Image } from '@/components/ui/ProfileImage';
import { getProfilePhotoSource } from '@/data/demoProfilePhotos';
import { usePrivateMedia } from '@/hooks/usePrivateMedia';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { fetchMyAvatarCrop, saveMyAvatarCrop, type AvatarCrop } from '@/api/profileMedia';
import { PhotoCropSheet } from '@/components/you/PhotoCropSheet';
import { useI18n } from '@/i18n';
import { useToast } from '@/state/toast';
import { color, radius } from '@/theme/tokens';
import type { Profile } from '@/types';

const SIZE = 48;
const KEY = ['avatar-crop'] as const;

/**
 * The round profile picture: a circle placed on the main photo. Tap it to move
 * or zoom; nothing is cut from the photo, so it can be changed any time.
 */
export function ProfileAvatar({ profile }: { profile: Profile }) {
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editorUri, setEditorUri] = useState<string | null>(null);
  const [sourceFailed, setSourceFailed] = useState(false);
  const editorAttempt = useRef(0);
  const [editorPath, setEditorPath] = useState('');

  const [aspect, setAspect] = useState(4 / 3);
  const crop = useQuery({ queryKey: KEY, queryFn: fetchMyAvatarCrop });

  const original = getProfilePhotoSource(profile.id, profile.photos, 0);
  const media = usePrivateMedia(original, 'profile-photos', profile.photoMedia?.[0]?.storagePath);
  const source = (media.privateMedia ? media.url ?? '' : original) as typeof original;
  const url = typeof source === 'string' ? source : typeof source === 'object' ? source.uri : undefined;
  const path = profile.photoMedia?.[0]?.storagePath ?? profile.photos[0] ?? '';
  const canEdit = Boolean(path && (media.privateMedia || typeof original === 'number' || url));
  if (!canEdit && !url) return <View style={styles.circle} />;

  const open = async (retry = false) => {
    const attempt = ++editorAttempt.current;
    setEditorPath(path);
    setEditorUri(null);
    setSourceFailed(false);
    setEditing(true);
    try {
      let resolved;
      if (media.privateMedia) {
        resolved = await media.ensure(retry);
      } else if (typeof original === 'number') {
        const asset = Asset.fromModule(original);
        if (!asset.localUri) await asset.downloadAsync();
        resolved = asset.localUri ?? asset.uri;
      } else {
        resolved = url;
      }
      if (attempt !== editorAttempt.current) return;
      if (typeof resolved !== 'string' || !resolved) throw new Error('Photo unavailable');
      setEditorUri(resolved);
    } catch {
      if (attempt === editorAttempt.current) setSourceFailed(true);
    }
  };

  // A crop set on a different main photo no longer applies.
  const saved = crop.data && crop.data.path === path ? crop.data : null;
  const place = saved ?? { cx: 0.5, cy: 0.5, size: Math.min(1, aspect) };
  const width = SIZE / place.size;
  const height = width * aspect;

  const save = (next: Omit<AvatarCrop, 'path'>) => {
    setEditing(false);
    const value = { ...next, path };
    queryClient.setQueryData(KEY, value);
    void saveMyAvatarCrop(value)
      .then(() => toast.show(`✓ ${t('filters.saved')}`))
      .catch(() => void queryClient.invalidateQueries({ queryKey: KEY }));
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('profile.avatarEditA11y')}
        disabled={!canEdit}
        onPress={() => void open()}
        style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
      >
        {media.loading && !media.url ? <ActivityIndicator color={color.white} /> : null}
        <Image
          source={source}
          onLoad={(event) => setAspect(event.source.height / Math.max(event.source.width, 1))}
          style={{
            position: 'absolute',
            width,
            height,
            left: SIZE / 2 - place.cx * width,
            top: SIZE / 2 - place.cy * height,
          }}
          contentFit="fill"
          accessibilityIgnoresInvertColors
        />
      </Pressable>
      <PhotoCropSheet
        shape="circle"
        open={editing && editorPath === path}
        uri={editing && editorPath === path ? editorUri : null}
        sourceFailed={sourceFailed}
        onRetry={() => void open(true)}
        initial={saved}
        onCircle={save}
        onCancel={() => { editorAttempt.current += 1; setEditing(false); setEditorUri(null); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  circle: { width: SIZE, height: SIZE, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: color.ink, justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
