import type { MembershipTier } from '../types/index.ts';
import type { CardsAccess } from './types.ts';

/**
 * Premium unlocks Halal Cards for a connection, not for a person. A Premium
 * member unlocks it by starting the first session; from then on either of the
 * pair may start activities, and the invited member never has to subscribe.
 * The unlock lapses only if the member who unlocked it stops being Premium.
 *
 * The server re-checks all of this (`halal_cards_start_session`); this is the
 * same rule for drawing the screen.
 */
export function canStartSession(input: { myTier: MembershipTier; access: CardsAccess | undefined }): boolean {
  return input.myTier === 'premium' || input.access?.unlocked === true;
}
