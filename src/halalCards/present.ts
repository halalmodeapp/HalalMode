import { labKey, labNeedsAnswers } from './engine/lab.ts';
import { quizKey, type QuizScore } from './engine/quiz.ts';
import type { Activity, CardsSession, CardsTrack, Quiz } from './types.ts';

/** Whether an activity suits the couple's chosen track. */
export function inTrack(activity: Pick<Activity, 'tracks'>, track: CardsTrack): boolean {
  return !activity.tracks || activity.tracks.includes(track);
}

/** The earliest track an activity opens at, for "For when you're engaged". */
export function firstTrack(activity: Pick<Activity, 'tracks'>): CardsTrack {
  return activity.tracks?.[0] ?? 'getting_to_know';
}

const normal = (text: string) => text.toLowerCase().replace(/[^a-z]/g, '');

/** A format label above a title that already says it ("Would you rather?") is noise. */
export function showFormatEyebrow(quiz: Pick<Quiz, 'title'>, formatLabel: string): boolean {
  return !normal(quiz.title).startsWith(normal(formatLabel));
}

/** A card prompt that only repeats the deck's title adds nothing. */
export function promptRepeatsTitle(quiz: Pick<Quiz, 'title'>, prompt: string): boolean {
  const title = normal(quiz.title);
  return title.length > 0 && normal(prompt) === title;
}

/**
 * Lab and quizzes share one cursor, so either player's Next moves both. Each
 * phone keeps its own "seen up to" mark and shows anything the other skipped
 * past — a reveal or a card to read — before the current card. On opening a
 * session, the card just before the cursor is shown again only if it was a
 * reveal (both had answered), so the last result is never lost.
 */
export function initialSeenCursor(activity: Activity, session: Pick<CardsSession, 'state' | 'answers'>): number {
  const { state } = session;
  if (state.kind === 'adventure') return 0;
  const previous = state.cursor - 1;
  if (previous < 0) return state.cursor;
  let key: string | undefined;
  if (activity.kind === 'lab' && state.kind === 'lab') {
    const step = activity.steps[previous];
    key = step && labNeedsAnswers(step) ? labKey(step) : undefined;
  } else if (activity.kind === 'quiz' && state.kind === 'quiz') {
    const card = activity.cards[previous];
    key = card ? quizKey(card) : undefined;
  }
  const sealed = key ? session.answers[key] : undefined;
  return sealed?.mine !== undefined && sealed.theirs !== undefined ? previous : state.cursor;
}

/** Which card this phone should show, given what it has seen. */
export function viewCursor(seen: number, cursor: number): { index: number; catchingUp: boolean } {
  const index = Math.min(seen, cursor);
  return { index, catchingUp: index < cursor };
}

/** A sentence instead of a count — the recap's rule applied to quizzes too. */
export function quizSummaryKey(score: QuizScore): 'quizMostlySame' | 'quizMixed' | 'quizMostlyDifferent' | null {
  if (!score.compared) return null;
  const share = (score.agreed + score.close * 0.5) / score.compared;
  if (share >= 0.65) return 'quizMostlySame';
  if (share >= 0.35) return 'quizMixed';
  return 'quizMostlyDifferent';
}

export function guessesKey(score: QuizScore): 'quizGuessesGood' | 'quizGuessesSurprising' | null {
  const total = score.guesses.host.total + score.guesses.guest.total;
  if (!total) return null;
  const right = score.guesses.host.right + score.guesses.guest.right;
  return right / total >= 0.5 ? 'quizGuessesGood' : 'quizGuessesSurprising';
}

/** Wait before retrying the automatic story resolve after a failed save. */
export function resolveRetryDelay(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, attempt));
}
