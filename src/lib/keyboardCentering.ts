import { Keyboard, Platform, TextInput } from 'react-native';

/**
 * When a text box is tapped, put it in the middle of the space between the top
 * of the screen and the keyboard, once, and then leave the scrolling alone. The
 * screen used to follow the caret on every key press, so typing and backspacing
 * made it jump around.
 *
 * Scroll views register themselves; a text field calls requestCentering() from
 * its onFocus. Only the scroll view that is on screen and holds the field acts.
 */
export type FocusedInput = { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void };

type Scroller = {
  /** Whether this scroll view is the one in front. */
  active: () => boolean;
  /** Centres the field if it sits inside this scroll view. */
  center: (input: FocusedInput) => void;
};

const scrollers = new Set<Scroller>();

export function registerScroller(scroller: Scroller): () => void {
  scrollers.add(scroller);
  return () => {
    scrollers.delete(scroller);
  };
}

function run() {
  const input = TextInput.State.currentlyFocusedInput?.() as FocusedInput | null | undefined;
  if (!input) return;
  scrollers.forEach((scroller) => {
    if (scroller.active()) scroller.center(input);
  });
}

/**
 * Centres the focused field. The keyboard is not up yet when focus arrives, so
 * this runs once at once (for a field that is already above the keyboard) and
 * once more when the keyboard has finished appearing and its height is known.
 */
export function requestCentering(): void {
  if (Platform.OS === 'web') return;
  setTimeout(run, 30);
  const subscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardDidShow' : 'keyboardDidShow', () => {
    subscription.remove();
    setTimeout(run, 30);
  });
  // If the keyboard is already open (moving between fields) nothing more will fire.
  setTimeout(() => subscription.remove(), 700);
}

/** Where the middle of the visible area is, in window coordinates, for a scroll view's window rect. */
export function visibleCenter(scrollTop: number, scrollHeight: number, windowHeight: number): number {
  const keyboard = Keyboard.metrics()?.height ?? 0;
  const bottom = Math.min(scrollTop + scrollHeight, windowHeight - keyboard);
  return (scrollTop + bottom) / 2;
}
