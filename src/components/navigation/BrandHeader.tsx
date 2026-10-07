import { StyleSheet, View } from 'react-native';

import { ShiningWordmark } from '@/components/brand/ShiningWordmark';
import { PremiumWord } from '@/components/brand/PremiumLogo';
import { useI18n } from '@/i18n';
import { useSession } from '@/state/session';

/** The wordmark strip that tops every primary screen in the reference. */
export function BrandHeader() {
  const { tier } = useSession();
  const { t } = useI18n();

  return (
    <View style={styles.header}>
      <ShiningWordmark width={110} />
      {tier === 'premium' ? (
        // The same lockup as everywhere Halal Mode Premium is named.
        <View testID="membership-premium-badge" accessible accessibilityLabel={t('settings.premium')}>
          <PremiumWord logoWidth={110} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%', maxWidth: 720, alignSelf: 'center',
    height: 34,
    paddingHorizontal: 26,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
});
