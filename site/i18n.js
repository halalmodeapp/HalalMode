(function () {
  'use strict';

  const names = {
    en: 'English', ar: 'العربية', ur: 'اردو', fa: 'فارسی',
    hi: 'हिन्दी', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu',
    bn: 'বাংলা', fr: 'Français', tr: 'Türkçe', ha: 'Hausa',
    am: 'አማርኛ', so: 'Soomaali', es: 'Español', ru: 'Русский',
    'zh-Hans': '简体中文'
  };

  const copy = {
    en: {
      language: 'Choose language', navHow: 'How it works', heroTitle: 'Marriage, taken seriously.',
      heroIntro: 'Halal Mode is a better Muslim marriage app, built around a small, curated set of introductions each day. It’s intentionally designed for',
      heroBold: 'less noise and better connections.', comingSoon: 'Coming soon',
      downloadOn: 'Download on the', getItOn: 'Get it on', join: 'Join the waitlist',
      early: 'Early members are invited first, in the order they joined.',
      email: 'Email', city: 'City', cityPlaceholder: 'e.g. London', age: 'Age range',
      choose: 'Choose…', notify: 'Notify me',
      privacy: 'We use your details only to tell you when Halal Mode opens. No spam, and never shared.',
      questions: 'Questions?', soundOn: 'Sound on', soundOff: 'Sound off',
      soundToggle: 'Squeeze sound', availability: 'App availability', photos: 'Photos',
      validationEmail: 'That email address does not look right.',
      validationCity: 'Please tell us which city you are in.',
      validationAge: 'Please choose an age range.',
      thanks: 'Thank you — you are on the list. We will email you when Halal Mode opens.',
      error: 'Something went wrong. Please try again in a moment.',
      howTitle: 'Halal Mode, a better Muslim marriage app.',
      feature1Title: 'Five thoughtfully selected introductions. Every Fajr.',
      feature1Body: 'Less noise, better matches, more intention.',
      feature2Title: 'Looks matter, but they stay private.',
      feature2Body: 'Height and build help us match you better without public filters.',
      feature3Title: 'Earn the conversation.',
      feature3Body: 'You both answer meaningful icebreakers before you can chat freely, and you only see their answers once you’ve answered too.',
      feature4Title: 'Halal Cards: learn together, and have fun.',
      feature4Body: 'The Relationship Lab is a set of short workshops: you each answer real-life scenarios privately, then see where every choice leads and talk it through. There are relationship quizzes and choose-your-own-adventure stories too — for learning, getting to know each other, and fun.',
      feature4Free: 'Two are free to try on your own: a Lab workshop and a story. Halal Mode Premium opens all 35 — 4 Lab workshops with 13 scenarios, 16 quizzes for every stage and 15 stories — to play with any match, who plays free.'
    },
    ar: {
      language: 'اختر اللغة', navHow: 'كيف يشتغل', heroTitle: 'الزواج يستاهل جدّية.',
      heroIntro: 'حلال مود يساعد المسلمين على الزواج بطريقة أهدى وأوضح. كل يوم يعرّفك على عدد قليل من الناس، مختارين بعناية. والنتيجة:',
      heroBold: 'زحمة أقل. وتواصل أحسن.', comingSoon: 'قريبًا',
      downloadOn: 'حمّله من', getItOn: 'متوفر على', join: 'سجّل في قائمة الانتظار',
      early: 'اللي يسجّلون أول، توصلهم الدعوة أول.',
      email: 'البريد الإلكتروني', city: 'المدينة', cityPlaceholder: 'مثلًا: الرياض', age: 'الفئة العمرية',
      choose: 'اختر…', notify: 'بلغوني وقت الإطلاق',
      privacy: 'نستخدم بياناتك فقط عشان نخبرك وقت إطلاق حلال مود. بدون رسائل مزعجة، وما نشاركها مع أحد.',
      questions: 'عندك سؤال؟', soundOn: 'الصوت شغّال', soundOff: 'الصوت مقفّل',
      soundToggle: 'صوت القلب', availability: 'توفر التطبيق', photos: 'الصور',
      validationEmail: 'تأكد من عنوان بريدك الإلكتروني.',
      validationCity: 'اكتب لنا مدينتك.',
      validationAge: 'اختر فئتك العمرية.',
      thanks: 'شكرًا! اسمك صار في القائمة. بنراسلك وقت إطلاق حلال مود.',
      error: 'صار خطأ بسيط. حاول مرة ثانية بعد شوي.',
      howTitle: 'حلال مود، طريقة أهدى وأوضح للزواج.',
      feature1Title: 'خمس فرص تعارف مختارة بعناية. كل فجر.',
      feature1Body: 'زحمة أقل، توافق أفضل، ونيّة أوضح.',
      feature2Title: 'الشكل مهم، بس تفاصيلك تبقى خاصة.',
      feature2Body: 'الطول وبنية الجسم يساعدوننا نختار لك بشكل أفضل، بدون فلاتر علنية.',
      feature3Title: 'خلّوا الحوار يبدأ بمعنى.',
      feature3Body: 'كل واحد منكم يجاوب على أسئلة تعارف لها معنى قبل ما تفتح المحادثة. وما تشوف إجابات الطرف الثاني إلا بعد ما تجاوب أنت أيضًا.',
      feature4Title: 'بطاقات حلال: تعلّموا مع بعض، واستمتعوا.',
      feature4Body: 'مختبر العلاقات ورش قصيرة: كل واحد منكم يجاوب بسرّية على مواقف من الحياة الحقيقية، بعدها تشوفون وين يوصل كل اختيار وتتكلمون عنه. وفيه كمان اختبارات عن العلاقة وقصص تختارون أنتم مسارها — للتعلّم، وللتعارف، وللمتعة.',
      feature4Free: 'تقدر تجرّب اثنين مجانًا لوحدك: ورشة من المختبر وقصة. وحلال مود Premium يفتح لك الـ35 كلها — 4 ورش فيها 13 موقفًا، و16 اختبارًا لكل مرحلة، و15 قصة — تلعبونها مع أي تعارف، والطرف الثاني يلعب مجانًا.'
    },
    ur: {
      language: 'زبان چنیں', navHow: 'یہ کیسے کام کرتا ہے', heroTitle: 'شادی، سنجیدگی کے ساتھ۔',
      heroIntro: 'حلال موڈ مسلم شادی کے لیے ایک بہتر ایپ ہے۔ ہر روز آپ کو چند سوچ سمجھ کر چنے گئے تعارف ملتے ہیں، تاکہ',
      heroBold: 'شور کم ہو۔ اچھے رابطے بنیں۔', comingSoon: 'جلد آ رہا ہے',
      downloadOn: 'ڈاؤن لوڈ کریں', getItOn: 'حاصل کریں', join: 'انتظار کی فہرست میں شامل ہوں',
      early: 'جو پہلے شامل ہوں گے، انہیں پہلے دعوت ملے گی۔',
      email: 'ای میل', city: 'شہر', cityPlaceholder: 'مثلاً لاہور', age: 'عمر کا گروپ',
      choose: 'منتخب کریں…', notify: 'مجھے بتائیں',
      privacy: 'آپ کی معلومات صرف حلال موڈ کے آغاز کی خبر دینے کے لیے استعمال ہوں گی۔ غیر ضروری پیغامات نہیں، اور کسی سے شیئر نہیں کریں گے۔',
      questions: 'کوئی سوال؟', soundOn: 'آواز آن', soundOff: 'آواز آف',
      soundToggle: 'دل کی آواز', availability: 'ایپ کی دستیابی', photos: 'تصاویر',
      validationEmail: 'یہ ای میل ایڈریس ٹھیک نہیں لگ رہا۔',
      validationCity: 'اپنا شہر بتا دیں۔',
      validationAge: 'عمر کا گروپ چن لیں۔',
      thanks: 'شکریہ! آپ فہرست میں شامل ہو گئے ہیں۔ حلال موڈ شروع ہوتے ہی ہم آپ کو ای میل کریں گے۔',
      error: 'کچھ مسئلہ ہو گیا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
      howTitle: 'حلال موڈ، مسلم شادی کے لیے ایک بہتر ایپ۔',
      feature1Title: 'پانچ سوچ سمجھ کر چنے گئے تعارف۔ ہر فجر۔',
      feature1Body: 'کم شور، بہتر میل، زیادہ سنجیدگی۔',
      feature2Title: 'ظاہری شکل اہم ہے، مگر آپ کی باتیں نجی رہتی ہیں۔',
      feature2Body: 'قد اور جسمانی ساخت بہتر میل ڈھونڈنے میں مدد دیتے ہیں، مگر ان کے لیے سب کو نظر آنے والے فلٹر نہیں ہیں۔',
      feature3Title: 'بات چیت سے پہلے ایک دوسرے کو سمجھیں۔',
      feature3Body: 'کھل کر بات کرنے سے پہلے آپ دونوں تعارف کے چند اچھے سوالوں کے جواب دیتے ہیں۔ دوسرے کے جواب تبھی نظر آتے ہیں جب آپ بھی جواب دے چکے ہوں۔',
      feature4Title: 'حلال کارڈز: ساتھ سیکھیں، اور مزہ کریں۔',
      feature4Body: 'ریلیشن شپ لیب مختصر ورکشاپس کا مجموعہ ہے: آپ دونوں الگ الگ حقیقی زندگی کے منظرناموں کا جواب دیتے ہیں، پھر دیکھتے ہیں کہ ہر انتخاب کہاں لے جاتا ہے اور اس پر بات کرتے ہیں۔ ساتھ میں رشتے کے کوئز اور اپنی راہ خود چننے والی کہانیاں بھی ہیں — سیکھنے، ایک دوسرے کو جاننے اور مزے کے لیے۔',
      feature4Free: 'دو چیزیں اکیلے مفت آزما سکتے ہیں: لیب کی ایک ورکشاپ اور ایک کہانی۔ حلال موڈ Premium تمام 35 کھول دیتا ہے — 13 منظرناموں والی 4 ورکشاپس، ہر مرحلے کے لیے 16 کوئز اور 15 کہانیاں — کسی بھی میچ کے ساتھ کھیلیں، ان کے لیے مفت۔'
    },
    hi: {
      language: 'भाषा चुनें', navHow: 'यह कैसे काम करता है', heroTitle: 'शादी को संजीदगी से लें।',
      heroIntro: 'हलाल मोड मुस्लिम शादी के लिए एक बेहतर ऐप है। हर दिन आपको सोच-समझकर चुने गए कुछ परिचय मिलते हैं, ताकि',
      heroBold: 'शोर कम हो। अच्छे रिश्ते बनें।', comingSoon: 'जल्द आ रहा है',
      downloadOn: 'डाउनलोड करें', getItOn: 'पाएँ', join: 'वेटलिस्ट में जुड़ें',
      early: 'जो पहले जुड़ेंगे, उन्हें पहले बुलाया जाएगा।',
      email: 'ईमेल', city: 'शहर', cityPlaceholder: 'जैसे दिल्ली', age: 'उम्र का दायरा',
      choose: 'चुनें…', notify: 'मुझे बताएं',
      privacy: 'आपकी जानकारी सिर्फ हलाल मोड शुरू होने की खबर देने के लिए इस्तेमाल होगी। बेवजह मैसेज नहीं, और किसी से साझा नहीं करेंगे।',
      questions: 'कोई सवाल?', soundOn: 'आवाज़ चालू', soundOff: 'आवाज़ बंद',
      soundToggle: 'दिल की आवाज़', availability: 'ऐप की उपलब्धता', photos: 'तस्वीरें',
      validationEmail: 'यह ईमेल पता सही नहीं लग रहा।',
      validationCity: 'अपना शहर बताएं।',
      validationAge: 'उम्र का दायरा चुनें।',
      thanks: 'शुक्रिया! आप वेटलिस्ट में जुड़ गए हैं। हलाल मोड शुरू होते ही हम आपको ईमेल करेंगे।',
      error: 'कुछ गड़बड़ हो गई। थोड़ी देर बाद फिर कोशिश करें।',
      howTitle: 'हलाल मोड, मुस्लिम शादी के लिए एक बेहतर ऐप।',
      feature1Title: 'सोच-समझकर चुने गए पाँच परिचय। हर फ़ज्र।',
      feature1Body: 'कम शोर, बेहतर मेल, ज़्यादा संजीदगी।',
      feature2Title: 'दिखना मायने रखता है, पर यह निजी रहता है।',
      feature2Body: 'कद और बनावट बेहतर मेल ढूँढ़ने में मदद करते हैं, लेकिन इनके लिए सार्वजनिक फ़िल्टर नहीं हैं।',
      feature3Title: 'बातचीत की शुरुआत मायने रखे।',
      feature3Body: 'खुलकर चैट करने से पहले आप दोनों कुछ अच्छे सवालों के जवाब देते हैं। उनके जवाब तभी दिखेंगे जब आप भी जवाब दे चुके होंगे।',
      feature4Title: 'हलाल कार्ड्स: साथ सीखें, और मज़े करें।',
      feature4Body: 'रिलेशनशिप लैब छोटी-छोटी वर्कशॉप का सेट है: आप दोनों अलग-अलग असल ज़िंदगी की परिस्थितियों का जवाब देते हैं, फिर देखते हैं कि हर फ़ैसला कहाँ ले जाता है और उस पर बात करते हैं। साथ में रिश्तों पर क्विज़ और अपनी राह खुद चुनने वाली कहानियाँ भी हैं — सीखने, एक-दूसरे को जानने और मज़े के लिए।',
      feature4Free: 'दो चीज़ें आप अकेले मुफ़्त आज़मा सकते हैं: लैब की एक वर्कशॉप और एक कहानी। हलाल मोड Premium सभी 35 खोल देता है — 13 परिस्थितियों वाली 4 वर्कशॉप, हर पड़ाव के लिए 16 क्विज़ और 15 कहानियाँ — किसी भी मैच के साथ खेलें, उनके लिए मुफ़्त।'
    },
    id: {
      language: 'Pilih bahasa', navHow: 'Cara kerjanya', heroTitle: 'Menikah, dengan niat yang jelas.',
      heroIntro: 'Halal Mode adalah aplikasi pernikahan Muslim yang lebih baik. Setiap hari, kamu mendapat beberapa perkenalan yang dipilih dengan cermat, supaya',
      heroBold: 'lebih sedikit distraksi. Lebih banyak koneksi yang berarti.', comingSoon: 'Segera hadir',
      downloadOn: 'Unduh di', getItOn: 'Dapatkan di', join: 'Gabung daftar tunggu',
      early: 'Yang mendaftar lebih awal akan diundang lebih dulu.',
      email: 'Email', city: 'Kota', cityPlaceholder: 'mis. Jakarta', age: 'Rentang usia',
      choose: 'Pilih…', notify: 'Kabari saya',
      privacy: 'Data kamu hanya kami pakai untuk mengabari saat Halal Mode hadir. Tanpa spam, dan tidak dibagikan.',
      questions: 'Ada pertanyaan?', soundOn: 'Suara aktif', soundOff: 'Suara mati',
      soundToggle: 'Suara hati', availability: 'Ketersediaan aplikasi', photos: 'Foto',
      validationEmail: 'Alamat email itu sepertinya belum benar.',
      validationCity: 'Kota kamu di mana?',
      validationAge: 'Pilih rentang usiamu.',
      thanks: 'Terima kasih! Kamu sudah masuk daftar. Kami akan mengirim email saat Halal Mode hadir.',
      error: 'Ada yang bermasalah. Coba lagi sebentar ya.',
      howTitle: 'Halal Mode, cara yang lebih baik untuk mencari pasangan Muslim.',
      feature1Title: 'Lima perkenalan pilihan. Setiap Subuh.',
      feature1Body: 'Lebih sedikit distraksi, lebih cocok, lebih jelas niatnya.',
      feature2Title: 'Penampilan penting, tapi tetap pribadi.',
      feature2Body: 'Tinggi dan bentuk tubuh membantu kami mencarikan pasangan yang lebih cocok, tanpa filter publik.',
      feature3Title: 'Mulai obrolan dengan sungguh-sungguh.',
      feature3Body: 'Kalian berdua menjawab pertanyaan perkenalan yang bermakna sebelum bisa mengobrol bebas. Jawaban mereka baru terlihat setelah kamu menjawab juga.',
      feature4Title: 'Halal Cards: belajar bersama, dan bersenang-senang.',
      feature4Body: 'Relationship Lab adalah rangkaian lokakarya singkat: kalian masing-masing menjawab skenario kehidupan nyata secara pribadi, lalu melihat ke mana setiap pilihan membawa dan membicarakannya. Ada juga kuis hubungan dan cerita pilih jalanmu sendiri — untuk belajar, saling mengenal, dan bersenang-senang.',
      feature4Free: 'Dua bisa dicoba gratis sendiri: satu lokakarya Lab dan satu cerita. Halal Mode Premium membuka semua 35 — 4 lokakarya Lab dengan 13 skenario, 16 kuis untuk setiap tahap, dan 15 cerita — untuk dimainkan dengan siapa pun yang cocok, gratis untuknya.'
    },
    ms: {
      language: 'Pilih bahasa', navHow: 'Cara ia berfungsi', heroTitle: 'Perkahwinan, dengan niat yang jelas.',
      heroIntro: 'Halal Mode ialah aplikasi perkahwinan Muslim yang lebih baik. Setiap hari, anda dapat beberapa perkenalan yang dipilih dengan teliti, supaya',
      heroBold: 'kurang gangguan. Hubungan yang lebih bermakna.', comingSoon: 'Akan datang',
      downloadOn: 'Muat turun di', getItOn: 'Dapatkan di', join: 'Sertai senarai menunggu',
      early: 'Yang mendaftar lebih awal akan dijemput lebih dahulu.',
      email: 'E-mel', city: 'Bandar', cityPlaceholder: 'cth. Kuala Lumpur', age: 'Julat umur',
      choose: 'Pilih…', notify: 'Maklumkan saya',
      privacy: 'Maklumat anda hanya digunakan untuk memberitahu apabila Halal Mode dilancarkan. Tiada spam, dan tidak dikongsi.',
      questions: 'Ada soalan?', soundOn: 'Bunyi hidup', soundOff: 'Bunyi mati',
      soundToggle: 'Bunyi hati', availability: 'Ketersediaan aplikasi', photos: 'Foto',
      validationEmail: 'Alamat e-mel itu nampaknya tidak betul.',
      validationCity: 'Di bandar mana anda tinggal?',
      validationAge: 'Pilih julat umur anda.',
      thanks: 'Terima kasih! Anda sudah dalam senarai. Kami akan e-mel anda apabila Halal Mode dilancarkan.',
      error: 'Ada masalah. Cuba lagi sebentar nanti.',
      howTitle: 'Halal Mode, cara yang lebih baik untuk mencari pasangan Muslim.',
      feature1Title: 'Lima perkenalan pilihan. Setiap Subuh.',
      feature1Body: 'Kurang gangguan, lebih serasi, lebih jelas niatnya.',
      feature2Title: 'Rupa penting, tapi tetap peribadi.',
      feature2Body: 'Ketinggian dan bentuk badan membantu kami mencari padanan yang lebih serasi, tanpa penapis terbuka.',
      feature3Title: 'Mulakan perbualan dengan lebih bermakna.',
      feature3Body: 'Anda berdua jawab soalan perkenalan yang bermakna sebelum boleh berbual bebas. Jawapan mereka hanya dapat dilihat selepas anda menjawab juga.',
      feature4Title: 'Halal Cards: belajar bersama, dan berseronok.',
      feature4Body: 'Relationship Lab ialah siri bengkel ringkas: anda berdua menjawab senario kehidupan sebenar secara peribadi, kemudian melihat ke mana setiap pilihan membawa dan membincangkannya. Ada juga kuiz hubungan dan cerita pilih jalan sendiri — untuk belajar, mengenali satu sama lain, dan berseronok.',
      feature4Free: 'Dua boleh dicuba percuma sendiri: satu bengkel Lab dan satu cerita. Halal Mode Premium membuka kesemua 35 — 4 bengkel Lab dengan 13 senario, 16 kuiz untuk setiap peringkat dan 15 cerita — untuk dimainkan dengan sesiapa padanan anda, percuma untuknya.'
    },
    bn: {
      language: 'ভাষা বেছে নিন', navHow: 'যেভাবে কাজ করে', heroTitle: 'বিয়েকে গুরুত্ব দিয়ে।',
      heroIntro: 'হালাল মোড মুসলিমদের বিয়ের জন্য আরও ভালো একটি অ্যাপ। প্রতিদিন আপনার জন্য বেছে দেওয়া হয় অল্প কিছু পরিচয়, যাতে থাকে',
      heroBold: 'কম ভিড়। ভালো যোগাযোগ।', comingSoon: 'শিগগিরই আসছে',
      downloadOn: 'ডাউনলোড করুন', getItOn: 'পাবেন', join: 'অপেক্ষার তালিকায় যোগ দিন',
      early: 'যারা আগে যোগ দেবেন, তারা আগে আমন্ত্রণ পাবেন।',
      email: 'ইমেইল', city: 'শহর', cityPlaceholder: 'যেমন ঢাকা', age: 'বয়সের পরিসর',
      choose: 'বেছে নিন…', notify: 'আমাকে জানান',
      privacy: 'আপনার তথ্য শুধু হালাল মোড চালু হলে জানাতে ব্যবহার করব। অযথা মেসেজ নয়, কারও সঙ্গে শেয়ারও নয়।',
      questions: 'কোনো প্রশ্ন?', soundOn: 'শব্দ চালু', soundOff: 'শব্দ বন্ধ',
      soundToggle: 'হৃদয়ের শব্দ', availability: 'অ্যাপের তথ্য', photos: 'ছবি',
      validationEmail: 'ইমেইল ঠিকানাটা ঠিক মনে হচ্ছে না।',
      validationCity: 'আপনার শহরের নাম লিখুন।',
      validationAge: 'বয়সের পরিসর বেছে নিন।',
      thanks: 'ধন্যবাদ! আপনি তালিকায় আছেন। হালাল মোড চালু হলে আমরা ইমেইল করব।',
      error: 'কিছু একটা সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।',
      howTitle: 'হালাল মোড, মুসলিমদের বিয়ের জন্য আরও ভালো অ্যাপ।',
      feature1Title: 'ভেবেচিন্তে বেছে দেওয়া পাঁচটি পরিচয়। প্রতি ফজরে।',
      feature1Body: 'কম ভিড়, ভালো মিল, আরও স্পষ্ট উদ্দেশ্য।',
      feature2Title: 'চেহারা গুরুত্বপূর্ণ, তবে তথ্য ব্যক্তিগতই থাকে।',
      feature2Body: 'উচ্চতা আর গড়ন ভালো মিল খুঁজতে সাহায্য করে, কিন্তু এগুলো দিয়ে সবার সামনে কাউকে ফিল্টার করা যায় না।',
      feature3Title: 'কথা শুরু হোক বুঝেশুনে।',
      feature3Body: 'খোলামেলা চ্যাটের আগে আপনারা দুজনই কিছু অর্থপূর্ণ পরিচয়মূলক প্রশ্নের উত্তর দেবেন। নিজের উত্তর দেওয়ার পরেই অন্যজনের উত্তর দেখতে পাবেন।',
      feature4Title: 'হালাল কার্ডস: একসাথে শিখুন, আর মজা করুন।',
      feature4Body: 'রিলেশনশিপ ল্যাব হলো ছোট ছোট কর্মশালা: আপনারা দুজনই আলাদাভাবে বাস্তব জীবনের পরিস্থিতির উত্তর দেন, তারপর দেখেন প্রতিটি সিদ্ধান্ত কোথায় নিয়ে যায় এবং তা নিয়ে কথা বলেন। সাথে আছে সম্পর্ক নিয়ে কুইজ আর নিজের পথ বেছে নেওয়ার গল্প — শেখা, একে অপরকে জানা আর মজার জন্য।',
      feature4Free: 'দুটি একা বিনামূল্যে চেষ্টা করতে পারেন: ল্যাবের একটি কর্মশালা আর একটি গল্প। হালাল মোড Premium খুলে দেয় সব 35টি — 13টি পরিস্থিতিসহ 4টি কর্মশালা, প্রতিটি পর্যায়ের জন্য 16টি কুইজ আর 15টি গল্প — যেকোনো ম্যাচের সাথে খেলুন, তাঁর জন্য বিনামূল্যে।'
    },
    fr: {
      language: 'Choisir la langue', navHow: 'Comment ça marche', heroTitle: 'Le mariage mérite qu’on s’y attarde.',
      heroIntro: 'Halal Mode est une meilleure façon de faire des rencontres en vue du mariage. Chaque jour, quelques présentations choisies avec soin, pour',
      heroBold: 'moins de bruit. De plus belles connexions.', comingSoon: 'Bientôt disponible',
      downloadOn: 'Télécharger sur', getItOn: 'Disponible sur', join: 'Rejoindre la liste d’attente',
      early: 'Les premières personnes inscrites seront invitées en premier.',
      email: 'E-mail', city: 'Ville', cityPlaceholder: 'ex. Paris', age: 'Tranche d’âge',
      choose: 'Choisir…', notify: 'Tenez-moi au courant',
      privacy: 'Vos coordonnées servent uniquement à vous prévenir du lancement de Halal Mode. Pas de spam, aucun partage.',
      questions: 'Une question ?', soundOn: 'Son activé', soundOff: 'Son coupé',
      soundToggle: 'Son des cœurs', availability: 'Disponibilité de l’application', photos: 'Photos',
      validationEmail: 'Cette adresse e-mail ne semble pas correcte.',
      validationCity: 'Indiquez-nous votre ville.',
      validationAge: 'Choisissez une tranche d’âge.',
      thanks: 'Merci ! Vous êtes sur la liste. Nous vous écrirons au lancement de Halal Mode.',
      error: 'Un problème est survenu. Réessayez dans un instant.',
      howTitle: 'Halal Mode, une meilleure façon de faire des rencontres pour le mariage.',
      feature1Title: 'Cinq présentations choisies avec soin. Chaque Fajr.',
      feature1Body: 'Moins de bruit, de meilleures affinités, des intentions claires.',
      feature2Title: 'L’apparence compte, mais reste privée.',
      feature2Body: 'La taille et la silhouette nous aident à trouver de meilleures affinités, sans filtres publics.',
      feature3Title: 'Une conversation qui se mérite.',
      feature3Body: 'Avant de discuter librement, vous répondez tous les deux à des questions pour faire connaissance. Vous ne voyez ses réponses qu’après avoir donné les vôtres.',
      feature4Title: 'Halal Cards : apprendre ensemble, et s’amuser.',
      feature4Body: 'Le Relationship Lab, ce sont de courts ateliers : chacun répond en privé à des situations de la vie réelle, puis vous découvrez où mène chaque choix et vous en parlez. Il y a aussi des quiz sur le couple et des histoires dont vous choisissez la suite — pour apprendre, faire connaissance et s’amuser.',
      feature4Free: 'Deux sont à essayer gratuitement, seul : un atelier du Lab et une histoire. Halal Mode Premium ouvre les 35 — 4 ateliers avec 13 situations, 16 quiz pour chaque étape et 15 histoires — à jouer avec n’importe quel contact, gratuitement pour l’autre.'
    },
    tr: {
      language: 'Dil seç', navHow: 'Nasıl çalışır', heroTitle: 'Evliliği ciddiye alıyoruz.',
      heroIntro: 'Halal Mode, Müslümanların evlilik niyetiyle tanışması için daha iyi bir uygulama. Her gün özenle seçilmiş az sayıda tanışma sunar; böylece',
      heroBold: 'daha az gürültü. Daha güçlü bağlar.', comingSoon: 'Yakında',
      downloadOn: 'Şuradan indir', getItOn: 'Şuradan edin', join: 'Bekleme listesine katıl',
      early: 'Erken kaydolanlar önce davet edilir.',
      email: 'E-posta', city: 'Şehir', cityPlaceholder: 'ör. İstanbul', age: 'Yaş aralığı',
      choose: 'Seç…', notify: 'Bana haber ver',
      privacy: 'Bilgilerini yalnızca Halal Mode açıldığında haber vermek için kullanırız. Gereksiz mesaj yok, paylaşım yok.',
      questions: 'Sorun mu var?', soundOn: 'Ses açık', soundOff: 'Ses kapalı',
      soundToggle: 'Kalp sesi', availability: 'Uygulama durumu', photos: 'Fotoğraflar',
      validationEmail: 'Bu e-posta adresi doğru görünmüyor.',
      validationCity: 'Hangi şehirde olduğunu yaz.',
      validationAge: 'Yaş aralığını seç.',
      thanks: 'Teşekkürler! Listedesin. Halal Mode açıldığında sana e-posta göndereceğiz.',
      error: 'Bir sorun oldu. Biraz sonra tekrar dene.',
      howTitle: 'Halal Mode, Müslümanlar için daha iyi bir evlilik uygulaması.',
      feature1Title: 'Özenle seçilmiş beş tanışma. Her sabah namazında.',
      feature1Body: 'Daha az gürültü, daha iyi uyum, daha ciddi niyet.',
      feature2Title: 'Görünüş önemli, ama özel kalır.',
      feature2Body: 'Boy ve vücut yapısı daha iyi eşleşmeler bulmamıza yardımcı olur; herkese açık filtrelere dönüşmez.',
      feature3Title: 'Sohbetin bir anlamı olsun.',
      feature3Body: 'Serbestçe sohbet etmeden önce ikiniz de tanışmaya yardımcı soruları yanıtlarsınız. Karşı tarafın cevaplarını ancak kendi cevaplarını verdikten sonra görürsün.',
      feature4Title: 'Halal Cards: birlikte öğrenin, keyif alın.',
      feature4Body: 'İlişki Laboratuvarı kısa atölyelerden oluşur: ikiniz de gerçek hayattan senaryoları ayrı ayrı yanıtlarsınız, sonra her seçimin nereye götürdüğünü görür ve konuşursunuz. İlişki testleri ve kendi yolunu seç hikâyeleri de var — öğrenmek, birbirinizi tanımak ve eğlenmek için.',
      feature4Free: 'İkisini tek başınıza ücretsiz deneyebilirsiniz: bir Laboratuvar atölyesi ve bir hikâye. Halal Mode Premium 35’inin hepsini açar — 13 senaryolu 4 atölye, her aşama için 16 test ve 15 hikâye — her eşleşmeyle oynayın, karşı taraf için ücretsiz.'
    },
    fa: {
      language: 'انتخاب زبان', navHow: 'چطور کار می‌کند', heroTitle: 'ازدواج را جدی بگیریم.',
      heroIntro: 'حلال مود راه بهتری برای آشنایی مسلمان‌ها با هدف ازدواج است. هر روز چند آشنایی با دقت انتخاب‌شده به شما پیشنهاد می‌شود تا',
      heroBold: 'شلوغی کمتر باشد. ارتباط‌ها بهتر شوند.', comingSoon: 'به‌زودی',
      downloadOn: 'دریافت از', getItOn: 'دریافت از', join: 'عضویت در فهرست انتظار',
      early: 'کسانی که زودتر ثبت‌نام کنند، زودتر دعوت می‌شوند.',
      email: 'ایمیل', city: 'شهر', cityPlaceholder: 'مثلاً تهران', age: 'بازهٔ سنی',
      choose: 'انتخاب کنید…', notify: 'به من خبر بدهید',
      privacy: 'از اطلاعات شما فقط برای خبر دادنِ زمان شروع حلال مود استفاده می‌کنیم. پیام اضافه نمی‌فرستیم و آن را با کسی به اشتراک نمی‌گذاریم.',
      questions: 'سؤالی دارید؟', soundOn: 'صدا روشن', soundOff: 'صدا خاموش',
      soundToggle: 'صدای قلب', availability: 'وضعیت برنامه', photos: 'عکس‌ها',
      validationEmail: 'این آدرس ایمیل درست به نظر نمی‌رسد.',
      validationCity: 'شهرتان را بنویسید.',
      validationAge: 'بازهٔ سنی‌تان را انتخاب کنید.',
      thanks: 'ممنون! اسم‌تان در فهرست ثبت شد. وقتی حلال مود شروع شود به شما ایمیل می‌زنیم.',
      error: 'مشکلی پیش آمد. کمی بعد دوباره امتحان کنید.',
      howTitle: 'حلال مود، راهی بهتر برای ازدواج مسلمان‌ها.',
      feature1Title: 'پنج آشنایی که با دقت انتخاب شده‌اند. هر روز وقت فجر.',
      feature1Body: 'شلوغی کمتر، تناسب بیشتر، نیت روشن‌تر.',
      feature2Title: 'ظاهر مهم است، اما خصوصی می‌ماند.',
      feature2Body: 'قد و اندام کمک می‌کنند گزینه‌های مناسب‌تری پیدا کنیم، بدون فیلترهای عمومی.',
      feature3Title: 'گفت‌وگو را با شناخت شروع کنید.',
      feature3Body: 'پیش از گفت‌وگوی آزاد، هر دو به چند سؤال آشناییِ معنادار جواب می‌دهید. جواب‌های طرف مقابل را هم فقط بعد از پاسخ دادن خودتان می‌بینید.',
      feature4Title: 'کارت‌های حلال: با هم یاد بگیرید، و لذت ببرید.',
      feature4Body: 'آزمایشگاه رابطه مجموعه‌ای از کارگاه‌های کوتاه است: هر کدام جداگانه به موقعیت‌هایی از زندگی واقعی جواب می‌دهید، بعد می‌بینید هر انتخاب به کجا می‌رسد و درباره‌اش حرف می‌زنید. آزمونک‌های رابطه و داستان‌هایی که مسیرشان را خودتان انتخاب می‌کنید هم هست — برای یادگرفتن، شناختن هم و سرگرمی.',
      feature4Free: 'دو مورد را می‌توانید رایگان و به‌تنهایی امتحان کنید: یک کارگاه و یک داستان. حلال مود Premium همهٔ 35 مورد را باز می‌کند — 4 کارگاه با 13 موقعیت، 16 آزمونک برای هر مرحله و 15 داستان — برای بازی با هر آشنایی، برای طرف مقابل رایگان.'
    },
    ha: {
      language: 'Zaɓi harshe', navHow: 'Yadda yake aiki', heroTitle: 'Aure abu ne mai muhimmanci.',
      heroIntro: 'Halal Mode manhaja ce mafi kyau ga Musulmai masu neman aure. Kowace rana za ku ga ƴan gabatarwa da aka zaɓa da kyau, domin',
      heroBold: 'Hayaniya ta ragu. Haɗuwa mai ma’ana ta ƙaru.', comingSoon: 'Na nan tafe',
      downloadOn: 'Sauke daga', getItOn: 'Samu a', join: 'Shiga jerin masu jira',
      early: 'Waɗanda suka fara shiga za su fara samun gayyata.',
      email: 'Imel', city: 'Birni', cityPlaceholder: 'misali Kano', age: 'Shekaru',
      choose: 'Zaɓa…', notify: 'A sanar da ni',
      privacy: 'Za mu yi amfani da bayananku ne kawai don sanar da ku idan Halal Mode ta fara. Babu saƙonnin banza, kuma ba za mu raba su ba.',
      questions: 'Akwai tambaya?', soundOn: 'Sauti a kunne', soundOff: 'Sauti a kashe',
      soundToggle: 'Sautin zuciya', availability: 'Samuwar manhajar', photos: 'Hotuna',
      validationEmail: 'Adireshin imel ɗin nan bai yi daidai ba.',
      validationCity: 'Faɗa mana birninku.',
      validationAge: 'Zaɓi rukunin shekarunku.',
      thanks: 'Na gode! An saka ku a jerin. Za mu turo muku imel idan Halal Mode ta fara.',
      error: 'An samu matsala. Ku sake gwadawa nan gaba kaɗan.',
      howTitle: 'Halal Mode, hanya mafi kyau ga Musulmai masu neman aure.',
      feature1Title: 'Gabatarwa biyar da aka zaɓa da kyau. Kowace asuba bayan sallar Fajr.',
      feature1Body: 'Ƙarancin hayaniya, dacewa mai kyau, niyya mai kyau.',
      feature2Title: 'Kamanni na da muhimmanci, amma bayananka na sirri ne.',
      feature2Body: 'Tsayi da sigar jiki suna taimaka mana wajen haɗa masu dacewa, ba tare da matattarar da kowa zai gani ba.',
      feature3Title: 'Ku fara hira da fahimtar juna.',
      feature3Body: 'Kafin ku yi hira yadda kuke so, ku duka za ku amsa tambayoyin sanin juna masu ma’ana. Sai kun amsa naku kafin ku ga amsoshin ɗayan.',
      feature4Title: 'Halal Cards: ku koya tare, ku kuma ji daɗi.',
      feature4Body: 'Relationship Lab jerin gajerun bita ne: kowannenku yana amsa yanayin rayuwa ta gaske a ɓoye, sannan ku ga inda kowane zaɓi zai kai ku tattauna. Akwai kuma tambayoyi game da dangantaka da labarai da kuke zaɓar hanyarsu — don koyo, sanin juna, da nishaɗi.',
      feature4Free: 'Za ku iya gwada guda biyu kyauta da kanku: bita ɗaya ta Lab da labari ɗaya. Halal Mode Premium yana buɗe duka 35 — bita 4 masu yanayi 13, tambayoyi 16 na kowane mataki da labarai 15 — don yin wasa da kowane wanda kuka dace, kyauta gare shi/ita.'
    },
    am: {
      language: 'ቋንቋ ይምረጡ', navHow: 'እንዴት ይሰራል', heroTitle: 'ጋብቻ ቁም ነገር ነው።',
      heroIntro: 'Halal Mode ሙስሊሞች ለጋብቻ እንዲተዋወቁ የሚረዳ የተሻለ መተግበሪያ ነው። በየቀኑ በጥንቃቄ የተመረጡ ጥቂት ሰዎችን ያስተዋውቅዎታል። ይህም ማለት',
      heroBold: 'ጫጫታ ያንሳል። ጥሩ ግንኙነት ይጨምራል።', comingSoon: 'በቅርቡ',
      downloadOn: 'ከዚህ ያውርዱ', getItOn: 'ከዚህ ያግኙ', join: 'በመጠበቂያ ዝርዝሩ ይመዝገቡ',
      early: 'ቀድመው የተመዘገቡ ቀድመው ግብዣ ያገኛሉ።',
      email: 'ኢሜይል', city: 'ከተማ', cityPlaceholder: 'ለምሳሌ፣ አዲስ አበባ', age: 'የዕድሜ ክልል',
      choose: 'ይምረጡ…', notify: 'አሳውቁኝ',
      privacy: 'መረጃዎን Halal Mode ሲጀምር ለማሳወቅ ብቻ እንጠቀማለን። አላስፈላጊ መልዕክት አንልክም፣ ለሌላም አናጋራም።',
      questions: 'ጥያቄ አለዎት?', soundOn: 'ድምፅ በርቷል', soundOff: 'ድምፅ ጠፍቷል',
      soundToggle: 'የልብ ድምፅ', availability: 'የመተግበሪያው ሁኔታ', photos: 'ፎቶዎች',
      validationEmail: 'የኢሜይል አድራሻዎ ትክክል አይመስልም።',
      validationCity: 'የትኛው ከተማ እንደሆኑ ይንገሩን።',
      validationAge: 'የዕድሜ ክልልዎን ይምረጡ።',
      thanks: 'እናመሰግናለን! በዝርዝሩ ውስጥ ነዎት። Halal Mode ሲጀምር ኢሜይል እንልክልዎታለን።',
      error: 'ትንሽ ችግር ተፈጥሯል። እባክዎ ከጥቂት ጊዜ በኋላ እንደገና ይሞክሩ።',
      howTitle: 'Halal Mode፣ ለሙስሊሞች የተሻለ የጋብቻ መተግበሪያ።',
      feature1Title: 'በጥንቃቄ የተመረጡ አምስት መተዋወቆች። በየፈጅር ሰዓት።',
      feature1Body: 'ጫጫታ ያንሳል፣ ተስማሚ ሰዎች ይበዛሉ፣ ዓላማም ግልጽ ይሆናል።',
      feature2Title: 'መልክ አስፈላጊ ነው፣ ግን መረጃዎ የግል ነው።',
      feature2Body: 'ቁመትና የሰውነት አቋም ተስማሚ ሰው ለማግኘት ይረዱናል፤ ለሁሉም የሚታይ ማጣሪያ ግን የለም።',
      feature3Title: 'ውይይቱ በትርጉም ይጀምር።',
      feature3Body: 'በነፃ መወያየት ከመጀመራችሁ በፊት ሁለታችሁም የሚያስተዋውቁ ጥያቄዎችን ትመልሳላችሁ። የሌላውን መልስ የምታዩት የራሳችሁን ከመለሳችሁ በኋላ ብቻ ነው።',
      feature4Title: 'ሃላል ካርድስ፦ አብራችሁ ተማሩ፣ ተደሰቱም።',
      feature4Body: 'የግንኙነት ላብ አጫጭር ወርክሾፖች ስብስብ ነው፦ እያንዳንዳችሁ ከእውነተኛ ሕይወት የተወሰዱ ሁኔታዎችን በግል ትመልሳላችሁ፣ ከዚያ እያንዳንዱ ምርጫ ወዴት እንደሚያመራ አይታችሁ ትወያያላችሁ። ስለ ግንኙነት ጥያቄዎችና መንገዳቸውን የምትመርጡባቸው ታሪኮችም አሉ — ለመማር፣ እርስ በርስ ለመተዋወቅና ለመዝናናት።',
      feature4Free: 'ሁለቱን ብቻችሁን በነጻ መሞከር ትችላላችሁ፦ አንድ የላብ ወርክሾፕና አንድ ታሪክ። ሃላል ሞድ Premium ሁሉንም 35 ይከፍታል — 13 ሁኔታዎች ያሏቸው 4 ወርክሾፖች፣ ለእያንዳንዱ ደረጃ 16 ጥያቄዎችና 15 ታሪኮች — ከማንኛውም ተዛማጅ ጋር ተጫወቱ፣ ለእነሱ በነጻ።'
    },
    so: {
      language: 'Dooro luqadda', navHow: 'Sida ay u shaqayso', heroTitle: 'Guurka si dhab ah ayaan u qaadannaa.',
      heroIntro: 'Halal Mode waa app ka wanaagsan oo Muslimiintu ku bartaan qof ay guursan karaan. Maalin kasta waxa lagu tusaa dad yar oo si taxaddar leh loo soo xulay, si aad u hesho',
      heroBold: 'buuq yar. Xiriir macno leh.', comingSoon: 'Dhawaan',
      downloadOn: 'Ka soo degso', getItOn: 'Ka hel', join: 'Ku biir liiska sugitaanka',
      early: 'Kuwa hore isu diiwaangeliya ayaa marka hore la casuumi doonaa.',
      email: 'Iimayl', city: 'Magaalo', cityPlaceholder: 'tusaale: Muqdisho', age: 'Da’da',
      choose: 'Dooro…', notify: 'I ogeysii',
      privacy: 'Xogtaada waxaannu u isticmaalnaa oo keliya inaan ku ogeysiino marka Halal Mode bilaabato. Farriimo aan loo baahnayn ma jiraan, cid kalena lama wadaagno.',
      questions: 'Su’aal ma qabtaa?', soundOn: 'Codka waa shidan yahay', soundOff: 'Codka waa dansan yahay',
      soundToggle: 'Codka wadnaha', availability: 'Helitaanka app-ka', photos: 'Sawirro',
      validationEmail: 'Cinwaanka iimaylka sax ma aha.',
      validationCity: 'Noo sheeg magaaladaada.',
      validationAge: 'Dooro da’daada.',
      thanks: 'Mahadsanid! Liiska ayaad ku jirtaa. Iimayl ayaan kuu soo diri doonnaa marka Halal Mode bilaabato.',
      error: 'Waxbaa khaldamay. Fadlan mar kale isku day wax yar ka dib.',
      howTitle: 'Halal Mode, hab ka wanaagsan oo Muslimiintu guur ku raadsadaan.',
      feature1Title: 'Shan isbarasho oo si fiican loo xulay. Fajr kasta.',
      feature1Body: 'Buuq yar, is-waafajin fiican, niyad cad.',
      feature2Title: 'Muuqaalku waa muhiim, laakiin xogtaadu waa gaar.',
      feature2Body: 'Dhererka iyo dhismaha jidhka ayaa naga caawiya inaan helno qof kugu habboon, iyada oo aan la samayn shaandhooyin dadweyne.',
      feature3Title: 'Wadahadalka ha yeesho macne.',
      feature3Body: 'Labadiinuba waxaad ka jawaabaysaan su’aalo isbarasho oo macno leh ka hor inta aadan si xor ah u sheekaysan. Jawaabaha qofka kale waxaad arki kartaa markaad adigu ka jawaabto.',
      feature4Title: 'Halal Cards: wada barta, oo ku raaxaysta.',
      feature4Body: 'Relationship Lab waa aqoon-is-weydaarsiyo gaagaaban: mid kastaa si gaar ah ayuu uga jawaabaa xaalado nolosha dhabta ah, kadibna waxaad arkaysaan meesha doorasho kastaa horseeddo oo aad ka wada hadlaysaan. Waxaa kale oo jira kediska xiriirka iyo sheekooyin aad adigu jidkooda dooranayso — waxbarasho, is-barasho iyo madadaalo.',
      feature4Free: 'Laba ayaad keligaa bilaash ku tijaabin kartaa: hal aqoon-is-weydaarsi oo Lab ah iyo hal sheeko. Halal Mode Premium wuxuu furaa dhammaan 35 — 4 aqoon-is-weydaarsi oo leh 13 xaaladood, 16 kediska oo heer kasta ah iyo 15 sheeko — si aad ula ciyaarto qof kasta oo aad isku aaddan tihiin, bilaash isaga/iyada.'
    },
    es: {
      language: 'Elegir idioma', navHow: 'Cómo funciona', heroTitle: 'El matrimonio merece atención.',
      heroIntro: 'Halal Mode es una forma mejor de conocer a alguien con intención de casarse. Cada día, unas pocas presentaciones elegidas con cuidado para tener',
      heroBold: 'menos ruido. Mejores conexiones.', comingSoon: 'Muy pronto',
      downloadOn: 'Descárgala en', getItOn: 'Consíguela en', join: 'Apúntate a la lista de espera',
      early: 'Invitaremos primero a quienes se apunten antes.',
      email: 'Correo electrónico', city: 'Ciudad', cityPlaceholder: 'p. ej., Madrid', age: 'Rango de edad',
      choose: 'Elige…', notify: 'Avísame',
      privacy: 'Solo usaremos tus datos para avisarte cuando abra Halal Mode. Sin spam y sin compartirlos.',
      questions: '¿Alguna pregunta?', soundOn: 'Sonido activado', soundOff: 'Sonido desactivado',
      soundToggle: 'Sonido del corazón', availability: 'Disponibilidad de la app', photos: 'Fotos',
      validationEmail: 'Ese correo no parece correcto.',
      validationCity: 'Dinos en qué ciudad estás.',
      validationAge: 'Elige un rango de edad.',
      thanks: '¡Gracias! Ya estás en la lista. Te escribiremos cuando abra Halal Mode.',
      error: 'Algo ha fallado. Prueba otra vez en un momento.',
      howTitle: 'Halal Mode, una forma mejor de buscar matrimonio musulmán.',
      feature1Title: 'Cinco presentaciones elegidas con cuidado. Cada Fajr.',
      feature1Body: 'Menos ruido, más compatibilidad y una intención clara.',
      feature2Title: 'El aspecto importa, pero sigue siendo privado.',
      feature2Body: 'La altura y la complexión nos ayudan a encontrar mejores parejas, sin filtros públicos.',
      feature3Title: 'Que la conversación tenga sentido.',
      feature3Body: 'Antes de chatear libremente, los dos respondéis preguntas para conoceros mejor. Solo verás sus respuestas cuando hayas dado las tuyas.',
      feature4Title: 'Halal Cards: aprended juntos, y pasadlo bien.',
      feature4Body: 'El Relationship Lab es una serie de talleres cortos: cada uno responde en privado a situaciones de la vida real y luego veis adónde lleva cada decisión y lo habláis. También hay cuestionarios sobre la relación e historias en las que elegís el camino — para aprender, conoceros y divertiros.',
      feature4Free: 'Dos se pueden probar gratis a solas: un taller del Lab y una historia. Halal Mode Premium abre las 35 — 4 talleres con 13 situaciones, 16 cuestionarios para cada etapa y 15 historias — para jugar con cualquier conexión, gratis para la otra persona.'
    },
    ru: {
      language: 'Выбрать язык', navHow: 'Как это работает', heroTitle: 'К браку — серьёзно.',
      heroIntro: 'Halal Mode помогает мусульманам знакомиться для брака по-новому. Каждый день — несколько тщательно подобранных знакомств, чтобы было',
      heroBold: 'меньше шума. Больше настоящего общения.', comingSoon: 'Скоро',
      downloadOn: 'Скачать в', getItOn: 'Доступно в', join: 'Записаться в лист ожидания',
      early: 'Кто запишется раньше, получит приглашение раньше.',
      email: 'Эл. почта', city: 'Город', cityPlaceholder: 'например, Москва', age: 'Возраст',
      choose: 'Выберите…', notify: 'Сообщите мне',
      privacy: 'Мы используем ваши данные только для сообщения о запуске Halal Mode. Без спама и передачи третьим лицам.',
      questions: 'Есть вопросы?', soundOn: 'Звук включён', soundOff: 'Звук выключен',
      soundToggle: 'Звук сердца', availability: 'Доступность приложения', photos: 'Фото',
      validationEmail: 'Похоже, адрес электронной почты указан неверно.',
      validationCity: 'Укажите свой город.',
      validationAge: 'Выберите возрастную группу.',
      thanks: 'Спасибо! Вы в списке. Мы напишем вам, когда Halal Mode запустится.',
      error: 'Что-то пошло не так. Попробуйте ещё раз чуть позже.',
      howTitle: 'Halal Mode — лучшее приложение для знакомства мусульман с целью брака.',
      feature1Title: 'Пять тщательно подобранных знакомств. Каждое утро после фаджра.',
      feature1Body: 'Меньше шума, больше совместимости и серьёзных намерений.',
      feature2Title: 'Внешность важна, но эти данные остаются личными.',
      feature2Body: 'Рост и телосложение помогают нам подобрать подходящего человека без открытых фильтров.',
      feature3Title: 'Сначала узнайте друг друга.',
      feature3Body: 'Прежде чем свободно общаться, вы оба ответите на важные вопросы для знакомства. Ответы другого человека откроются только после ваших.',
      feature4Title: 'Halal Cards: учитесь вместе и получайте удовольствие.',
      feature4Body: 'Relationship Lab — это короткие мастерские: каждый отвечает наедине на ситуации из реальной жизни, а потом вы видите, к чему ведёт каждый выбор, и обсуждаете. Есть также викторины об отношениях и истории, в которых вы сами выбираете путь, — чтобы учиться, узнавать друг друга и веселиться.',
      feature4Free: 'Две можно бесплатно попробовать в одиночку: одну мастерскую и одну историю. Halal Mode Premium открывает все 35 — 4 мастерские с 13 ситуациями, 16 викторин для каждого этапа и 15 историй — чтобы играть с любым знакомством, для второго бесплатно.'
    },
    'zh-Hans': {
      language: '选择语言', navHow: '使用方式', heroTitle: '认真对待婚姻。',
      heroIntro: 'Halal Mode 是一款更适合穆斯林寻找婚姻伴侣的应用。每天只为你精选少量介绍，让你',
      heroBold: '少些干扰，多些真诚的连接。', comingSoon: '即将上线',
      downloadOn: '下载于', getItOn: '获取于', join: '加入等候名单',
      early: '越早加入，越早收到邀请。',
      email: '邮箱', city: '城市', cityPlaceholder: '例如：北京', age: '年龄范围',
      choose: '请选择…', notify: '上线时通知我',
      privacy: '我们只会用你的信息通知你 Halal Mode 上线。不会发垃圾消息，也不会分享给别人。',
      questions: '有疑问？', soundOn: '声音已开启', soundOff: '声音已关闭',
      soundToggle: '爱心音效', availability: '应用上线情况', photos: '照片',
      validationEmail: '这个邮箱地址似乎不对。',
      validationCity: '请填写你的城市。',
      validationAge: '请选择年龄范围。',
      thanks: '谢谢！你已加入名单。Halal Mode 上线时我们会发邮件通知你。',
      error: '出了点问题，请稍后再试。',
      howTitle: 'Halal Mode，让穆斯林更好地寻找婚姻伴侣。',
      feature1Title: '每天晨礼时，五位精心挑选的介绍对象。',
      feature1Body: '少些干扰，更合适的匹配，更明确的心意。',
      feature2Title: '外貌重要，但你的信息保持私密。',
      feature2Body: '身高和体型能帮我们找到更合适的人，但不会成为公开筛选条件。',
      feature3Title: '先用心认识，再自由聊天。',
      feature3Body: '你们都要先回答几个有意义的破冰问题，之后才能自由聊天。只有回答后，你才能看到对方的答案。',
      feature4Title: 'Halal Cards：一起学习，一起开心。',
      feature4Body: '关系实验室是一组简短的工作坊：你们各自私下回答真实生活中的情景，然后看到每个选择会带来什么，并一起聊聊。还有关系测验和自选路线故事——为了学习、彼此了解，也为了开心。',
      feature4Free: '有两项可以免费独自体验：一个实验室工作坊和一个故事。Halal Mode Premium 解锁全部 35 项——4 个工作坊共 13 个情景、16 个覆盖各个阶段的测验和 15 个故事——可与任何配对一起玩，对方免费。'
    }
  };

  const storageKey = 'halalmode-language';
  let language = 'en';
  try {
    const saved = localStorage.getItem(storageKey);
    if (Object.prototype.hasOwnProperty.call(copy, saved)) language = saved;
  } catch (_) {}

  function t(key) {
    return copy[language][key] || copy.en[key] || '';
  }

  function updateSound() {
    const button = document.getElementById('sound-control');
    if (!button) return;
    const on = button.getAttribute('aria-pressed') !== 'false';
    button.textContent = t(on ? 'soundOn' : 'soundOff');
    button.setAttribute('aria-label', t('soundToggle') + ': ' + t(on ? 'soundOn' : 'soundOff'));
    button.title = t('soundToggle');
  }

  function apply() {
    document.documentElement.lang = language;
    document.documentElement.dir = /^(ar|ur|fa)$/.test(language) ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    const stores = document.querySelectorAll('.store[role=img]');
    stores.forEach((el, index) => el.setAttribute('aria-label', (index ? 'Google Play' : 'App Store') + ' — ' + t('comingSoon')));
    const message = document.getElementById('msg');
    if (message && message.dataset.messageKey) message.textContent = t(message.dataset.messageKey);
    updateSound();
    const how = /^\/how-it-works(?:\.html)?\/?$/.test(location.pathname);
    document.title = how ? t('howTitle') : 'Halal Mode — ' + t('heroTitle');
    const description = document.querySelector('meta[name=description]');
    if (description) description.content = how ? t('feature1Title') + ' ' + t('feature1Body') : t('heroIntro') + ' ' + t('heroBold');
    document.querySelectorAll('.language-option').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    const trigger = document.querySelector('.language-trigger');
    const menu = document.getElementById('language-menu');
    if (menu) menu.setAttribute('aria-label', t('language'));
    if (trigger) {
      trigger.setAttribute('aria-label', t('language'));
      trigger.title = t('language');
    }
  }

  function select(code) {
    if (!Object.prototype.hasOwnProperty.call(copy, code)) return;
    language = code;
    try { localStorage.setItem(storageKey, code); } catch (_) {}
    apply();
  }

  function buildSelector() {
    const header = document.querySelector('header');
    const nav = header && header.querySelector('.nav');
    if (!nav) return;
    const actions = document.createElement('div');
    actions.className = 'header-actions';
    nav.before(actions);
    actions.append(nav);
    const picker = document.createElement('div');
    picker.className = 'language-picker';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'language-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'language-menu');
    trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-2.5 2.4-4 5.5-4 9s1.5 6.6 4 9M12 3c2.5 2.4 4 5.5 4 9s-1.5 6.6-4 9"/></svg>';
    const menu = document.createElement('div');
    menu.id = 'language-menu';
    menu.className = 'language-menu';
    menu.setAttribute('role', 'group');
    menu.hidden = true;
    for (const [code, name] of Object.entries(names)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'language-option';
      button.dataset.language = code;
      button.lang = code;
      button.dir = 'auto';
      button.textContent = name;
      button.addEventListener('click', () => { select(code); close(); trigger.focus(); });
      menu.append(button);
    }
    picker.append(trigger, menu);
    actions.append(picker);
    function close() {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
    trigger.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      trigger.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden) menu.querySelector('[aria-pressed=true]')?.focus();
    });
    document.addEventListener('pointerdown', event => {
      if (!picker.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) { close(); trigger.focus(); }
    });
  }

  window.HalalI18n = { t, select, updateSound, get language() { return language; } };
  buildSelector();
  apply();
})();
