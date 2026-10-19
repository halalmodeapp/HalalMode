import { Linking, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useI18n } from '@/i18n';
import { CONTACT_EMAIL, howItWorksUrl, referUrl } from '@/lib/publicLinks';
import { useSession } from '@/state/session';
import { font } from '@/theme/tokens';

/**
 * The halalmo.de footer (site/site-footer.js) for the app's public screens:
 * the year, How it works, Refer your friends, and the contact address. The
 * year follows the calendar; the words are the website's, kept in step by
 * tests/marketingContent.test.ts.
 */
export function SiteFooter({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t, brandName } = useI18n();
  const { language } = useSession();
  const open = (url: string) => () => void Linking.openURL(url);
  return (
    <View style={[styles.footer, style]}>
      <Text style={styles.text}>© {new Date().getFullYear()} {brandName}</Text>
      <Text style={styles.text}>
        <Text accessibilityRole="link" style={styles.link} onPress={open(howItWorksUrl(language))}>{t('marketing.howItWorks')}</Text>
        {' · '}
        <Text accessibilityRole="link" style={styles.link} onPress={open(referUrl(language))}>{t('marketing.refer')}</Text>
        {' · '}
        {t('marketing.questions')}{' '}
        <Text accessibilityRole="link" style={styles.link} onPress={open(`mailto:${CONTACT_EMAIL}`)}>{CONTACT_EMAIL}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 12, rowGap: 2 },
  text: { fontFamily: font.body, fontSize: 12, lineHeight: 18, color: '#6C6A65', textAlign: 'center' },
  link: { color: '#B8914F' }, // Halal Gold
});
