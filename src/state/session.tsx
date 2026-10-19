import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { Language, MembershipTier } from '@/types';
import { isSupportedLocale } from '@/i18n/locales';
import { normalizeMembershipTier } from '@/lib/membership';
import { supabase, USE_MOCKS } from '@/lib/supabase';
import { useAuth } from '@/state/auth';

const STORAGE_KEY = 'halalmode.session.v1';

interface SessionValue {
  tier: MembershipTier;
  language: Language;
  setTier: (tier: MembershipTier) => void;
  setLanguage: (language: Language) => void;
  entitlementStatus: 'loading' | 'ready' | 'error';
  refreshEntitlement: () => Promise<void>;
  ready: boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Lightweight local session preferences, tier and language.
 *
 * Tier is mirrored here for instant UI response, but it is not the source of
 * truth: every limit that matters (round size, keeps, open connections) is
 * re-checked server-side. Flipping this value locally buys nothing.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [tier, setTierState] = useState<MembershipTier>('free');
  const [language, setLanguageState] = useState<Language>('en');
  const [entitlementStatus, setEntitlementStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ready, setReady] = useState(false);
  const entitlementRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as Partial<SessionValue>;
        const savedTier = normalizeMembershipTier(parsed.tier);
        if (savedTier && USE_MOCKS) {
          setTierState(savedTier);
          if (savedTier !== parsed.tier) {
            void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
              tier: savedTier,
              language: isSupportedLocale(parsed.language) ? parsed.language : 'en',
            })).catch(() => {});
          }
        }
        if (isSupportedLocale(parsed.language)) {
          setLanguageState(parsed.language);
        }
      })
      .catch(() => {
        // A corrupt preferences blob should never block launch.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshEntitlement = useCallback(async () => {
    const request = ++entitlementRequest.current;
    if (USE_MOCKS) {
      setEntitlementStatus('ready');
      return;
    }
    if (!userId) {
      setTierState('free');
      setEntitlementStatus('ready');
      return;
    }
    if (!supabase) {
      setTierState('free');
      setEntitlementStatus('error');
      return;
    }

    setEntitlementStatus('loading');
    try {
      const { data, error } = await supabase.rpc('get_my_membership_entitlement');
      if (request !== entitlementRequest.current) return;
      if (error) throw error;
      const payload = data as { tier?: unknown } | null;
      const nextTier = normalizeMembershipTier(payload?.tier);
      if (!nextTier) throw new Error('Membership entitlement response is invalid.');
      setTierState(nextTier);
      setEntitlementStatus('ready');
    } catch {
      if (request !== entitlementRequest.current) return;
      // Fail closed for access, but keep the failure distinct from a genuine
      // free entitlement so Settings can explain it and offer a retry.
      setTierState('free');
      setEntitlementStatus('error');
    }
  }, [userId]);

  useEffect(() => {
    void refreshEntitlement();
    return () => { entitlementRequest.current += 1; };
  }, [refreshEntitlement]);

  const persist = useCallback((next: { tier: MembershipTier; language: Language }) => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setTier = useCallback(
    (next: MembershipTier) => {
      setTierState(next);
      persist({ tier: next, language });
    },
    [language, persist]
  );

  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      persist({ tier, language: next });
    },
    [tier, persist]
  );

  const value = useMemo(
    () => ({ tier, language, setTier, setLanguage, entitlementStatus, refreshEntitlement, ready }),
    [tier, language, setTier, setLanguage, entitlementStatus, refreshEntitlement, ready]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
