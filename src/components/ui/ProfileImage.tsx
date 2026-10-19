import { Image, type ImageProps } from 'expo-image';
import { useRef } from 'react';
import { usePrivateMedia } from '@/hooks/usePrivateMedia';

/** Keeps renewal local to the image. A thumbnail and full-size image share a key. */
export function ProfileImage({ source, storagePath, onError, ...props }: ImageProps & { storagePath?: string }) {
  const uri = typeof source === 'object' && source !== null && 'uri' in source ? source.uri : source;
  const media = usePrivateMedia(uri, 'profile-photos', storagePath);
  const retried = useRef<unknown>(null);
  return <Image {...props} source={media.privateMedia ? media.url as string | undefined : source}
    onError={event => {
      const key = storagePath ?? uri;
      if (media.privateMedia && retried.current !== key) {
        retried.current = key;
        media.retry();
      }
      onError?.(event);
    }} />;
}
