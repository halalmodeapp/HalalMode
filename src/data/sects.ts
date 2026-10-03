import type { Sect } from '../types';
import type { CatalogGroup, CatalogOption } from './catalogOption';

type Names = { en: string; ar: string; t: CatalogOption['t'] };

/**
 * Sect, with its major schools of law (madhhabs) under it.
 *
 * Choosing the group itself ("Sunni") is a full answer; the madhhab beneath it
 * is optional detail. Only the large schools are listed — madhhabs, not
 * movements, so no Salafi, Sufi, Deobandi and the like. The ids must match
 * `public.sect_of_detail` (migration 0156).
 */
const N = (en: string, ar: string, t: NonNullable<CatalogOption['t']>): Names => ({ en, ar, t });

const SUNNI = N('Sunni', 'سني', { ur: 'سنی', fa: 'سنی', hi: 'सुन्नी', id: 'Sunni', ms: 'Sunni', bn: 'সুন্নি', fr: 'Sunnite', tr: 'Sünni', ha: 'Sunni', am: 'ሱኒ', so: 'Sunni', es: 'Suní', ru: 'Суннит', 'zh-Hans': '逊尼派' });
const SHIA = N('Shia', 'شيعي', { ur: 'شیعہ', fa: 'شیعه', hi: 'शिया', id: 'Syiah', ms: 'Syiah', bn: 'শিয়া', fr: 'Chiite', tr: 'Şii', ha: 'Shi’a', am: 'ሺዓ', so: 'Shiico', es: 'Chií', ru: 'Шиит', 'zh-Hans': '什叶派' });
const OTHER = N('Other', 'أخرى', { ur: 'دیگر', fa: 'دیگر', hi: 'अन्य', id: 'Lainnya', ms: 'Lain-lain', bn: 'অন্যান্য', fr: 'Autre', tr: 'Diğer', ha: 'Wani', am: 'ሌላ', so: 'Kale', es: 'Otro', ru: 'Другое', 'zh-Hans': '其他' });

const DETAILS: Record<Exclude<Sect, 'prefer_not_to_say'>, [string, Names][]> = {
  sunni: [
    ['hanafi', N('Hanafi', 'حنفي', { ur: 'حنفی', fa: 'حنفی', hi: 'हनफ़ी', id: 'Hanafi', ms: 'Hanafi', bn: 'হানাফি', fr: 'Hanafite', tr: 'Hanefi', ha: 'Hanafi', am: 'ሐነፊ', so: 'Xanafi', es: 'Hanafí', ru: 'Ханафит', 'zh-Hans': '哈乃斐派' })],
    ['maliki', N('Maliki', 'مالكي', { ur: 'مالکی', fa: 'مالکی', hi: 'मालिकी', id: 'Maliki', ms: 'Maliki', bn: 'মালিকি', fr: 'Malikite', tr: 'Maliki', ha: 'Maliki', am: 'ማሊኪ', so: 'Maaliki', es: 'Malikí', ru: 'Маликит', 'zh-Hans': '马立克派' })],
    ['shafii', N('Shafi‘i', 'شافعي', { ur: 'شافعی', fa: 'شافعی', hi: 'शाफ़ई', id: 'Syafi’i', ms: 'Syafie', bn: 'শাফেয়ি', fr: 'Chaféite', tr: 'Şafii', ha: 'Shafi’i', am: 'ሻፊዒ', so: 'Shaafici', es: 'Shafií', ru: 'Шафиит', 'zh-Hans': '沙斐仪派' })],
    ['hanbali', N('Hanbali', 'حنبلي', { ur: 'حنبلی', fa: 'حنبلی', hi: 'हंबली', id: 'Hanbali', ms: 'Hanbali', bn: 'হাম্বলি', fr: 'Hanbalite', tr: 'Hanbeli', ha: 'Hanbali', am: 'ሐንበሊ', so: 'Xanbali', es: 'Hanbalí', ru: 'Ханбалит', 'zh-Hans': '罕百里派' })],
  ],
  shia: [
    ['twelver', N('Ja‘fari', 'جعفري', { ur: 'جعفری', fa: 'جعفری', hi: 'जाफ़री', id: 'Ja’fari', ms: 'Ja’fari', bn: 'জাফরি', fr: 'Jafarite', tr: 'Caferi', ha: 'Ja’fari', am: 'ጃዕፈሪ', so: 'Jacfari', es: 'Yafarí', ru: 'Джафарит', 'zh-Hans': '贾法里派' })],
  ],
  other: [],
};

const GROUP_NAMES = { sunni: SUNNI, shia: SHIA, other: OTHER } as const;

/**
 * Each group lists itself first ("Sunni — any") so the broad answer is one
 * tap, then its traditions. An id is either a Sect or a detail id.
 */
export const SECT_GROUPS: readonly CatalogGroup[] = (Object.keys(DETAILS) as (keyof typeof DETAILS)[]).map((sect) => ({
  id: `group:${sect}`,
  ...GROUP_NAMES[sect],
  options: [
    { id: sect, ...GROUP_NAMES[sect] },
    ...DETAILS[sect].map(([id, names]) => ({ id, ...names, nested: true })),
  ],
}));

/** The sect a stored id belongs to, whether it is the sect itself or a tradition under it. */
export function sectOf(id: string): Exclude<Sect, 'prefer_not_to_say'> | undefined {
  if (id === 'sunni' || id === 'shia' || id === 'other') return id;
  for (const sect of Object.keys(DETAILS) as (keyof typeof DETAILS)[]) {
    if (DETAILS[sect].some(([detail]) => detail === id)) return sect;
  }
  return undefined;
}

export function isSectDetail(id: string): boolean {
  return id !== 'sunni' && id !== 'shia' && id !== 'other' && sectOf(id) !== undefined;
}
