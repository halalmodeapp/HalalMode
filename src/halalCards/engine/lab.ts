import type { LabLesson, LabStep } from '../types.ts';

export function labKey(step: LabStep): string {
  return `l:${step.id}`;
}

export function currentLabStep(lesson: LabLesson, cursor: number): LabStep | undefined {
  return lesson.steps[cursor];
}

/** Scenarios are answered in private by both; every other card is read together. */
export function labNeedsAnswers(step: LabStep): boolean {
  return step.type === 'scenario';
}

/** How a pair of choices compares, for the line above the reveal. */
export function labAgreement(
  lesson: LabLesson,
  stepId: string,
  picks: { host: string; guest: string }
): 'same' | 'both_help' | 'split' | 'both_struggle' {
  const step = lesson.steps.find((item) => item.id === stepId);
  if (!step || step.type !== 'scenario') return 'split';
  if (picks.host === picks.guest) return 'same';
  const tone = (id: string) => step.choices.find((choice) => choice.id === id)?.tone;
  const tones = [tone(picks.host), tone(picks.guest)];
  if (tones.every((value) => value === 'helps')) return 'both_help';
  if (tones.every((value) => value === 'harms')) return 'both_struggle';
  return 'split';
}

export function labProgress(lesson: LabLesson, cursor: number): { done: number; total: number } {
  return { done: Math.min(cursor, lesson.steps.length), total: lesson.steps.length };
}
