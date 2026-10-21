import type { DeviceCoordinates, DeviceLocationUpdate } from './deviceLocation';
import { nearestGeoNamesPlace, type GeoNamesCityDataset } from './geonamesCityLookup';

/** Loaded on demand only on web, when the member asks to use browser GPS. */
export async function placeFromBrowserCoordinates(
  coordinates: DeviceCoordinates,
): Promise<DeviceLocationUpdate | null> {
  const { default: dataset } = await import('../data/geonames-cities15000.json');
  return nearestGeoNamesPlace(
    coordinates.latitude,
    coordinates.longitude,
    dataset as unknown as GeoNamesCityDataset,
  );
}
