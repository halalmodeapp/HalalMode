import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { nextFajrAfter } from '@/lib/prayerTimes';

/**
 * The member's next Fajr, worked out on the device from where it is now.
 *
 * Location is already required to use the app, so this only reads a position
 * that permission already covers; it never asks. Coordinates stay on the
 * device. Null until known, or if location is unavailable.
 */
export function useNextFajr(): Date | null {
  const [next, setNext] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = (await Location.getLastKnownPositionAsync())
          ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
        if (cancelled || !position) return;
        setNext(nextFajrAfter(position.coords.latitude, position.coords.longitude, new Date()));
      } catch {
        // No position, no countdown: the screen still says "at Fajr".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return next;
}
