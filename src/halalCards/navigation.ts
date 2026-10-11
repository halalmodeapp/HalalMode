import { router } from 'expo-router';

/** Back if there is somewhere to go back to; otherwise up to a sensible parent. */
export function backOr(fallback: string) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}

export const cardsPaths = {
  hub: (connectionId: string) => `/halal-cards/${connectionId}`,
  activity: (connectionId: string, activityId: string) => `/halal-cards/${connectionId}/activity/${activityId}`,
  play: (connectionId: string, sessionId: string) => `/halal-cards/${connectionId}/play/${sessionId}`,
  guide: (connectionId: string) => `/halal-cards/${connectionId}/guide`,
  chat: (connectionId: string) => `/connection/${connectionId}/chat`,
};
