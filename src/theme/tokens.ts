import { Platform } from 'react-native';

/**
 * Design tokens transcribed from `Halal Mode 2030.dc.html`.
 *
 * The reference commits hard to a two-colour world — alabaster and near-black —
 * with a single warm gold accent. Everything else is an opacity of the ink.
 * Resist adding hues here; the restraint is the brand.
 */

export const color = {
  /** Page behind the phone shell. */
  canvas: '#EFEEEB',
  /** Default screen surface. */
  surface: '#FCFCFB',
  /** Recessed panels, received chat bubbles, segmented-control track. */
  sand: '#F2F0EC',
  /** Image placeholders and inert circles. */
  sandDeep: '#F1EFEA',
  /** Input fills and dashed drop zones. */
  sandLight: '#F7F6F3',
  /** Photo placeholder before load. */
  clay: '#EDEBE6',

  ink: '#0A0A0A',
  /** Pressed state for the near-black primary button. */
  inkPressed: '#2A2822',
  /** Body copy on light surfaces. */
  inkSoft: '#3B3934',
  /** Secondary copy. */
  muted: '#6C6A65',
  /** Tertiary copy. */
  faint: '#8B8880',
  /** Quaternary copy, "Later tonight" style links. */
  faintest: '#9A9790',
  /** Uppercase micro-labels. */
  label: '#A6A29A',
  /** Counters and the quietest hints. */
  whisper: '#B4B0A8',

  /** The one accent. Used for micro-labels that matter and links. */
  gold: '#8A6A34',
  /** Gold on dark surfaces. */
  goldOnDark: '#D6B469',
  /** The chosen-one glow. */
  goldGlow: '#C5A054',

  /** Verified badge only. */
  green: '#2F5D4A',

  white: '#FCFCFB',
} as const;

/** Ink at opacity — borders, scrims, hairlines. */
export const alpha = {
  line: 'rgba(10,10,10,0.09)',
  lineStrong: 'rgba(10,10,10,0.14)',
  lineFaint: 'rgba(10,10,10,0.07)',
  lineButton: 'rgba(10,10,10,0.18)',
  scrim: 'rgba(10,10,10,0.42)',
  onDark: 'rgba(252,252,251,0.62)',
  onDarkStrong: 'rgba(252,252,251,0.88)',
  onDarkLine: 'rgba(252,252,251,0.28)',
} as const;

export const radius = {
  sm: 6,
  md: 14,
  lg: 18,
  xl: 20,
  card: 22,
  panel: 26,
  hero: 30,
  sheet: 32,
  pill: 999,
} as const;

/**
 * How wide the app is allowed to get.
 *
 * Every screen here was drawn for a hand. On a desktop monitor an unconstrained
 * layout gives you buttons a metre wide and a line of body copy nobody can read
 * across, so the whole app keeps a hand's width and sits in the middle.
 *
 * Modals need this too, and are the easy thing to forget: a Modal renders
 * outside the navigator, so it does not inherit the screen's constraint and
 * will happily fill a 27-inch display on top of a 560px app.
 */
export const layout = {
  maxContentWidth: 560,
} as const;

export const space = {
  /** Standard horizontal screen gutter. */
  gutter: 22,
  /** Wider gutter used on the question and recap screens. */
  gutterWide: 24,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

/**
 * On the web the browser picks a font per character, so each face is followed
 * by what it lacks: Beiruti for Arabic script, then the system's own faces for
 * Devanagari, Bengali, Ethiopic and Chinese. On a phone the OS does the same
 * fallback itself, so the bare family name is enough.
 */
const webStack = (face: string) =>
  Platform.OS === 'web'
    ? `${face}, Beiruti_500Medium, "Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
    : face;

export const font = {
  /** Playfair Display — the human sentences. Never for mechanics. */
  display: 'PlayfairDisplay_400Regular',
  displayItalic: 'PlayfairDisplay_400Regular_Italic',
  /**
   * Noto Sans — mechanics, labels, body. Chosen because it was drawn to cover
   * nearly every script in one consistent design, so the app reads as itself
   * in Hindi or Russian rather than in whatever the device happened to have.
   */
  body: webStack('NotoSans_400Regular'),
  bodyMedium: webStack('NotoSans_500Medium'),
  bodySemi: webStack('NotoSans_600SemiBold'),
  bodyBold: webStack('NotoSans_700Bold'),
  /** Beiruti, for Arabic, Urdu and Persian, where it reads better than Noto. */
  arabic: 'Beiruti_400Regular',
} as const;

/**
 * The uppercase micro-label that replaces icon clutter throughout the
 * reference. Three sizes, all wide-tracked.
 */
export const microLabel = {
  tiny: { fontSize: 9, letterSpacing: 2.6, textTransform: 'uppercase' },
  small: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  medium: { fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  lifted: {
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.2,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  modal: {
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.3,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 24 },
    elevation: 16,
  },
} as const;

/**
 * Spring-eased arc motion, matching `cubic-bezier(.22,1,.36,1)` from the
 * reference. Reanimated springs read closer to the original than a timing curve.
 */
export const motion = {
  arc: { damping: 18, stiffness: 170, mass: 0.9 },
  crossfade: 320,
  rise: 300,
  quick: 160,
} as const;
