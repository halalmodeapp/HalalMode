export interface StoredAvatarCrop {
  path: string;
  cx: number;
  cy: number;
  size: number;
}

/** Old or incomplete crop metadata must fall back to the centred avatar. */
export function validAvatarCrop(value: unknown): StoredAvatarCrop | null {
  if (!value || typeof value !== 'object') return null;
  const crop = value as Partial<StoredAvatarCrop>;
  if (typeof crop.path !== 'string' || !crop.path.trim()) return null;
  if (typeof crop.cx !== 'number' || !Number.isFinite(crop.cx) || crop.cx < 0 || crop.cx > 1) return null;
  if (typeof crop.cy !== 'number' || !Number.isFinite(crop.cy) || crop.cy < 0 || crop.cy > 1) return null;
  if (typeof crop.size !== 'number' || !Number.isFinite(crop.size) || crop.size < 0.05 || crop.size > 1) return null;
  return crop as StoredAvatarCrop;
}
