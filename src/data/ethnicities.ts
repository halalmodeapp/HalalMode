import type { CatalogGroup, CatalogOption } from './catalogOption';
import { ETHNICITY_OPTIONS, UNSTATED } from './matchingOptions';

/**
 * Ethnicity and origin, generated with migration 0174 so the ids always match
 * `public.ethnicity_region`. Each broad group can be chosen on its own, and
 * lists the specific ethnicities and origins under it. A filter on a group
 * includes everyone who chose something under it.
 */
const BROAD: Record<string, CatalogOption> = Object.fromEntries(ETHNICITY_OPTIONS.map((o) => [o.id, o]));

const NEW_BROAD: Record<string, CatalogOption> = {
  north_caucasian: { id: "north_caucasian", en: "North Caucasian", ar: "شمال قوقازي", t: { ur: "شمالی قفقازی", fa: "قفقاز شمالی", hi: "उत्तरी कॉकेशियाई", id: "Kaukasus Utara", ms: "Kaukasus Utara", bn: "উত্তর ককেশীয়", fr: "Caucasien du Nord", tr: "Kuzey Kafkasyalı", ha: "Arewacin Caucasus", am: "ሰሜን ካውካሳዊ", so: "Waqooyiga Kawkaas", es: "Norcaucásico", ru: "Северокавказец", "zh-Hans": "北高加索人" } },
};

const SPECIFIC: Record<string, CatalogOption[]> = {
  arab: [
    { id: "egyptian", en: "Egyptian", ar: "مصري", t: { ur: "مصری", fa: "مصری", hi: "मिस्री", id: "Mesir", ms: "Mesir", bn: "মিশরীয়", fr: "Égyptien", tr: "Mısırlı", ha: "Bamasare", am: "ግብፃዊ", so: "Masaari", es: "Egipcio", ru: "Египтянин", "zh-Hans": "埃及裔" }, nested: true },
    { id: "moroccan", en: "Moroccan", ar: "مغربي", t: { ur: "مراکشی", fa: "مراکشی", hi: "मोरक्कन", id: "Maroko", ms: "Maghribi", bn: "মরক্কান", fr: "Marocain", tr: "Faslı", ha: "Bamoroko", am: "ሞሮኳዊ", so: "Marooko", es: "Marroquí", ru: "Марокканец", "zh-Hans": "摩洛哥裔" }, nested: true },
    { id: "algerian", en: "Algerian", ar: "جزائري", t: { ur: "الجزائری", fa: "الجزایری", hi: "अल्जीरियाई", id: "Aljazair", ms: "Algeria", bn: "আলজেরীয়", fr: "Algérien", tr: "Cezayirli", ha: "Baaljeriye", am: "አልጄሪያዊ", so: "Aljeeriya", es: "Argelino", ru: "Алжирец", "zh-Hans": "阿尔及利亚裔" }, nested: true },
    { id: "tunisian", en: "Tunisian", ar: "تونسي", t: { ur: "تیونسی", fa: "تونسی", hi: "ट्यूनीशियाई", id: "Tunisia", ms: "Tunisia", bn: "তিউনিসীয়", fr: "Tunisien", tr: "Tunuslu", ha: "Batunusiye", am: "ቱኒዚያዊ", so: "Tuniisiya", es: "Tunecino", ru: "Тунисец", "zh-Hans": "突尼斯裔" }, nested: true },
    { id: "libyan", en: "Libyan", ar: "ليبي", t: { ur: "لیبیائی", fa: "لیبیایی", hi: "लीबियाई", id: "Libya", ms: "Libya", bn: "লিবীয়", fr: "Libyen", tr: "Libyalı", ha: "Balibiye", am: "ሊቢያዊ", so: "Liibiya", es: "Libio", ru: "Ливиец", "zh-Hans": "利比亚裔" }, nested: true },
    { id: "sudanese", en: "Sudanese", ar: "سوداني", t: { ur: "سوڈانی", fa: "سودانی", hi: "सूडानी", id: "Sudan", ms: "Sudan", bn: "সুদানী", fr: "Soudanais", tr: "Sudanlı", ha: "Basudane", am: "ሱዳናዊ", so: "Suudaan", es: "Sudanés", ru: "Суданец", "zh-Hans": "苏丹裔" }, nested: true },
    { id: "mauritanian", en: "Mauritanian", ar: "موريتاني", t: { ur: "موریتانوی", fa: "موریتانیایی", hi: "मॉरिटानियाई", id: "Mauritania", ms: "Mauritania", bn: "মৌরিতানীয়", fr: "Mauritanien", tr: "Moritanyalı", ha: "Bamoritaniya", am: "ሞሪታኒያዊ", so: "Muritaaniya", es: "Mauritano", ru: "Мавританец", "zh-Hans": "毛里塔尼亚裔" }, nested: true },
    { id: "saudi", en: "Saudi", ar: "سعودي", t: { ur: "سعودی", fa: "سعودی", hi: "सऊदी", id: "Saudi", ms: "Saudi", bn: "সৌদি", fr: "Saoudien", tr: "Suudi", ha: "Basaudiye", am: "ሳዑዲ", so: "Sacuudi", es: "Saudí", ru: "Саудовец", "zh-Hans": "沙特裔" }, nested: true },
    { id: "emirati", en: "Emirati", ar: "إماراتي", t: { ur: "اماراتی", fa: "اماراتی", hi: "अमीराती", id: "Emirat", ms: "Emiriah", bn: "আমিরাতি", fr: "Émirien", tr: "Emirlik", ha: "Baemirati", am: "ኢሚሬቲ", so: "Imaaraati", es: "Emiratí", ru: "Эмиратец", "zh-Hans": "阿联酋裔" }, nested: true },
    { id: "kuwaiti", en: "Kuwaiti", ar: "كويتي", t: { ur: "کویتی", fa: "کویتی", hi: "कुवैती", id: "Kuwait", ms: "Kuwait", bn: "কুয়েতি", fr: "Koweïtien", tr: "Kuveytli", ha: "Bakuwaiti", am: "ኩዌቲ", so: "Kuweyti", es: "Kuwaití", ru: "Кувейтец", "zh-Hans": "科威特裔" }, nested: true },
    { id: "qatari", en: "Qatari", ar: "قطري", t: { ur: "قطری", fa: "قطری", hi: "क़तरी", id: "Qatar", ms: "Qatar", bn: "কাতারি", fr: "Qatarien", tr: "Katarlı", ha: "Baqatari", am: "ቀጣሪ", so: "Qadari", es: "Catarí", ru: "Катарец", "zh-Hans": "卡塔尔裔" }, nested: true },
    { id: "bahraini", en: "Bahraini", ar: "بحريني", t: { ur: "بحرینی", fa: "بحرینی", hi: "बहरीनी", id: "Bahrain", ms: "Bahrain", bn: "বাহরাইনি", fr: "Bahreïnien", tr: "Bahreynli", ha: "Babahraini", am: "ባሕሬይኒ", so: "Baxreyn", es: "Bareiní", ru: "Бахрейнец", "zh-Hans": "巴林裔" }, nested: true },
    { id: "omani", en: "Omani", ar: "عماني", t: { ur: "عمانی", fa: "عمانی", hi: "ओमानी", id: "Oman", ms: "Oman", bn: "ওমানি", fr: "Omanais", tr: "Ummanlı", ha: "Baomani", am: "ኦማኒ", so: "Cumaani", es: "Omaní", ru: "Оманец", "zh-Hans": "阿曼裔" }, nested: true },
    { id: "yemeni", en: "Yemeni", ar: "يمني", t: { ur: "یمنی", fa: "یمنی", hi: "यमनी", id: "Yaman", ms: "Yaman", bn: "ইয়েমেনি", fr: "Yéménite", tr: "Yemenli", ha: "Bayamane", am: "የመናዊ", so: "Yamani", es: "Yemení", ru: "Йеменец", "zh-Hans": "也门裔" }, nested: true },
    { id: "iraqi", en: "Iraqi", ar: "عراقي", t: { ur: "عراقی", fa: "عراقی", hi: "इराक़ी", id: "Irak", ms: "Iraq", bn: "ইরাকি", fr: "Irakien", tr: "Iraklı", ha: "Bairaki", am: "ኢራቃዊ", so: "Ciraaqi", es: "Iraquí", ru: "Иракец", "zh-Hans": "伊拉克裔" }, nested: true },
    { id: "syrian", en: "Syrian", ar: "سوري", t: { ur: "شامی", fa: "سوری", hi: "सीरियाई", id: "Suriah", ms: "Syria", bn: "সিরীয়", fr: "Syrien", tr: "Suriyeli", ha: "Basuriye", am: "ሶሪያዊ", so: "Suuri", es: "Sirio", ru: "Сириец", "zh-Hans": "叙利亚裔" }, nested: true },
    { id: "lebanese", en: "Lebanese", ar: "لبناني", t: { ur: "لبنانی", fa: "لبنانی", hi: "लेबनानी", id: "Lebanon", ms: "Lubnan", bn: "লেবানিজ", fr: "Libanais", tr: "Lübnanlı", ha: "Balebanon", am: "ሊባኖሳዊ", so: "Lubnaani", es: "Libanés", ru: "Ливанец", "zh-Hans": "黎巴嫩裔" }, nested: true },
    { id: "jordanian", en: "Jordanian", ar: "أردني", t: { ur: "اردنی", fa: "اردنی", hi: "जॉर्डनियन", id: "Yordania", ms: "Jordan", bn: "জর্ডানীয়", fr: "Jordanien", tr: "Ürdünlü", ha: "Bajordan", am: "ዮርዳኖሳዊ", so: "Urdun", es: "Jordano", ru: "Иорданец", "zh-Hans": "约旦裔" }, nested: true },
    { id: "palestinian", en: "Palestinian", ar: "فلسطيني", t: { ur: "فلسطینی", fa: "فلسطینی", hi: "फ़िलिस्तीनी", id: "Palestina", ms: "Palestin", bn: "ফিলিস্তিনি", fr: "Palestinien", tr: "Filistinli", ha: "Bafalasdine", am: "ፍልስጤማዊ", so: "Falastiini", es: "Palestino", ru: "Палестинец", "zh-Hans": "巴勒斯坦裔" }, nested: true },
  ],
  amazigh: [
    { id: "kabyle", en: "Kabyle", ar: "قبائلي", t: { ur: "قبائلی", fa: "قبایلی", hi: "काबिल", id: "Kabyle", ms: "Kabyle", bn: "কাবিল", fr: "Kabyle", tr: "Kabil", ha: "Kabyle", am: "ካቢል", so: "Kabaayil", es: "Cabileño", ru: "Кабил", "zh-Hans": "卡拜尔人" }, nested: true },
    { id: "riffian", en: "Riffian", ar: "ريفي", t: { ur: "ریفی", fa: "ریفی", hi: "रिफ़ी", id: "Rif", ms: "Rif", bn: "রিফি", fr: "Rifain", tr: "Rifli", ha: "Barife", am: "ሪፊ", so: "Riifi", es: "Rifeño", ru: "Риф", "zh-Hans": "里夫人" }, nested: true },
    { id: "shilha", en: "Chleuh (Shilha)", ar: "شلحي", t: { ur: "شلحہ", fa: "شلح", hi: "शिल्हा", id: "Shilha", ms: "Shilha", bn: "শিলহা", fr: "Chleuh", tr: "Şilha", ha: "Shilha", am: "ሺልሓ", so: "Shilxa", es: "Chleuh", ru: "Шильх", "zh-Hans": "希尔哈人" }, nested: true },
    { id: "tuareg", en: "Tuareg", ar: "طوارقي", t: { ur: "طوارق", fa: "توارگ", hi: "तुआरेग", id: "Tuareg", ms: "Tuareg", bn: "তুয়ারেগ", fr: "Touareg", tr: "Tuareg", ha: "Abzinawa", am: "ቱዋሬግ", so: "Tuwaareg", es: "Tuareg", ru: "Туарег", "zh-Hans": "图阿雷格人" }, nested: true },
  ],
  south_asian: [
    { id: "pakistani", en: "Pakistani", ar: "باكستاني", t: { ur: "پاکستانی", fa: "پاکستانی", hi: "पाकिस्तानी", id: "Pakistan", ms: "Pakistan", bn: "পাকিস্তানি", fr: "Pakistanais", tr: "Pakistanlı", ha: "Bapakistane", am: "ፓኪስታናዊ", so: "Bakistaani", es: "Pakistaní", ru: "Пакистанец", "zh-Hans": "巴基斯坦裔" }, nested: true },
    { id: "indian", en: "Indian", ar: "هندي", t: { ur: "ہندوستانی", fa: "هندی", hi: "भारतीय", id: "India", ms: "India", bn: "ভারতীয়", fr: "Indien", tr: "Hintli", ha: "Baindiye", am: "ሕንዳዊ", so: "Hindi", es: "Indio", ru: "Индиец", "zh-Hans": "印度裔" }, nested: true },
    { id: "bangladeshi", en: "Bangladeshi", ar: "بنغلاديشي", t: { ur: "بنگلہ دیشی", fa: "بنگلادشی", hi: "बांग्लादेशी", id: "Bangladesh", ms: "Bangladesh", bn: "বাংলাদেশি", fr: "Bangladais", tr: "Bangladeşli", ha: "Babangaladash", am: "ባንግላዲሻዊ", so: "Bangaaladheeshi", es: "Bangladesí", ru: "Бангладешец", "zh-Hans": "孟加拉国裔" }, nested: true },
    { id: "sri_lankan", en: "Sri Lankan", ar: "سريلانكي", t: { ur: "سری لنکن", fa: "سریلانکایی", hi: "श्रीलंकाई", id: "Sri Lanka", ms: "Sri Lanka", bn: "শ্রীলঙ্কান", fr: "Sri-Lankais", tr: "Sri Lankalı", ha: "Basirilanka", am: "ሲሪላንካዊ", so: "Sirilaanka", es: "Esrilanqués", ru: "Шриланкиец", "zh-Hans": "斯里兰卡裔" }, nested: true },
    { id: "maldivian", en: "Maldivian", ar: "مالديفي", t: { ur: "مالدیپی", fa: "مالدیوی", hi: "मालदीवी", id: "Maladewa", ms: "Maldives", bn: "মালদ্বীপী", fr: "Maldivien", tr: "Maldivli", ha: "Bamaldibiya", am: "ማልዲቫዊ", so: "Maldiifi", es: "Maldivo", ru: "Мальдивец", "zh-Hans": "马尔代夫裔" }, nested: true },
    { id: "nepali", en: "Nepali", ar: "نيبالي", t: { ur: "نیپالی", fa: "نپالی", hi: "नेपाली", id: "Nepal", ms: "Nepal", bn: "নেপালি", fr: "Népalais", tr: "Nepalli", ha: "Banepal", am: "ኔፓላዊ", so: "Nebaali", es: "Nepalí", ru: "Непалец", "zh-Hans": "尼泊尔裔" }, nested: true },
    { id: "punjabi", en: "Punjabi", ar: "بنجابي", t: { ur: "پنجابی", fa: "پنجابی", hi: "पंजाबी", id: "Punjabi", ms: "Punjabi", bn: "পাঞ্জাবি", fr: "Pendjabi", tr: "Pencaplı", ha: "Bapunjabi", am: "ፑንጃቢ", so: "Bunjaabi", es: "Panyabí", ru: "Пенджабец", "zh-Hans": "旁遮普人" }, nested: true },
    { id: "sindhi", en: "Sindhi", ar: "سندي", t: { ur: "سندھی", fa: "سندی", hi: "सिंधी", id: "Sindhi", ms: "Sindhi", bn: "সিন্ধি", fr: "Sindhi", tr: "Sindli", ha: "Basindhi", am: "ሲንዲ", so: "Sindhi", es: "Sindhi", ru: "Синдх", "zh-Hans": "信德人" }, nested: true },
    { id: "pashtun", en: "Pashtun", ar: "بشتوني", t: { ur: "پشتون", fa: "پشتون", hi: "पश्तून", id: "Pashtun", ms: "Pashtun", bn: "পশতুন", fr: "Pachtoune", tr: "Peştun", ha: "Bapashtun", am: "ፓሽቱን", so: "Bashtuun", es: "Pastún", ru: "Пуштун", "zh-Hans": "普什图人" }, nested: true },
    { id: "baloch", en: "Baloch", ar: "بلوشي", t: { ur: "بلوچ", fa: "بلوچ", hi: "बलूच", id: "Baloch", ms: "Baloch", bn: "বেলুচ", fr: "Baloutche", tr: "Beluç", ha: "Baloch", am: "ባሉች", so: "Baluush", es: "Baluchi", ru: "Белудж", "zh-Hans": "俾路支人" }, nested: true },
    { id: "kashmiri", en: "Kashmiri", ar: "كشميري", t: { ur: "کشمیری", fa: "کشمیری", hi: "कश्मीरी", id: "Kashmir", ms: "Kashmir", bn: "কাশ্মীরি", fr: "Cachemiri", tr: "Keşmirli", ha: "Bakashmiri", am: "ካሽሚሪ", so: "Kashmiiri", es: "Cachemir", ru: "Кашмирец", "zh-Hans": "克什米尔人" }, nested: true },
    { id: "gujarati", en: "Gujarati", ar: "غوجاراتي", t: { ur: "گجراتی", fa: "گجراتی", hi: "गुजराती", id: "Gujarat", ms: "Gujerat", bn: "গুজরাটি", fr: "Gujarati", tr: "Gucaratlı", ha: "Bagujarati", am: "ጉጃራቲ", so: "Gujaraati", es: "Guyaratí", ru: "Гуджаратец", "zh-Hans": "古吉拉特人" }, nested: true },
  ],
  persian: [
    { id: "iranian", en: "Iranian", ar: "إيراني", t: { ur: "ایرانی", fa: "ایرانی", hi: "ईरानी", id: "Iran", ms: "Iran", bn: "ইরানি", fr: "Iranien", tr: "İranlı", ha: "Bairane", am: "ኢራናዊ", so: "Iiraani", es: "Iraní", ru: "Иранец", "zh-Hans": "伊朗裔" }, nested: true },
    { id: "tajik", en: "Tajik", ar: "طاجيكي", t: { ur: "تاجک", fa: "تاجیک", hi: "ताजिक", id: "Tajik", ms: "Tajik", bn: "তাজিক", fr: "Tadjik", tr: "Tacik", ha: "Batajik", am: "ታጂክ", so: "Taajik", es: "Tayiko", ru: "Таджик", "zh-Hans": "塔吉克人" }, nested: true },
    { id: "hazara", en: "Hazara", ar: "هزارة", t: { ur: "ہزارہ", fa: "هزاره", hi: "हज़ारा", id: "Hazara", ms: "Hazara", bn: "হাজারা", fr: "Hazara", tr: "Hazara", ha: "Bahazara", am: "ሐዛራ", so: "Hasaara", es: "Hazara", ru: "Хазареец", "zh-Hans": "哈扎拉人" }, nested: true },
  ],
  central_asian: [
    { id: "afghan", en: "Afghan", ar: "أفغاني", t: { ur: "افغان", fa: "افغان", hi: "अफ़ग़ान", id: "Afganistan", ms: "Afghanistan", bn: "আফগান", fr: "Afghan", tr: "Afgan", ha: "Baafgane", am: "አፍጋናዊ", so: "Afgaan", es: "Afgano", ru: "Афганец", "zh-Hans": "阿富汗裔" }, nested: true },
    { id: "uzbek", en: "Uzbek", ar: "أوزبكي", t: { ur: "ازبک", fa: "ازبک", hi: "उज़्बेक", id: "Uzbek", ms: "Uzbek", bn: "উজবেক", fr: "Ouzbek", tr: "Özbek", ha: "Bauzbek", am: "ኡዝቤክ", so: "Usbeg", es: "Uzbeko", ru: "Узбек", "zh-Hans": "乌兹别克人" }, nested: true },
    { id: "kazakh", en: "Kazakh", ar: "كازاخي", t: { ur: "قازق", fa: "قزاق", hi: "कज़ाख़", id: "Kazakh", ms: "Kazakh", bn: "কাজাখ", fr: "Kazakh", tr: "Kazak", ha: "Bakazak", am: "ካዛክ", so: "Kasaag", es: "Kazajo", ru: "Казах", "zh-Hans": "哈萨克人" }, nested: true },
    { id: "kyrgyz", en: "Kyrgyz", ar: "قيرغيزي", t: { ur: "کرغیز", fa: "قرقیز", hi: "किर्गिज़", id: "Kirgiz", ms: "Kyrgyz", bn: "কিরগিজ", fr: "Kirghize", tr: "Kırgız", ha: "Bakirgiz", am: "ኪርጊዝ", so: "Kirgis", es: "Kirguís", ru: "Киргиз", "zh-Hans": "吉尔吉斯人" }, nested: true },
    { id: "turkmen", en: "Turkmen", ar: "تركماني", t: { ur: "ترکمان", fa: "ترکمن", hi: "तुर्कमेन", id: "Turkmen", ms: "Turkmen", bn: "তুর্কমেন", fr: "Turkmène", tr: "Türkmen", ha: "Baturkmen", am: "ቱርክመን", so: "Turkmaan", es: "Turcomano", ru: "Туркмен", "zh-Hans": "土库曼人" }, nested: true },
    { id: "uyghur", en: "Uyghur", ar: "أويغوري", t: { ur: "ایغور", fa: "اویغور", hi: "उइगर", id: "Uighur", ms: "Uighur", bn: "উইঘুর", fr: "Ouïghour", tr: "Uygur", ha: "Bauyghur", am: "ዊገር", so: "Uygur", es: "Uigur", ru: "Уйгур", "zh-Hans": "维吾尔族" }, nested: true },
    { id: "tatar", en: "Tatar", ar: "تتري", t: { ur: "تاتار", fa: "تاتار", hi: "तातार", id: "Tatar", ms: "Tatar", bn: "তাতার", fr: "Tatar", tr: "Tatar", ha: "Batatar", am: "ታታር", so: "Tataar", es: "Tártaro", ru: "Татарин", "zh-Hans": "鞑靼人" }, nested: true },
  ],
  turkish: [
    { id: "turkish_cypriot", en: "Turkish Cypriot", ar: "قبرصي تركي", t: { ur: "ترک قبرصی", fa: "قبرسی ترک", hi: "तुर्की साइप्रसी", id: "Siprus Turki", ms: "Cyprus Turki", bn: "তুর্কি সাইপ্রিয়ট", fr: "Chypriote turc", tr: "Kıbrıslı Türk", ha: "Baturke na Cyprus", am: "የቱርክ ቆጵሮሳዊ", so: "Turki Qubrus", es: "Turcochipriota", ru: "Киприот-турок", "zh-Hans": "土族塞浦路斯人" }, nested: true },
    { id: "azerbaijani", en: "Azerbaijani", ar: "أذربيجاني", t: { ur: "آذربائیجانی", fa: "آذربایجانی", hi: "अज़रबैजानी", id: "Azerbaijan", ms: "Azerbaijan", bn: "আজারবাইজানি", fr: "Azerbaïdjanais", tr: "Azerbaycanlı", ha: "Baazarbaijane", am: "አዘርባጃናዊ", so: "Asarbayjaan", es: "Azerbaiyano", ru: "Азербайджанец", "zh-Hans": "阿塞拜疆人" }, nested: true },
  ],
  kurdish: [
  ],
  north_caucasian: [
    { id: "chechen", en: "Chechen", ar: "شيشاني", t: { ur: "چیچن", fa: "چچنی", hi: "चेचन", id: "Chechnya", ms: "Chechen", bn: "চেচেন", fr: "Tchétchène", tr: "Çeçen", ha: "Bachechen", am: "ቼቼን", so: "Jejeen", es: "Checheno", ru: "Чеченец", "zh-Hans": "车臣人" }, nested: true },
    { id: "circassian", en: "Circassian", ar: "شركسي", t: { ur: "چرکس", fa: "چرکس", hi: "सर्कासियन", id: "Sirkasia", ms: "Circassia", bn: "সার্কাসিয়ান", fr: "Circassien", tr: "Çerkes", ha: "Bacircassian", am: "ሰርካሲያን", so: "Sharkas", es: "Circasiano", ru: "Черкес", "zh-Hans": "切尔克斯人" }, nested: true },
    { id: "dagestani", en: "Dagestani", ar: "داغستاني", t: { ur: "داغستانی", fa: "داغستانی", hi: "दागिस्तानी", id: "Dagestan", ms: "Dagestan", bn: "দাগেস্তানি", fr: "Daghestanais", tr: "Dağıstanlı", ha: "Badagestan", am: "ዳጌስታኒ", so: "Daagistaani", es: "Daguestaní", ru: "Дагестанец", "zh-Hans": "达吉斯坦人" }, nested: true },
    { id: "ingush", en: "Ingush", ar: "إنغوشي", t: { ur: "انگوش", fa: "اینگوش", hi: "इंगुश", id: "Ingush", ms: "Ingush", bn: "ইঙ্গুশ", fr: "Ingouche", tr: "İnguş", ha: "Baingush", am: "ኢንጉሽ", so: "Inguush", es: "Ingusetio", ru: "Ингуш", "zh-Hans": "印古什人" }, nested: true },
  ],
  southeast_asian: [
    { id: "malay", en: "Malay", ar: "ملايو", t: { ur: "ملائی", fa: "مالایی", hi: "मलय", id: "Melayu", ms: "Melayu", bn: "মালয়", fr: "Malais", tr: "Malay", ha: "Bamalay", am: "ማላይ", so: "Malaay", es: "Malayo", ru: "Малаец", "zh-Hans": "马来人" }, nested: true },
    { id: "indonesian", en: "Indonesian", ar: "إندونيسي", t: { ur: "انڈونیشیائی", fa: "اندونزیایی", hi: "इंडोनेशियाई", id: "Indonesia", ms: "Indonesia", bn: "ইন্দোনেশীয়", fr: "Indonésien", tr: "Endonezyalı", ha: "Baindonesiya", am: "ኢንዶኔዢያዊ", so: "Indooniisiyaan", es: "Indonesio", ru: "Индонезиец", "zh-Hans": "印度尼西亚裔" }, nested: true },
    { id: "javanese", en: "Javanese", ar: "جاوي", t: { ur: "جاوی", fa: "جاوه‌ای", hi: "जावानीज़", id: "Jawa", ms: "Jawa", bn: "জাভানিজ", fr: "Javanais", tr: "Cavalı", ha: "Bajawa", am: "ጃቫኛ", so: "Jaafaa", es: "Javanés", ru: "Яванец", "zh-Hans": "爪哇人" }, nested: true },
    { id: "sundanese", en: "Sundanese", ar: "سوندي", t: { ur: "سنڈانی", fa: "سوندایی", hi: "सुंडानी", id: "Sunda", ms: "Sunda", bn: "সুন্দানিজ", fr: "Soundanais", tr: "Sundalı", ha: "Basunda", am: "ሱንዳኛ", so: "Sundaani", es: "Sundanés", ru: "Сунданец", "zh-Hans": "巽他人" }, nested: true },
    { id: "minangkabau", en: "Minangkabau", ar: "مينانغكاباو", t: { ur: "منانگکباؤ", fa: "مینانگ‌کابائو", hi: "मिनांगकबाउ", id: "Minangkabau", ms: "Minangkabau", bn: "মিনাংকাবাউ", fr: "Minangkabau", tr: "Minangkabau", ha: "Minangkabau", am: "ሚናንግካባው", so: "Minangkabaw", es: "Minangkabau", ru: "Минангкабау", "zh-Hans": "米南佳保人" }, nested: true },
    { id: "bruneian", en: "Bruneian", ar: "بروناي", t: { ur: "برونائی", fa: "برونئیایی", hi: "ब्रुनेई", id: "Brunei", ms: "Brunei", bn: "ব্রুনাইয়ান", fr: "Brunéien", tr: "Bruneili", ha: "Babrunei", am: "ብሩኔያዊ", so: "Buruuney", es: "Bruneano", ru: "Брунеец", "zh-Hans": "文莱裔" }, nested: true },
    { id: "moro_filipino", en: "Filipino (Moro)", ar: "فلبيني (مورو)", t: { ur: "فلپائنی (مورو)", fa: "فیلیپینی (مورو)", hi: "फ़िलिपीनो (मोरो)", id: "Filipina (Moro)", ms: "Filipina (Moro)", bn: "ফিলিপিনো (মোরো)", fr: "Philippin (Moro)", tr: "Filipinli (Moro)", ha: "Bafilifin (Moro)", am: "ፊሊፒናዊ (ሞሮ)", so: "Filibiin (Moro)", es: "Filipino (moro)", ru: "Филиппинец (моро)", "zh-Hans": "菲律宾摩洛人" }, nested: true },
    { id: "cham", en: "Cham", ar: "تشام", t: { ur: "چام", fa: "چام", hi: "चाम", id: "Cham", ms: "Cham", bn: "চাম", fr: "Cham", tr: "Çam", ha: "Bacham", am: "ቻም", so: "Jaam", es: "Cham", ru: "Чам", "zh-Hans": "占族" }, nested: true },
    { id: "rohingya", en: "Rohingya", ar: "روهينغيا", t: { ur: "روہنگیا", fa: "روهینگیا", hi: "रोहिंग्या", id: "Rohingya", ms: "Rohingya", bn: "রোহিঙ্গা", fr: "Rohingya", tr: "Rohingya", ha: "Barohingya", am: "ሮሂንጊያ", so: "Rohinja", es: "Rohinyá", ru: "Рохинджа", "zh-Hans": "罗兴亚人" }, nested: true },
    { id: "thai_malay", en: "Thai Malay", ar: "ملايو تايلاندي", t: { ur: "تھائی ملائی", fa: "مالایی تایلندی", hi: "थाई मलय", id: "Melayu Thailand", ms: "Melayu Thai", bn: "থাই মালয়", fr: "Malais de Thaïlande", tr: "Taylandlı Malay", ha: "Bamalay na Thailand", am: "የታይላንድ ማላይ", so: "Malaay Taylaand", es: "Malayo tailandés", ru: "Тайский малаец", "zh-Hans": "泰国马来人" }, nested: true },
    { id: "cape_malay", en: "Cape Malay", ar: "ملايو الكيب", t: { ur: "کیپ ملائی", fa: "مالایی کیپ", hi: "केप मलय", id: "Melayu Cape", ms: "Melayu Cape", bn: "কেপ মালয়", fr: "Malais du Cap", tr: "Kap Malay", ha: "Bamalay na Cape", am: "ኬፕ ማላይ", so: "Malaay Keyb", es: "Malayo del Cabo", ru: "Капский малаец", "zh-Hans": "开普马来人" }, nested: true },
  ],
  east_asian: [
    { id: "hui", en: "Hui", ar: "هوي", t: { ur: "ہوئی", fa: "هوی", hi: "हुई", id: "Hui", ms: "Hui", bn: "হুই", fr: "Hui", tr: "Hui", ha: "Bahui", am: "ሁዊ", so: "Huy", es: "Hui", ru: "Хуэйцзу", "zh-Hans": "回族" }, nested: true },
    { id: "chinese", en: "Chinese", ar: "صيني", t: { ur: "چینی", fa: "چینی", hi: "चीनी", id: "Tionghoa", ms: "Cina", bn: "চীনা", fr: "Chinois", tr: "Çinli", ha: "Bachine", am: "ቻይናዊ", so: "Shiinees", es: "Chino", ru: "Китаец", "zh-Hans": "华人" }, nested: true },
    { id: "japanese", en: "Japanese", ar: "ياباني", t: { ur: "جاپانی", fa: "ژاپنی", hi: "जापानी", id: "Jepang", ms: "Jepun", bn: "জাপানি", fr: "Japonais", tr: "Japon", ha: "Bajafane", am: "ጃፓናዊ", so: "Jabbaaniis", es: "Japonés", ru: "Японец", "zh-Hans": "日本裔" }, nested: true },
    { id: "korean", en: "Korean", ar: "كوري", t: { ur: "کوریائی", fa: "کره‌ای", hi: "कोरियाई", id: "Korea", ms: "Korea", bn: "কোরীয়", fr: "Coréen", tr: "Koreli", ha: "Bakoriya", am: "ኮሪያዊ", so: "Kuuriyaan", es: "Coreano", ru: "Кореец", "zh-Hans": "韩裔" }, nested: true },
  ],
  black_african: [
    { id: "somali", en: "Somali", ar: "صومالي", t: { ur: "صومالی", fa: "سومالیایی", hi: "सोमाली", id: "Somalia", ms: "Somalia", bn: "সোমালি", fr: "Somalien", tr: "Somalili", ha: "Basomale", am: "ሶማሊ", so: "Soomaali", es: "Somalí", ru: "Сомалиец", "zh-Hans": "索马里裔" }, nested: true },
    { id: "ethiopian", en: "Ethiopian", ar: "إثيوبي", t: { ur: "ایتھوپیائی", fa: "اتیوپیایی", hi: "इथियोपियाई", id: "Etiopia", ms: "Ethiopia", bn: "ইথিওপীয়", fr: "Éthiopien", tr: "Etiyopyalı", ha: "Bahabashe", am: "ኢትዮጵያዊ", so: "Itoobiyaan", es: "Etíope", ru: "Эфиоп", "zh-Hans": "埃塞俄比亚裔" }, nested: true },
    { id: "oromo", en: "Oromo", ar: "أورومو", t: { ur: "اورومو", fa: "اورومو", hi: "ओरोमो", id: "Oromo", ms: "Oromo", bn: "ওরোমো", fr: "Oromo", tr: "Oromo", ha: "Baoromo", am: "ኦሮሞ", so: "Oromo", es: "Oromo", ru: "Оромо", "zh-Hans": "奥罗莫人" }, nested: true },
    { id: "eritrean", en: "Eritrean", ar: "إريتري", t: { ur: "اریٹیرین", fa: "اریتره‌ای", hi: "इरिट्रियाई", id: "Eritrea", ms: "Eritrea", bn: "ইরিত্রীয়", fr: "Érythréen", tr: "Eritreli", ha: "Baeritiriya", am: "ኤርትራዊ", so: "Eritiriyaan", es: "Eritreo", ru: "Эритреец", "zh-Hans": "厄立特里亚裔" }, nested: true },
    { id: "djiboutian", en: "Djiboutian", ar: "جيبوتي", t: { ur: "جبوتی", fa: "جیبوتیایی", hi: "जिबूती", id: "Djibouti", ms: "Djibouti", bn: "জিবুতীয়", fr: "Djiboutien", tr: "Cibutili", ha: "Bajibuti", am: "ጅቡቲያዊ", so: "Jabuuti", es: "Yibutiano", ru: "Джибутиец", "zh-Hans": "吉布提裔" }, nested: true },
    { id: "nigerian", en: "Nigerian", ar: "نيجيري", t: { ur: "نائجیرین", fa: "نیجریه‌ای", hi: "नाइजीरियाई", id: "Nigeria", ms: "Nigeria", bn: "নাইজেরীয়", fr: "Nigérian", tr: "Nijeryalı", ha: "Ɗan Najeriya", am: "ናይጄሪያዊ", so: "Nayjeeriyaan", es: "Nigeriano", ru: "Нигериец", "zh-Hans": "尼日利亚裔" }, nested: true },
    { id: "hausa", en: "Hausa", ar: "هوسا", t: { ur: "ہاؤسا", fa: "هوسا", hi: "हौसा", id: "Hausa", ms: "Hausa", bn: "হাউসা", fr: "Haoussa", tr: "Hausa", ha: "Bahaushe", am: "ሐውሳ", so: "Hawsa", es: "Hausa", ru: "Хауса", "zh-Hans": "豪萨人" }, nested: true },
    { id: "fulani", en: "Fulani", ar: "فولاني", t: { ur: "فولانی", fa: "فولانی", hi: "फुलानी", id: "Fulani", ms: "Fulani", bn: "ফুলানি", fr: "Peul", tr: "Fulani", ha: "Bafulatani", am: "ፉላኒ", so: "Fulaani", es: "Fulani", ru: "Фульбе", "zh-Hans": "富拉尼人" }, nested: true },
    { id: "yoruba", en: "Yoruba", ar: "يوروبا", t: { ur: "یوروبا", fa: "یوروبا", hi: "योरूबा", id: "Yoruba", ms: "Yoruba", bn: "ইয়োরুবা", fr: "Yoruba", tr: "Yoruba", ha: "Bayarabe", am: "ዮሩባ", so: "Yoruuba", es: "Yoruba", ru: "Йоруба", "zh-Hans": "约鲁巴人" }, nested: true },
    { id: "senegalese", en: "Senegalese", ar: "سنغالي", t: { ur: "سینیگالی", fa: "سنگالی", hi: "सेनेगली", id: "Senegal", ms: "Senegal", bn: "সেনেগালি", fr: "Sénégalais", tr: "Senegalli", ha: "Basenegal", am: "ሴኔጋላዊ", so: "Senegaali", es: "Senegalés", ru: "Сенегалец", "zh-Hans": "塞内加尔裔" }, nested: true },
    { id: "gambian", en: "Gambian", ar: "غامبي", t: { ur: "گیمبیائی", fa: "گامبیایی", hi: "गाम्बियाई", id: "Gambia", ms: "Gambia", bn: "গাম্বীয়", fr: "Gambien", tr: "Gambiyalı", ha: "Bagambiya", am: "ጋምቢያዊ", so: "Gambiyaan", es: "Gambiano", ru: "Гамбиец", "zh-Hans": "冈比亚裔" }, nested: true },
    { id: "malian", en: "Malian", ar: "مالي", t: { ur: "مالیائی", fa: "مالیایی", hi: "माली", id: "Mali", ms: "Mali", bn: "মালিয়ান", fr: "Malien", tr: "Malili", ha: "Bamale", am: "ማሊያዊ", so: "Maali", es: "Maliense", ru: "Малиец", "zh-Hans": "马里裔" }, nested: true },
    { id: "guinean", en: "Guinean", ar: "غيني", t: { ur: "گنیائی", fa: "گینه‌ای", hi: "गिनीयाई", id: "Guinea", ms: "Guinea", bn: "গিনীয়", fr: "Guinéen", tr: "Gineli", ha: "Bagini", am: "ጊኒያዊ", so: "Gini", es: "Guineano", ru: "Гвинеец", "zh-Hans": "几内亚裔" }, nested: true },
    { id: "sierra_leonean", en: "Sierra Leonean", ar: "سيراليوني", t: { ur: "سیرالیونی", fa: "سیرالئونی", hi: "सिएरा लियोनी", id: "Sierra Leone", ms: "Sierra Leone", bn: "সিয়েরা লিওনীয়", fr: "Sierra-Léonais", tr: "Sierra Leoneli", ha: "Basaliyo", am: "ሴራሊዮናዊ", so: "Siiraaliyoon", es: "Sierraleonés", ru: "Сьерра-леонец", "zh-Hans": "塞拉利昂裔" }, nested: true },
    { id: "ghanaian", en: "Ghanaian", ar: "غاني", t: { ur: "گھانائی", fa: "غنایی", hi: "घानाई", id: "Ghana", ms: "Ghana", bn: "ঘানীয়", fr: "Ghanéen", tr: "Ganalı", ha: "Bagana", am: "ጋናዊ", so: "Gaana", es: "Ghanés", ru: "Ганец", "zh-Hans": "加纳裔" }, nested: true },
    { id: "ivorian", en: "Ivorian", ar: "إيفواري", t: { ur: "آئیوری", fa: "ساحل عاجی", hi: "आइवरी", id: "Pantai Gading", ms: "Ivory Coast", bn: "আইভরীয়", fr: "Ivoirien", tr: "Fildişili", ha: "Baivory", am: "አይቮሪያዊ", so: "Ayfoori", es: "Marfileño", ru: "Ивуариец", "zh-Hans": "科特迪瓦裔" }, nested: true },
    { id: "burkinabe", en: "Burkinabé", ar: "بوركيني", t: { ur: "برکینابے", fa: "بورکینایی", hi: "बुर्किनाबे", id: "Burkina Faso", ms: "Burkina Faso", bn: "বুরকিনাবে", fr: "Burkinabé", tr: "Burkinalı", ha: "Baburkina", am: "ቡርኪናቤ", so: "Burkinaabe", es: "Burkinés", ru: "Буркиниец", "zh-Hans": "布基纳法索裔" }, nested: true },
    { id: "nigerien", en: "Nigerien", ar: "نيجري", t: { ur: "نائیجری", fa: "نیجری", hi: "नाइजरी", id: "Niger", ms: "Niger", bn: "নাইজেরিয়েন", fr: "Nigérien", tr: "Nijerli", ha: "Ɗan Nijar", am: "ኒጀራዊ", so: "Nayjar", es: "Nigerino", ru: "Нигерец", "zh-Hans": "尼日尔裔" }, nested: true },
    { id: "chadian", en: "Chadian", ar: "تشادي", t: { ur: "چاڈی", fa: "چادی", hi: "चाडी", id: "Chad", ms: "Chad", bn: "চাদীয়", fr: "Tchadien", tr: "Çadlı", ha: "Bachade", am: "ቻዳዊ", so: "Jaad", es: "Chadiano", ru: "Чадец", "zh-Hans": "乍得裔" }, nested: true },
    { id: "cameroonian", en: "Cameroonian", ar: "كاميروني", t: { ur: "کیمرونی", fa: "کامرونی", hi: "कैमरूनी", id: "Kamerun", ms: "Cameroon", bn: "ক্যামেরুনীয়", fr: "Camerounais", tr: "Kamerunlu", ha: "Bakamaru", am: "ካሜሩናዊ", so: "Kaameruun", es: "Camerunés", ru: "Камерунец", "zh-Hans": "喀麦隆裔" }, nested: true },
    { id: "kenyan", en: "Kenyan", ar: "كيني", t: { ur: "کینیائی", fa: "کنیایی", hi: "केन्याई", id: "Kenya", ms: "Kenya", bn: "কেনীয়", fr: "Kényan", tr: "Kenyalı", ha: "Bakenya", am: "ኬንያዊ", so: "Kenyaati", es: "Keniano", ru: "Кениец", "zh-Hans": "肯尼亚裔" }, nested: true },
    { id: "tanzanian", en: "Tanzanian", ar: "تنزاني", t: { ur: "تنزانیائی", fa: "تانزانیایی", hi: "तंज़ानियाई", id: "Tanzania", ms: "Tanzania", bn: "তানজানীয়", fr: "Tanzanien", tr: "Tanzanyalı", ha: "Batanzaniya", am: "ታንዛኒያዊ", so: "Tansaaniyaan", es: "Tanzano", ru: "Танзаниец", "zh-Hans": "坦桑尼亚裔" }, nested: true },
    { id: "swahili", en: "Swahili", ar: "سواحيلي", t: { ur: "سواحلی", fa: "سواحیلی", hi: "स्वाहिली", id: "Swahili", ms: "Swahili", bn: "সোয়াহিলি", fr: "Swahili", tr: "Svahili", ha: "Baswahili", am: "ስዋሂሊ", so: "Sawaaxili", es: "Suajili", ru: "Суахили", "zh-Hans": "斯瓦希里人" }, nested: true },
    { id: "ugandan", en: "Ugandan", ar: "أوغندي", t: { ur: "یوگنڈائی", fa: "اوگاندایی", hi: "युगांडाई", id: "Uganda", ms: "Uganda", bn: "উগান্ডান", fr: "Ougandais", tr: "Ugandalı", ha: "Bayuganda", am: "ኡጋንዳዊ", so: "Ugandhaan", es: "Ugandés", ru: "Угандиец", "zh-Hans": "乌干达裔" }, nested: true },
    { id: "comorian", en: "Comorian", ar: "قمري", t: { ur: "کوموری", fa: "کوموری", hi: "कोमोरियन", id: "Komoro", ms: "Comoros", bn: "কোমোরীয়", fr: "Comorien", tr: "Komorlu", ha: "Bakomoro", am: "ኮሞራዊ", so: "Komoori", es: "Comorense", ru: "Коморец", "zh-Hans": "科摩罗裔" }, nested: true },
    { id: "south_african", en: "South African", ar: "جنوب أفريقي", t: { ur: "جنوبی افریقی", fa: "آفریقای جنوبی", hi: "दक्षिण अफ़्रीकी", id: "Afrika Selatan", ms: "Afrika Selatan", bn: "দক্ষিণ আফ্রিকান", fr: "Sud-Africain", tr: "Güney Afrikalı", ha: "Ɗan Afirka ta Kudu", am: "ደቡብ አፍሪካዊ", so: "Koonfur Afrikaan", es: "Sudafricano", ru: "Южноафриканец", "zh-Hans": "南非裔" }, nested: true },
  ],
  african_caribbean: [
    { id: "african_american", en: "African American", ar: "أمريكي من أصل أفريقي", t: { ur: "افریقی امریکی", fa: "آمریکایی آفریقایی‌تبار", hi: "अफ़्रीकी अमेरिकी", id: "Afrika-Amerika", ms: "Afrika-Amerika", bn: "আফ্রিকান আমেরিকান", fr: "Afro-Américain", tr: "Afro-Amerikan", ha: "Ba-Amurke ɗan Afirka", am: "አፍሪካዊ አሜሪካዊ", so: "Afrikaan Maraykan", es: "Afroamericano", ru: "Афроамериканец", "zh-Hans": "非裔美国人" }, nested: true },
    { id: "black_british", en: "Black British", ar: "بريطاني أسود", t: { ur: "سیاہ فام برطانوی", fa: "بریتانیایی سیاه‌پوست", hi: "अश्वेत ब्रिटिश", id: "Inggris kulit hitam", ms: "British berkulit hitam", bn: "কৃষ্ণাঙ্গ ব্রিটিশ", fr: "Britannique noir", tr: "Siyahi İngiliz", ha: "Baturen Ingila baƙar fata", am: "ጥቁር ብሪታኒያዊ", so: "Ingiriis Madow", es: "Británico negro", ru: "Чернокожий британец", "zh-Hans": "英国黑人" }, nested: true },
    { id: "indo_caribbean", en: "Indo-Caribbean", ar: "كاريبي من أصل هندي", t: { ur: "ہند کیریبین", fa: "کارائیبی هندی‌تبار", hi: "इंडो-कैरिबियाई", id: "Indo-Karibia", ms: "Indo-Caribbean", bn: "ইন্দো-ক্যারিবিয়ান", fr: "Indo-Caribéen", tr: "Hint-Karayipli", ha: "Ba-Caribbean ɗan Indiya", am: "ኢንዶ-ካሪቢያን", so: "Hindi-Kariibiyaan", es: "Indocaribeño", ru: "Индо-карибец", "zh-Hans": "印度裔加勒比人" }, nested: true },
  ],
  white: [
    { id: "bosniak", en: "Bosniak", ar: "بوشناقي", t: { ur: "بوسنیائی", fa: "بوسنیایی", hi: "बोस्नियाक", id: "Bosnia", ms: "Bosniak", bn: "বসনিয়াক", fr: "Bosniaque", tr: "Boşnak", ha: "Babosniya", am: "ቦስኒያክ", so: "Bosniyaan", es: "Bosnio", ru: "Босниец", "zh-Hans": "波什尼亚克人" }, nested: true },
    { id: "albanian", en: "Albanian", ar: "ألباني", t: { ur: "البانوی", fa: "آلبانیایی", hi: "अल्बानियाई", id: "Albania", ms: "Albania", bn: "আলবেনীয়", fr: "Albanais", tr: "Arnavut", ha: "Baalbaniya", am: "አልባኒያዊ", so: "Albaaniyaan", es: "Albanés", ru: "Албанец", "zh-Hans": "阿尔巴尼亚人" }, nested: true },
    { id: "pomak", en: "Pomak", ar: "بوماك", t: { ur: "پوماک", fa: "پوماک", hi: "पोमाक", id: "Pomak", ms: "Pomak", bn: "পোমাক", fr: "Pomak", tr: "Pomak", ha: "Bapomak", am: "ፖማክ", so: "Bomaak", es: "Pomaco", ru: "Помак", "zh-Hans": "波马克人" }, nested: true },
    { id: "british", en: "British", ar: "بريطاني", t: { ur: "برطانوی", fa: "بریتانیایی", hi: "ब्रिटिश", id: "Inggris", ms: "British", bn: "ব্রিটিশ", fr: "Britannique", tr: "İngiliz", ha: "Baturen Ingila", am: "ብሪታኒያዊ", so: "Ingiriis", es: "Británico", ru: "Британец", "zh-Hans": "英国裔" }, nested: true },
    { id: "irish", en: "Irish", ar: "أيرلندي", t: { ur: "آئرش", fa: "ایرلندی", hi: "आयरिश", id: "Irlandia", ms: "Ireland", bn: "আইরিশ", fr: "Irlandais", tr: "İrlandalı", ha: "Bairish", am: "አይሪሽ", so: "Ayrish", es: "Irlandés", ru: "Ирландец", "zh-Hans": "爱尔兰裔" }, nested: true },
    { id: "western_european", en: "Western European", ar: "أوروبي غربي", t: { ur: "مغربی یورپی", fa: "اروپای غربی", hi: "पश्चिमी यूरोपीय", id: "Eropa Barat", ms: "Eropah Barat", bn: "পশ্চিম ইউরোপীয়", fr: "Européen de l’Ouest", tr: "Batı Avrupalı", ha: "Ɗan Yammacin Turai", am: "ምዕራብ አውሮፓዊ", so: "Galbeedka Yurub", es: "Europeo occidental", ru: "Западноевропеец", "zh-Hans": "西欧裔" }, nested: true },
    { id: "southern_european", en: "Southern European", ar: "أوروبي جنوبي", t: { ur: "جنوبی یورپی", fa: "اروپای جنوبی", hi: "दक्षिणी यूरोपीय", id: "Eropa Selatan", ms: "Eropah Selatan", bn: "দক্ষিণ ইউরোপীয়", fr: "Européen du Sud", tr: "Güney Avrupalı", ha: "Ɗan Kudancin Turai", am: "ደቡብ አውሮፓዊ", so: "Koonfurta Yurub", es: "Europeo del sur", ru: "Южноевропеец", "zh-Hans": "南欧裔" }, nested: true },
    { id: "eastern_european", en: "Eastern European", ar: "أوروبي شرقي", t: { ur: "مشرقی یورپی", fa: "اروپای شرقی", hi: "पूर्वी यूरोपीय", id: "Eropa Timur", ms: "Eropah Timur", bn: "পূর্ব ইউরোপীয়", fr: "Européen de l’Est", tr: "Doğu Avrupalı", ha: "Ɗan Gabashin Turai", am: "ምሥራቅ አውሮፓዊ", so: "Bariga Yurub", es: "Europeo del este", ru: "Восточноевропеец", "zh-Hans": "东欧裔" }, nested: true },
    { id: "white_american", en: "White American", ar: "أمريكي أبيض", t: { ur: "سفید فام امریکی", fa: "آمریکایی سفیدپوست", hi: "श्वेत अमेरिकी", id: "Amerika kulit putih", ms: "Amerika berkulit putih", bn: "শ্বেতাঙ্গ আমেরিকান", fr: "Américain blanc", tr: "Beyaz Amerikalı", ha: "Ba-Amurke farar fata", am: "ነጭ አሜሪካዊ", so: "Maraykan Cad", es: "Estadounidense blanco", ru: "Белый американец", "zh-Hans": "美国白人" }, nested: true },
  ],
  hispanic_latino: [
    { id: "mexican", en: "Mexican", ar: "مكسيكي", t: { ur: "میکسیکن", fa: "مکزیکی", hi: "मैक्सिकन", id: "Meksiko", ms: "Mexico", bn: "মেক্সিকান", fr: "Mexicain", tr: "Meksikalı", ha: "Bamekziko", am: "ሜክሲካዊ", so: "Meksikaan", es: "Mexicano", ru: "Мексиканец", "zh-Hans": "墨西哥裔" }, nested: true },
    { id: "puerto_rican", en: "Puerto Rican", ar: "بورتوريكي", t: { ur: "پورٹو ریکن", fa: "پورتوریکویی", hi: "प्यूर्टो रिकन", id: "Puerto Riko", ms: "Puerto Rico", bn: "পুয়ের্তো রিকান", fr: "Portoricain", tr: "Porto Rikolu", ha: "Bapuerto Rico", am: "ፖርቶ ሪኳዊ", so: "Boortoriikaan", es: "Puertorriqueño", ru: "Пуэрториканец", "zh-Hans": "波多黎各裔" }, nested: true },
    { id: "dominican", en: "Dominican", ar: "دومينيكاني", t: { ur: "ڈومینیکن", fa: "دومینیکنی", hi: "डोमिनिकन", id: "Dominika", ms: "Dominican", bn: "ডোমিনিকান", fr: "Dominicain", tr: "Dominikli", ha: "Badominika", am: "ዶሚኒካዊ", so: "Dominikaan", es: "Dominicano", ru: "Доминиканец", "zh-Hans": "多米尼加裔" }, nested: true },
    { id: "colombian", en: "Colombian", ar: "كولومبي", t: { ur: "کولمبیائی", fa: "کلمبیایی", hi: "कोलंबियाई", id: "Kolombia", ms: "Colombia", bn: "কলম্বিয়ান", fr: "Colombien", tr: "Kolombiyalı", ha: "Bakolombiya", am: "ኮሎምቢያዊ", so: "Kolombiyaan", es: "Colombiano", ru: "Колумбиец", "zh-Hans": "哥伦比亚裔" }, nested: true },
    { id: "brazilian", en: "Brazilian", ar: "برازيلي", t: { ur: "برازیلی", fa: "برزیلی", hi: "ब्राज़ीलियाई", id: "Brasil", ms: "Brazil", bn: "ব্রাজিলীয়", fr: "Brésilien", tr: "Brezilyalı", ha: "Babrazil", am: "ብራዚላዊ", so: "Baraasiil", es: "Brasileño", ru: "Бразилец", "zh-Hans": "巴西裔" }, nested: true },
    { id: "argentine", en: "Argentine", ar: "أرجنتيني", t: { ur: "ارجنٹائنی", fa: "آرژانتینی", hi: "अर्जेंटीनी", id: "Argentina", ms: "Argentina", bn: "আর্জেন্টাইন", fr: "Argentin", tr: "Arjantinli", ha: "Baarjantina", am: "አርጀንቲናዊ", so: "Arjantiin", es: "Argentino", ru: "Аргентинец", "zh-Hans": "阿根廷裔" }, nested: true },
  ],
  mixed: [
  ],
  other: [
  ],
};

const ORDER = ["arab", "amazigh", "south_asian", "persian", "central_asian", "turkish", "kurdish", "north_caucasian", "southeast_asian", "east_asian", "black_african", "african_caribbean", "white", "hispanic_latino", "mixed", "other"] as const;

export const ETHNICITY_GROUPS: readonly CatalogGroup[] = ORDER.map((id) => {
  const broad = (BROAD[id] ?? NEW_BROAD[id]) as CatalogOption;
  return { ...broad, id: `group:${id}`, options: [broad, ...(SPECIFIC[id] ?? [])] };
});

/** On a profile, "prefer not to say" is a real answer; in a filter it is not offered. */
export const ETHNICITY_PROFILE_GROUPS: readonly CatalogGroup[] = [
  ...ETHNICITY_GROUPS,
  { ...UNSTATED, id: 'group:prefer_not_to_say', options: [UNSTATED] },
];

const ALL: readonly CatalogOption[] = ETHNICITY_PROFILE_GROUPS.flatMap((group) => group.options);

export function findEthnicity(id: string | null | undefined): CatalogOption | undefined {
  return id ? ALL.find((option) => option.id === id) : undefined;
}
