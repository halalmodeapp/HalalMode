/** One identity per delivered message, irrespective of arrival order or transport. */
export function mergeMessages<T extends { id: string; createdAt: string; readAt?: string }>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) {
    const previous = byId.get(message.id);
    // An HTTP send response can arrive after a realtime read receipt.
    const readAt = [previous?.readAt, message.readAt].filter((value): value is string => !!value).sort().at(-1);
    byId.set(message.id, { ...message, ...(readAt ? { readAt } : {}) });
  }
  return [...byId.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
}
