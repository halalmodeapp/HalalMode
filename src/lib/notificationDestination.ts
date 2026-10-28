export type AppNotificationDestination = '/(tabs)/daily' | '/(tabs)/connections' | '/(tabs)/you';
export type NotificationTapDecision =
  | { action: 'route'; destination: AppNotificationDestination }
  | { action: 'wait' | 'ignore' };

const DESTINATIONS: Record<string, AppNotificationDestination> = {
  round_ready: '/(tabs)/daily',
  mutual_match: '/(tabs)/connections',
  new_message: '/(tabs)/connections',
  notice: '/(tabs)/you',
  halal_cards: '/(tabs)/connections',
  liked_you: '/(tabs)/connections',
  waiting_on_you: '/(tabs)/connections',
  quiet_match: '/(tabs)/connections',
  recap_ready: '/(tabs)/connections',
  photo_decision: '/(tabs)/you',
};

/** Resolve only known server notification kinds to routes inside the app. */
export function notificationDestination(data: unknown): AppNotificationDestination | null {
  if (!data || typeof data !== 'object' || !('kind' in data)) return null;
  const kind = (data as { kind?: unknown }).kind;
  return typeof kind === 'string' ? DESTINATIONS[kind] ?? null : null;
}

/** Defer valid notification taps until the signed-in member's routes are ready. */
export function decideNotificationTap(input: {
  actionIdentifier: string;
  defaultActionIdentifier: string;
  data: unknown;
  userId: string | undefined;
  canOpen: boolean;
}): NotificationTapDecision {
  if (input.actionIdentifier !== input.defaultActionIdentifier || !input.userId) {
    return { action: 'ignore' };
  }
  const destination = notificationDestination(input.data);
  if (!destination) return { action: 'ignore' };
  return input.canOpen ? { action: 'route', destination } : { action: 'wait' };
}
