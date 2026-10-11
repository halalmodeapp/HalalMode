import type { Activity, Adventure } from '../types.ts';
import { backgroundNoise } from './adventures/backgroundNoise.ts';
import { fajrAlarm } from './adventures/fajrAlarm.ts';
import { firstRamadan } from './adventures/firstRamadan.ts';
import { longWay } from './adventures/longWay.ts';
import { mahrConversation } from './adventures/mahrConversation.ts';
import { oldFriend } from './adventures/oldFriend.ts';
import { publicPrivate } from './adventures/publicPrivate.ts';
import { raisedVoice } from './adventures/raisedVoice.ts';
import { readAt1142 } from './adventures/readAt1142.ts';
import { startingOver } from './adventures/startingOver.ts';
import { theBrother } from './adventures/theBrother.ts';
import { theOffer } from './adventures/theOffer.ts';
import { threeInTheMorning } from './adventures/threeInTheMorning.ts';
import { upstairsRoom } from './adventures/upstairsRoom.ts';
import { whoseWedding } from './adventures/whoseWedding.ts';
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
  upstairsRoom,
  oldFriend,
  backgroundNoise,
  startingOver,
  theBrother,
  whoseWedding,
  longWay,
  raisedVoice,
];

export const ALL_ACTIVITIES: Activity[] = [...LAB_LESSONS, ...QUIZZES, ...ADVENTURES];

const byId = new Map(ALL_ACTIVITIES.map((activity) => [activity.id, activity]));

export function findActivity(id: string): Activity | undefined {
  return byId.get(id);
}

/**
 * What the catalogue holds, for the Premium and How it works copy. Counted
 * from the content so the numbers never drift from what members can play.
 */
export const CATALOGUE_COUNTS = {
  total: ALL_ACTIVITIES.length,
  lab: LAB_LESSONS.length,
  scenarios: LAB_LESSONS.reduce((sum, lesson) => sum + lesson.steps.filter((step) => step.type === 'scenario').length, 0),
  quizzes: QUIZZES.length,
  stories: ADVENTURES.length,
  free: ALL_ACTIVITIES.filter((activity) => activity.soloPreview).length,
};

export { LAB_LESSONS, QUIZZES };
