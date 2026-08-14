import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { RTL_LAYOUT } from '@/lib/rtl';
import { alpha, color, font, layout, radius, space } from '@/theme/tokens';

const SUPPORT_ADDRESS = 'safety@halalmo.de';

/**
 * What happens when somebody reports a person, in plain words.
 *
 * Reporting itself lives where the concern does — on the introduction and in
 * the conversation, one tap from the person being reported, so nobody has to
 * describe who they mean. What was missing was this: an explanation of what a
 * report does, what it does not do, and who to write to when the situation is
 * not a report at all.
 *
 * Written to answer the question people are actually asking before they tap
 * the button, which is "will they know it was me".
 */
export function ModerationSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();

  const steps: { title: string; body: string }[] = [
    { title: t('moderation.s1Title'), body: t('moderation.s1Body') },
    { title: t('moderation.s2Title'), body: t('moderation.s2Body') },
    { title: t('moderation.s3Title'), body: t('moderation.s3Body') },
    { title: t('moderation.s4Title'), body: t('moderation.s4Body') },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={[styles.scrim, isRTL && styles.rtl]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Animated.View entering={FadeInDown.duration(280)} style={styles.sheet} accessibilityViewIsModal>
          <View style={[styles.head, isRTL && styles.rowReverse]}>
            <View style={styles.headText}>
              <Text variant="microAccent">{t('settings.safety')}</Text>
              <Text variant="displaySmall" style={styles.title}>{t('moderation.title')}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('picker.close')}
              onPress={onClose}
              style={styles.close}
            >
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="bodySmall">{t('moderation.intro')}</Text>

            <View style={styles.steps}>
              {steps.map((step, index) => (
                <View key={step.title} style={[styles.step, isRTL && styles.rowReverse]}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberLabel}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepText}>
                    <Text variant="label">{step.title}</Text>
                    <Text variant="caption" style={styles.stepBody}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.emergency}>
              <Text variant="label">{t('moderation.urgentTitle')}</Text>
              <Text variant="caption" style={styles.stepBody}>{t('moderation.urgentBody')}</Text>
            </View>
          </ScrollView>

          <View style={[styles.foot, { paddingBottom: insets.bottom + 20 }]}>
            <Button
              label={t('moderation.write')}
              onPress={() => {
                void Linking.openURL(
                  `mailto:${SUPPORT_ADDRESS}?subject=${encodeURIComponent(t('moderation.subject'))}`,
                ).catch(() => {});
              }}
            />
            <Text variant="caption" center style={styles.address}>{SUPPORT_ADDRESS}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  rowReverse: { flexDirection: 'row-reverse' },
  scrim: { flex: 1, backgroundColor: alpha.scrim, justifyContent: 'flex-end' },
  sheet: {
    // A Modal renders outside the navigator, so it does not inherit the app's
    // width. Without this it fills the whole monitor.
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: space.gutter,
    borderBottomWidth: 1,
    borderBottomColor: alpha.lineFaint,
  },
  headText: { flexShrink: 1 },
  title: { marginTop: 7 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { fontFamily: font.body, fontSize: 13, color: color.inkSoft },

  body: { flexGrow: 1, flexShrink: 1 },
  bodyContent: { padding: space.gutter, gap: 18 },
  steps: { gap: 16 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberLabel: { fontFamily: font.bodyBold, fontSize: 10, color: color.white },
  stepText: { flexShrink: 1, gap: 3 },
  stepBody: { lineHeight: 17 },
  emergency: {
    gap: 4,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: color.sandLight,
    borderWidth: 1,
    borderColor: alpha.line,
  },

  foot: {
    paddingHorizontal: space.gutter,
    paddingTop: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: alpha.lineFaint,
  },
  address: { color: color.faintest },
});
