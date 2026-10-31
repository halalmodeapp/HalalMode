import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { AUTOSAVE, nextFlushDelay, retryDelay, savedToastDue } from '@/lib/autosave';

/**
 * 'saved': it went through. 'offline': the phone could not reach the server;
 * 'failed': the server refused. Either way the edits are kept and tried again
 * later. 'invalid': something required is empty; the edits are kept and it
 * waits for the next change rather than retrying.
 */
export type SaveResult = 'saved' | 'offline' | 'failed' | 'invalid';

/**
 * Saves edits by itself, in batches, and says so at once.
 *
 * An edit is kept on the phone the moment it is made, so `onLocalSave` (the
 * "Saved" toast) fires as soon as the edits pause, without waiting for the
 * server. The server send follows: `version` changes with every edit; while
 * `dirty`, each change restarts a short
 * quiet timer, and the save runs when it ends, but never sooner than a minimum
 * gap after the previous one. Leaving the screen, or the app going to the
 * background, sends what is pending straight away. A failed send keeps the edits
 * and retries with a growing wait.
 *
 * Returns `flush`, which sends now if there is anything to send.
 */
export function useAutosave({
  dirty,
  version,
  save,
  valid = true,
  onLocalSave,
  onFailure,
}: {
  dirty: boolean;
  version: string;
  save: () => Promise<SaveResult>;
  /** False while something required is empty or wrong: nothing can be sent yet, so nothing says "Saved". */
  valid?: boolean;
  /** The optimistic "Saved": the edit is safe on the phone. Not more than once every few seconds. */
  onLocalSave?: () => void;
  /** Called once when a run of failures begins; `offline` says the phone could not reach the server. */
  onFailure?: (kind: 'offline' | 'error') => void;
}): { flush: () => Promise<void> } {
  const latest = useRef({ dirty, save, onFailure, onLocalSave, valid });
  latest.current = { dirty, save, onFailure, onLocalSave, valid };
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastToastAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChangeAt = useRef(0);
  const lastSentAt = useRef(0);
  const failures = useRef(0);
  const running = useRef<Promise<void> | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const schedule = useCallback((delay: number) => {
    clearTimer();
    timer.current = setTimeout(() => void flushRef.current(), delay);
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    clearTimer();
    if (running.current) return running.current;
    if (!latest.current.dirty) return;
    const run = (async () => {
      lastSentAt.current = Date.now();
      let result: SaveResult;
      try {
        result = await latest.current.save();
      } catch {
        result = 'failed';
      }
      if (result === 'saved') {
        failures.current = 0;
      } else if (result === 'failed' || result === 'offline') {
        failures.current += 1;
        if (failures.current === 1) latest.current.onFailure?.(result === 'offline' ? 'offline' : 'error');
        // No signal is worth waiting out for ever; a server that keeps refusing is not, so
        // after a few refusals it waits for the member's next change instead of hammering it.
        if (result === 'offline' || failures.current < AUTOSAVE.maxRefusals) schedule(retryDelay(failures.current));
      }
    })().finally(() => {
      running.current = null;
    });
    running.current = run;
    return run;
  }, [schedule]);
  flushRef.current = flush;

  // Every edit restarts the quiet timer, and the optimistic "Saved" comes as soon as the edits pause.
  useEffect(() => {
    if (!dirty) {
      clearTimer();
      return;
    }
    lastChangeAt.current = Date.now();
    schedule(nextFlushDelay({ now: Date.now(), lastChangeAt: lastChangeAt.current, lastSentAt: lastSentAt.current }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      if (latest.current.valid && savedToastDue(Date.now(), lastToastAt.current)) {
        lastToastAt.current = Date.now();
        latest.current.onLocalSave?.();
      }
    }, AUTOSAVE.savedToastAfterMs);
    return () => {
      clearTimer();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [dirty, version, schedule]);

  // Going to the background, coming back, or leaving the screen sends what is waiting;
  // so does the connection returning (the browser says so; on a phone, coming back to the app).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', () => {
      void flushRef.current();
    });
    const online = () => void flushRef.current();
    const hasWindow = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
    if (hasWindow) window.addEventListener('online', online);
    return () => {
      subscription.remove();
      if (hasWindow) window.removeEventListener('online', online);
      void flushRef.current();
    };
  }, []);

  return { flush };
}
