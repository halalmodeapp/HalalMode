import { placeFromDevice, type DeviceCoordinates, type DeviceLocationUpdate } from './deviceLocation';

/** Native fallback; the browser build replaces this with the larger local data set. */
export async function placeFromBrowserCoordinates(
  coordinates: DeviceCoordinates,
): Promise<DeviceLocationUpdate | null> {
  return placeFromDevice(undefined, coordinates);
}
