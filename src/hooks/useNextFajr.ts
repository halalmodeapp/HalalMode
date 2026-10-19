import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { fetchMyHighLatitudeFajrSettings } from '@/api/profile';
import { DEFAULT_HIGH_LATITUDE_FAJR_METHOD, nextFajrAfter } from '@/lib/prayerTimes';
import { queryKeys } from '@/lib/queryClient';

/**
 * The member's next Fajr, using the same saved coordinates and shared
 * calculation as the server-side round scheduler. Device GPS can differ from
 * the location used to open the round, so it is deliberately not consulted.
 *
 * The owner-only settings RPC supplies these coordinates and never exposes
 * them through another member's profile.
 */
export function useNextFajr(): Date | null {
  const [next, setNext] = useState<Date | null>(null);
  const settings = useQuery({
    queryKey: queryKeys.highLatitudeFajrSettings,
    queryFn: fetchMyHighLatitudeFajrSettings,
  });
  const method = settings.data?.method ?? DEFAULT_HIGH_LATITUDE_FAJR_METHOD;
  const latitude = settings.data?.latitude ?? null;
  const longitude = settings.data?.longitude ?? null;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const calculate = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      const now = new Date();
      const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
      const dawn = hasCoordinates
        ? nextFajrAfter(latitude!, longitude!, now, method)
        : null;
      setNext(dawn);
      // Recompute just past dawn, including after the OS resumes a delayed timer.
      // Polar locations without a calculable dawn are reconsidered periodically.
      const delay = dawn ? Math.max(1000, dawn.getTime() - now.getTime() + 1000) : 6 * 60 * 60 * 1000;
      timer = setTimeout(calculate, Math.min(delay, 24 * 60 * 60 * 1000));
    };
    calculate();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') calculate();
      else {
        if (timer) clearTimeout(timer);
      }
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [latitude, longitude, method]);

  return next;
}
