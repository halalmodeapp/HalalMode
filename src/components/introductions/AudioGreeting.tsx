import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { alpha, color, font, radius } from '@/theme/tokens';
import { usePrivateMedia } from '@/hooks/usePrivateMedia';
import { useScreenActive } from '@/hooks/useScreenActive';
import { showNotice } from '@/lib/notice';

const BAR_COUNT = 26;

export interface AudioGreetingProps {
  durationSeconds: number;
  /** Absent in the sample data, the waveform still scrubs so the UI is real. */
  url?: string;
  storagePath?: string;
  /** Chat bubbles use the compact form with no surrounding card. */
  compact?: boolean;
  /** Inverts for the sent-message bubble. */
  onDark?: boolean;
}

/**
 * Voice greeting player.
 *
 * The waveform is derived from the duration rather than decoded from the file,
 * a real FFT would cost a native module and a decode pass for a 16-second clip
 * that is decoration. Playback position is honest; the bar heights are not.
 */
export function AudioGreeting({
  durationSeconds,
  url,
  storagePath,
  compact,
  onDark,
}: AudioGreetingProps) {
  const { localeTag, isRTL, t } = useI18n();
  const media = usePrivateMedia(url, 'voice-introductions', storagePath);
  const active = useScreenActive();
  const loadedUrl = useRef<string | undefined>(undefined);
  const request = useRef(0);
  const startingRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const player = useAudioPlayer(null, {
    updateInterval: 250,
    // Downloading first helps a phone start playback cleanly. On the web the
    // library's pre-download has no error handling, so an unreachable file
    // became an uncaught "Failed to fetch" that took down the whole screen;
    // a browser streams the file itself anyway.
    downloadFirst: Platform.OS !== 'web',
  });
  const status = useAudioPlayerStatus(player);
  useEffect(() => {
    if (!active) player.pause();
    startingRef.current = false;
    setStarting(false);
    // useAudioPlayer releases its native object on unmount; do not call it
    // from cleanup after that release. Blur/background pause above is enough.
    return () => { request.current += 1; };
  }, [active, player]);

  const play = async () => {
    if (!active || startingRef.current) return;
    if (status.playing) { player.pause(); return; }
    startingRef.current = true;
    setStarting(true);
    const generation = request.current;
    try {
      const fresh = await media.ensure();
      if (generation !== request.current) return;
      if (typeof fresh !== 'string' || !fresh) throw new Error('Audio unavailable');
      if (loadedUrl.current !== fresh) {
        player.replace(fresh);
        loadedUrl.current = fresh;
      } else if (status.didJustFinish) await player.seekTo(0);
      if (generation === request.current) player.play();
    } catch {
      if (generation === request.current) showNotice(t('audio.unavailable'), t('profile.connectionError'));
    } finally {
      if (generation === request.current) { startingRef.current = false; setStarting(false); }
    }
  };

  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => {
        const seed = i * 1.7 + durationSeconds;
        return 4 + (Math.sin(seed) * 0.5 + 0.5) * 14;
      }),
    [durationSeconds]
  );

  const actualDuration = status.duration || durationSeconds;
  const progress = actualDuration > 0 ? status.currentTime / actualDuration : 0;
  const remaining = Math.max(0, Math.round(actualDuration - status.currentTime));
  const timeLabel = new Intl.NumberFormat(localeTag, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(remaining);

  const tint = onDark ? color.white : color.ink;
  const idleBar = onDark ? 'rgba(252,252,251,0.35)' : 'rgba(10,10,10,0.16)';

  return (
    <View style={[styles.row, isRTL && styles.rowRTL, !compact && styles.card]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          !url && !storagePath ? t('audio.unavailable') : status.playing ? t('audio.pause') : t('audio.play')
        }
        accessibilityState={{ disabled: !url && !storagePath, busy: starting || status.isBuffering }}
        disabled={(!url && !storagePath) || starting}
        onPress={() => void play()}
        style={[
          styles.play,
          !url && !storagePath && styles.playDisabled,
          { backgroundColor: onDark ? color.white : color.ink },
        ]}
      >
        <Text
          style={[styles.playGlyph, { color: onDark ? color.ink : color.white }]}
        >
          {status.playing ? '❚❚' : '▶'}
        </Text>
      </Pressable>

      <View style={styles.wave}>
        {bars.map((height, index) => {
          const reached = index / BAR_COUNT <= progress;
          return (
            <View
              key={index}
              style={{
                width: 2,
                height,
                borderRadius: 1,
                backgroundColor: reached ? tint : idleBar,
              }}
            />
          );
        })}
      </View>

      <Text
        style={[
          styles.time,
          { color: onDark ? 'rgba(252,252,251,0.6)' : color.faint },
        ]}
      >
        0:{timeLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowRTL: { flexDirection: 'row-reverse' },
  card: {
    borderWidth: 1,
    borderColor: alpha.line,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: { fontFamily: font.body, fontSize: 11 },
  playDisabled: { opacity: 0.35 },
  wave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  time: { fontFamily: font.body, fontSize: 12 },
});
