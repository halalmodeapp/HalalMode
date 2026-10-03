import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { coordsForCityName } from '@/data/cities';
import { nextFajrAfter } from '@/lib/prayerTimes';

type Coords = { latitude: number; longitude: number };

/** A position the member has already allowed; never shows a permission prompt. */
async function allowedPosition(): Promise<Coords | null> {
  if (Platform.OS === 'web') {
    // expo-location's permission check on the web often answers "not asked"
    // even after the browser has granted it, so ask the browser itself.
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    try {
      const state = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
      if (state && state.state !== 'granted') return null;
    } catch {
      return null;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => resolve(null),
        { maximumAge: 6 * 60 * 60 * 1000, timeout: 8000 },
      );
    });
  }
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const position = (await Location.getLastKnownPositionAsync())
    ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  return position ? { latitude: position.coords.latitude, longitude: position.coords.longitude } : null;
}

/**
 * The member's next Fajr.
 *
 * From where the device is now when location is already allowed; otherwise
 * from their city on the profile, which is close enough to the minute that
 * matters. Coordinates stay on the device. Null only if neither is known.
 */
export function useNextFajr(city?: string | null): Date | null {
  const [next, setNext] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fromCity = coordsForCityName(city);
    if (fromCity) setNext(nextFajrAfter(fromCity.latitude, fromCity.longitude, new Date()));
    void allowedPosition()
      .then((coords) => {
        if (!cancelled && coords) setNext(nextFajrAfter(coords.latitude, coords.longitude, new Date()));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [city]);

  return next;
}
