type MessageIdentity = { id: string; createdAt: string; readAt?: string; deletedAt?: string };
type MessagePage<T, C> = { messages: T[]; hasMore: boolean; nextCursor?: C };
export type MessageHistory<T, C> = MessagePage<T, C> & { newestFetchedId?: string };

/** One identity per delivered message, irrespective of arrival order or transport. */
export function mergeMessages<T extends MessageIdentity>(
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
export function mergeLatestMessagePage<T extends MessageIdentity, C>(
  current: MessagePage<T, C> | undefined,
  latest: MessagePage<T, C>,
): MessagePage<T, C> {
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

/** Repair a gap before joining the refresh to the cached scrollback. */
export async function refreshMessageHistory<T extends MessageIdentity, C>(
  getCurrent: () => MessageHistory<T, C> | undefined,
  latest: MessagePage<T, C>,
  fetchEarlier: (cursor: C) => Promise<MessagePage<T, C>>,
): Promise<MessageHistory<T, C>> {
  // Send acknowledgements can add newer messages to the cache. Only a fetched
  // message proves that the new pages reached the previously fetched range.
  const anchor = getCurrent()?.newestFetchedId;
  const newestFetchedId = latest.messages.at(-1)?.id;
  let oldestPage = latest;
  let fetched = latest.messages;
  let overlaps = !!anchor && fetched.some(message => message.id === anchor);
  for (let pages = 0; anchor && !overlaps && oldestPage.hasMore
      && oldestPage.nextCursor !== undefined && pages < 4; pages += 1) {
    oldestPage = await fetchEarlier(oldestPage.nextCursor);
    fetched = mergeMessages(oldestPage.messages, fetched);
    overlaps = fetched.some(message => message.id === anchor);
  }

  // An older-page load or a deletion may have updated the cache while fetching.
  const current = getCurrent();
  if (overlaps && current?.newestFetchedId === anchor) {
    return { ...mergeLatestMessagePage(current, { ...oldestPage, messages: fetched }), newestFetchedId };
  }
  // If the gap is too large for this refresh, retain the fetched range and its
  // cursor so ordinary history paging can reach everything before it.
  const fetchedIds = new Set(fetched.map(message => message.id));
  const cachedCopies = current?.messages.filter(message => fetchedIds.has(message.id)) ?? [];
  return { ...oldestPage, messages: mergeMessages(cachedCopies, fetched), newestFetchedId };
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
