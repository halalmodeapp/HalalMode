import type { AppLocale } from '@/i18n/locales';

/**
 * ISO region codes for the country names the app stores. The stored value stays
 * the English name (matching compares it); the code only lets the device name
 * the country in whatever language is on screen.
 */
export const COUNTRY_CODES: Record<string, string> = {
  Afghanistan: 'AF', Albania: 'AL', Algeria: 'DZ', Andorra: 'AD', Angola: 'AO', Argentina: 'AR',
  Armenia: 'AM', Australia: 'AU', Austria: 'AT', Azerbaijan: 'AZ', Bahrain: 'BH', Bangladesh: 'BD',
  Belarus: 'BY', Belgium: 'BE', Benin: 'BJ', 'Bosnia and Herzegovina': 'BA', Brazil: 'BR', Brunei: 'BN',
  Bulgaria: 'BG', 'Burkina Faso': 'BF', Cameroon: 'CM', Canada: 'CA', Chad: 'TD', Chile: 'CL', China: 'CN',
  Comoros: 'KM', 'Côte d’Ivoire': 'CI', Croatia: 'HR', Cyprus: 'CY', Czechia: 'CZ', Denmark: 'DK',
  Djibouti: 'DJ', Egypt: 'EG', Eritrea: 'ER', Estonia: 'EE', Ethiopia: 'ET', Finland: 'FI', France: 'FR',
  Gambia: 'GM', Georgia: 'GE', Germany: 'DE', Ghana: 'GH', Greece: 'GR', Guinea: 'GN', Hungary: 'HU',
  India: 'IN', Indonesia: 'ID', Iran: 'IR', Iraq: 'IQ', Ireland: 'IE', Italy: 'IT', Japan: 'JP', Jordan: 'JO',
  Kazakhstan: 'KZ', Kenya: 'KE', Kosovo: 'XK', Kuwait: 'KW', Kyrgyzstan: 'KG', Lebanon: 'LB', Libya: 'LY',
  Lithuania: 'LT', Luxembourg: 'LU', Malaysia: 'MY', Maldives: 'MV', Mali: 'ML', Malta: 'MT',
  Mauritania: 'MR', Mauritius: 'MU', Mexico: 'MX', Morocco: 'MA', Mozambique: 'MZ', Netherlands: 'NL',
  'New Zealand': 'NZ', Niger: 'NE', Nigeria: 'NG', 'North Macedonia': 'MK', Norway: 'NO', Oman: 'OM',
  Pakistan: 'PK', Palestine: 'PS', Philippines: 'PH', Poland: 'PL', Portugal: 'PT', Qatar: 'QA',
  Romania: 'RO', Russia: 'RU', 'Saudi Arabia': 'SA', Senegal: 'SN', Serbia: 'RS', 'Sierra Leone': 'SL',
  Singapore: 'SG', Slovakia: 'SK', Slovenia: 'SI', Somalia: 'SO', 'South Africa': 'ZA', Spain: 'ES',
  'Sri Lanka': 'LK', Sudan: 'SD', Sweden: 'SE', Switzerland: 'CH', Syria: 'SY', Tajikistan: 'TJ',
  Tanzania: 'TZ', Thailand: 'TH', Togo: 'TG', Tunisia: 'TN', Turkey: 'TR', Turkmenistan: 'TM', Uganda: 'UG',
  Ukraine: 'UA', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB', 'United States': 'US',
  Uzbekistan: 'UZ', Yemen: 'YE', Zambia: 'ZM', Zimbabwe: 'ZW',
};

const namers = new Map<string, Intl.DisplayNames | null>();

/**
 * A country's name in the given language, or the English name where the device
 * cannot say it (some phones ship without the data for every language).
 */
export function countryName(englishName: string, locale: AppLocale): string {
  if (locale === 'en') return englishName;
  const code = COUNTRY_CODES[englishName];
  if (!code) return englishName;
  let namer = namers.get(locale);
  if (namer === undefined) {
    try {
      namer = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
        ? new Intl.DisplayNames([locale], { type: 'region' })
        : null;
    } catch {
      namer = null;
    }
    namers.set(locale, namer);
  }
  try {
    return namer?.of(code) ?? englishName;
  } catch {
    return englishName;
  }
}
