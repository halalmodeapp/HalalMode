import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { DevicePushToken } from 'expo-notifications';
import { Platform } from 'react-native';

import { supportsRemotePushRuntime } from '@/lib/notificationRuntime';
import { requireSupabase, USE_MOCKS } from '@/lib/supabase';
import { brandNameFor, supportedLocales } from '@/i18n/locales';

export type NotificationPermissionError =
  | 'unsupported_device'
  | 'unsupported_runtime'
  | 'permission_denied'
  | 'project_unconfigured';

export async function fetchMyNotificationConsent(): Promise<boolean> {
  if (USE_MOCKS) return false;
  const { data, error } = await requireSupabase().rpc('get_my_notification_consent');
  if (error) throw error;
  return data === true;
}

export async function enableMyNotifications(locale: string): Promise<void> {
  if (USE_MOCKS) return;
  if (!Device.isDevice) throw new Error('unsupported_device' satisfies NotificationPermissionError);
  if (!supportsRemotePushRuntime(Platform.OS, Constants.executionEnvironment)) {
    throw new Error('unsupported_runtime' satisfies NotificationPermissionError);
  }
  // Expo Go excludes Android remote-notification support. Import lazily only
  // after confirming a production/development build runtime, so Settings can
  // still render safely in Expo Go and in browser previews.
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') {
    const appLocale = supportedLocales.find(
      (supported) => locale === supported || locale.startsWith(`${supported}-`)
    ) ?? 'en';
    await Notifications.setNotificationChannelAsync('default', {
      name: brandNameFor(appLocale),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === 'granted'
    ? existing
    : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('permission_denied' satisfies NotificationPermissionError);

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(projectId)) {
    throw new Error('project_unconfigured' satisfies NotificationPermissionError);
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const platform = Platform.OS;
  if (platform !== 'ios' && platform !== 'android') throw new Error('unsupported_device' satisfies NotificationPermissionError);
  await registerNotificationDevice(token.data, platform, locale);
}

/** Keep the app's Expo token current after APNs or FCM rotates its token. */
export async function refreshMyNotificationToken(devicePushToken: DevicePushToken, locale: string): Promise<void> {
  if (USE_MOCKS || !Device.isDevice) return;
  if (!supportsRemotePushRuntime(Platform.OS, Constants.executionEnvironment)) return;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  const Notifications = await import('expo-notifications');
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(projectId)) return;

  const client = requireSupabase();
  const consent = await client.rpc('get_my_notification_consent');
  if (consent.error || consent.data !== true) return;

  // Reuse the rotated native token. This avoids another native token read from
  // inside Expo's token-rotation callback and converts it to our Expo token.
  const token = await Notifications.getExpoPushTokenAsync({ projectId, devicePushToken });
  const stillConsented = await client.rpc('get_my_notification_consent');
  if (stillConsented.error || stillConsented.data !== true) return;
  await registerNotificationDevice(token.data, Platform.OS, locale);
}

async function registerNotificationDevice(token: string, platform: 'ios' | 'android', locale: string) {
  const { error } = await requireSupabase().rpc('register_my_notification_device', {
    p_token: token,
    p_platform: platform,
    p_locale: locale.split('-')[0],
  });
  if (error) throw error;
}

export async function disableMyNotifications(): Promise<void> {
  if (USE_MOCKS) return;
  const { error } = await requireSupabase().rpc('disable_my_notifications');
  if (error) throw error;
}

/**
 * On sign-out: this phone stops receiving this account's notifications.
 *
 * Only ever reads a token that already exists (never asks for permission), and
 * never fails the sign-out it belongs to.
 */
export async function forgetThisDevice(): Promise<void> {
  if (USE_MOCKS || !Device.isDevice) return;
  if (!supportsRemotePushRuntime(Platform.OS, Constants.executionEnvironment)) return;
  try {
    const Notifications = await import('expo-notifications');
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await requireSupabase().rpc('forget_my_notification_device', { p_token: token.data });
  } catch {
    // Signing out still proceeds; the next registration on this phone moves it anyway.
  }
}
