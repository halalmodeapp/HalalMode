import assert from 'node:assert/strict';
import test from 'node:test';

import { browserDeviceCoordinates, deviceLocationFromReverseGeocode, nativeDevicePlace, placeFromDevice } from '../src/lib/deviceLocation';
import { profilePatchToRow } from '../src/lib/profilePatch';

test('device reverse geocoding resolves a city without typed location input', () => {
  assert.deepEqual(
    deviceLocationFromReverseGeocode(
      { city: null, subregion: 'Al Madinah', region: 'Madinah Region', country: 'Saudi Arabia' },
      { latitude: 24.4672, longitude: 39.6024 }
    ),
    { city: 'Al Madinah', country: 'Saudi Arabia', latitude: 24.4672, longitude: 39.6024 }
  );
});

test('device location rejects missing place labels and invalid coordinates', () => {
  assert.equal(
    deviceLocationFromReverseGeocode({ city: 'Madinah', country: 'Saudi Arabia' }, { latitude: 91, longitude: 39 }),
    null
  );
  assert.equal(
    deviceLocationFromReverseGeocode({ country: 'Saudi Arabia' }, { latitude: 24, longitude: 39 }),
    null
  );
});

test('general profile updates cannot serialize city or country', () => {
  assert.deepEqual(
    profilePatchToRow({ city: 'Typed city', country: 'Typed country', firstName: 'Amina' }),
    { first_name: 'Amina' }
  );
});

test('blank native city labels fall through to a usable district', () => {
  assert.equal(deviceLocationFromReverseGeocode(
    { city: '  ', subregion: 'Wembley', country: 'United Kingdom' },
    { latitude: 51.556, longitude: -0.2796 },
  )?.city, 'Wembley');
});

test('invalid positions never reach the nearest-city fallback', () => {
  for (const latitude of [NaN, Infinity, -Infinity, 91, -91]) {
    assert.equal(placeFromDevice(undefined, { latitude, longitude: 0 }), null);
  }
  for (const longitude of [NaN, Infinity, 181, -181]) {
    assert.equal(placeFromDevice(undefined, { latitude: 0, longitude }), null);
  }
});

const coords = { latitude: 51.556, longitude: -0.2796 };

test('browser location calls the native geolocation prompt without relying on Permissions API', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let calls = 0;
  let options: PositionOptions | undefined;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(
          success: (position: { coords: typeof coords }) => void,
          _failure: (error: unknown) => void,
          requestOptions: PositionOptions,
        ) {
          calls += 1;
          options = requestOptions;
          success({ coords });
        },
      },
    },
  });
  try {
    assert.deepEqual(await browserDeviceCoordinates(), coords);
    assert.equal(calls, 1);
    assert.equal(options?.maximumAge, 0);
    assert.equal(options?.enableHighAccuracy, false);
    assert.equal(options?.timeout, 15_000);
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});

test('native lookup tries all OS results before the city fallback', async () => {
  const result = await nativeDevicePlace(async () => ({ coords }), async () => [
    { country: 'United Kingdom' },
    { city: 'Wembley', country: 'United Kingdom' },
  ]);
  assert.deepEqual(result, { ...coords, city: 'Wembley', country: 'United Kingdom' });
});

test('native geocoder timeout releases the caller without accepting a late label', async () => {
  let finish!: (value: { city: string; country: string }[]) => void;
  const geocoding = new Promise<{ city: string; country: string }[]>(resolve => { finish = resolve; });
  const result = await nativeDevicePlace(async () => ({ coords }), () => geocoding,
    { position: 1000, geocode: 5 });
  assert.equal(result?.city, 'London');
  finish([{ city: 'Late result', country: 'United Kingdom' }]);
  await Promise.resolve();
  assert.equal(result?.city, 'London');
});

test('native positioning timeout does not invoke geocoding', async () => {
  let called = false;
  await assert.rejects(nativeDevicePlace(() => new Promise(() => {}), async () => {
    called = true;
    return [];
  }, { position: 5, geocode: 5 }), /timed out/);
  assert.equal(called, false);
});

test('native geocoder rejection falls back without losing coordinates', async () => {
  const result = await nativeDevicePlace(async () => ({ coords }), async () => { throw new Error('offline'); });
  assert.deepEqual(result, { ...coords, city: 'London', country: 'United Kingdom' });
});
