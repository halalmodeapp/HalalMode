import { fajrInstant } from './prayerTimes.ts';

const MADINAH_LATITUDE = 24.4672;
const MADINAH_LONGITUDE = 39.6111;
const MADINAH_UTC_OFFSET_MINUTES = 180;
const MINUTE_MS = 60_000;

export interface MadinahFajrTime {
  hour: number;
  minute: number;
  at: Date;
}

/** Calculate Madinah's Umm al-Qura Fajr without a runtime prayer-time API. */
export function fajrForMadinahDate(cycleDate: string): MadinahFajrTime {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(cycleDate);
  if (!match) throw new Error('Madinah Fajr date must use YYYY-MM-DD');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== cycleDate) {
    throw new Error('Madinah Fajr date is invalid');
  }

  const calculated = fajrInstant(MADINAH_LATITUDE, MADINAH_LONGITUDE, { year, month, day });
  if (!calculated) throw new Error('Madinah Fajr could not be calculated');

  // Cron runs in UTC, while the round window is described in Madinah time.
  // Round once to the minute so both use the same instant.
  const at = new Date(Math.round(calculated.getTime() / MINUTE_MS) * MINUTE_MS);
  const madinahClock = new Date(at.getTime() + MADINAH_UTC_OFFSET_MINUTES * MINUTE_MS);
  return { hour: madinahClock.getUTCHours(), minute: madinahClock.getUTCMinutes(), at };
}
