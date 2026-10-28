import { Image } from 'expo-image';
import { StyleSheet, View, type ImageStyle } from 'react-native';

import type { LikedYou } from '@/api/likedYou';
import { ProfileImage } from '@/components/ui/ProfileImage';
import { getProfilePhotoSource } from '@/data/demoProfilePhotos';
import { usePrivateMedia } from '@/hooks/usePrivateMedia';
import { color } from '@/theme/tokens';

/**
 * The photo of someone who liked you. Unlocked: their real first photo. Not
 * unlocked: the 12-pixel copy the server made, blurred again here, or a plain
 * tile while that copy is still being made. The real file is never requested.
 */
export function LikedYouPhoto({ liked, style }: { liked: LikedYou; style: ImageStyle }) {
  if (liked.unlocked && liked.profile) {
    return (
      <ProfileImage
        source={getProfilePhotoSource(liked.profile.id, liked.profile.photos, 0)}
        storagePath={liked.profile.photoMedia?.[0]?.storagePath}
        style={style}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return <BlurredPhoto path={liked.blurredPhoto} style={style} />;
}

function BlurredPhoto({ path, style }: { path?: string | null; style: ImageStyle }) {
  const media = usePrivateMedia(undefined, 'profile-photos-blurred', path ?? undefined);
  const url = media.privateMedia ? (media.url as string | undefined) : undefined;
  return (
    <View style={[style, styles.tile]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={30}
          onError={() => media.retry()}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { overflow: 'hidden', backgroundColor: color.clay },
});
