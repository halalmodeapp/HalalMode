/**
 * Keeps a cover's face group near the visual centre after its portrait artwork
 * is cropped into a wide tile. Cover source art follows the 4:5 catalogue spec.
 */
export function coverCropPosition(
  aspectRatio: number,
  focalY = 0.3,
): { top: string; left: '50%' } | undefined {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0.84) return undefined;

  const sourceHeightPerWidth = 1.25;
  const frameHeightPerWidth = 1 / aspectRatio;
  const croppedHeight = sourceHeightPerWidth - frameHeightPerWidth;
  if (croppedHeight <= 0) return undefined;

  const faceCentre = Math.max(0, Math.min(1, Number.isFinite(focalY) ? focalY : 0.3));
  const desiredFramePosition = 0.4;
  const contentOffset = (faceCentre * sourceHeightPerWidth - desiredFramePosition * frameHeightPerWidth)
    / croppedHeight;
  const top = Math.round(Math.max(0, Math.min(1, contentOffset)) * 100);
  return { top: `${top}%`, left: '50%' };
}
