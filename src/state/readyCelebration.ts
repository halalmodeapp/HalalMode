import { useSyncExternalStore } from 'react';

/**
 * The "you're ready" pop-up must not appear while someone is still filling in
 * the form (autosave can complete the last required answer mid-edit). It is held
 * until they switch to another page, and then shown wherever they have landed.
 */
type State = { pending: boolean; held: boolean };
let state: State = { pending: false, held: false };
const listeners = new Set<() => void>();
const set = (next: State) => {
  if (next.pending === state.pending && next.held === state.held) return;
  state = next;
  listeners.forEach((listener) => listener());
};

/** Everything is complete: celebrate, but not yet. */
export function markReady(): void {
  set({ pending: true, held: true });
}
/** The member has moved to another page: the celebration may show. */
export function releaseReady(): void {
  set({ pending: state.pending, held: false });
}
/** Done with it: either answer closes it. */
export function clearReady(): void {
  set({ pending: false, held: false });
}

export function useReadyCelebrationVisible(): boolean {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
  return snapshot.pending && !snapshot.held;
}
