/**
 * Moving one item to a new position, without disturbing the rest.
 *
 * Pure, so the awkward cases can be pinned down in a test rather than
 * discovered with a finger on a screen.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= next.length ||
    to >= next.length
  ) {
    return next;
  }
  const moved = next.splice(from, 1);
  next.splice(to, 0, ...moved);
  return next;
}

/**
 * Which slot a dragged tile is currently over.
 *
 * Measured from the tile's centre rather than the finger, because a finger sits
 * wherever it happened to land on the tile — grab a photo by its corner and the
 * finger is a whole column away from where the photo looks like it is.
 *
 * Columns are counted right to left when the interface is, so a member dragging
 * in Arabic moves a photo towards the position they can see.
 */
export function slotFromPosition({
  centreX,
  centreY,
  cellWidth,
  cellHeight,
  gap,
  columns,
  count,
  isRTL = false,
}: {
  centreX: number;
  centreY: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  columns: number;
  count: number;
  isRTL?: boolean;
}): number {
  if (count <= 0 || cellWidth <= 0 || cellHeight <= 0) return 0;

  const rawColumn = Math.floor(centreX / (cellWidth + gap));
  const row = Math.floor(centreY / (cellHeight + gap));

  const column = isRTL ? columns - 1 - rawColumn : rawColumn;
  const clampedColumn = Math.min(Math.max(column, 0), columns - 1);
  const clampedRow = Math.max(row, 0);

  return Math.min(clampedRow * columns + clampedColumn, count - 1);
}

/** Where a tile at this index sits, in pixels from the grid's top-left. */
export function slotPosition({
  index,
  cellWidth,
  cellHeight,
  gap,
  columns,
  isRTL = false,
}: {
  index: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  columns: number;
  isRTL?: boolean;
}): { x: number; y: number } {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const laidOut = isRTL ? columns - 1 - column : column;
  return {
    x: laidOut * (cellWidth + gap),
    y: row * (cellHeight + gap),
  };
}
