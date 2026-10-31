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
} as const;

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
