import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
  const [aspect, setAspect] = useState(4 / 3);
  const crop = useQuery({ queryKey: KEY, queryFn: fetchMyAvatarCrop });

  const url = profile.photos[0];
  const path = profile.photoMedia?.[0]?.storagePath ?? url ?? '';
  if (!url) return <View style={styles.circle} />;

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
        onPress={() => setEditing(true)}
        style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
      >
        <Image
          source={url}
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
        uri={editing ? url : null}
        initial={saved}
        onCircle={save}
        onCancel={() => setEditing(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  circle: { width: SIZE, height: SIZE, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: color.ink },
  pressed: { opacity: 0.75 },
});
