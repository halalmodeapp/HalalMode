import { router } from 'expo-router';

import type { ActivityKind } from './types';

/** Back if there is somewhere to go back to; otherwise up to a sensible parent. */
export function backOr(fallback: string) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}

export const cardsPaths = {
  hub: (connectionId: string) => `/halal-cards/${connectionId}`,
  section: (connectionId: string, kind: ActivityKind) => `/halal-cards/${connectionId}/section/${kind}`,
  activity: (connectionId: string, activityId: string) => `/halal-cards/${connectionId}/activity/${activityId}`,
  play: (connectionId: string, sessionId: string) => `/halal-cards/${connectionId}/play/${sessionId}`,
  solo: (connectionId: string, activityId: string) => `/halal-cards/${connectionId}/solo/${activityId}`,
  journal: (connectionId: string) => `/halal-cards/${connectionId}/journal`,
  chat: (connectionId: string) => `/connection/${connectionId}/chat`,
};
