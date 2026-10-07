import { createContext, useContext, type ReactNode } from 'react';

/**
 * Whether what is drawn sits on the light page or on a black card (the Halal
 * Mode Premium sections). Text and form controls read it and swap to light ink
 * on dark, so a section can go black without restyling every control in it.
 */
export type SurfaceTone = 'light' | 'dark';

const ToneContext = createContext<SurfaceTone>('light');

export function SurfaceToneProvider({ tone, children }: { tone: SurfaceTone; children: ReactNode }) {
  return <ToneContext.Provider value={tone}>{children}</ToneContext.Provider>;
}

export function useSurfaceTone(): SurfaceTone {
  return useContext(ToneContext);
}

/** Ink for a black card. */
export const onDark = {
  ink: '#FCFCFB',
  soft: 'rgba(252,252,251,0.78)',
  quiet: 'rgba(252,252,251,0.55)',
  line: 'rgba(252,252,251,0.22)',
  lineStrong: 'rgba(252,252,251,0.4)',
  fill: 'rgba(252,252,251,0.08)',
} as const;
