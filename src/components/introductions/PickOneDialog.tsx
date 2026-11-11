import { ProfileImage as Image } from '@/components/ui/ProfileImage';
import { getProfilePhotoSource } from '@/data/demoProfilePhotos';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { alpha, color, radius, shadow, space } from '@/theme/tokens';
import type { Introduction } from '@/types';

export interface PickOneDialogProps {
  visible: boolean;
  /** The people to choose between: the member's current choices. */
  introductions: Introduction[];
  selectedId: string | null;
  onSelect: (introductionId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
}

/**
 * Asks the member to pick one person from their current choices, for example
 * who comes first or who to swap out. Confirm stays disabled until one is picked.
 */
export function PickOneDialog({
  visible,
  introductions,
  selectedId,
  onSelect,
  onConfirm,
  onCancel,
  title,
  body,
  confirmLabel,
  cancelLabel,
}: PickOneDialogProps) {
  const { isRTL } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.scrim}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityLabel={cancelLabel}
        />
        <Animated.View entering={FadeInUp.duration(200)} style={styles.card}>
          <Text variant="displaySmall" center>
            {title}
          </Text>
          <Text variant="bodySmall" center style={styles.body}>
            {body}
          </Text>

          <View style={styles.options}>
            {introductions.map((introduction) => {
              const selected = introduction.id === selectedId;
              return (
                <Pressable
                  key={introduction.id}
                  testID={`first-choice-${introduction.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={introduction.profile.firstName}
                  onPress={() => onSelect(introduction.id)}
                  style={[
                    styles.option,
                    isRTL && styles.rowReverse,
                    selected && styles.optionSelected,
                  ]}
                >
                  <Image
                    source={getProfilePhotoSource(introduction.profile.id, introduction.profile.photos, 0)}
                    storagePath={introduction.profile.photoMedia?.[0]?.storagePath}
                    style={styles.avatar}
                    contentFit="cover"
                    accessibilityIgnoresInvertColors
                  />
                  <Text variant="label" style={styles.name}>
                    {introduction.profile.firstName}
                  </Text>
                  <View style={[styles.dot, selected && styles.dotSelected]} />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              variant="gold"
              disabled={selectedId === null}
              onPress={onConfirm}
              style={styles.action}
            />
            <Button
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              style={styles.action}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    paddingVertical: space.xxl,
    paddingHorizontal: space.gutterWide,
    maxWidth: 320,
    width: '100%',
    ...shadow.modal,
  },
  body: { marginTop: space.sm, color: color.muted },
  options: { marginTop: space.xl, gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: alpha.line,
    borderRadius: radius.card,
    padding: 10,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  optionSelected: { borderColor: color.goldGlow, backgroundColor: 'rgba(197,160,84,0.07)' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  name: { flex: 1, fontSize: 13 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: alpha.lineStrong,
  },
  dotSelected: { backgroundColor: color.goldGlow, borderColor: color.goldGlow },
  // Stacked, main action first, so no label ever wraps into a tall oval.
  actions: { gap: 10, marginTop: space.xl },
  action: { alignSelf: 'stretch' },
});
