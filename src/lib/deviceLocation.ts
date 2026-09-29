// Relative, not '@/': the tests load this file directly and do not resolve aliases.
import { nearestPlace } from '../data/cities';

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

/**
 * Converts the OS reverse-geocode result into the only location payload the
 * profile API accepts. A place name always arrives with the coordinates it
 * belongs to — from the device here, or as a pair from the city list — so a
 * member can never claim one city while standing in another.
 */
export function deviceLocationFromReverseGeocode(
  place: ReverseGeocodedPlace | undefined,
  coordinates: DeviceCoordinates
): DeviceLocationUpdate | null {
  const city = (place?.city ?? place?.subregion ?? place?.region ?? '').trim();
  const country = (place?.country ?? '').trim();
  const coordinatesValid = Number.isFinite(coordinates.latitude)
    && Number.isFinite(coordinates.longitude)
    && coordinates.latitude >= -90
    && coordinates.latitude <= 90
    && coordinates.longitude >= -180
    && coordinates.longitude <= 180;

  if (!coordinatesValid || city.length < 2 || city.length > 100 || country.length < 2 || country.length > 100) {
    return null;
  }

  return { city, country, ...coordinates };
}

/**
 * The device's answer, or the nearest listed city when the device cannot name
 * the place.
 *
 * A browser gives coordinates but has no geocoder — Expo removed it — so on the
 * web the first answer is always empty and every member used to fail the
 * location step. The coordinates are still the member's own; only the name is
 * borrowed from the closest city on the list.
 */
export function placeFromDevice(
  place: ReverseGeocodedPlace | undefined,
  coordinates: DeviceCoordinates,
): DeviceLocationUpdate | null {
  return (
    deviceLocationFromReverseGeocode(place, coordinates) ??
    nearestPlace(coordinates.latitude, coordinates.longitude)
  );
}
