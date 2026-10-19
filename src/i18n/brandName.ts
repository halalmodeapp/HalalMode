/** Phonetic brand spellings for written copy. The graphic wordmark stays English. */
const BRAND_NAMES = {
  en: 'Halal Mode',
  ar: 'حلال مود',
  ur: 'حلال موڈ',
  fa: 'حلال مود',
  hi: 'हलाल मोड',
  id: 'Halal Mode',
  ms: 'Halal Mode',
  bn: 'হালাল মোড',
  fr: 'Halal Mode',
  tr: 'Halal Mode',
  ha: 'Halal Mode',
  am: 'ሃላል ሞድ',
  so: 'Halal Mode',
  es: 'Halal Mode',
  ru: 'Халал Мод',
  'zh-Hans': '哈拉尔·莫德',
} as const;

export type BrandNameLocale = keyof typeof BRAND_NAMES;

const PREMIUM_WORDS: Record<BrandNameLocale, string> = {
  en: 'Premium',
  ar: 'بريميوم',
  ur: 'پریمیم',
  fa: 'پریمیوم',
  hi: 'प्रीमियम',
  id: 'Premium',
  ms: 'Premium',
  bn: 'প্রিমিয়াম',
  fr: 'Premium',
  tr: 'Premium',
  ha: 'Premium',
  am: 'ፕሪሚየም',
  so: 'Premium',
  es: 'Premium',
  ru: 'Премиум',
  'zh-Hans': '普瑞米姆',
};

/** Returns a locally pronounceable spelling without translating the brand. */
export function brandNameFor(locale: BrandNameLocale): string {
  return BRAND_NAMES[locale];
}

/** Phonetic suffix used beside the English wordmark in the Premium lockup. */
export function premiumWordFor(locale: BrandNameLocale): string {
  return PREMIUM_WORDS[locale];
}
