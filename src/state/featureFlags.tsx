import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { fetchReleaseFlags } from '@/api/releaseFlags';
import { defaultFeatureFlags, type FeatureFlags } from '@/lib/featureFlags';
import { USE_MOCKS } from '@/lib/supabase';
import { useAuth } from '@/state/auth';

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFeatureFlags);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);

  useEffect(() => {
    if (USE_MOCKS || !userId) {
      setFlags(defaultFeatureFlags);
      return;
    }
    let cancelled = false;
    const refresh = () => void fetchReleaseFlags()
      .then((next) => { if (!cancelled) setFlags(next); })
      .catch(() => { if (!cancelled) setFlags(defaultFeatureFlags); });
    refresh();
    const timer = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { cancelled = true; clearInterval(timer); subscription.remove(); };
  }, [userId]);

  const value = useMemo(() => flags, [flags]);
  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagsContext);
}
