/** One identity per delivered message, irrespective of arrival order or transport. */
export function mergeMessages<T extends { id: string; createdAt: string; readAt?: string; deletedAt?: string }>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) {
    const previous = byId.get(message.id);
    // An HTTP send response can arrive after a realtime read receipt.
    const readAt = [previous?.readAt, message.readAt].filter((value): value is string => !!value).sort().at(-1);
    const current = previous?.deletedAt && !message.deletedAt ? previous : message;
    byId.set(message.id, { ...current, ...(readAt ? { readAt } : {}) });
  }
  return [...byId.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
}

/** A latest-page refresh keeps scrollback and its older-page cursor. */
export function mergeLatestMessagePage<T extends { id: string; createdAt: string; readAt?: string; deletedAt?: string }, C>(
  current: { messages: T[]; hasMore: boolean; nextCursor?: C } | undefined,
  latest: { messages: T[]; hasMore: boolean; nextCursor?: C },
): { messages: T[]; hasMore: boolean; nextCursor?: C } {
  if (!current?.messages.length) return latest;
  const first = current.messages[0]!;
  const incoming = latest.messages[0];
  const keepsOlder = !incoming || first.createdAt < incoming.createdAt
    || (first.createdAt === incoming.createdAt && first.id < incoming.id);
  return {
    ...(keepsOlder ? current : latest),
    messages: mergeMessages(current.messages, latest.messages),
  };
}

/** A deletion remains visible even when its message is outside the newest page. */
export function applyMessageDeletions<T extends { id: string }>(
  messages: readonly T[], deletions: readonly { id: string; deletedAt: string }[],
): T[] {
  const byId = new Map(deletions.map(item => [item.id, item.deletedAt]));
  return messages.map(message => byId.has(message.id)
    ? { ...message, deletedAt: byId.get(message.id), text: undefined, voiceUrl: undefined, voiceDurationSeconds: undefined }
    : message);
}
