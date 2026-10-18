export const COVER_STYLE_STORAGE_KEY = 'halalmode-cover-style';

export const COVER_STYLES = ['couple', 'hearts'] as const;

export type CoverStyle = (typeof COVER_STYLES)[number];

export function isCoverStyle(value: string | null): value is CoverStyle {
  return value !== null && COVER_STYLES.some((style) => style === value);
}
