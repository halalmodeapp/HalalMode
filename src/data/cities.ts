import type { CatalogGroup } from '@/data/catalogOption';

/**
 * Where a member can say they live without handing over their location.
 *
 * Three jobs, one list:
 *
 *   A member who says no to location is not stuck. Onboarding used to accept
 *   the device's answer and nothing else, so "Don't Allow" — which iOS only
 *   offers once — locked that person out of the app for good.
 *
 *   The web works at all. A browser will give coordinates but has no way to
 *   turn them into a city name, so on the web every member failed the location
 *   step. The nearest city on this list names them instead.
 *
 *   A chosen city stores the city centre, not a doorstep, which is all distance
 *   matching needs and more than some members would like to share.
 *
 * Country names are spelled exactly as in `COUNTRIES`, because matching compares
 * a member's country with the countries other people said they would accept.
 * Coordinates are city centres to two decimal places — about a kilometre, which
 * is far finer than any distance preference in the app.
 */
export interface City {
  id: string;
  en: string;
  ar: string;
  lat: number;
  lng: number;
}

interface CityCountry {
  country: string;
  ar: string;
  cities: City[];
}

const c = (id: string, en: string, ar: string, lat: number, lng: number): City => ({ id, en, ar, lat, lng });

const CITY_COUNTRIES: readonly CityCountry[] = [
  {
    country: 'United Kingdom',
    ar: 'المملكة المتحدة',
    cities: [
      c('london', 'London', 'لندن', 51.51, -0.13),
      c('birmingham', 'Birmingham', 'برمنغهام', 52.49, -1.89),
      c('manchester', 'Manchester', 'مانشستر', 53.48, -2.24),
      c('leeds', 'Leeds', 'ليدز', 53.80, -1.55),
      c('bradford', 'Bradford', 'برادفورد', 53.80, -1.75),
      c('leicester', 'Leicester', 'ليستر', 52.64, -1.13),
      c('glasgow', 'Glasgow', 'غلاسكو', 55.86, -4.25),
      c('edinburgh', 'Edinburgh', 'إدنبرة', 55.95, -3.19),
      c('cardiff', 'Cardiff', 'كارديف', 51.48, -3.18),
      c('liverpool', 'Liverpool', 'ليفربول', 53.41, -2.98),
      c('sheffield', 'Sheffield', 'شيفيلد', 53.38, -1.47),
      c('bristol', 'Bristol', 'بريستول', 51.45, -2.59),
      c('nottingham', 'Nottingham', 'نوتنغهام', 52.95, -1.15),
      c('luton', 'Luton', 'لوتن', 51.88, -0.42),
      c('blackburn', 'Blackburn', 'بلاكبيرن', 53.75, -2.48),
      c('newcastle', 'Newcastle', 'نيوكاسل', 54.98, -1.62),
      c('belfast', 'Belfast', 'بلفاست', 54.60, -5.93),
    ],
  },
  {
    country: 'United States',
    ar: 'الولايات المتحدة',
    cities: [
      c('new_york', 'New York', 'نيويورك', 40.71, -74.01),
      c('los_angeles', 'Los Angeles', 'لوس أنجلوس', 34.05, -118.24),
      c('chicago', 'Chicago', 'شيكاغو', 41.88, -87.63),
      c('houston', 'Houston', 'هيوستن', 29.76, -95.37),
      c('dallas', 'Dallas', 'دالاس', 32.78, -96.80),
      c('dearborn', 'Dearborn', 'ديربورن', 42.32, -83.18),
      c('detroit', 'Detroit', 'ديترويت', 42.33, -83.05),
      c('washington', 'Washington, D.C.', 'واشنطن', 38.91, -77.04),
      c('philadelphia', 'Philadelphia', 'فيلادلفيا', 39.95, -75.17),
      c('atlanta', 'Atlanta', 'أتلانتا', 33.75, -84.39),
      c('minneapolis', 'Minneapolis', 'مينيابوليس', 44.98, -93.27),
      c('san_francisco', 'San Francisco', 'سان فرانسيسكو', 37.77, -122.42),
      c('seattle', 'Seattle', 'سياتل', 47.61, -122.33),
      c('boston', 'Boston', 'بوسطن', 42.36, -71.06),
      c('miami', 'Miami', 'ميامي', 25.76, -80.19),
      c('phoenix', 'Phoenix', 'فينيكس', 33.45, -112.07),
      c('paterson', 'Paterson', 'باترسون', 40.92, -74.17),
    ],
  },
  {
    country: 'Canada',
    ar: 'كندا',
    cities: [
      c('toronto', 'Toronto', 'تورنتو', 43.65, -79.38),
      c('mississauga', 'Mississauga', 'ميسيساغا', 43.59, -79.64),
      c('montreal', 'Montreal', 'مونتريال', 45.50, -73.57),
      c('ottawa', 'Ottawa', 'أوتاوا', 45.42, -75.70),
      c('calgary', 'Calgary', 'كالغاري', 51.05, -114.07),
      c('edmonton', 'Edmonton', 'إدمونتون', 53.55, -113.49),
      c('vancouver', 'Vancouver', 'فانكوفر', 49.28, -123.12),
      c('windsor', 'Windsor', 'وندسور', 42.31, -83.04),
    ],
  },
  {
    country: 'Australia',
    ar: 'أستراليا',
    cities: [
      c('sydney', 'Sydney', 'سيدني', -33.87, 151.21),
      c('melbourne', 'Melbourne', 'ملبورن', -37.81, 144.96),
      c('brisbane', 'Brisbane', 'بريزبن', -27.47, 153.03),
      c('perth', 'Perth', 'بيرث', -31.95, 115.86),
      c('adelaide', 'Adelaide', 'أديلايد', -34.93, 138.60),
    ],
  },
  {
    country: 'Saudi Arabia',
    ar: 'المملكة العربية السعودية',
    cities: [
      c('riyadh', 'Riyadh', 'الرياض', 24.71, 46.68),
      c('jeddah', 'Jeddah', 'جدة', 21.49, 39.19),
      c('makkah', 'Makkah', 'مكة المكرمة', 21.42, 39.83),
      c('madinah', 'Madinah', 'المدينة المنورة', 24.47, 39.61),
      c('dammam', 'Dammam', 'الدمام', 26.43, 50.10),
      c('khobar', 'Al Khobar', 'الخبر', 26.22, 50.20),
      c('taif', 'Taif', 'الطائف', 21.27, 40.42),
      c('abha', 'Abha', 'أبها', 18.22, 42.51),
      c('tabuk', 'Tabuk', 'تبوك', 28.38, 36.57),
      c('buraydah', 'Buraydah', 'بريدة', 26.33, 43.97),
    ],
  },
  {
    country: 'United Arab Emirates',
    ar: 'الإمارات العربية المتحدة',
    cities: [
      c('dubai', 'Dubai', 'دبي', 25.20, 55.27),
      c('abu_dhabi', 'Abu Dhabi', 'أبوظبي', 24.45, 54.38),
      c('sharjah', 'Sharjah', 'الشارقة', 25.35, 55.39),
      c('ajman', 'Ajman', 'عجمان', 25.41, 55.51),
      c('al_ain', 'Al Ain', 'العين', 24.21, 55.74),
    ],
  },
  {
    country: 'Qatar',
    ar: 'قطر',
    cities: [c('doha', 'Doha', 'الدوحة', 25.29, 51.53)],
  },
  {
    country: 'Kuwait',
    ar: 'الكويت',
    cities: [c('kuwait_city', 'Kuwait City', 'مدينة الكويت', 29.38, 47.99)],
  },
  {
    country: 'Bahrain',
    ar: 'البحرين',
    cities: [c('manama', 'Manama', 'المنامة', 26.23, 50.59)],
  },
  {
    country: 'Oman',
    ar: 'عُمان',
    cities: [
      c('muscat', 'Muscat', 'مسقط', 23.59, 58.41),
      c('salalah', 'Salalah', 'صلالة', 17.02, 54.09),
    ],
  },
  {
    country: 'Jordan',
    ar: 'الأردن',
    cities: [
      c('amman', 'Amman', 'عمّان', 31.95, 35.93),
      c('irbid', 'Irbid', 'إربد', 32.56, 35.85),
      c('zarqa', 'Zarqa', 'الزرقاء', 32.07, 36.09),
    ],
  },
  {
    country: 'Palestine',
    ar: 'فلسطين',
    cities: [
      c('jerusalem', 'Jerusalem', 'القدس', 31.78, 35.22),
      c('gaza', 'Gaza', 'غزة', 31.50, 34.47),
      c('ramallah', 'Ramallah', 'رام الله', 31.90, 35.20),
      c('nablus', 'Nablus', 'نابلس', 32.22, 35.25),
      c('hebron', 'Hebron', 'الخليل', 31.53, 35.10),
    ],
  },
  {
    country: 'Lebanon',
    ar: 'لبنان',
    cities: [
      c('beirut', 'Beirut', 'بيروت', 33.89, 35.50),
      c('tripoli_lb', 'Tripoli', 'طرابلس', 34.44, 35.83),
      c('sidon', 'Sidon', 'صيدا', 33.56, 35.37),
    ],
  },
  {
    country: 'Syria',
    ar: 'سوريا',
    cities: [
      c('damascus', 'Damascus', 'دمشق', 33.51, 36.29),
      c('aleppo', 'Aleppo', 'حلب', 36.20, 37.13),
      c('homs', 'Homs', 'حمص', 34.73, 36.71),
    ],
  },
  {
    country: 'Iraq',
    ar: 'العراق',
    cities: [
      c('baghdad', 'Baghdad', 'بغداد', 33.31, 44.36),
      c('basra', 'Basra', 'البصرة', 30.51, 47.78),
      c('erbil', 'Erbil', 'أربيل', 36.19, 44.01),
      c('mosul', 'Mosul', 'الموصل', 36.34, 43.13),
    ],
  },
  {
    country: 'Yemen',
    ar: 'اليمن',
    cities: [
      c('sanaa', 'Sanaa', 'صنعاء', 15.37, 44.19),
      c('aden', 'Aden', 'عدن', 12.79, 45.02),
    ],
  },
  {
    country: 'Egypt',
    ar: 'مصر',
    cities: [
      c('cairo', 'Cairo', 'القاهرة', 30.04, 31.24),
      c('alexandria', 'Alexandria', 'الإسكندرية', 31.20, 29.92),
      c('giza', 'Giza', 'الجيزة', 30.01, 31.21),
      c('mansoura', 'Mansoura', 'المنصورة', 31.04, 31.38),
      c('tanta', 'Tanta', 'طنطا', 30.79, 31.00),
      c('asyut', 'Asyut', 'أسيوط', 27.18, 31.18),
    ],
  },
  {
    country: 'Morocco',
    ar: 'المغرب',
    cities: [
      c('casablanca', 'Casablanca', 'الدار البيضاء', 33.57, -7.59),
      c('rabat', 'Rabat', 'الرباط', 34.02, -6.84),
      c('marrakesh', 'Marrakesh', 'مراكش', 31.63, -7.99),
      c('fez', 'Fez', 'فاس', 34.03, -5.00),
      c('tangier', 'Tangier', 'طنجة', 35.76, -5.83),
    ],
  },
  {
    country: 'Algeria',
    ar: 'الجزائر',
    cities: [
      c('algiers', 'Algiers', 'الجزائر العاصمة', 36.75, 3.06),
      c('oran', 'Oran', 'وهران', 35.70, -0.63),
      c('constantine', 'Constantine', 'قسنطينة', 36.37, 6.61),
    ],
  },
  {
    country: 'Tunisia',
    ar: 'تونس',
    cities: [
      c('tunis', 'Tunis', 'تونس العاصمة', 36.81, 10.18),
      c('sfax', 'Sfax', 'صفاقس', 34.74, 10.76),
    ],
  },
  {
    country: 'Libya',
    ar: 'ليبيا',
    cities: [
      c('tripoli_ly', 'Tripoli', 'طرابلس', 32.89, 13.19),
      c('benghazi', 'Benghazi', 'بنغازي', 32.12, 20.09),
    ],
  },
  {
    country: 'Sudan',
    ar: 'السودان',
    cities: [c('khartoum', 'Khartoum', 'الخرطوم', 15.50, 32.56)],
  },
  {
    country: 'Somalia',
    ar: 'الصومال',
    cities: [
      c('mogadishu', 'Mogadishu', 'مقديشو', 2.05, 45.32),
      c('hargeisa', 'Hargeisa', 'هرجيسا', 9.56, 44.07),
    ],
  },
  {
    country: 'Turkey',
    ar: 'تركيا',
    cities: [
      c('istanbul', 'Istanbul', 'إسطنبول', 41.01, 28.98),
      c('ankara', 'Ankara', 'أنقرة', 39.93, 32.86),
      c('izmir', 'Izmir', 'إزمير', 38.42, 27.14),
      c('bursa', 'Bursa', 'بورصة', 40.19, 29.06),
      c('gaziantep', 'Gaziantep', 'غازي عنتاب', 37.07, 37.38),
      c('konya', 'Konya', 'قونية', 37.87, 32.48),
    ],
  },
  {
    country: 'Pakistan',
    ar: 'باكستان',
    cities: [
      c('karachi', 'Karachi', 'كراتشي', 24.86, 67.01),
      c('lahore', 'Lahore', 'لاهور', 31.55, 74.34),
      c('islamabad', 'Islamabad', 'إسلام آباد', 33.68, 73.05),
      c('rawalpindi', 'Rawalpindi', 'راولبندي', 33.60, 73.04),
      c('faisalabad', 'Faisalabad', 'فيصل آباد', 31.42, 73.08),
      c('peshawar', 'Peshawar', 'بيشاور', 34.01, 71.58),
      c('multan', 'Multan', 'ملتان', 30.20, 71.47),
      c('mirpur', 'Mirpur', 'ميربور', 33.15, 73.75),
    ],
  },
  {
    country: 'India',
    ar: 'الهند',
    cities: [
      c('delhi', 'Delhi', 'دلهي', 28.61, 77.21),
      c('mumbai', 'Mumbai', 'مومباي', 19.08, 72.88),
      c('hyderabad', 'Hyderabad', 'حيدر آباد', 17.39, 78.49),
      c('bengaluru', 'Bengaluru', 'بنغالور', 12.97, 77.59),
      c('kolkata', 'Kolkata', 'كولكاتا', 22.57, 88.36),
      c('lucknow', 'Lucknow', 'لكناو', 26.85, 80.95),
      c('srinagar', 'Srinagar', 'سريناغار', 34.08, 74.80),
      c('chennai', 'Chennai', 'تشيناي', 13.08, 80.27),
      c('kozhikode', 'Kozhikode', 'كوزيكود', 11.26, 75.78),
    ],
  },
  {
    country: 'Bangladesh',
    ar: 'بنغلاديش',
    cities: [
      c('dhaka', 'Dhaka', 'دكا', 23.81, 90.41),
      c('chittagong', 'Chittagong', 'شيتاغونغ', 22.36, 91.78),
      c('sylhet', 'Sylhet', 'سلهت', 24.89, 91.87),
    ],
  },
  {
    country: 'Afghanistan',
    ar: 'أفغانستان',
    cities: [
      c('kabul', 'Kabul', 'كابل', 34.56, 69.21),
      c('herat', 'Herat', 'هرات', 34.35, 62.20),
    ],
  },
  {
    country: 'Iran',
    ar: 'إيران',
    cities: [
      c('tehran', 'Tehran', 'طهران', 35.69, 51.39),
      c('mashhad', 'Mashhad', 'مشهد', 36.30, 59.61),
    ],
  },
  {
    country: 'Malaysia',
    ar: 'ماليزيا',
    cities: [
      c('kuala_lumpur', 'Kuala Lumpur', 'كوالالمبور', 3.14, 101.69),
      c('penang', 'George Town', 'جورج تاون', 5.41, 100.33),
      c('johor_bahru', 'Johor Bahru', 'جوهور باهرو', 1.49, 103.74),
      c('kota_bharu', 'Kota Bharu', 'كوتا بارو', 6.13, 102.24),
    ],
  },
  {
    country: 'Indonesia',
    ar: 'إندونيسيا',
    cities: [
      c('jakarta', 'Jakarta', 'جاكرتا', -6.21, 106.85),
      c('surabaya', 'Surabaya', 'سورابايا', -7.26, 112.75),
      c('bandung', 'Bandung', 'باندونغ', -6.92, 107.61),
      c('medan', 'Medan', 'ميدان', 3.60, 98.67),
      c('yogyakarta', 'Yogyakarta', 'يوجياكرتا', -7.80, 110.36),
    ],
  },
  {
    country: 'Singapore',
    ar: 'سنغافورة',
    cities: [c('singapore', 'Singapore', 'سنغافورة', 1.35, 103.82)],
  },
  {
    country: 'Brunei',
    ar: 'بروناي',
    cities: [c('bandar_seri_begawan', 'Bandar Seri Begawan', 'بندر سري بكاوان', 4.90, 114.94)],
  },
  {
    country: 'Maldives',
    ar: 'جزر المالديف',
    cities: [c('male', 'Malé', 'ماليه', 4.18, 73.51)],
  },
  {
    country: 'Ireland',
    ar: 'أيرلندا',
    cities: [c('dublin', 'Dublin', 'دبلن', 53.35, -6.26)],
  },
  {
    country: 'France',
    ar: 'فرنسا',
    cities: [
      c('paris', 'Paris', 'باريس', 48.86, 2.35),
      c('marseille', 'Marseille', 'مرسيليا', 43.30, 5.37),
      c('lyon', 'Lyon', 'ليون', 45.76, 4.84),
      c('lille', 'Lille', 'ليل', 50.63, 3.06),
      c('toulouse', 'Toulouse', 'تولوز', 43.60, 1.44),
    ],
  },
  {
    country: 'Germany',
    ar: 'ألمانيا',
    cities: [
      c('berlin', 'Berlin', 'برلين', 52.52, 13.40),
      c('hamburg', 'Hamburg', 'هامبورغ', 53.55, 9.99),
      c('munich', 'Munich', 'ميونخ', 48.14, 11.58),
      c('cologne', 'Cologne', 'كولونيا', 50.94, 6.96),
      c('frankfurt', 'Frankfurt', 'فرانكفورت', 50.11, 8.68),
      c('duisburg', 'Duisburg', 'دويسبورغ', 51.43, 6.76),
    ],
  },
  {
    country: 'Netherlands',
    ar: 'هولندا',
    cities: [
      c('amsterdam', 'Amsterdam', 'أمستردام', 52.37, 4.90),
      c('rotterdam', 'Rotterdam', 'روتردام', 51.92, 4.48),
      c('the_hague', 'The Hague', 'لاهاي', 52.07, 4.30),
    ],
  },
  {
    country: 'Belgium',
    ar: 'بلجيكا',
    cities: [
      c('brussels', 'Brussels', 'بروكسل', 50.85, 4.35),
      c('antwerp', 'Antwerp', 'أنتويرب', 51.22, 4.40),
    ],
  },
  {
    country: 'Sweden',
    ar: 'السويد',
    cities: [
      c('stockholm', 'Stockholm', 'ستوكهولم', 59.33, 18.07),
      c('gothenburg', 'Gothenburg', 'غوتنبرغ', 57.71, 11.97),
      c('malmo', 'Malmö', 'مالمو', 55.60, 13.00),
    ],
  },
  {
    country: 'Norway',
    ar: 'النرويج',
    cities: [c('oslo', 'Oslo', 'أوسلو', 59.91, 10.75)],
  },
  {
    country: 'Denmark',
    ar: 'الدنمارك',
    cities: [c('copenhagen', 'Copenhagen', 'كوبنهاغن', 55.68, 12.57)],
  },
  {
    country: 'Spain',
    ar: 'إسبانيا',
    cities: [
      c('madrid', 'Madrid', 'مدريد', 40.42, -3.70),
      c('barcelona', 'Barcelona', 'برشلونة', 41.39, 2.17),
    ],
  },
  {
    country: 'Italy',
    ar: 'إيطاليا',
    cities: [
      c('rome', 'Rome', 'روما', 41.90, 12.50),
      c('milan', 'Milan', 'ميلانو', 45.46, 9.19),
    ],
  },
  {
    country: 'Austria',
    ar: 'النمسا',
    cities: [c('vienna', 'Vienna', 'فيينا', 48.21, 16.37)],
  },
  {
    country: 'Switzerland',
    ar: 'سويسرا',
    cities: [
      c('zurich', 'Zurich', 'زيورخ', 47.38, 8.54),
      c('geneva', 'Geneva', 'جنيف', 46.20, 6.14),
    ],
  },
  {
    country: 'Bosnia and Herzegovina',
    ar: 'البوسنة والهرسك',
    cities: [c('sarajevo', 'Sarajevo', 'سراييفو', 43.86, 18.41)],
  },
  {
    country: 'Albania',
    ar: 'ألبانيا',
    cities: [c('tirana', 'Tirana', 'تيرانا', 41.33, 19.82)],
  },
  {
    country: 'Kosovo',
    ar: 'كوسوفو',
    cities: [c('pristina', 'Pristina', 'بريشتينا', 42.66, 21.17)],
  },
  {
    country: 'Azerbaijan',
    ar: 'أذربيجان',
    cities: [c('baku', 'Baku', 'باكو', 40.41, 49.87)],
  },
  {
    country: 'Uzbekistan',
    ar: 'أوزبكستان',
    cities: [c('tashkent', 'Tashkent', 'طشقند', 41.30, 69.24)],
  },
  {
    country: 'Kazakhstan',
    ar: 'كازاخستان',
    cities: [c('almaty', 'Almaty', 'ألماتي', 43.24, 76.89)],
  },
  {
    country: 'Nigeria',
    ar: 'نيجيريا',
    cities: [
      c('lagos', 'Lagos', 'لاغوس', 6.52, 3.38),
      c('abuja', 'Abuja', 'أبوجا', 9.08, 7.40),
      c('kano', 'Kano', 'كانو', 12.00, 8.52),
    ],
  },
  {
    country: 'Ghana',
    ar: 'غانا',
    cities: [c('accra', 'Accra', 'أكرا', 5.60, -0.19)],
  },
  {
    country: 'Senegal',
    ar: 'السنغال',
    cities: [c('dakar', 'Dakar', 'داكار', 14.72, -17.47)],
  },
  {
    country: 'Kenya',
    ar: 'كينيا',
    cities: [
      c('nairobi', 'Nairobi', 'نيروبي', -1.29, 36.82),
      c('mombasa', 'Mombasa', 'مومباسا', -4.04, 39.67),
    ],
  },
  {
    country: 'Ethiopia',
    ar: 'إثيوبيا',
    cities: [c('addis_ababa', 'Addis Ababa', 'أديس أبابا', 9.03, 38.74)],
  },
  {
    country: 'Tanzania',
    ar: 'تنزانيا',
    cities: [c('dar_es_salaam', 'Dar es Salaam', 'دار السلام', -6.79, 39.21)],
  },
  {
    country: 'South Africa',
    ar: 'جنوب أفريقيا',
    cities: [
      c('johannesburg', 'Johannesburg', 'جوهانسبرغ', -26.20, 28.05),
      c('cape_town', 'Cape Town', 'كيب تاون', -33.92, 18.42),
      c('durban', 'Durban', 'ديربان', -29.86, 31.02),
    ],
  },
  {
    country: 'New Zealand',
    ar: 'نيوزيلندا',
    cities: [c('auckland', 'Auckland', 'أوكلاند', -36.85, 174.76)],
  },
];

const BY_ID = new Map<string, { city: City; country: string }>();
for (const entry of CITY_COUNTRIES) {
  for (const city of entry.cities) BY_ID.set(city.id, { city, country: entry.country });
}

/** The cities as picker groups: one group per country, searchable in both languages. */
export const CITY_GROUPS: readonly CatalogGroup[] = CITY_COUNTRIES.map((entry) => ({
  id: entry.country,
  en: entry.country,
  ar: entry.ar,
  options: entry.cities.map(({ id, en, ar }) => ({ id, en, ar })),
}));

export interface ResolvedPlace {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

/** A chosen city, as the profile stores it: English name, and its centre. */
export function placeForCity(id: string): ResolvedPlace | null {
  const found = BY_ID.get(id);
  if (!found) return null;
  return {
    city: found.city.en,
    country: found.country,
    latitude: found.city.lat,
    longitude: found.city.lng,
  };
}

/** Great-circle distance, in kilometres. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Names a position after the closest city on the list.
 *
 * Only within reach: past 150km a "nearest city" is a different place, and it is
 * better to ask the member than to tell them they live somewhere they do not.
 * The member's own coordinates are kept either way; only the name is borrowed.
 */
export function nearestPlace(
  latitude: number,
  longitude: number,
  withinKm = 150,
): ResolvedPlace | null {
  let best: { city: City; country: string; km: number } | null = null;
  for (const entry of CITY_COUNTRIES) {
    for (const city of entry.cities) {
      const km = distanceKm(latitude, longitude, city.lat, city.lng);
      if (!best || km < best.km) best = { city, country: entry.country, km };
    }
  }
  if (!best || best.km > withinKm) return null;
  return { city: best.city.en, country: best.country, latitude, longitude };
}
