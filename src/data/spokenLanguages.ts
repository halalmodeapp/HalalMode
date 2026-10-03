import type { AppLocale } from '../i18n/locales';
import type { CatalogGroup, CatalogOption } from './catalogOption';

/**
 * Languages a member can say they speak.
 *
 * Stored as ISO 639 codes, named at read time by the device in whatever
 * language the app is in, so "ur" reads Urdu, اردو, or Ourdou without a
 * translation table. The English name is the fallback and what search matches
 * when the device cannot name a code.
 */
const LANGUAGES: readonly [code: string, english: string][] = [
  ['af', 'Afrikaans'], ['sq', 'Albanian'], ['am', 'Amharic'], ['ar', 'Arabic'], ['hy', 'Armenian'],
  ['as', 'Assamese'], ['ay', 'Aymara'], ['az', 'Azerbaijani'], ['bm', 'Bambara'], ['eu', 'Basque'],
  ['be', 'Belarusian'], ['bn', 'Bengali'], ['ber', 'Berber (Tamazight)'], ['bho', 'Bhojpuri'], ['bs', 'Bosnian'],
  ['br', 'Breton'], ['bg', 'Bulgarian'], ['my', 'Burmese'], ['yue', 'Cantonese'], ['ca', 'Catalan'],
  ['ceb', 'Cebuano'], ['ny', 'Chichewa'], ['zh', 'Chinese (Mandarin)'], ['ckb', 'Kurdish (Sorani)'], ['co', 'Corsican'],
  ['hr', 'Croatian'], ['cs', 'Czech'], ['da', 'Danish'], ['dv', 'Dhivehi'], ['nl', 'Dutch'],
  ['dz', 'Dzongkha'], ['en', 'English'], ['eo', 'Esperanto'], ['et', 'Estonian'], ['ee', 'Ewe'],
  ['fo', 'Faroese'], ['fj', 'Fijian'], ['fil', 'Filipino'], ['fi', 'Finnish'], ['fr', 'French'],
  ['ff', 'Fula'], ['gl', 'Galician'], ['ka', 'Georgian'], ['de', 'German'], ['el', 'Greek'],
  ['gn', 'Guarani'], ['gu', 'Gujarati'], ['ht', 'Haitian Creole'], ['ha', 'Hausa'], ['haw', 'Hawaiian'],
  ['he', 'Hebrew'], ['hi', 'Hindi'], ['hmn', 'Hmong'], ['hu', 'Hungarian'], ['is', 'Icelandic'],
  ['ig', 'Igbo'], ['ilo', 'Ilocano'], ['id', 'Indonesian'], ['ga', 'Irish'], ['it', 'Italian'],
  ['ja', 'Japanese'], ['jv', 'Javanese'], ['kn', 'Kannada'], ['ks', 'Kashmiri'], ['kk', 'Kazakh'],
  ['km', 'Khmer'], ['rw', 'Kinyarwanda'], ['ko', 'Korean'], ['kri', 'Krio'], ['ku', 'Kurdish (Kurmanji)'],
  ['ky', 'Kyrgyz'], ['lo', 'Lao'], ['la', 'Latin'], ['lv', 'Latvian'], ['ln', 'Lingala'],
  ['lt', 'Lithuanian'], ['lg', 'Luganda'], ['lb', 'Luxembourgish'], ['mk', 'Macedonian'], ['mai', 'Maithili'],
  ['mg', 'Malagasy'], ['ms', 'Malay'], ['ml', 'Malayalam'], ['mt', 'Maltese'], ['mi', 'Maori'],
  ['mr', 'Marathi'], ['mn', 'Mongolian'], ['ne', 'Nepali'], ['no', 'Norwegian'], ['or', 'Odia'],
  ['om', 'Oromo'], ['ps', 'Pashto'], ['fa', 'Persian (Farsi)'], ['prs', 'Dari'], ['pl', 'Polish'],
  ['pt', 'Portuguese'], ['pa', 'Punjabi'], ['qu', 'Quechua'], ['ro', 'Romanian'], ['ru', 'Russian'],
  ['sm', 'Samoan'], ['sa', 'Sanskrit'], ['gd', 'Scottish Gaelic'], ['sr', 'Serbian'], ['st', 'Sesotho'],
  ['sn', 'Shona'], ['sd', 'Sindhi'], ['si', 'Sinhala'], ['sk', 'Slovak'], ['sl', 'Slovenian'],
  ['so', 'Somali'], ['es', 'Spanish'], ['su', 'Sundanese'], ['sw', 'Swahili'], ['sv', 'Swedish'],
  ['tg', 'Tajik'], ['ta', 'Tamil'], ['tt', 'Tatar'], ['te', 'Telugu'], ['th', 'Thai'],
  ['ti', 'Tigrinya'], ['ts', 'Tsonga'], ['tn', 'Tswana'], ['tr', 'Turkish'], ['tk', 'Turkmen'],
  ['tw', 'Twi'], ['uk', 'Ukrainian'], ['ur', 'Urdu'], ['ug', 'Uyghur'], ['uz', 'Uzbek'],
  ['vi', 'Vietnamese'], ['cy', 'Welsh'], ['wo', 'Wolof'], ['xh', 'Xhosa'], ['yi', 'Yiddish'],
  ['yo', 'Yoruba'], ['zu', 'Zulu'], ['bal', 'Balochi'], ['brh', 'Brahui'], ['skr', 'Saraiki'],
  ['hno', 'Hindko'], ['ctg', 'Chittagonian'], ['syl', 'Sylheti'], ['mad', 'Madurese'], ['min', 'Minangkabau'],
  ['bug', 'Buginese'], ['ace', 'Acehnese'], ['ban', 'Balinese'], ['tet', 'Tetum'], ['kab', 'Kabyle'],
  ['shi', 'Tachelhit'], ['zgh', 'Standard Moroccan Tamazight'], ['din', 'Dinka'], ['nus', 'Nuer'], ['sid', 'Sidamo'],
  ['aa', 'Afar'], ['kr', 'Kanuri'], ['ful', 'Fulfulde'], ['dyu', 'Dyula'], ['mos', 'Mossi'],
  ['ak', 'Akan'], ['kg', 'Kongo'], ['lu', 'Luba-Katanga'], ['ki', 'Kikuyu'], ['luo', 'Luo'],
  ['kam', 'Kamba'], ['rn', 'Kirundi'], ['ce', 'Chechen'], ['av', 'Avar'],
  ['ba', 'Bashkir'], ['cv', 'Chuvash'], ['os', 'Ossetian'], ['kbd', 'Kabardian'], ['lez', 'Lezgian'],
  ['crh', 'Crimean Tatar'], ['bo', 'Tibetan'], ['ii', 'Yi'], ['za', 'Zhuang'],
  ['wuu', 'Shanghainese (Wu)'], ['nan', 'Hokkien (Min Nan)'], ['hak', 'Hakka'], ['tl', 'Tagalog'], ['mfe', 'Mauritian Creole'],
  ['sgn', 'Sign language'],
];

const namers = new Map<AppLocale, Intl.DisplayNames | null>();

export function languageName(code: string, locale: AppLocale): string {
  const english = ENGLISH_NAMES.get(code) ?? code;
  if (locale === 'en') return english;
  let namer = namers.get(locale);
  if (namer === undefined) {
    try {
      namer = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
        ? new Intl.DisplayNames([locale], { type: 'language' })
        : null;
    } catch {
      namer = null;
    }
    namers.set(locale, namer);
  }
  try {
    const named = namer?.of(code);
    // An unknown code comes back as itself; the English name is better than that.
    return named && named !== code ? named : english;
  } catch {
    return english;
  }
}

const ENGLISH_NAMES = new Map(LANGUAGES);

/** Old free-text entries ("Arabic, English") map back to codes where they can. */
export function languageCodeFor(value: string): string | undefined {
  const needle = value.trim().toLowerCase();
  if (ENGLISH_NAMES.has(needle)) return needle;
  for (const [code, english] of LANGUAGES) {
    if (english.toLowerCase() === needle || english.toLowerCase().startsWith(`${needle} (`)) return code;
  }
  return undefined;
}

const OPTIONS: CatalogOption[] = [...LANGUAGES]
  .sort((a, b) => a[1].localeCompare(b[1]))
  .map(([code, english]) => ({ id: code, en: english, ar: english, language: code }));

export const LANGUAGE_GROUPS: readonly CatalogGroup[] = [
  { id: 'languages', en: 'Languages', ar: 'اللغات', language: 'mul', options: OPTIONS },
];
