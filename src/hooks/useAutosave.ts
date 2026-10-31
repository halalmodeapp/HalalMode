import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { nextFlushDelay, retryDelay } from '@/lib/autosave';

/**
 * 'saved': it went through. 'failed': the network or server refused; keep the
 * edits and try again later. 'invalid': something required is empty; keep the
 * edits and wait for the next change rather than retrying.
 */
export type SaveResult = 'saved' | 'failed' | 'invalid';

/**
 * Saves edits by itself, in batches.
 *
 * `version` changes with every edit; while `dirty`, each change restarts a short
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
  onFailure,
}: {
  dirty: boolean;
  version: string;
  save: () => Promise<SaveResult>;
  /** Called once when a run of failures begins, so the screen can say it will try again. */
  onFailure?: () => void;
}): { flush: () => Promise<void> } {
  const latest = useRef({ dirty, save, onFailure });
  latest.current = { dirty, save, onFailure };
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
      } else if (result === 'failed') {
        failures.current += 1;
        if (failures.current === 1) latest.current.onFailure?.();
        schedule(retryDelay(failures.current));
      }
    })().finally(() => {
      running.current = null;
    });
    running.current = run;
    return run;
  }, [schedule]);
  flushRef.current = flush;

  // Every edit restarts the quiet timer.
  useEffect(() => {
    if (!dirty) {
      clearTimer();
      return;
    }
    lastChangeAt.current = Date.now();
    schedule(nextFlushDelay({ now: Date.now(), lastChangeAt: lastChangeAt.current, lastSentAt: lastSentAt.current }));
    return clearTimer;
  }, [dirty, version, schedule]);

  // Going to the background, or leaving the screen, sends what is waiting.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flushRef.current();
    });
    return () => {
      subscription.remove();
      void flushRef.current();
    };
  }, []);

  return { flush };
}
