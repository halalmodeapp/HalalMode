import type { Quiz, QuizAnswer, QuizCard, Seat } from '../types.ts';
import { otherSeat } from './seats.ts';

export interface AnswerNeeds {
  /** Answers for themselves. */
  self: boolean;
  /** Guesses the other player's answer. */
  guess: boolean;
}

export function quizKey(card: QuizCard): string {
  return `q:${card.id}`;
}

/** In `know_me` the person being guessed alternates: host first. */
export function knowMeSubject(cardIndex: number): Seat {
  return cardIndex % 2 === 0 ? 'host' : 'guest';
}

export function quizNeeds(quiz: Quiz, cardIndex: number, seat: Seat): AnswerNeeds {
  switch (quiz.format) {
    case 'know_me': {
      const subject = knowMeSubject(cardIndex);
      return { self: seat === subject, guess: seat !== subject };
    }
    case 'guess_my_answer':
      return { self: true, guess: true };
    default:
      return { self: true, guess: false };
  }
}

export function answerComplete(needs: AnswerNeeds, answer: QuizAnswer | undefined): boolean {
  if (!answer) return false;
  return (!needs.self || answer.self !== undefined) && (!needs.guess || answer.guess !== undefined);
}

/** Options a player picks from. `more_likely` points at "me" or "my partner". */
export function quizOptions(quiz: Quiz, card: QuizCard): string[] {
  return quiz.format === 'more_likely' ? ['Me', 'My partner'] : card.options;
}

/** For `more_likely`: which seat this answer points at. */
export function pointsAt(seat: Seat, value: number): Seat {
  return value === 0 ? seat : otherSeat(seat);
}

export interface CardReveal {
  /** Both said the same thing (or pointed at the same person). Null if not compared. */
  agreed: boolean | null;
  /** `scale`: steps apart, 0 = the same answer. */
  distance?: number;
  /** Each seat's guess about the other: right or wrong. */
  guessedRight: Partial<Record<Seat, boolean>>;
  /** `more_likely`: who each seat pointed at. */
  pointed?: Record<Seat, Seat>;
}

export function revealCard(quiz: Quiz, cardIndex: number, answers: Record<Seat, QuizAnswer>): CardReveal {
  const { host, guest } = answers;
  switch (quiz.format) {
    case 'know_me': {
      const subject = knowMeSubject(cardIndex);
      const guesser = otherSeat(subject);
      const right = answers[subject].self !== undefined && answers[subject].self === answers[guesser].guess;
      return { agreed: null, guessedRight: { [guesser]: right } };
    }
    case 'guess_my_answer':
      return {
        agreed: host.self === guest.self,
        guessedRight: { host: host.guess === guest.self, guest: guest.guess === host.self },
      };
    case 'more_likely': {
      const pointed = { host: pointsAt('host', host.self ?? 0), guest: pointsAt('guest', guest.self ?? 0) };
      return { agreed: pointed.host === pointed.guest, guessedRight: {}, pointed };
    }
    case 'scale': {
      const distance = Math.abs((host.self ?? 0) - (guest.self ?? 0));
      return { agreed: distance === 0, distance, guessedRight: {} };
    }
    default:
      return { agreed: host.self === guest.self, guessedRight: {} };
  }
}

export interface QuizScore {
  compared: number;
  agreed: number;
  /** Within one step on a scale, counted as close rather than agreed. */
  close: number;
  guesses: Record<Seat, { right: number; total: number }>;
}

export function scoreQuiz(quiz: Quiz, answersByCard: (Record<Seat, QuizAnswer> | undefined)[]): QuizScore {
  const score: QuizScore = {
    compared: 0,
    agreed: 0,
    close: 0,
    guesses: { host: { right: 0, total: 0 }, guest: { right: 0, total: 0 } },
  };
  answersByCard.forEach((answers, index) => {
    if (!answers) return;
    const reveal = revealCard(quiz, index, answers);
    if (reveal.agreed !== null) {
      score.compared += 1;
      if (reveal.agreed) score.agreed += 1;
      else if (reveal.distance === 1) score.close += 1;
    }
    for (const seat of ['host', 'guest'] as const) {
      const right = reveal.guessedRight[seat];
      if (right === undefined) continue;
      score.guesses[seat].total += 1;
      if (right) score.guesses[seat].right += 1;
    }
  });
  return score;
}

/** Replaces `{{name}}` with the other player's first name. */
export function personalise(text: string, name: string): string {
  return text.replaceAll('{{name}}', name);
}
