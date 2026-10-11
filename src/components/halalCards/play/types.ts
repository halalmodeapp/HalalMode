import type { Turn } from '@/halalCards/engine/session';
import type { Activity, ActivityState, CardsSession } from '@/halalCards/types';

export interface PlayProps<A extends Activity> {
  session: CardsSession;
  activity: A;
  turn: Turn | undefined;
  partnerName: string;
  connectionId: string;
  /** Seals this member's answer under `key`. */
  onAnswer: (key: string, answer: unknown) => void;
  /** Writes the next shared state, computed from the current one. */
  onAdvance: (state: ActivityState) => void;
  busy: boolean;
}
