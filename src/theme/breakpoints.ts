import { useWindowDimensions } from 'react-native';

/**
 * Three sizes, at the widths where layouts naturally change.
 *
 * Below 640 is a phone held in a hand: one column, edge to edge. From 640 a
 * tablet or a narrow browser window has room for wider cards but not yet for
 * two columns of form. From 1024 a laptop or a landscape tablet has room for
 * two columns side by side, so the long screens (sign-in, profile, settings)
 * split rather than stretching one column across a monitor.
 */
export type Breakpoint = 'phone' | 'tablet' | 'desktop';

export const BREAKPOINTS = { tablet: 640, desktop: 1024 } as const;

/** How wide the app frame is allowed to get at each size. */
export const FRAME_WIDTH: Record<Breakpoint, number> = {
  phone: 560,
  tablet: 720,
  desktop: 1080,
};

export function breakpointFor(width: number): Breakpoint {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
}

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return breakpointFor(width);
}
