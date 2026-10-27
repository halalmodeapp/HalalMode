import { StyleSheet } from 'react-native';
import { RTL_LAYOUT } from '@/lib/rtl';
import { color, radius } from '@/theme/tokens';

export const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,

  gestureArea: { flex: 1, overflow: 'visible' },

  deck: {
    flex: 1,
    marginHorizontal: 30,
    overflow: 'visible',
  },

  card: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.hero,
    // Keep the photo's clipping bounds identical as interest is toggled.
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: color.clay,
    // A lift, not a halo.
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 8,
  },

  corner: { position: 'absolute', top: 14, right: 14, zIndex: 300 },
  cornerRTL: { right: undefined, left: 14 },
  chosenTick: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 5,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#C5A054',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chosenTickRTL: { left: undefined, right: 14 },
  chosenTickGlyph: { color: '#FFFFFF', fontSize: 18, lineHeight: 20, fontWeight: '700' },

  cardChosen: {
    borderColor: '#C5A054',
    shadowColor: '#C5A054',
    shadowOpacity: 0.7,
    shadowRadius: 26,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 12,
  },

  filmGrainLayer: {
    zIndex: 2,
  },

  caption: {
    zIndex: 3,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingBottom: 16,
    alignItems: 'center',
  },

  name: {
    fontFamily:
      'PlayfairDisplay_400Regular',
    fontSize: 24,
    lineHeight: 28,
    color: color.white,
    textAlign: 'center',
  },

  maritalOnCard: { marginTop: 10 },
  line: {
    fontFamily:
      'Beiruti_400Regular',
    fontSize: 11.5,
    color:
      'rgba(252,252,251,0.78)',
    marginTop: 4,
    textAlign: 'center',
  },

  popBadge: {
    position: 'absolute',
    zIndex: 4,
    top: 14,
    left: 14,
    backgroundColor:
      'rgba(252,252,251,0.94)',
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },

  popBadgeLabel: {
    fontFamily:
      'Beiruti_700Bold',
    fontSize: 9.5,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: color.ink,
  },
});
