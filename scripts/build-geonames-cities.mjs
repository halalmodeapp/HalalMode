import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [citiesFile, countriesFile, outputFile = 'src/data/geonames-cities15000.json'] = process.argv.slice(2);

if (!citiesFile || !countriesFile) {
  console.error('Usage: node scripts/build-geonames-cities.mjs <cities15000.txt> <countryInfo.txt> [output.json]');
  process.exit(2);
}

const countries = Object.create(null);
for (const line of readFileSync(countriesFile, 'utf8').split(/\r?\n/u)) {
  if (!line || line.startsWith('#')) continue;
  const columns = line.split('\t');
  const code = columns[0]?.trim();
  const name = columns[4]?.trim();
  if (code && name) countries[code] = name;
}

const cities = [];
for (const line of readFileSync(citiesFile, 'utf8').split(/\r?\n/u)) {
  if (!line) continue;
  const columns = line.split('\t');
  const name = columns[2]?.trim();
  const latitude = Number(columns[4]);
  const longitude = Number(columns[5]);
  const countryCode = columns[8]?.trim();
  if (!name || !countries[countryCode] || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
  cities.push([name, countryCode, Number(latitude.toFixed(4)), Number(longitude.toFixed(4))]);
}

if (cities.length < 20_000) {
  throw new Error(`Expected the worldwide cities15000 data set; only found ${cities.length} usable cities.`);
}

cities.sort((left, right) => left[1].localeCompare(right[1]) || left[0].localeCompare(right[0]));
const data = {
  source: 'GeoNames cities15000',
  license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
  attribution: 'City names and coordinates are derived from GeoNames (https://www.geonames.org).',
  countries,
  cities,
};

writeFileSync(resolve(outputFile), `${JSON.stringify(data)}\n`, 'utf8');
console.log(`Wrote ${cities.length.toLocaleString()} GeoNames cities to ${outputFile}.`);
