import type { Sect } from '../types';
import type { CatalogGroup, CatalogOption } from './catalogOption';

type Names = { en: string; ar: string; t: CatalogOption['t'] };

/**
 * Sect, with the commonly named schools and traditions under it.
 *
 * Choosing the group itself ("Sunni") is a full answer; the entries beneath it
 * are optional detail. Kept to what most Muslims would recognise as mainstream
 * practice — no attempt to list every movement. The ids must match
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
    ['salafi', N('Salafi', 'سلفي', { ur: 'سلفی', fa: 'سلفی', hi: 'सलफ़ी', id: 'Salafi', ms: 'Salafi', bn: 'সালাফি', fr: 'Salafi', tr: 'Selefi', ha: 'Salafi', am: 'ሰለፊ', so: 'Salafi', es: 'Salafí', ru: 'Салафит', 'zh-Hans': '萨拉菲' })],
    ['sufi', N('Sufi', 'صوفي', { ur: 'صوفی', fa: 'صوفی', hi: 'सूफ़ी', id: 'Sufi', ms: 'Sufi', bn: 'সুফি', fr: 'Soufi', tr: 'Sufi', ha: 'Sufi', am: 'ሱፊ', so: 'Suufi', es: 'Sufí', ru: 'Суфий', 'zh-Hans': '苏菲' })],
    ['deobandi', N('Deobandi', 'ديوبندي', { ur: 'دیوبندی', fa: 'دیوبندی', hi: 'देवबंदी', id: 'Deobandi', ms: 'Deobandi', bn: 'দেওবন্দি', fr: 'Deobandi', tr: 'Diyobendi', ha: 'Deobandi', am: 'ዴኦባንዲ', so: 'Deobandi', es: 'Deobandi', ru: 'Деобанди', 'zh-Hans': '迪奥班迪' })],
    ['barelvi', N('Barelvi', 'بريلوي', { ur: 'بریلوی', fa: 'بریلوی', hi: 'बरेलवी', id: 'Barelvi', ms: 'Barelvi', bn: 'বেরেলভি', fr: 'Barelvi', tr: 'Barelvi', ha: 'Barelvi', am: 'ባሬልቪ', so: 'Barelvi', es: 'Barelvi', ru: 'Барелви', 'zh-Hans': '巴雷尔维' })],
  ],
  shia: [
    ['twelver', N('Twelver (Ja‘fari)', 'اثنا عشري (جعفري)', { ur: 'اثنا عشری (جعفری)', fa: 'اثنی‌عشری (جعفری)', hi: 'इसना अशरी (जाफ़री)', id: 'Dua Belas Imam (Ja’fari)', ms: 'Dua Belas Imam (Ja’fari)', bn: 'ইসনা আশারি (জাফরি)', fr: 'Duodécimain (jafarite)', tr: 'İsna Aşeriyye (Caferi)', ha: 'Imamai Goma Sha Biyu (Ja’fari)', am: 'ኢስና ዐሸሪ (ጃዕፈሪ)', so: 'Laba-iyo-tobanle (Jacfari)', es: 'Duodecimano (yafarí)', ru: 'Двунадесятник (джафарит)', 'zh-Hans': '十二伊玛目派（贾法里）' })],
    ['zaydi', N('Zaydi', 'زيدي', { ur: 'زیدی', fa: 'زیدی', hi: 'ज़ैदी', id: 'Zaidi', ms: 'Zaidi', bn: 'জায়েদি', fr: 'Zaydite', tr: 'Zeydi', ha: 'Zaidi', am: 'ዘይዲ', so: 'Zaydi', es: 'Zaidí', ru: 'Зейдит', 'zh-Hans': '宰德派' })],
  ],
  other: [
    ['just_muslim', N('Just Muslim', 'مسلم فقط', { ur: 'صرف مسلمان', fa: 'فقط مسلمان', hi: 'बस मुसलमान', id: 'Muslim saja', ms: 'Muslim sahaja', bn: 'শুধু মুসলিম', fr: 'Simplement musulman', tr: 'Sadece Müslüman', ha: 'Musulmi kawai', am: 'ሙስሊም ብቻ', so: 'Muslim kaliya', es: 'Solo musulmán', ru: 'Просто мусульманин', 'zh-Hans': '只是穆斯林' })],
    ['ibadi', N('Ibadi', 'إباضي', { ur: 'اباضی', fa: 'اباضی', hi: 'इबादी', id: 'Ibadi', ms: 'Ibadi', bn: 'ইবাদি', fr: 'Ibadite', tr: 'İbadi', ha: 'Ibadi', am: 'ኢባዲ', so: 'Ibaadi', es: 'Ibadí', ru: 'Ибадит', 'zh-Hans': '伊巴德派' })],
  ],
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
    ...DETAILS[sect].map(([id, names]) => ({ id, ...names })),
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
