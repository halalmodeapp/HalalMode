import { Platform, type ViewStyle } from 'react-native';

/**
 * Right-to-left layout, spelled the way each platform understands it.
 *
 * On a device Yoga reads `direction` and flips the view's rows for us. The web
 * renderer has no such property — it rejects it, logs an error for every screen
 * that mounts, and lays the view out left-to-right anyway. So on web this is
 * deliberately empty and the flip happens once on the document element instead,
 * in `I18nProvider`, which is how a browser expects to be told.
 *
 * One constant rather than ten copies, because the ten copies were already
 * drifting: some spelled it inline, some in a `styles.rtl` entry, and every one
 * of them was wrong in a browser.
 */
export const RTL_LAYOUT: ViewStyle = Platform.OS === 'web' ? {} : { direction: 'rtl' };
