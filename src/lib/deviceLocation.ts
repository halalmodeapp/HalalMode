// Relative, not '@/': the tests load this file directly and do not resolve aliases.
import { nearestPlace } from '../data/cities';
import { withDeadline } from './withDeadline';

export interface DeviceCoordinates {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodedPlace {
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
  country?: string | null;
}

export interface DeviceLocationUpdate extends DeviceCoordinates {
  city: string;
  country: string;
}

function validCoordinates({ latitude, longitude }: DeviceCoordinates): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/** Permission is requested by the screen, before starting these deadlines.
 * A timed-out OS request cannot subsequently overwrite the selected result.
 * The native geocoder can use OS network services; no app API key is needed.
 */
export async function nativeDevicePlace(
  locate: () => Promise<{ coords: DeviceCoordinates }>,
  geocode: (coordinates: DeviceCoordinates) => Promise<ReverseGeocodedPlace[]>,
  deadlines = { position: 15_000, geocode: 8_000 },
): Promise<DeviceLocationUpdate | null> {
  const { coords } = await withDeadline(locate(), deadlines.position);
  if (!validCoordinates(coords)) return null;
  let places: ReverseGeocodedPlace[] = [];
  try {
    places = await withDeadline(geocode(coords), deadlines.geocode);
  } catch {
    // OS geocoding is best effort. Keep the actual device coordinates.
  }
  for (const place of places) {
    const resolved = deviceLocationFromReverseGeocode(place, coords);
    if (resolved) return resolved;
  }
  return placeFromDevice(undefined, coords);
}

/**
 * Ask the browser directly for coordinates. Safari on iPhone can expose
 * navigator.geolocation while not exposing the Permissions API that
 * expo-location's web adapter uses for its permission check. Calling the
 * browser API itself also keeps the request tied to the user's tap.
 */
export function browserDeviceCoordinates(): Promise<DeviceCoordinates> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new Error('Browser geolocation is unavailable.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      reject,
      {
        enableHighAccuracy: false,
        maximumAge: 0,
        timeout: 15_000,
      },
    );
  });
}

/**
 * Converts the OS reverse-geocode result into the only location payload the
 * profile API accepts. A place name always arrives with the coordinates it
 * belongs to, from the device here, or as a pair from the city list, so a
 * labels and coordinates are saved together. This is not spoof-proof location
 * verification: device coordinates and geocoder labels are client input.
 */
export function deviceLocationFromReverseGeocode(
  place: ReverseGeocodedPlace | undefined,
  coordinates: DeviceCoordinates
): DeviceLocationUpdate | null {
  const city = [place?.city, place?.subregion, place?.region]
    .map(value => value?.trim() ?? '')
    .find(value => value.length >= 2 && value.length <= 100) ?? '';
  const country = (place?.country ?? '').trim();
  if (!validCoordinates(coordinates) || city.length < 2 || country.length < 2 || country.length > 100) {
    return null;
  }

  return { city, country, ...coordinates };
}

/**
 * The device's answer, or the nearest listed city when the device cannot name
 * the place.
 *
 * A browser gives coordinates but has no geocoder, Expo removed it, so on the
 * web the first answer is always empty and every member used to fail the
 * location step. The coordinates are still the member's own; only the name is
 * borrowed from the closest city on the list.
 */
export function placeFromDevice(
  place: ReverseGeocodedPlace | undefined,
  coordinates: DeviceCoordinates,
): DeviceLocationUpdate | null {
  if (!validCoordinates(coordinates)) return null;
  return (
    deviceLocationFromReverseGeocode(place, coordinates) ??
    nearestPlace(coordinates.latitude, coordinates.longitude)
  );
}
