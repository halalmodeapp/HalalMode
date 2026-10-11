import type { Activity, Adventure, LabLesson, Quiz } from '@/halalCards/types';
import { AdventurePlay } from './AdventurePlay';
import { LabPlay } from './LabPlay';
import { QuizPlay } from './QuizPlay';
import type { PlayProps } from './types';

/** The right play surface for the activity, shared by real and solo sessions. */
export function PlayBody(props: PlayProps<Activity>) {
  const { activity } = props;
  if (activity.kind === 'lab') return <LabPlay {...(props as PlayProps<LabLesson>)} />;
  if (activity.kind === 'quiz') return <QuizPlay {...(props as PlayProps<Quiz>)} />;
  return <AdventurePlay {...(props as PlayProps<Adventure>)} />;
}
