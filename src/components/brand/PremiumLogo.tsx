import { StyleSheet, Text, View } from 'react-native';

import { Wordmark } from '@/components/brand/Wordmark';
import { useSurfaceTone } from '@/theme/tone';
import { color, font } from '@/theme/tokens';

/** The wordmark's height for its width (988.77 × 139.6). */
const RATIO = 139.6 / 988.77;

/**
 * "Premium" in gold, sized and lowered to sit beside a wordmark of the given
 * width: capitals as tall as the logo's ascenders, baseline on its bottom.
 */
export function PremiumWord({ logoWidth, dark }: { logoWidth: number; dark?: boolean }) {
  const height = logoWidth * RATIO;
  const size = height * 1.32;
  return (
    <Text
      style={[
        styles.word,
        {
          fontSize: size,
          lineHeight: size,
          // Lowers the line box so the baseline lands on the logo's bottom.
          marginBottom: -size * 0.11,
          marginLeft: height * 0.45,
          color: dark ? color.goldOnDark : color.gold,
        },
      ]}
    >
      Premium
    </Text>
  );
}

/**
 * The Halal Mode Premium mark: the wordmark with "Premium" beside it. Used
 * wherever Halal Mode Premium is named as a heading. Ink on light, white on a
 * black card.
 */
export function PremiumLogo({ width = 150 }: { width?: number }) {
  const dark = useSurfaceTone() === 'dark';
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Halal Mode Premium" style={styles.row}>
      <Wordmark width={width} fill={dark ? color.white : color.ink} />
      <PremiumWord logoWidth={width} dark={dark} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', direction: 'ltr' },
  word: { fontFamily: font.body },
});
