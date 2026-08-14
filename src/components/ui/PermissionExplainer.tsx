import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { RTL_LAYOUT } from '@/lib/rtl';
import { alpha, color, font, radius, shadow, space } from '@/theme/tokens';

export interface PermissionExplainerProps {
  visible: boolean;
  eyebrow: string;
  title: string;
  body: string;
  /** The two or three concrete things this permission is used for. */
  points: readonly string[];
  /** What is never done with it. The reassurance people actually want. */
  reassurance?: string;
  continueLabel: string;
  cancelLabel: string;
  onContinue: () => void;
  onCancel: () => void;
  testID?: string;
}

/**
 * Asks before the operating system does.
 *
 * A permission prompt on its own is a demand with no reason attached, and the
 * honest answer to an unexplained demand is no. On iOS that no is permanent —
 * the system prompt is offered once per install, and after a refusal the only
 * route back is a trip to Settings that nobody makes.
 *
 * So the reason comes first, in our own words, with a "not now" that costs
 * nothing. The real prompt is only reached by somebody who has already decided
 * to say yes, which is the only version of this that is both effective and
 * fair. Saying no here leaves the system prompt unspent for another day.
 */
export function PermissionExplainer({
  visible,
  eyebrow,
  title,
  body,
  points,
  reassurance,
  continueLabel,
  cancelLabel,
  onContinue,
  onCancel,
  testID,
}: PermissionExplainerProps) {
  const reducedMotion = useReducedMotion();
  const { isRTL } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View
        accessibilityViewIsModal
        entering={reducedMotion ? undefined : FadeIn.duration(160)}
        style={styles.scrim}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityLabel={cancelLabel}
        />
        <Animated.View
          testID={testID}
          accessible
          accessibilityRole="alert"
          entering={reducedMotion ? undefined : FadeInUp.duration(200)}
          style={[styles.card, isRTL && styles.rtl]}
        >
          <Text variant="microAccent" center>{eyebrow}</Text>
          <Text variant="displaySmall" center style={styles.title}>{title}</Text>
          <Text variant="bodySmall" center style={styles.body}>{body}</Text>

          <View style={styles.points}>
            {points.map((point) => (
              <View key={point} style={[styles.pointRow, isRTL && styles.rowReverse]}>
                <Text style={styles.mark}>✦</Text>
                <Text variant="bodySmall" style={styles.pointText}>{point}</Text>
              </View>
            ))}
          </View>

          {reassurance ? (
            <Text variant="caption" center style={styles.reassurance}>{reassurance}</Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              testID={testID ? `${testID}-continue` : undefined}
              label={continueLabel}
              onPress={onContinue}
            />
            <Pressable
              testID={testID ? `${testID}-cancel` : undefined}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              onPress={onCancel}
              style={styles.cancel}
            >
              <Text style={styles.cancelLabel}>{cancelLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  rowReverse: { flexDirection: 'row-reverse' },
  scrim: {
    flex: 1,
    backgroundColor: alpha.scrim,
    justifyContent: 'center',
    padding: space.gutter,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.sheet,
    padding: space.gutter,
    gap: 10,
    ...shadow.modal,
  },
  title: { marginTop: 4 },
  body: { marginTop: 2 },
  points: {
    marginTop: 8,
    gap: 10,
    backgroundColor: color.sandLight,
    borderRadius: radius.md,
    padding: 14,
  },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  mark: { color: color.gold, fontSize: 10, fontFamily: font.body, marginTop: 3 },
  pointText: { flexShrink: 1 },
  reassurance: { marginTop: 4 },
  actions: { marginTop: 10, gap: 4 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { fontFamily: font.bodySemi, fontSize: 11, color: color.faintest },
});
