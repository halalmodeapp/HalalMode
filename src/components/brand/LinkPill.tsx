import { Linking, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useI18n } from '@/i18n';
import { howItWorksUrl, referUrl } from '@/lib/publicLinks';
import { useSession } from '@/state/session';
import { font } from '@/theme/tokens';

type PressState = { pressed: boolean; hovered?: boolean };

/**
 * The one link button of the public screens, matching halalmo.de's .pill-link
 * (site/ui.css): mixed case with an arrow, Halal Pink for the main action and
 * an outlined pill for the rest.
 */
export function LinkPill({ label, onPress, primary = false, style }: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { isRTL } = useI18n();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed, hovered }: PressState) => [
        styles.pill,
        primary ? styles.primary : styles.secondary,
        (pressed || hovered) && (primary ? styles.primaryActive : styles.secondaryActive),
        style,
      ]}
    >
      {({ pressed, hovered }: PressState) => (
        <Text numberOfLines={1} style={[styles.label, primary ? styles.primaryLabel : styles.secondaryLabel, !primary && (pressed || hovered) && styles.secondaryLabelActive]}>
          {label} {isRTL ? '←' : '→'}
        </Text>
      )}
    </Pressable>
  );
}

/** How it works and Refer your friends, as on halalmo.de. */
export function PublicLinks({ refer = true, style }: { refer?: boolean; style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { language } = useSession();
  return (
    <View style={[styles.row, style]}>
      <LinkPill primary label={t('marketing.howItWorks')} onPress={() => void Linking.openURL(howItWorksUrl(language))} />
      {refer ? <LinkPill label={t('marketing.refer')} onPress={() => void Linking.openURL(referUrl(language))} /> : null}
    </View>
  );
}

const PINK = '#FC3C6C'; // Halal Pink
const PINK_DEEP = '#C2124A';
const GOLD = '#B8914F'; // Halal Gold

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: PINK, borderColor: PINK },
  primaryActive: { backgroundColor: PINK_DEEP, borderColor: PINK_DEEP },
  secondary: { backgroundColor: 'rgba(252,252,251,0.9)', borderColor: 'rgba(184,145,79,0.2)' },
  secondaryActive: { borderColor: 'rgba(184,145,79,0.45)' },
  label: { fontFamily: font.bodySemi, fontSize: 13, lineHeight: 18 },
  primaryLabel: { color: '#FFFFFF' },
  secondaryLabel: { color: '#0A0A0A' },
  secondaryLabelActive: { color: GOLD },
});
