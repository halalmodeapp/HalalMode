import type { Activity, Adventure } from '../types.ts';
import { ADVENTURE_CONCEPTS } from './adventures/concepts.ts';
import { fajrAlarm } from './adventures/fajrAlarm.ts';
import { firstRamadan } from './adventures/firstRamadan.ts';
import { mahrConversation } from './adventures/mahrConversation.ts';
import { publicPrivate } from './adventures/publicPrivate.ts';
import { readAt1142 } from './adventures/readAt1142.ts';
import { theOffer } from './adventures/theOffer.ts';
import { threeInTheMorning } from './adventures/threeInTheMorning.ts';
import { LAB_LESSONS } from './lab.ts';
import { QUIZZES } from './quizzes.ts';

/**
 * The Halal Cards catalogue. New content is registered here and nowhere
 * else: the hub, invitations, sessions and the server all refer to an
 * activity only by its id.
 */
export const ADVENTURES: Adventure[] = [
  firstRamadan,
  readAt1142,
  theOffer,
  fajrAlarm,
  mahrConversation,
  threeInTheMorning,
  publicPrivate,
];

export const ALL_ACTIVITIES: Activity[] = [...LAB_LESSONS, ...QUIZZES, ...ADVENTURES];

const byId = new Map(ALL_ACTIVITIES.map((activity) => [activity.id, activity]));

export function findActivity(id: string): Activity | undefined {
  return byId.get(id);
}

export { ADVENTURE_CONCEPTS, LAB_LESSONS, QUIZZES };
