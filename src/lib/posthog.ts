import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { setAnalyticsSink, type ProductEvent } from '@/lib/analytics';

/**
 * Sends product events to PostHog's capture endpoint with a plain request, so
 * there is no SDK to load. Only what `analytics.ts` lets through is sent: an
 * event name and simple metadata, against an anonymous id for the device —
 * never a member id, email, profile text or location.
 *
 * Off unless EXPO_PUBLIC_POSTHOG_KEY is set (a public, write-only key).
 */
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const ID_KEY = 'hm.analytics.device';

let deviceId: Promise<string> | null = null;

function anonymousId(): Promise<string> {
  deviceId ??= (async () => {
    try {
      const saved = await AsyncStorage.getItem(ID_KEY);
      if (saved) return saved;
    } catch {
      // Storage can be unavailable (private browsing); a per-session id will do.
    }
    const fresh = `d_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    try {
      await AsyncStorage.setItem(ID_KEY, fresh);
    } catch {
      // As above.
    }
    return fresh;
  })();
  return deviceId;
}

export function installPostHog(): void {
  if (!KEY || process.env.EXPO_PUBLIC_USE_MOCKS === '1') return;
  setAnalyticsSink(async (event: ProductEvent) => {
    try {
      await fetch(`${HOST}/i/v0/e/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: KEY,
          event: event.name,
          distinct_id: await anonymousId(),
          timestamp: event.occurredAt,
          properties: { ...event.properties, $process_person_profile: false, platform: Platform.OS },
        }),
      });
    } catch {
      // Analytics must never affect the app.
    }
  });
}
