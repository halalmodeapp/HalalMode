import { distanceKm, type ResolvedPlace } from '../data/cities';

export type GeoNamesCity = readonly [name: string, countryCode: string, latitude: number, longitude: number];

export interface GeoNamesCityDataset {
  countries: Readonly<Record<string, string>>;
  cities: readonly GeoNamesCity[];
}

/** Name browser GPS coordinates from the bundled large-city list, never a network geocoder. */
export function nearestGeoNamesPlace(
  latitude: number,
  longitude: number,
  dataset: GeoNamesCityDataset,
  withinKm = 50,
): ResolvedPlace | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180
    || !Number.isFinite(withinKm) || withinKm < 0) return null;

  let best: { name: string; country: string; km: number } | null = null;
  for (const [name, countryCode, cityLatitude, cityLongitude] of dataset.cities) {
    const country = dataset.countries[countryCode];
    if (!name || !country || !Number.isFinite(cityLatitude) || !Number.isFinite(cityLongitude)) continue;
    const km = distanceKm(latitude, longitude, cityLatitude, cityLongitude);
    if (!best || km < best.km) best = { name, country, km };
  }

  if (!best || best.km > withinKm) return null;
  return { city: best.name, country: best.country, latitude, longitude };
}
