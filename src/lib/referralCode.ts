import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

/**
 * The code of whoever invited this person, remembered from a shared link
 * (https://halalmo.de/?ref=HM…) until they finish signing up. halalmo.de keeps
 * it under the same key, and on the web the app shares that storage, so a code
 * picked up on the waitlist page carries straight into the app's sign-up.
 */
export const REFERRAL_STORAGE_KEY = 'halal-mode-referral-code';
const CODE = /^HM[A-Z0-9]{8}$/;

/** A well-formed code in capitals, or null. */
export function normalizeReferralCode(raw: unknown): string | null {
  const code = String(raw ?? '').trim().toUpperCase();
  return CODE.test(code) ? code : null;
}

/** The ?ref= code in a link, or null. */
export function referralCodeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /[?&]ref=([^&#]+)/i.exec(url);
  return match ? normalizeReferralCode(decodeURIComponent(match[1]!)) : null;
}

// The server-rendered web pages have no storage; nothing is remembered there.
const hasStorage = () => typeof window !== 'undefined';

/** Keeps the first code seen; a later link does not replace who invited them. */
export async function rememberReferralCode(raw: unknown): Promise<void> {
  const code = normalizeReferralCode(raw);
  if (!code || !hasStorage()) return;
  try {
    if (!(await AsyncStorage.getItem(REFERRAL_STORAGE_KEY))) await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, code);
  } catch {
    // Storage can be unavailable (private browsing); the code can still be typed in.
  }
}

export async function pendingReferralCode(): Promise<string | null> {
  if (!hasStorage()) return null;
  try {
    return normalizeReferralCode(await AsyncStorage.getItem(REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

export async function forgetReferralCode(): Promise<void> {
  if (!hasStorage()) return;
  try {
    await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // Nothing to forget.
  }
}

/** Remembers the code from any link that opens the app. */
export function useReferralLinkCapture(): void {
  const url = Linking.useURL();
  useEffect(() => {
    const code = referralCodeFromUrl(url);
    if (code) void rememberReferralCode(code);
  }, [url]);
}
