/**
 * When to send what has been edited. Edits are kept locally the moment they are
 * made; they go to the server as one batch, after a short quiet spell, and never
 * more often than once in `minGapMs` while someone keeps editing.
 */
export const AUTOSAVE = {
  /** How long the edits must go quiet before they are sent. */
  quietMs: 4000,
  /** The least time between two sends while editing carries on. */
  minGapMs: 20000,
  /** After a failed send, the waits before trying again (the last one repeats). */
  retryMs: [15000, 30000, 60000],
  /** The "Saved" toast comes this soon after an edit pauses: the change is already kept on the phone. */
  savedToastAfterMs: 900,
  /** ...and not more often than this, however long someone keeps editing. */
  savedToastGapMs: 3000,
} as const;

/** Whether an error is the phone being offline (or unable to reach the server), as opposed to the server refusing. */
export function isNetworkError(error: unknown): boolean {
  const text = String((error as { message?: unknown } | null | undefined)?.message ?? error ?? '');
  return /network request failed|failed to fetch|network error|networkerror|load failed|timed? ?out|offline|internet|connection|econn|enotfound|unable to resolve/i.test(text);
}

/** Whether the optimistic "Saved" toast may show now. */
export function savedToastDue(now: number, lastShownAt: number): boolean {
  return lastShownAt === 0 || now - lastShownAt >= AUTOSAVE.savedToastGapMs;
}

/** Milliseconds until the next send is due. Never negative; a first send waits only for quiet. */
export function nextFlushDelay(input: {
  now: number;
  lastChangeAt: number;
  /** When the last request went out; 0 if none has. */
  lastSentAt: number;
  quietMs?: number;
  minGapMs?: number;
}): number {
  const quietMs = input.quietMs ?? AUTOSAVE.quietMs;
  const minGapMs = input.minGapMs ?? AUTOSAVE.minGapMs;
  const quietAt = input.lastChangeAt + quietMs;
  const gapAt = input.lastSentAt > 0 ? input.lastSentAt + minGapMs : 0;
  return Math.max(0, Math.max(quietAt, gapAt) - input.now);
}

/** How long to wait before the nth retry (1 is the first retry after a failure). */
export function retryDelay(failures: number): number {
  const waits = AUTOSAVE.retryMs;
  return waits[Math.min(Math.max(failures, 1), waits.length) - 1]!;
}
