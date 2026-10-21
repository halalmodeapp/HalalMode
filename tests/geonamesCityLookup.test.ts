import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { nearestGeoNamesPlace, type GeoNamesCityDataset } from '../src/lib/geonamesCityLookup';

const sample: GeoNamesCityDataset = {
  countries: { GB: 'United Kingdom', FR: 'France' },
  cities: [
    ['London', 'GB', 51.5074, -0.1278],
    ['Paris', 'FR', 48.8566, 2.3522],
  ],
};

test('browser GPS resolves to the nearest bundled city and keeps the device coordinates', () => {
  const place = nearestGeoNamesPlace(51.556, -0.2796, sample);
  assert.equal(place?.city, 'London');
  assert.equal(place?.country, 'United Kingdom');
  assert.deepEqual([place?.latitude, place?.longitude], [51.556, -0.2796]);
});

test('browser GPS does not borrow a city name from more than 50 km away', () => {
  assert.equal(nearestGeoNamesPlace(0, -140, sample), null);
  assert.equal(nearestGeoNamesPlace(51.51, -0.13, sample, 0), null);
});

test('the bundled data is a worldwide GeoNames cities15000 extract with attribution', () => {
  const data = JSON.parse(readFileSync(resolve('src/data/geonames-cities15000.json'), 'utf8')) as {
    source: string;
    license: string;
    attribution: string;
    countries: Record<string, string>;
    cities: unknown[][];
  };
  assert.equal(data.source, 'GeoNames cities15000');
  assert.match(data.license, /CC BY 4\.0/u);
  assert.match(data.attribution, /geonames\.org/u);
  assert.ok(data.cities.length >= 20_000);
  assert.ok(data.cities.some(([name]) => name === 'London'));
  assert.ok(data.cities.some(([name]) => name === 'Riyadh'));
  assert.ok(Object.hasOwn(data.countries, 'GB'));
});
