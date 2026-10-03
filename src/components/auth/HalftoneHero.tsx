import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

/**
 * On phones, the landing page's photo with a warm gold wash over it. The web
 * build draws it as halftone dots instead (HalftoneHero.web.tsx).
 */
export function HalftoneHero() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        source={require('../../../assets/branding/landing-hero.webp')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        accessibilityIgnoresInvertColors
      />
      <View style={[StyleSheet.absoluteFill, styles.wash]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wash: { backgroundColor: 'rgba(160,120,60,0.35)' },
});
