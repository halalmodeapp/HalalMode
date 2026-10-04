import type { AppLocale } from '@/i18n/locales';
import type { CatalogGroup, CatalogOption } from './catalogOption';
import { UNSTATED } from './matchingOptions';

/**
 * Heritage: up to three countries a member or their family are from — every
 * country, so nobody is missing. Stored as ISO 3166-1 codes (migration 0175);
 * the device names each one in the language on screen, falling back to the
 * English name here where it cannot.
 */
export const HERITAGE_MAX = 3;

const COUNTRIES: Record<string, string> = {
  AF: 'Afghanistan', AX: 'Åland Islands', AL: 'Albania', DZ: 'Algeria', AS: 'American Samoa', AD: 'Andorra',
  AO: 'Angola', AI: 'Anguilla', AG: 'Antigua and Barbuda', AR: 'Argentina', AM: 'Armenia', AW: 'Aruba',
  AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan', BS: 'Bahamas', BH: 'Bahrain', BD: 'Bangladesh',
  BB: 'Barbados', BY: 'Belarus', BE: 'Belgium', BZ: 'Belize', BJ: 'Benin', BM: 'Bermuda', BT: 'Bhutan',
  BO: 'Bolivia', BA: 'Bosnia and Herzegovina', BW: 'Botswana', BR: 'Brazil', BN: 'Brunei', BG: 'Bulgaria',
  BF: 'Burkina Faso', BI: 'Burundi', CV: 'Cape Verde', KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada',
  KY: 'Cayman Islands', CF: 'Central African Republic', TD: 'Chad', CL: 'Chile', CN: 'China', CO: 'Colombia',
  KM: 'Comoros', CG: 'Congo', CD: 'Congo (DRC)', CK: 'Cook Islands', CR: 'Costa Rica', CI: 'Côte d’Ivoire',
  HR: 'Croatia', CU: 'Cuba', CW: 'Curaçao', CY: 'Cyprus', CZ: 'Czechia', DK: 'Denmark', DJ: 'Djibouti',
  DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', EG: 'Egypt', SV: 'El Salvador',
  GQ: 'Equatorial Guinea', ER: 'Eritrea', EE: 'Estonia', SZ: 'Eswatini', ET: 'Ethiopia', FO: 'Faroe Islands',
  FJ: 'Fiji', FI: 'Finland', FR: 'France', GF: 'French Guiana', PF: 'French Polynesia', GA: 'Gabon',
  GM: 'Gambia', GE: 'Georgia', DE: 'Germany', GH: 'Ghana', GI: 'Gibraltar', GR: 'Greece', GL: 'Greenland',
  GD: 'Grenada', GP: 'Guadeloupe', GU: 'Guam', GT: 'Guatemala', GG: 'Guernsey', GN: 'Guinea',
  GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', HK: 'Hong Kong', HU: 'Hungary',
  IS: 'Iceland', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IE: 'Ireland', IM: 'Isle of Man',
  IL: 'Israel', IT: 'Italy', JM: 'Jamaica', JP: 'Japan', JE: 'Jersey', JO: 'Jordan', KZ: 'Kazakhstan',
  KE: 'Kenya', KI: 'Kiribati', XK: 'Kosovo', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LV: 'Latvia',
  LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', LI: 'Liechtenstein', LT: 'Lithuania',
  LU: 'Luxembourg', MO: 'Macao', MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia', MV: 'Maldives', ML: 'Mali',
  MT: 'Malta', MH: 'Marshall Islands', MQ: 'Martinique', MR: 'Mauritania', MU: 'Mauritius', YT: 'Mayotte',
  MX: 'Mexico', FM: 'Micronesia', MD: 'Moldova', MC: 'Monaco', MN: 'Mongolia', ME: 'Montenegro',
  MS: 'Montserrat', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar', NA: 'Namibia', NR: 'Nauru', NP: 'Nepal',
  NL: 'Netherlands', NC: 'New Caledonia', NZ: 'New Zealand', NI: 'Nicaragua', NE: 'Niger', NG: 'Nigeria',
  NU: 'Niue', KP: 'North Korea', MK: 'North Macedonia', MP: 'Northern Mariana Islands', NO: 'Norway',
  OM: 'Oman', PK: 'Pakistan', PW: 'Palau', PS: 'Palestine', PA: 'Panama', PG: 'Papua New Guinea',
  PY: 'Paraguay', PE: 'Peru', PH: 'Philippines', PL: 'Poland', PT: 'Portugal', PR: 'Puerto Rico', QA: 'Qatar',
  RE: 'Réunion', RO: 'Romania', RU: 'Russia', RW: 'Rwanda', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia',
  VC: 'Saint Vincent and the Grenadines', WS: 'Samoa', SM: 'San Marino', ST: 'São Tomé and Príncipe',
  SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia', SC: 'Seychelles', SL: 'Sierra Leone', SG: 'Singapore',
  SX: 'Sint Maarten', SK: 'Slovakia', SI: 'Slovenia', SB: 'Solomon Islands', SO: 'Somalia', ZA: 'South Africa',
  KR: 'South Korea', SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname',
  SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan', TZ: 'Tanzania',
  TH: 'Thailand', TL: 'Timor-Leste', TG: 'Togo', TO: 'Tonga', TT: 'Trinidad and Tobago', TN: 'Tunisia',
  TR: 'Turkey', TM: 'Turkmenistan', TC: 'Turks and Caicos Islands', TV: 'Tuvalu', UG: 'Uganda',
  UA: 'Ukraine', AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States', UY: 'Uruguay',
  UZ: 'Uzbekistan', VU: 'Vanuatu', VA: 'Vatican City', VE: 'Venezuela', VN: 'Vietnam',
  VG: 'British Virgin Islands', VI: 'U.S. Virgin Islands', EH: 'Western Sahara', YE: 'Yemen', ZM: 'Zambia',
  ZW: 'Zimbabwe',
};

const namers = new Map<AppLocale, Intl.DisplayNames | null>();

function namer(language: AppLocale): Intl.DisplayNames | null {
  let found = namers.get(language);
  if (found === undefined) {
    try {
      found = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
        ? new Intl.DisplayNames([language], { type: 'region' })
        : null;
    } catch {
      found = null;
    }
    namers.set(language, found);
  }
  return found;
}

/** A country's name in the language on screen. */
export function heritageName(code: string, language: AppLocale): string {
  if (code === UNSTATED.id) return language === 'ar' ? UNSTATED.ar : UNSTATED.t?.[language] ?? UNSTATED.en;
  const english = COUNTRIES[code] ?? code;
  if (language === 'en') return english;
  try {
    const name = namer(language)?.of(code);
    return name && name !== code ? name : english;
  } catch {
    return english;
  }
}

const cache = new Map<string, readonly CatalogGroup[]>();

/**
 * Every country as one list, in alphabetical order for the language on
 * screen. Each option carries its English name too, so searching in English
 * still finds it.
 */
export function heritageGroups(language: AppLocale, withUnstated: boolean): readonly CatalogGroup[] {
  const key = `${language}:${withUnstated}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const options: CatalogOption[] = Object.keys(COUNTRIES)
    .map((code) => {
      const name = heritageName(code, language);
      return { id: code, en: COUNTRIES[code] ?? code, ar: language === 'ar' ? name : COUNTRIES[code] ?? code, t: { [language]: name } };
    })
    .sort((a, b) => heritageName(a.id, language).localeCompare(heritageName(b.id, language), language));
  const groups: readonly CatalogGroup[] = [
    { id: 'group:heritage', en: '', ar: '', t: {}, options: withUnstated ? [...options, UNSTATED] : options },
  ];
  cache.set(key, groups);
  return groups;
}
