import assert from 'node:assert/strict';
import test from 'node:test';

import { CITY_GROUPS, distanceKm, nearestPlace, placeForCity } from '../src/data/cities';
import { COUNTRIES } from '../src/data/preferences';
import { placeFromDevice } from '../src/lib/deviceLocation';

test('every country is spelled the way matching compares it', () => {
  // A country the preference list does not know could never be accepted by
  // anyone's "preferred countries", and the member would silently match nobody.
  const known = new Set<string>(COUNTRIES);
  const unknown = CITY_GROUPS.map((group) => group.en).filter((name) => !known.has(name));
  assert.deepEqual(unknown, []);
});

test('every city id is unique, because the id is what is looked up', () => {
  const ids = CITY_GROUPS.flatMap((group) => group.options.map((option) => option.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('a chosen city arrives as a name and its own centre, together', () => {
  const london = placeForCity('london');
  assert.equal(london?.city, 'London');
  assert.equal(london?.country, 'United Kingdom');
  assert.ok(Math.abs((london?.latitude ?? 0) - 51.51) < 0.01);
  assert.equal(placeForCity('atlantis'), null);
});

test('a browser position is named after the nearest city, keeping its own coordinates', () => {
  // Wembley, about 13km from central London.
  const place = nearestPlace(51.556, -0.2796);
  assert.equal(place?.city, 'London');
  assert.equal(place?.latitude, 51.556);
});

test('somewhere far from every listed city is not given a stranger’s name', () => {
  // The middle of the Pacific.
  assert.equal(nearestPlace(0, -140), null);
});

test('the device answer wins, and the list only fills in when the device has none', () => {
  const coordinates = { latitude: 51.556, longitude: -0.2796 };
  assert.equal(placeFromDevice({ city: 'Wembley', country: 'United Kingdom' }, coordinates)?.city, 'Wembley');
  // The web: no geocoder, so nothing comes back.
  assert.equal(placeFromDevice(undefined, coordinates)?.city, 'London');
});

test('distance is the real great-circle distance', () => {
  // London to Paris is about 344km.
  const km = distanceKm(51.51, -0.13, 48.86, 2.35);
  assert.ok(km > 330 && km < 355, `${km}`);
});
