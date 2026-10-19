import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/state/auth';
import { decideNotificationTap } from '@/lib/notificationDestination';
import { refreshMyNotificationToken } from '@/api/notifications';
import { useI18n } from '@/i18n';

if (Platform.OS !== 'web') {
  void import('expo-notifications').then((notifications) => {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }).catch(() => undefined);
}

/** Handles foreground taps and cold-start taps without trusting a remote URL. */
export function NotificationObserver() {
  const { ready, user, onboardingComplete, profileStatusReady } = useAuth();
  const { localeTag } = useI18n();
  const userId = user?.id;
  const canOpenNotifications = ready && !!userId && onboardingComplete && profileStatusReady;
  const lastHandledResponse = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !ready) return;

    let active = true;
    let subscription: { remove: () => void } | undefined;
    let notifications: typeof import('expo-notifications') | undefined;

    const handleResponse = (response: import('expo-notifications').NotificationResponse) => {
      if (!active) return;
      const identifier = response.notification.request.identifier;
      if (identifier === lastHandledResponse.current) return;

      const decision = decideNotificationTap({
        actionIdentifier: response.actionIdentifier,
        defaultActionIdentifier: notifications?.DEFAULT_ACTION_IDENTIFIER ?? '',
        data: response.notification.request.content.data,
        userId,
        canOpen: canOpenNotifications,
      });
      if (decision.action === 'ignore') {
        lastHandledResponse.current = identifier;
      } else if (decision.action === 'route') {
        lastHandledResponse.current = identifier;
        router.navigate(decision.destination);
      } else {
        // Keep a valid tap while the authenticated profile is still loading.
        // This effect will read it again when the protected routes are ready.
        return;
      }

      if (notifications) {
        void notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      }
    };

    const setup = async () => {
      notifications = await import('expo-notifications');
      if (!active) return;

      subscription = notifications.addNotificationResponseReceivedListener(handleResponse);
      const lastResponse = await notifications.getLastNotificationResponseAsync();
      if (lastResponse) handleResponse(lastResponse);
    };

    void setup().catch(() => undefined);
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [canOpenNotifications, ready, userId]);

  useEffect(() => {
    if (Platform.OS === 'web' || !ready || !userId) return;

    let active = true;
    let subscription: { remove: () => void } | undefined;
    void import('expo-notifications').then((notifications) => {
      if (!active) return;
      subscription = notifications.addPushTokenListener((devicePushToken) => {
        if (!active) return;
        void refreshMyNotificationToken(devicePushToken, localeTag).catch(() => undefined);
      });
    }).catch(() => undefined);

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [localeTag, ready, userId]);

  return null;
}
