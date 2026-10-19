export const HALFTONE_DEFAULTS: Record<string, string | number | boolean>;
/** Lays the halftone texture over a scene element. */
export function startHalftone(
  scene: HTMLElement,
  options?: { settings?: Record<string, string | number | boolean>; still?: boolean },
): { apply(settings: Record<string, string | number | boolean>): void; stop(): void };
