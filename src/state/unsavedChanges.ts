import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Profile and Preferences have one Save button each. If someone has changed
 * something and tries to go elsewhere (another tab, the tab bar, Settings), they
 * are asked first: save, or leave the changes behind.
 *
 * The tab that holds unsaved changes registers itself here. Anything that is
 * about to move the member away calls guardNavigation(), which either goes
 * straight ahead or waits for the answer.
 */
type Entry = {
  dirty: () => boolean;
  /** Saves; resolves true when it worked, false when it could not (for instance a required box is empty). */
  save: () => Promise<boolean>;
};

let entry: Entry | null = null;
let pending: (() => void) | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function hasUnsavedChanges(): boolean {
  return entry?.dirty() ?? false;
}

/** Runs `proceed` now if nothing is unsaved; otherwise asks first and runs it after a yes or a no. */
export function guardNavigation(proceed: () => void): void {
  if (!hasUnsavedChanges()) {
    proceed();
    return;
  }
  pending = proceed;
  notify();
}

/**
 * The answer to the question. Yes saves, and only goes on if the save worked
 * (a required box left empty keeps the member where they are, with it outlined).
 * No leaves the changes behind: `discard` puts the screens back as last saved.
 */
export async function answerUnsaved(save: boolean, discard: () => void): Promise<void> {
  const proceed = pending;
  pending = null;
  notify();
  if (!proceed) return;
  if (save) {
    const saved = await entry?.save().catch(() => false);
    if (!saved) return;
  } else {
    discard();
  }
  proceed();
}

/** For the dialog: whether a question is waiting. */
export function useUnsavedQuestion(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pending !== null,
    () => false,
  );
}

/** Called by a tab that can hold unsaved changes. Keeps the latest values without re-registering. */
export function useRegisterUnsaved(dirty: boolean, save: () => Promise<boolean>): void {
  const latest = useRef({ dirty, save });
  latest.current = { dirty, save };
  useEffect(() => {
    const mine: Entry = { dirty: () => latest.current.dirty, save: () => latest.current.save() };
    entry = mine;
    return () => {
      if (entry === mine) entry = null;
    };
  }, []);
}
