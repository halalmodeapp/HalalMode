/** Move freely near the origin, then ease the drag toward a finite edge. */
export function rubberBandOffset(value: number, limit: number) {
  const edge = Math.max(0, limit);
  if (!Number.isFinite(value) || edge === 0) return 0;
  const magnitude = Math.abs(value);
  const softEdge = edge * 0.56;
  const resisted = magnitude <= softEdge
    ? magnitude
    : softEdge + (edge - softEdge) * (1 - Math.exp(-(magnitude - softEdge) / Math.max(1, edge - softEdge)));
  return Math.sign(value) * Math.min(edge, resisted);
}
