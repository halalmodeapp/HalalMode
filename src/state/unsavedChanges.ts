import { useEffect, useRef } from 'react';

/**
 * Profile and Preferences save by themselves (see hooks/useAutosave). This keeps
 * track of which of them has edits waiting, so that anything about to move the
 * member somewhere else (another tab, the tab bar, Settings) can send them first.
 * Nothing is asked: the send starts and the navigation carries on.
 */
type Entry = {
  dirty: () => boolean;
  /** Sends what is waiting, now. */
  flush: () => Promise<void>;
};

let entry: Entry | null = null;

export function hasUnsavedChanges(): boolean {
  return entry?.dirty() ?? false;
}

/** Sends any waiting edits (without waiting for the answer), then goes ahead. */
export function guardNavigation(proceed: () => void): void {
  if (entry?.dirty()) void entry.flush();
  proceed();
}

/** Called by a tab that autosaves. Keeps the latest values without re-registering. */
export function useRegisterUnsaved(dirty: boolean, flush: () => Promise<void>): void {
  const latest = useRef({ dirty, flush });
  latest.current = { dirty, flush };
  useEffect(() => {
    const mine: Entry = { dirty: () => latest.current.dirty, flush: () => latest.current.flush() };
    entry = mine;
    return () => {
      if (entry === mine) entry = null;
    };
  }, []);
}
