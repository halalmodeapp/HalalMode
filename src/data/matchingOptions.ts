import type { Gender } from '../types';
import type { CatalogGroup, CatalogOption } from './catalogOption';

/**
 * Option lists for the Premium filters and the matching answers on a profile.
 * The ids must match the checks in migration 0171.
 */

type Langs = NonNullable<CatalogOption['t']>;
const O = (id: string, en: string, ar: string, t: Langs): CatalogOption => ({ id, en, ar, t });

export const ETHNICITY_OPTIONS: CatalogOption[] = [
  O('arab', 'Arab', 'عربي', { ur: 'عرب', fa: 'عرب', hi: 'अरब', id: 'Arab', ms: 'Arab', bn: 'আরব', fr: 'Arabe', tr: 'Arap', ha: 'Balarabe', am: 'ዐረብ', so: 'Carab', es: 'Árabe', ru: 'Араб', 'zh-Hans': '阿拉伯裔' }),
  O('south_asian', 'South Asian', 'جنوب آسيوي', { ur: 'جنوبی ایشیائی', fa: 'جنوب آسیایی', hi: 'दक्षिण एशियाई', id: 'Asia Selatan', ms: 'Asia Selatan', bn: 'দক্ষিণ এশীয়', fr: 'Sud-asiatique', tr: 'Güney Asyalı', ha: 'Kudancin Asiya', am: 'ደቡብ እስያዊ', so: 'Koonfur Aasiya', es: 'Surasiático', ru: 'Южноазиат', 'zh-Hans': '南亚裔' }),
  O('southeast_asian', 'Southeast Asian', 'جنوب شرق آسيوي', { ur: 'جنوب مشرقی ایشیائی', fa: 'جنوب شرق آسیایی', hi: 'दक्षिण-पूर्व एशियाई', id: 'Asia Tenggara', ms: 'Asia Tenggara', bn: 'দক্ষিণ-পূর্ব এশীয়', fr: 'Asiatique du Sud-Est', tr: 'Güneydoğu Asyalı', ha: 'Kudu maso gabashin Asiya', am: 'ደቡብ ምሥራቅ እስያዊ', so: 'Koonfur-bari Aasiya', es: 'Del sudeste asiático', ru: 'Из Юго-Восточной Азии', 'zh-Hans': '东南亚裔' }),
  O('east_asian', 'East Asian', 'شرق آسيوي', { ur: 'مشرقی ایشیائی', fa: 'شرق آسیایی', hi: 'पूर्वी एशियाई', id: 'Asia Timur', ms: 'Asia Timur', bn: 'পূর্ব এশীয়', fr: 'Asiatique de l’Est', tr: 'Doğu Asyalı', ha: 'Gabashin Asiya', am: 'ምሥራቅ እስያዊ', so: 'Bariga Aasiya', es: 'Asiático oriental', ru: 'Восточноазиат', 'zh-Hans': '东亚裔' }),
  O('central_asian', 'Central Asian', 'آسيا الوسطى', { ur: 'وسطی ایشیائی', fa: 'آسیای میانه', hi: 'मध्य एशियाई', id: 'Asia Tengah', ms: 'Asia Tengah', bn: 'মধ্য এশীয়', fr: 'Asiatique centrale', tr: 'Orta Asyalı', ha: 'Tsakiyar Asiya', am: 'መካከለኛ እስያዊ', so: 'Bartamaha Aasiya', es: 'Asiático central', ru: 'Из Центральной Азии', 'zh-Hans': '中亚裔' }),
  O('persian', 'Persian', 'فارسي', { ur: 'فارسی', fa: 'فارس', hi: 'फ़ारसी', id: 'Persia', ms: 'Parsi', bn: 'পারস্য', fr: 'Persan', tr: 'Fars', ha: 'Farisa', am: 'ፋርስ', so: 'Faaris', es: 'Persa', ru: 'Перс', 'zh-Hans': '波斯裔' }),
  O('turkish', 'Turkish', 'تركي', { ur: 'ترک', fa: 'ترک', hi: 'तुर्क', id: 'Turki', ms: 'Turki', bn: 'তুর্কি', fr: 'Turc', tr: 'Türk', ha: 'Baturke', am: 'ቱርክ', so: 'Turki', es: 'Turco', ru: 'Турок', 'zh-Hans': '土耳其裔' }),
  O('kurdish', 'Kurdish', 'كردي', { ur: 'کرد', fa: 'کرد', hi: 'कुर्द', id: 'Kurdi', ms: 'Kurdi', bn: 'কুর্দি', fr: 'Kurde', tr: 'Kürt', ha: 'Kurdawa', am: 'ኩርድ', so: 'Kurdi', es: 'Kurdo', ru: 'Курд', 'zh-Hans': '库尔德裔' }),
  O('amazigh', 'Amazigh (Berber)', 'أمازيغي', { ur: 'امازیغ (بربر)', fa: 'آمازیغ (بربر)', hi: 'अमाज़िघ (बर्बर)', id: 'Amazigh (Berber)', ms: 'Amazigh (Berber)', bn: 'আমাজিগ (বার্বার)', fr: 'Amazigh (berbère)', tr: 'Amazig (Berberi)', ha: 'Amazigh (Barbar)', am: 'አማዚግ (በርበር)', so: 'Amazigh (Berber)', es: 'Amazigh (bereber)', ru: 'Амазиг (бербер)', 'zh-Hans': '阿马齐格（柏柏尔）裔' }),
  O('black_african', 'Black African', 'أفريقي أسود', { ur: 'سیاہ فام افریقی', fa: 'آفریقایی سیاه‌پوست', hi: 'अश्वेत अफ़्रीकी', id: 'Afrika berkulit hitam', ms: 'Afrika berkulit hitam', bn: 'কৃষ্ণাঙ্গ আফ্রিকান', fr: 'Africain noir', tr: 'Siyahi Afrikalı', ha: 'Baƙar fata ɗan Afirka', am: 'ጥቁር አፍሪካዊ', so: 'Afrikaan madow', es: 'Africano negro', ru: 'Чернокожий африканец', 'zh-Hans': '非洲黑人' }),
  O('african_caribbean', 'African Caribbean', 'كاريبي من أصل أفريقي', { ur: 'افریقی کیریبین', fa: 'کارائیبی آفریقایی‌تبار', hi: 'अफ़्रीकी कैरिबियाई', id: 'Afrika Karibia', ms: 'Afrika Caribbean', bn: 'আফ্রিকান ক্যারিবিয়ান', fr: 'Afro-caribéen', tr: 'Afrika kökenli Karayipli', ha: 'Ɗan Afirka na Caribbean', am: 'አፍሪካዊ ካሪቢያን', so: 'Afrikaan Kariibiyaan', es: 'Afrocaribeño', ru: 'Афрокарибец', 'zh-Hans': '非裔加勒比人' }),
  O('white', 'White', 'أبيض', { ur: 'سفید فام', fa: 'سفیدپوست', hi: 'श्वेत', id: 'Kulit putih', ms: 'Kulit putih', bn: 'শ্বেতাঙ্গ', fr: 'Blanc', tr: 'Beyaz', ha: 'Farar fata', am: 'ነጭ', so: 'Caddaan', es: 'Blanco', ru: 'Белый', 'zh-Hans': '白人' }),
  O('hispanic_latino', 'Hispanic or Latino', 'لاتيني', { ur: 'ہسپانوی یا لاطینی', fa: 'اسپانیایی‌تبار یا لاتین', hi: 'हिस्पैनिक या लैटिनो', id: 'Hispanik atau Latin', ms: 'Hispanik atau Latin', bn: 'হিস্পানিক বা লাতিনো', fr: 'Hispanique ou latino', tr: 'Hispanik veya Latin', ha: 'Hispanic ko Latino', am: 'ሂስፓኒክ ወይም ላቲኖ', so: 'Hisbaanik ama Laatiino', es: 'Hispano o latino', ru: 'Латиноамериканец', 'zh-Hans': '西班牙裔或拉丁裔' }),
  O('mixed', 'Mixed', 'مختلط', { ur: 'مخلوط', fa: 'دورگه', hi: 'मिश्रित', id: 'Campuran', ms: 'Campuran', bn: 'মিশ্র', fr: 'Métis', tr: 'Karma', ha: 'Gauraye', am: 'ቅይጥ', so: 'Isku-dhaf', es: 'Mixto', ru: 'Смешанное', 'zh-Hans': '混血' }),
  O('other', 'Other', 'أخرى', { ur: 'دیگر', fa: 'دیگر', hi: 'अन्य', id: 'Lainnya', ms: 'Lain-lain', bn: 'অন্যান্য', fr: 'Autre', tr: 'Diğer', ha: 'Wani', am: 'ሌላ', so: 'Kale', es: 'Otro', ru: 'Другое', 'zh-Hans': '其他' }),
];

const UNSTATED = O('prefer_not_to_say', 'Prefer not to say', 'أفضل عدم الإفصاح', { ur: 'بتانا نہیں چاہتا', fa: 'ترجیح می‌دهم نگویم', hi: 'नहीं बताना चाहते', id: 'Memilih tidak menyebutkan', ms: 'Memilih untuk tidak menyatakan', bn: 'বলতে চাই না', fr: 'Je préfère ne pas le dire', tr: 'Belirtmek istemiyorum', ha: 'Na fi son kada in faɗa', am: 'መናገር አልፈልግም', so: 'Ma doonayo inaan sheego', es: 'Prefiero no decirlo', ru: 'Предпочитаю не указывать', 'zh-Hans': '不愿透露' });

const NO_DRESS = O('no_religious_dress', 'No religious dress', 'بلا لباس ديني', { ur: 'کوئی مذہبی لباس نہیں', fa: 'بدون پوشش مذهبی', hi: 'कोई धार्मिक पहनावा नहीं', id: 'Tidak berpakaian religius', ms: 'Tiada pakaian keagamaan', bn: 'কোনো ধর্মীয় পোশাক নয়', fr: 'Pas de tenue religieuse', tr: 'Dini kıyafet yok', ha: 'Babu suturar addini', am: 'ሃይማኖታዊ አለባበስ የለም', so: 'Dhar diimeed ma leh', es: 'Sin vestimenta religiosa', ru: 'Без религиозной одежды', 'zh-Hans': '不穿宗教服饰' });

/** Women's options. */
export const DRESS_FEMALE: CatalogOption[] = [
  O('niqab', 'Niqab', 'نقاب', { ur: 'نقاب', fa: 'نقاب', hi: 'नक़ाब', id: 'Cadar (niqab)', ms: 'Purdah (niqab)', bn: 'নিকাব', fr: 'Niqab', tr: 'Peçe (nikap)', ha: 'Nikabi', am: 'ኒቃብ', so: 'Niqaab', es: 'Niqab', ru: 'Никаб', 'zh-Hans': '面纱（尼卡布）' }),
  O('hijab', 'Hijab', 'حجاب', { ur: 'حجاب', fa: 'حجاب', hi: 'हिजाब', id: 'Hijab', ms: 'Tudung', bn: 'হিজাব', fr: 'Hijab', tr: 'Başörtüsü', ha: 'Hijabi', am: 'ሂጃብ', so: 'Xijaab', es: 'Hiyab', ru: 'Хиджаб', 'zh-Hans': '头巾（希贾布）' }),
  O('modest', 'Modest dress, no hijab', 'لباس محتشم دون حجاب', { ur: 'باحیا لباس، حجاب کے بغیر', fa: 'پوشش ساده، بدون حجاب', hi: 'शालीन पहनावा, बिना हिजाब', id: 'Berpakaian sopan, tanpa hijab', ms: 'Berpakaian sopan, tanpa tudung', bn: 'শালীন পোশাক, হিজাব ছাড়া', fr: 'Tenue pudique, sans hijab', tr: 'Tesettürsüz, kapalı giyim', ha: 'Sutura mai kamun kai, babu hijabi', am: 'ጨዋ አለባበስ፣ ያለ ሂጃብ', so: 'Dhar edeb leh, xijaab la’aan', es: 'Vestimenta modesta, sin hiyab', ru: 'Скромная одежда, без хиджаба', 'zh-Hans': '端庄着装，不戴头巾' }),
  NO_DRESS,
];

/** Men's options. */
export const DRESS_MALE: CatalogOption[] = [
  O('full_beard', 'Full beard', 'لحية كاملة', { ur: 'پوری داڑھی', fa: 'ریش کامل', hi: 'पूरी दाढ़ी', id: 'Janggut penuh', ms: 'Janggut penuh', bn: 'পূর্ণ দাড়ি', fr: 'Barbe complète', tr: 'Tam sakal', ha: 'Cikakken gemu', am: 'ሙሉ ጺም', so: 'Gadh buuxa', es: 'Barba completa', ru: 'Полная борода', 'zh-Hans': '留全须' }),
  O('trimmed_beard', 'Trimmed beard', 'لحية مشذبة', { ur: 'تراشی ہوئی داڑھی', fa: 'ریش کوتاه', hi: 'छँटी हुई दाढ़ी', id: 'Janggut dirapikan', ms: 'Janggut dirapikan', bn: 'ছাঁটা দাড়ি', fr: 'Barbe taillée', tr: 'Kısa sakal', ha: 'Gemu da aka gyara', am: 'የተከረከመ ጺም', so: 'Gadh la jaray', es: 'Barba recortada', ru: 'Короткая борода', 'zh-Hans': '修剪胡须' }),
  O('traditional_dress', 'Wears traditional dress (e.g. thobe, kufi)', 'يرتدي لباسًا تقليديًا (كالثوب والطاقية)', { ur: 'روایتی لباس (جیسے جبہ، ٹوپی)', fa: 'لباس سنتی (مانند پیراهن بلند، عرقچین)', hi: 'पारंपरिक पहनावा (जैसे थोब, टोपी)', id: 'Berpakaian tradisional (mis. gamis, peci)', ms: 'Berpakaian tradisional (cth. jubah, kopiah)', bn: 'ঐতিহ্যবাহী পোশাক (যেমন জুব্বা, টুপি)', fr: 'Tenue traditionnelle (ex. qamis, kufi)', tr: 'Geleneksel kıyafet (ör. cübbe, takke)', ha: 'Sutura ta gargajiya (misali jallabiya, hula)', am: 'ባህላዊ አለባበስ (ለምሳሌ ጀለቢያ፣ ቆብ)', so: 'Dhar dhaqameed (tus. khamiis, koofiyad)', es: 'Ropa tradicional (p. ej., zobe, kufi)', ru: 'Традиционная одежда (напр. тоб, тюбетейка)', 'zh-Hans': '穿传统服饰（如长袍、礼拜帽）' }),
  NO_DRESS,
];

export function dressOptions(gender: Gender | undefined): CatalogOption[] {
  return gender === 'female' ? DRESS_FEMALE : DRESS_MALE;
}

export const HAS_CHILDREN_OPTIONS: CatalogOption[] = [
  O('no', 'No children', 'لا يوجد أطفال', { ur: 'کوئی اولاد نہیں', fa: 'بدون فرزند', hi: 'कोई संतान नहीं', id: 'Belum punya anak', ms: 'Tiada anak', bn: 'সন্তান নেই', fr: 'Pas d’enfants', tr: 'Çocuğu yok', ha: 'Babu yara', am: 'ልጅ የለም', so: 'Carruur ma leh', es: 'Sin hijos', ru: 'Нет детей', 'zh-Hans': '没有孩子' }),
  O('yes', 'Has children', 'لديه أطفال', { ur: 'اولاد ہے', fa: 'دارای فرزند', hi: 'संतान है', id: 'Sudah punya anak', ms: 'Ada anak', bn: 'সন্তান আছে', fr: 'A des enfants', tr: 'Çocuğu var', ha: 'Yana da yara', am: 'ልጅ አለው/አላት', so: 'Carruur leh', es: 'Tiene hijos', ru: 'Есть дети', 'zh-Hans': '有孩子' }),
];

/** On a profile, "prefer not to say" is a real answer; in a filter it is not offered. */
export const HAS_CHILDREN_PROFILE: CatalogOption[] = [...HAS_CHILDREN_OPTIONS, UNSTATED];
export const ETHNICITY_PROFILE: CatalogOption[] = [...ETHNICITY_OPTIONS, UNSTATED];

/** A flat list as a single picker group, labelled with the field's own title. */
export function asGroups(title: string, options: CatalogOption[]): CatalogGroup[] {
  return [{ id: 'all', en: title, ar: title, t: {}, options }];
}
