(function () {
  'use strict';

  const names = {
    en: 'English', ar: 'العربية', fa: 'فارسی', ur: 'اردو',
    hi: 'हिन्दी', bn: 'বাংলা', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu',
    fr: 'Français', tr: 'Türkçe', ha: 'Hausa',
    am: 'አማርኛ', so: 'Soomaali', es: 'Español', ru: 'Русский',
    'zh-Hans': '简体中文'
  };

  // Phonetic spellings for ordinary text. The single English logo remains unchanged.
  const brandNames = {
    en: 'Halal Mode', ar: 'حلال مود', ur: 'حلال موڈ', fa: 'حلال مود',
    hi: 'हलाल मोड', id: 'Halal Mode', ms: 'Halal Mode', bn: 'হালাল মোড',
    fr: 'Halal Mode', tr: 'Halal Mode', ha: 'Halal Mode', am: 'ሃላል ሞድ',
    so: 'Halal Mode', es: 'Halal Mode', ru: 'Халал Мод',
    'zh-Hans': '哈拉尔·莫德'
  };

  const copy = {
    en: {
      confirmTitle: 'One step left', confirmBody: 'Confirm your email to see your referral link. If a friend invited you, this is also what counts it for them.', confirmButton: 'Confirm my email', tierCount: '{{joined}} of {{goal}}',
      referralLinkTitle: 'Here is your shareable referral link!', referralLinkLabel: 'Your referral link', rewardMonth1: 'Your 1 month of Premium is automatically reserved for launch.', rewardMonths: 'Your {{months}} months of Premium are automatically reserved for launch.', shareMessage: 'I’m on the Halal Mode waitlist. It’s a Muslim marriage app built around fewer, more thoughtful introductions.\n\nJoin the waitlist here: {{url}}',
      bubbleHim2: 'Have you heard of Halal Mode?', bubbleHer2: 'Yeah, actually I have!',
      offerFree: '1 month of Premium, free', offerFreeFor: 'for the first 10,000 people', joinedTitle: 'You’re in.', joinedBody: 'Thank you for being one of the first 10,000. Your free month of Premium is reserved for launch, and a note is on its way to your inbox.', joinedBodyLate: 'Thank you for joining. Your place is saved, and a note is on its way to your inbox. We’ll write to you when Halal Mode opens.', emailSuggest: 'Did you mean {{email}}?', referFormTitle: 'Get your referral link', referFormButton: 'Email me my link', referFormSent: 'If that email is on the waitlist, your referral link is on its way.',
      bubbleHim: 'Nice to meet you.', bubbleHer: 'Nice to meet you too.',
      language: 'Choose language', navHow: 'How it works', navRefer: 'Refer your friends', heroTitle: 'Marriage, taken seriously.',
      heroIntro: 'Halal Mode is a better Muslim marriage app, built around a small, curated set of introductions each day. It’s intentionally designed for',
      heroBold: 'less noise and better connections.', comingSoon: 'Coming soon',
      downloadOn: 'Download on the', getItOn: 'Get it on', join: 'Join the waitlist',
      early: 'Early members are invited first, in the order they joined.',
      email: 'Email', city: 'City', cityPlaceholder: 'e.g. London', age: 'Age range',
      choose: 'Choose…', notify: 'Notify me', waitlistOffer: 'Join the first 10,000 people on Halal Mode and automatically get 1 month of Premium free at launch.',
      waitlistButton: 'Join the waitlist', offerFine: 'Limited to the first 10,000 signups.',
      privacy: 'We use your details only to tell you when Halal Mode opens. No spam, and never shared.',
      questions: 'Questions?', soundOn: 'Sound on', soundOff: 'Sound off',
      soundToggle: 'Squeeze sound', availability: 'App availability', photos: 'Photos',
      coverStyle: 'Cover style', coverDots: 'Dots', coverHearts: 'Chrome hearts', coverCouple: 'Couple',
      validationEmail: 'That email address does not look right.',
      validationCity: 'Please tell us which city you are in.',
      validationAge: 'Please choose an age range.',
      thanks: 'Thank you, you are on the list. We will email you when Halal Mode opens.',
      almostThereTitle: 'Almost there.', almostThereBody: 'Check your email to confirm your place on the waitlist.',
      referralTitle: 'Refer your friends', referralBody: 'Invite a few good people and unlock more Premium.',
      reward3: '3 joins → 3 months free', reward5: '5 joins → 6 months free', reward10: '10 joins → 1 year free',
      referralNote: 'Referrals count once your friend verifies their email.',
      shareWhatsApp: 'WhatsApp', copyInvite: 'Copy invite link', copiedInvite: 'Copied',
      verifiedTitle: 'You’re in ✓', verifiedEligible: 'Your Premium reward is automatically reserved for launch.',
      verifiedNotEligible: 'Your email is verified and your place on the waitlist is reserved.',
      verificationError: 'This waitlist link is invalid or expired.',
      error: 'Something went wrong. Please try again in a moment.',
      howTitle: 'Halal Mode, a better Muslim marriage app.',
      feature1Title: 'Five thoughtfully selected introductions. Every Fajr.',
      feature1Body: 'Less noise, better matches, more intention.',
      feature2Title: 'Looks matter, but they stay private.',
      feature2Body: 'Height and build help us match you better without public filters.',
      feature3Title: 'Earn the conversation.',
      feature3Body: 'You both answer meaningful icebreakers before you can chat freely, and you only see their answers once you’ve answered too.',
      cardsTitle: 'Halal Cards. Learn and play together.',
      cardsBody: '{{count}} guided quizzes, activities and adventures that help couples understand each other, grow closer and build a stronger marriage. Available in {{languages}} languages.',
    },
    ar: {
      confirmTitle: 'خطوة أخيرة', confirmBody: 'أكّد بريدك الإلكتروني لترى رابط الدعوة الخاص بك. وإذا دعاك صديق، فبهذا تُحتسب دعوته.', confirmButton: 'تأكيد بريدي', tierCount: '{{joined}} من {{goal}}',
      referralLinkTitle: 'إليك رابط الدعوة الخاص بك للمشاركة!', referralLinkLabel: 'رابط الدعوة الخاص بك', rewardMonth1: 'شهر بريميوم الخاص بك محجوز تلقائيًا للإطلاق.', rewardMonths: '{{months}} أشهر من بريميوم محجوزة لك تلقائيًا للإطلاق.', shareMessage: 'أنا في قائمة انتظار حلال مود، تطبيق زواج للمسلمين يقدّم تعارفًا أقل وأكثر عناية.\n\nسجّل في قائمة الانتظار من هنا: {{url}}',
      navRefer: 'ادعُ أصدقاءك', referralTitle: 'ادعُ أصدقاءك', referralBody: 'ادعُ بعض الأشخاص الطيبين واحصل على المزيد من بريميوم.', referralNote: 'تُحتسب الدعوة بعد أن يؤكد صديقك بريده الإلكتروني.', reward3: '3 انضمامات ← 3 أشهر مجانًا', reward5: '5 انضمامات ← 6 أشهر مجانًا', reward10: '10 انضمامات ← سنة مجانًا', copyInvite: 'انسخ رابط الدعوة', copiedInvite: 'تم النسخ', shareWhatsApp: 'واتساب', almostThereTitle: 'خطوة أخيرة.', almostThereBody: 'تفقّد بريدك الإلكتروني لتأكيد مكانك في قائمة الانتظار.', verificationError: 'رابط قائمة الانتظار هذا غير صالح أو منتهي الصلاحية.', verifiedEligible: 'مكافأة بريميوم الخاصة بك محجوزة تلقائيًا للإطلاق.', verifiedNotEligible: 'تم تأكيد بريدك الإلكتروني وحجز مكانك في قائمة الانتظار.', waitlistOffer: 'كن من أول 10,000 شخص في حلال مود واحصل تلقائيًا على شهر بريميوم مجانًا عند الإطلاق.', verifiedTitle: 'أنت معنا ✓', waitlistButton: 'سجّل في قائمة الانتظار',
      bubbleHim2: 'هل سمعتِ بحلال مود؟', bubbleHer2: 'نعم، في الحقيقة سمعت به!',
      offerFine: 'العرض لأول 10,000 مسجّل فقط.',
      offerFree: 'شهر بريميوم مجانًا', offerFreeFor: 'لأول 10,000 شخص', joinedTitle: 'أنت معنا.', joinedBody: 'شكرًا لأنك من أول 10,000. شهر البريميوم المجاني محجوز لك عند الإطلاق، ورسالة في طريقها إلى بريدك.', joinedBodyLate: 'شكرًا لانضمامك. مكانك محفوظ، ورسالة في طريقها إلى بريدك. سنراسلك عند إطلاق حلال مود.', emailSuggest: 'هل تقصد {{email}}؟', referFormTitle: 'احصل على رابط الدعوة', referFormButton: 'أرسل لي الرابط', referFormSent: 'إذا كان هذا البريد في قائمة الانتظار، فرابط الدعوة في طريقه إليك.',
      bubbleHim: 'تشرّفنا.', bubbleHer: 'الشرف لي.',
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
      coverStyle: 'نمط الغلاف', coverDots: 'نقاط', coverHearts: 'قلوب كروم', coverCouple: 'الزوجان',
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
      cardsTitle: 'بطاقات حلال. تعلّما والعبا معًا.',
      cardsBody: '{{count}} من الاختبارات والأنشطة والمغامرات الموجّهة التي تساعد الأزواج على فهم بعضهم، والتقرّب، وبناء زواج أقوى. متاحة بـ{{languages}} لغة.'
    },
    ur: {
      confirmTitle: 'بس ایک قدم باقی', confirmBody: 'اپنا ریفرل لنک دیکھنے کے لیے اپنی ای میل کی تصدیق کریں۔ اگر کسی دوست نے آپ کو مدعو کیا ہے تو اسی سے ان کا ریفرل شمار ہوگا۔', confirmButton: 'میری ای میل کی تصدیق کریں', tierCount: '{{goal}} میں سے {{joined}}',
      referralLinkTitle: 'یہ رہا آپ کا شیئر کرنے والا ریفرل لنک!', referralLinkLabel: 'آپ کا ریفرل لنک', rewardMonth1: 'آپ کا ایک مہینہ پریمیم لانچ کے لیے خود بخود محفوظ ہے۔', rewardMonths: 'آپ کے {{months}} مہینے پریمیم لانچ کے لیے خود بخود محفوظ ہیں۔', shareMessage: 'میں حلال موڈ کی انتظار کی فہرست میں ہوں۔ یہ مسلمانوں کے لیے شادی کی ایپ ہے جو کم مگر سوچ سمجھ کر کیے گئے تعارف پیش کرتی ہے۔\n\nیہاں انتظار کی فہرست میں شامل ہوں: {{url}}',
      navRefer: 'دوستوں کو مدعو کریں', referralTitle: 'دوستوں کو مدعو کریں', referralBody: 'چند اچھے لوگوں کو مدعو کریں اور مزید پریمیم حاصل کریں۔', referralNote: 'ریفرل تب شمار ہوگا جب آپ کا دوست اپنی ای میل کی تصدیق کر لے۔', reward3: '3 شمولیتیں ← 3 مہینے مفت', reward5: '5 شمولیتیں ← 6 مہینے مفت', reward10: '10 شمولیتیں ← 1 سال مفت', copyInvite: 'دعوتی لنک کاپی کریں', copiedInvite: 'کاپی ہو گیا', shareWhatsApp: 'واٹس ایپ', almostThereTitle: 'بس ایک قدم باقی۔', almostThereBody: 'انتظار کی فہرست میں اپنی جگہ کی تصدیق کے لیے اپنی ای میل دیکھیں۔', verificationError: 'یہ لنک درست نہیں یا اس کی میعاد ختم ہو چکی ہے۔', verifiedEligible: 'آپ کا پریمیم انعام لانچ کے لیے خود بخود محفوظ ہو گیا ہے۔', verifiedNotEligible: 'آپ کی ای میل کی تصدیق ہو گئی ہے اور انتظار کی فہرست میں آپ کی جگہ محفوظ ہے۔', waitlistOffer: 'حلال موڈ کے پہلے 10,000 لوگوں میں شامل ہوں اور لانچ پر خود بخود ایک مہینہ پریمیم مفت پائیں۔', verifiedTitle: 'آپ شامل ہو گئے ✓', waitlistButton: 'انتظار کی فہرست میں شامل ہوں',
      bubbleHim2: 'کیا آپ نے حلال موڈ کے بارے میں سنا ہے؟', bubbleHer2: 'جی ہاں، دراصل سنا ہے!',
      offerFine: 'صرف پہلے 10,000 سائن اپس کے لیے۔',
      offerFree: 'ایک مہینہ پریمیم، مفت', offerFreeFor: 'پہلے 10,000 لوگوں کے لیے', joinedTitle: 'آپ شامل ہو گئے۔', joinedBody: 'پہلے 10,000 میں شامل ہونے کا شکریہ۔ آپ کا مفت پریمیم مہینہ لانچ کے لیے محفوظ ہے، اور ایک پیغام آپ کے ان باکس کی طرف آ رہا ہے۔', joinedBodyLate: 'شامل ہونے کا شکریہ۔ آپ کی جگہ محفوظ ہے، اور ایک پیغام آپ کے ان باکس کی طرف آ رہا ہے۔ حلال موڈ کھلنے پر ہم آپ کو لکھیں گے۔', emailSuggest: 'کیا آپ کا مطلب {{email}} تھا؟', referFormTitle: 'اپنا ریفرل لنک حاصل کریں', referFormButton: 'مجھے لنک ای میل کریں', referFormSent: 'اگر یہ ای میل ویٹ لسٹ میں ہے تو آپ کا ریفرل لنک آ رہا ہے۔',
      bubbleHim: 'آپ سے مل کر خوشی ہوئی۔', bubbleHer: 'مجھے بھی آپ سے مل کر خوشی ہوئی۔',
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
      coverStyle: 'سرورق کا انداز', coverDots: 'نقطے', coverHearts: 'کروم دل', coverCouple: 'جوڑا',
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
      cardsTitle: 'حلال کارڈز۔ ساتھ سیکھیں اور کھیلیں۔',
      cardsBody: '{{count}} رہنمائی والے کوئزز، سرگرمیاں اور مہمات، جو جوڑوں کو ایک دوسرے کو سمجھنے، قریب آنے اور مضبوط ازدواجی زندگی بنانے میں مدد دیں۔ {{languages}} زبانوں میں دستیاب۔'
    },
    hi: {
      confirmTitle: 'बस एक कदम और', confirmBody: 'अपना रेफ़रल लिंक देखने के लिए अपना ईमेल कन्फ़र्म करें। अगर किसी दोस्त ने आपको बुलाया है, तो इसी से उनका रेफ़रल गिना जाएगा।', confirmButton: 'मेरा ईमेल कन्फ़र्म करें', tierCount: '{{goal}} में से {{joined}}',
      referralLinkTitle: 'यह रहा आपका शेयर करने लायक रेफ़रल लिंक!', referralLinkLabel: 'आपका रेफ़रल लिंक', rewardMonth1: 'आपका 1 महीना प्रीमियम लॉन्च के लिए अपने आप रिज़र्व है।', rewardMonths: 'आपके {{months}} महीने प्रीमियम लॉन्च के लिए अपने आप रिज़र्व हैं।', shareMessage: 'मैं हलाल मोड की वेटलिस्ट में हूँ। यह मुसलमानों के लिए शादी का ऐप है, जिसमें कम लेकिन सोच-समझकर चुने गए परिचय मिलते हैं।\n\nयहाँ वेटलिस्ट में जुड़ें: {{url}}',
      navRefer: 'दोस्तों को बुलाएँ', referralTitle: 'दोस्तों को बुलाएँ', referralBody: 'कुछ अच्छे लोगों को बुलाएँ और ज़्यादा प्रीमियम पाएँ।', referralNote: 'रेफ़रल तब गिना जाता है जब आपका दोस्त अपना ईमेल कन्फ़र्म कर देता है।', reward3: '3 लोग जुड़ें → 3 महीने मुफ़्त', reward5: '5 लोग जुड़ें → 6 महीने मुफ़्त', reward10: '10 लोग जुड़ें → 1 साल मुफ़्त', copyInvite: 'इनवाइट लिंक कॉपी करें', copiedInvite: 'कॉपी हो गया', shareWhatsApp: 'WhatsApp', almostThereTitle: 'बस एक कदम और।', almostThereBody: 'वेटलिस्ट में अपनी जगह कन्फ़र्म करने के लिए अपना ईमेल देखें।', verificationError: 'यह वेटलिस्ट लिंक अमान्य है या इसकी समय-सीमा खत्म हो गई है।', verifiedEligible: 'आपका प्रीमियम इनाम लॉन्च के लिए अपने आप रिज़र्व हो गया है।', verifiedNotEligible: 'आपका ईमेल कन्फ़र्म हो गया है और वेटलिस्ट में आपकी जगह रिज़र्व है।', waitlistOffer: 'हलाल मोड के पहले 10,000 लोगों में शामिल हों और लॉन्च पर अपने आप 1 महीना प्रीमियम मुफ़्त पाएँ।', verifiedTitle: 'आप शामिल हो गए ✓', waitlistButton: 'वेटलिस्ट में जुड़ें',
      bubbleHim2: 'क्या आपने हलाल मोड के बारे में सुना है?', bubbleHer2: 'हाँ, असल में सुना है!',
      offerFine: 'सिर्फ़ पहले 10,000 साइनअप के लिए।',
      offerFree: '1 महीना प्रीमियम, मुफ़्त', offerFreeFor: 'पहले 10,000 लोगों के लिए', joinedTitle: 'आप शामिल हो गए।', joinedBody: 'पहले 10,000 में शामिल होने के लिए शुक्रिया। आपका मुफ़्त प्रीमियम महीना लॉन्च के लिए सुरक्षित है, और एक संदेश आपके इनबॉक्स में आ रहा है।', joinedBodyLate: 'शामिल होने के लिए शुक्रिया। आपकी जगह सुरक्षित है, और एक संदेश आपके इनबॉक्स में आ रहा है। हलाल मोड खुलने पर हम आपको लिखेंगे।', emailSuggest: 'क्या आपका मतलब {{email}} था?', referFormTitle: 'अपना रेफ़रल लिंक पाएँ', referFormButton: 'मुझे लिंक ईमेल करें', referFormSent: 'अगर यह ईमेल वेटलिस्ट में है, तो आपका रेफ़रल लिंक आ रहा है।',
      bubbleHim: 'आपसे मिलकर अच्छा लगा।', bubbleHer: 'मुझे भी आपसे मिलकर अच्छा लगा।',
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
      coverStyle: 'कवर शैली', coverDots: 'बिंदु', coverHearts: 'क्रोम दिल', coverCouple: 'जोड़ा',
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
      cardsTitle: 'हलाल कार्ड्स। साथ सीखें और खेलें।',
      cardsBody: '{{count}} मार्गदर्शित क्विज़, गतिविधियाँ और रोमांच, जो जोड़ों को एक-दूसरे को समझने, करीब आने और मज़बूत शादी बनाने में मदद करते हैं। {{languages}} भाषाओं में उपलब्ध।'
    },
    id: {
      confirmTitle: 'Tinggal satu langkah', confirmBody: 'Konfirmasi email-mu untuk melihat tautan referral kamu. Jika teman mengajakmu, ini juga yang membuat ajakannya terhitung.', confirmButton: 'Konfirmasi email saya', tierCount: '{{joined}} dari {{goal}}',
      referralLinkTitle: 'Ini tautan referral kamu yang bisa dibagikan!', referralLinkLabel: 'Tautan referral kamu', rewardMonth1: '1 bulan Premium kamu otomatis disimpan untuk peluncuran.', rewardMonths: '{{months}} bulan Premium kamu otomatis disimpan untuk peluncuran.', shareMessage: 'Aku ada di daftar tunggu Halal Mode. Ini aplikasi pernikahan Muslim dengan perkenalan yang lebih sedikit tapi lebih bermakna.\n\nGabung daftar tunggu di sini: {{url}}',
      navRefer: 'Ajak temanmu', referralTitle: 'Ajak temanmu', referralBody: 'Ajak beberapa orang baik dan dapatkan lebih banyak Premium.', referralNote: 'Ajakan dihitung setelah temanmu memverifikasi email-nya.', reward3: '3 bergabung → 3 bulan gratis', reward5: '5 bergabung → 6 bulan gratis', reward10: '10 bergabung → 1 tahun gratis', copyInvite: 'Salin tautan undangan', copiedInvite: 'Tersalin', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Sedikit lagi.', almostThereBody: 'Cek email-mu untuk mengonfirmasi tempatmu di daftar tunggu.', verificationError: 'Tautan daftar tunggu ini tidak valid atau sudah kedaluwarsa.', verifiedEligible: 'Hadiah Premium-mu otomatis disimpan untuk peluncuran.', verifiedNotEligible: 'Email-mu sudah terverifikasi dan tempatmu di daftar tunggu sudah aman.', waitlistOffer: 'Jadilah salah satu dari 10.000 orang pertama di Halal Mode dan otomatis dapatkan 1 bulan Premium gratis saat peluncuran.', verifiedTitle: 'Kamu sudah terdaftar ✓', waitlistButton: 'Gabung daftar tunggu',
      bubbleHim2: 'Pernah dengar tentang Halal Mode?', bubbleHer2: 'Iya, sebenarnya pernah!',
      offerFine: 'Hanya untuk 10.000 pendaftar pertama.',
      offerFree: '1 bulan Premium, gratis', offerFreeFor: 'untuk 10.000 orang pertama', joinedTitle: 'Kamu sudah terdaftar.', joinedBody: 'Terima kasih telah menjadi salah satu dari 10.000 orang pertama. Satu bulan Premium gratis sudah disiapkan untukmu saat peluncuran, dan pesan sedang dikirim ke kotak masukmu.', joinedBodyLate: 'Terima kasih telah bergabung. Tempatmu sudah tersimpan, dan pesan sedang dikirim ke kotak masukmu. Kami akan mengabarimu saat Halal Mode dibuka.', emailSuggest: 'Maksudmu {{email}}?', referFormTitle: 'Dapatkan tautan rujukanmu', referFormButton: 'Kirim tautannya ke email saya', referFormSent: 'Jika email itu ada di daftar tunggu, tautan rujukanmu sedang dikirim.',
      bubbleHim: 'Senang bertemu denganmu.', bubbleHer: 'Senang bertemu denganmu juga.',
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
      coverStyle: 'Gaya sampul', coverDots: 'Titik', coverHearts: 'Hati krom', coverCouple: 'Pasangan',
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
      cardsTitle: 'Halal Cards. Belajar dan bermain bersama.',
      cardsBody: '{{count}} kuis, aktivitas, dan petualangan terpandu yang membantu pasangan saling memahami, semakin dekat, dan membangun pernikahan yang lebih kuat. Tersedia dalam {{languages}} bahasa.'
    },
    ms: {
      confirmTitle: 'Tinggal satu langkah', confirmBody: 'Sahkan e-mel anda untuk melihat pautan rujukan anda. Jika rakan menjemput anda, inilah yang mengira jemputannya.', confirmButton: 'Sahkan e-mel saya', tierCount: '{{joined}} daripada {{goal}}',
      referralLinkTitle: 'Ini pautan rujukan anda untuk dikongsi!', referralLinkLabel: 'Pautan rujukan anda', rewardMonth1: '1 bulan Premium anda ditempah secara automatik untuk pelancaran.', rewardMonths: '{{months}} bulan Premium anda ditempah secara automatik untuk pelancaran.', shareMessage: 'Saya dalam senarai menunggu Halal Mode. Ia aplikasi perkahwinan Muslim dengan perkenalan yang lebih sedikit tetapi lebih bermakna.\n\nSertai senarai menunggu di sini: {{url}}',
      navRefer: 'Jemput rakan anda', referralTitle: 'Jemput rakan anda', referralBody: 'Jemput beberapa orang yang baik dan dapatkan lebih banyak Premium.', referralNote: 'Rujukan dikira selepas rakan anda mengesahkan e-mel mereka.', reward3: '3 sertai → 3 bulan percuma', reward5: '5 sertai → 6 bulan percuma', reward10: '10 sertai → 1 tahun percuma', copyInvite: 'Salin pautan jemputan', copiedInvite: 'Disalin', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Hampir siap.', almostThereBody: 'Semak e-mel anda untuk mengesahkan tempat anda dalam senarai menunggu.', verificationError: 'Pautan senarai menunggu ini tidak sah atau telah tamat tempoh.', verifiedEligible: 'Ganjaran Premium anda telah ditempah secara automatik untuk pelancaran.', verifiedNotEligible: 'E-mel anda telah disahkan dan tempat anda dalam senarai menunggu telah ditempah.', waitlistOffer: 'Sertai 10,000 orang pertama di Halal Mode dan dapatkan 1 bulan Premium percuma secara automatik semasa pelancaran.', verifiedTitle: 'Anda sudah berdaftar ✓', waitlistButton: 'Sertai senarai menunggu',
      bubbleHim2: 'Pernah dengar tentang Halal Mode?', bubbleHer2: 'Ya, sebenarnya pernah!',
      offerFine: 'Terhad kepada 10,000 pendaftaran pertama.',
      offerFree: '1 bulan Premium, percuma', offerFreeFor: 'untuk 10,000 orang pertama', joinedTitle: 'Anda sudah berdaftar.', joinedBody: 'Terima kasih kerana menjadi antara 10,000 orang pertama. Sebulan Premium percuma disimpan untuk anda semasa pelancaran, dan satu nota sedang dihantar ke peti masuk anda.', joinedBodyLate: 'Terima kasih kerana menyertai. Tempat anda disimpan, dan satu nota sedang dihantar ke peti masuk anda. Kami akan menghubungi anda apabila Halal Mode dibuka.', emailSuggest: 'Maksud anda {{email}}?', referFormTitle: 'Dapatkan pautan rujukan anda', referFormButton: 'E-melkan pautan saya', referFormSent: 'Jika e-mel itu ada dalam senarai menunggu, pautan rujukan anda sedang dihantar.',
      bubbleHim: 'Gembira berjumpa dengan awak.', bubbleHer: 'Saya pun gembira berjumpa dengan awak.',
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
      coverStyle: 'Gaya muka depan', coverDots: 'Titik', coverHearts: 'Hati krom', coverCouple: 'Pasangan',
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
      cardsTitle: 'Halal Cards. Belajar dan bermain bersama.',
      cardsBody: '{{count}} kuiz, aktiviti dan pengembaraan berpandu yang membantu pasangan memahami satu sama lain, menjadi lebih rapat dan membina perkahwinan yang lebih kukuh. Tersedia dalam {{languages}} bahasa.'
    },
    bn: {
      confirmTitle: 'আর একটি ধাপ', confirmBody: 'আপনার রেফারেল লিংক দেখতে ইমেইল নিশ্চিত করুন। কোনো বন্ধু আপনাকে আমন্ত্রণ জানালে, এতেই তার রেফারেল গোনা হবে।', confirmButton: 'আমার ইমেইল নিশ্চিত করুন', tierCount: '{{goal}} জনের মধ্যে {{joined}}',
      referralLinkTitle: 'এই নিন আপনার শেয়ার করার রেফারেল লিংক!', referralLinkLabel: 'আপনার রেফারেল লিংক', rewardMonth1: 'আপনার ১ মাস প্রিমিয়াম লঞ্চের জন্য নিজে থেকেই সংরক্ষিত।', rewardMonths: 'আপনার {{months}} মাস প্রিমিয়াম লঞ্চের জন্য নিজে থেকেই সংরক্ষিত।', shareMessage: 'আমি হালাল মোডের অপেক্ষার তালিকায় আছি। এটি মুসলিমদের বিয়ের অ্যাপ, যেখানে কম কিন্তু ভেবেচিন্তে বাছাই করা পরিচয় মেলে।\n\nএখানে অপেক্ষার তালিকায় যোগ দিন: {{url}}',
      navRefer: 'বন্ধুদের আমন্ত্রণ জানান', referralTitle: 'বন্ধুদের আমন্ত্রণ জানান', referralBody: 'কয়েকজন ভালো মানুষকে আমন্ত্রণ জানান আর আরও প্রিমিয়াম পান।', referralNote: 'আপনার বন্ধু ইমেইল যাচাই করলে তবেই রেফারেল গোনা হয়।', reward3: '৩ জন যোগ দিলে → ৩ মাস ফ্রি', reward5: '৫ জন যোগ দিলে → ৬ মাস ফ্রি', reward10: '১০ জন যোগ দিলে → ১ বছর ফ্রি', copyInvite: 'আমন্ত্রণ লিংক কপি করুন', copiedInvite: 'কপি হয়েছে', shareWhatsApp: 'হোয়াটসঅ্যাপ', almostThereTitle: 'আর একটু বাকি।', almostThereBody: 'অপেক্ষার তালিকায় আপনার জায়গা নিশ্চিত করতে ইমেইল দেখুন।', verificationError: 'অপেক্ষার তালিকার এই লিংকটি সঠিক নয় বা এর মেয়াদ শেষ হয়ে গেছে।', verifiedEligible: 'আপনার প্রিমিয়াম পুরস্কার লঞ্চের জন্য নিজে থেকেই সংরক্ষিত হয়েছে।', verifiedNotEligible: 'আপনার ইমেইল যাচাই হয়েছে এবং অপেক্ষার তালিকায় আপনার জায়গা সংরক্ষিত।', waitlistOffer: 'হালাল মোডের প্রথম ১০,০০০ জনের একজন হোন, আর লঞ্চের সময় নিজে থেকেই ১ মাস প্রিমিয়াম ফ্রি পান।', verifiedTitle: 'আপনি যুক্ত হয়েছেন ✓', waitlistButton: 'অপেক্ষার তালিকায় যোগ দিন',
      bubbleHim2: 'আপনি কি হালাল মোডের কথা শুনেছেন?', bubbleHer2: 'হ্যাঁ, আসলে শুনেছি!',
      offerFine: 'শুধু প্রথম ১০,০০০ সাইনআপের জন্য।',
      offerFree: '১ মাস প্রিমিয়াম, ফ্রি', offerFreeFor: 'প্রথম ১০,০০০ জনের জন্য', joinedTitle: 'আপনি যুক্ত হয়েছেন।', joinedBody: 'প্রথম ১০,০০০ জনের একজন হওয়ার জন্য ধন্যবাদ। লঞ্চের সময় আপনার এক মাসের ফ্রি প্রিমিয়াম সংরক্ষিত, আর একটি বার্তা আপনার ইনবক্সে যাচ্ছে।', joinedBodyLate: 'যুক্ত হওয়ার জন্য ধন্যবাদ। আপনার জায়গা সংরক্ষিত, আর একটি বার্তা আপনার ইনবক্সে যাচ্ছে। হালাল মোড চালু হলে আমরা আপনাকে জানাব।', emailSuggest: 'আপনি কি {{email}} বোঝাতে চেয়েছেন?', referFormTitle: 'আপনার রেফারেল লিংক নিন', referFormButton: 'আমাকে লিংক ইমেল করুন', referFormSent: 'ইমেলটি ওয়েটলিস্টে থাকলে আপনার রেফারেল লিংক পাঠানো হচ্ছে।',
      bubbleHim: 'আপনার সাথে দেখা হয়ে ভালো লাগল।', bubbleHer: 'আমারও আপনার সাথে দেখা হয়ে ভালো লাগল।',
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
      coverStyle: 'কভারের ধরন', coverDots: 'বিন্দু', coverHearts: 'ক্রোম হার্ট', coverCouple: 'জুটি',
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
      cardsTitle: 'হালাল কার্ডস। একসঙ্গে শিখুন ও খেলুন।',
      cardsBody: '{{count}}টি নির্দেশিত কুইজ, কার্যক্রম ও অ্যাডভেঞ্চার, যা দম্পতিদের একে অপরকে বুঝতে, আরও কাছাকাছি হতে এবং আরও শক্তিশালী দাম্পত্য গড়তে সাহায্য করে। {{languages}}টি ভাষায় পাওয়া যায়।'
    },
    fr: {
      confirmTitle: 'Plus qu’une étape', confirmBody: 'Confirmez votre e-mail pour voir votre lien de parrainage. Si un ami vous a invité, c’est aussi ce qui compte son parrainage.', confirmButton: 'Confirmer mon e-mail', tierCount: '{{joined}} sur {{goal}}',
      referralLinkTitle: 'Voici votre lien de parrainage à partager !', referralLinkLabel: 'Votre lien de parrainage', rewardMonth1: 'Votre mois de Premium est automatiquement réservé pour le lancement.', rewardMonths: 'Vos {{months}} mois de Premium sont automatiquement réservés pour le lancement.', shareMessage: 'Je suis sur la liste d’attente de Halal Mode, une application de mariage musulmane fondée sur moins de présentations, mieux choisies.\n\nInscris-toi ici : {{url}}',
      navRefer: 'Parrainez vos amis', referralTitle: 'Parrainez vos amis', referralBody: 'Invitez quelques belles personnes et débloquez plus de Premium.', referralNote: 'Un parrainage compte dès que votre ami a vérifié son e-mail.', reward3: '3 inscriptions → 3 mois offerts', reward5: '5 inscriptions → 6 mois offerts', reward10: '10 inscriptions → 1 an offert', copyInvite: 'Copier le lien d’invitation', copiedInvite: 'Copié', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Presque fini.', almostThereBody: 'Consultez vos e-mails pour confirmer votre place sur la liste d’attente.', verificationError: 'Ce lien de liste d’attente est invalide ou a expiré.', verifiedEligible: 'Votre récompense Premium est automatiquement réservée pour le lancement.', verifiedNotEligible: 'Votre e-mail est vérifié et votre place sur la liste d’attente est réservée.', waitlistOffer: 'Faites partie des 10 000 premières personnes sur Halal Mode et recevez automatiquement 1 mois de Premium offert au lancement.', verifiedTitle: 'C’est fait ✓', waitlistButton: 'Rejoindre la liste d’attente',
      bubbleHim2: 'Tu as entendu parler de Halal Mode ?', bubbleHer2: 'Oui, justement !',
      offerFine: 'Réservé aux 10 000 premières inscriptions.',
      offerFree: '1 mois de Premium offert', offerFreeFor: 'aux 10 000 premières personnes', joinedTitle: 'C’est fait.', joinedBody: 'Merci de faire partie des 10 000 premiers. Votre mois de Premium offert est réservé pour le lancement, et un message est en route vers votre boîte mail.', joinedBodyLate: 'Merci de nous avoir rejoints. Votre place est enregistrée, et un message est en route vers votre boîte mail. Nous vous écrirons à l’ouverture de Halal Mode.', emailSuggest: 'Vouliez-vous dire {{email}} ?', referFormTitle: 'Obtenez votre lien de parrainage', referFormButton: 'M’envoyer mon lien', referFormSent: 'Si cette adresse figure sur la liste d’attente, votre lien de parrainage est en route.',
      bubbleHim: 'Enchanté.', bubbleHer: 'Enchantée également.',
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
      coverStyle: 'Style de couverture', coverDots: 'Points', coverHearts: 'Cœurs chromés', coverCouple: 'Couple',
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
      cardsTitle: 'Halal Cards. Apprenez et jouez ensemble.',
      cardsBody: '{{count}} quiz, activités et aventures guidés pour aider les couples à mieux se comprendre, à se rapprocher et à construire un mariage plus solide. Disponible en {{languages}} langues.'
    },
    tr: {
      confirmTitle: 'Bir adım kaldı', confirmBody: 'Davet bağlantını görmek için e-postanı onayla. Bir arkadaşın seni davet ettiyse, daveti de bununla sayılır.', confirmButton: 'E-postamı onayla', tierCount: '{{goal}} kişiden {{joined}}',
      referralLinkTitle: 'İşte paylaşabileceğin davet bağlantın!', referralLinkLabel: 'Davet bağlantın', rewardMonth1: '1 aylık Premium’un lansman için otomatik olarak ayrıldı.', rewardMonths: '{{months}} aylık Premium’un lansman için otomatik olarak ayrıldı.', shareMessage: 'Halal Mode bekleme listesindeyim. Daha az ama daha özenli tanışmalar sunan bir Müslüman evlilik uygulaması.\n\nBekleme listesine buradan katıl: {{url}}',
      navRefer: 'Arkadaşlarını davet et', referralTitle: 'Arkadaşlarını davet et', referralBody: 'Birkaç iyi insanı davet et, daha fazla Premium kazan.', referralNote: 'Davetler, arkadaşın e-postasını doğruladığında sayılır.', reward3: '3 katılım → 3 ay ücretsiz', reward5: '5 katılım → 6 ay ücretsiz', reward10: '10 katılım → 1 yıl ücretsiz', copyInvite: 'Davet bağlantısını kopyala', copiedInvite: 'Kopyalandı', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Az kaldı.', almostThereBody: 'Bekleme listesindeki yerini onaylamak için e-postanı kontrol et.', verificationError: 'Bu bekleme listesi bağlantısı geçersiz veya süresi dolmuş.', verifiedEligible: 'Premium ödülün lansman için otomatik olarak ayrıldı.', verifiedNotEligible: 'E-postan doğrulandı ve bekleme listesindeki yerin ayrıldı.', waitlistOffer: 'Halal Mode’daki ilk 10.000 kişiden biri ol, lansmanda otomatik olarak 1 ay ücretsiz Premium kazan.', verifiedTitle: 'Listedesin ✓', waitlistButton: 'Bekleme listesine katıl',
      bubbleHim2: 'Halal Mode’u duydun mu?', bubbleHer2: 'Evet, aslında duydum!',
      offerFine: 'Yalnızca ilk 10.000 kayıt için.',
      offerFree: '1 ay Premium, ücretsiz', offerFreeFor: 'ilk 10.000 kişiye', joinedTitle: 'Listedesin.', joinedBody: 'İlk 10.000 kişiden biri olduğun için teşekkürler. Ücretsiz Premium ayın açılış için ayrıldı ve gelen kutuna bir not yolda.', joinedBodyLate: 'Katıldığın için teşekkürler. Yerin kaydedildi ve gelen kutuna bir not yolda. Halal Mode açıldığında sana yazacağız.', emailSuggest: 'Bunu mu demek istedin: {{email}}?', referFormTitle: 'Davet bağlantını al', referFormButton: 'Bağlantımı e-postayla gönder', referFormSent: 'Bu e-posta bekleme listesindeyse davet bağlantın yolda.',
      bubbleHim: 'Tanıştığımıza memnun oldum.', bubbleHer: 'Ben de memnun oldum.',
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
      coverStyle: 'Kapak görünümü', coverDots: 'Noktalar', coverHearts: 'Krom kalpler', coverCouple: 'Çift',
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
      cardsTitle: 'Halal Cards. Birlikte öğrenin ve oynayın.',
      cardsBody: 'Birbirinizi anlamanıza, yakınlaşmanıza ve daha güçlü bir evlilik kurmanıza yardımcı olan {{count}} rehberli bilgi oyunu, etkinlik ve macera. {{languages}} dilde kullanılabilir.'
    },
    fa: {
      confirmTitle: 'یک قدم مانده', confirmBody: 'برای دیدن لینک دعوت خود، ایمیلتان را تأیید کنید. اگر دوستی شما را دعوت کرده، دعوت او هم با همین حساب می‌شود.', confirmButton: 'تأیید ایمیل من', tierCount: '{{joined}} از {{goal}}',
      referralLinkTitle: 'این هم لینک دعوت شما برای اشتراک‌گذاری!', referralLinkLabel: 'لینک دعوت شما', rewardMonth1: '۱ ماه پریمیوم شما به‌طور خودکار برای زمان راه‌اندازی رزرو شده است.', rewardMonths: '{{months}} ماه پریمیوم شما به‌طور خودکار برای زمان راه‌اندازی رزرو شده است.', shareMessage: 'من در فهرست انتظار حلال مود هستم؛ اپ ازدواج مسلمانان با آشنایی‌های کمتر اما سنجیده‌تر.\n\nاز اینجا به فهرست انتظار بپیوندید: {{url}}',
      navRefer: 'دوستانتان را دعوت کنید', referralTitle: 'دوستانتان را دعوت کنید', referralBody: 'چند آدم خوب را دعوت کنید و پریمیوم بیشتری بگیرید.', referralNote: 'دعوت وقتی حساب می‌شود که دوستتان ایمیلش را تأیید کند.', reward3: '۳ عضویت ← ۳ ماه رایگان', reward5: '۵ عضویت ← ۶ ماه رایگان', reward10: '۱۰ عضویت ← ۱ سال رایگان', copyInvite: 'کپی لینک دعوت', copiedInvite: 'کپی شد', shareWhatsApp: 'واتس‌اپ', almostThereTitle: 'یک قدم مانده.', almostThereBody: 'برای تأیید جایتان در فهرست انتظار، ایمیلتان را ببینید.', verificationError: 'این لینک فهرست انتظار نامعتبر است یا منقضی شده.', verifiedEligible: 'پاداش پریمیوم شما به‌طور خودکار برای زمان راه‌اندازی رزرو شده است.', verifiedNotEligible: 'ایمیل شما تأیید شد و جایتان در فهرست انتظار رزرو شده است.', waitlistOffer: 'جزو ۱۰٬۰۰۰ نفر اول حلال مود باشید و هنگام راه‌اندازی به‌طور خودکار ۱ ماه پریمیوم رایگان بگیرید.', verifiedTitle: 'ثبت شدید ✓', waitlistButton: 'عضویت در فهرست انتظار',
      bubbleHim2: 'درباره حلال مود چیزی شنیده‌اید؟', bubbleHer2: 'بله، اتفاقاً شنیده‌ام!',
      offerFine: 'فقط برای ۱۰٬۰۰۰ ثبت‌نام اول.',
      offerFree: '۱ ماه پریمیوم، رایگان', offerFreeFor: 'برای ۱۰٬۰۰۰ نفر اول', joinedTitle: 'ثبت شدید.', joinedBody: 'ممنون که جزو ۱۰٬۰۰۰ نفر اول هستید. یک ماه پریمیوم رایگان برای زمان راه‌اندازی برایتان کنار گذاشته شده و پیامی در راه صندوق ایمیلتان است.', joinedBodyLate: 'ممنون که پیوستید. جای شما محفوظ است و پیامی در راه صندوق ایمیلتان است. هنگام راه‌اندازی حلال مود به شما خبر می‌دهیم.', emailSuggest: 'منظورتان {{email}} بود؟', referFormTitle: 'لینک دعوت خود را بگیرید', referFormButton: 'لینکم را ایمیل کنید', referFormSent: 'اگر این ایمیل در فهرست انتظار باشد، لینک دعوت شما در راه است.',
      bubbleHim: 'از آشنایی‌تان خوشحالم.', bubbleHer: 'من هم از آشنایی‌تان خوشحالم.',
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
      coverStyle: 'سبک جلد', coverDots: 'نقطه‌ها', coverHearts: 'قلب‌های کرومی', coverCouple: 'زوج',
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
      cardsTitle: 'کارت‌های حلال. با هم یاد بگیرید و بازی کنید.',
      cardsBody: '{{count}} آزمون، فعالیت و ماجراجویی هدایت‌شده برای کمک به زوج‌ها تا یکدیگر را بهتر بفهمند، صمیمی‌تر شوند و زندگی مشترک محکم‌تری بسازند. در {{languages}} زبان در دسترس است.'
    },
    ha: {
      confirmTitle: 'Saura mataki ɗaya', confirmBody: 'Tabbatar da imel ɗinku don ganin hanyar gayyatarku. Idan aboki ne ya gayyace ku, da wannan ne ake ƙirga gayyatarsa.', confirmButton: 'Tabbatar da imel ɗina', tierCount: '{{joined}} cikin {{goal}}',
      referralLinkTitle: 'Ga hanyar gayyatarku da za ku iya rabawa!', referralLinkLabel: 'Hanyar gayyatarku', rewardMonth1: 'An adana muku wata 1 na Premium kai tsaye don ƙaddamarwa.', rewardMonths: 'An adana muku wata {{months}} na Premium kai tsaye don ƙaddamarwa.', shareMessage: 'Ina cikin jerin masu jira na Halal Mode. Manhajar aure ce ta Musulmi mai gabatarwa kaɗan amma masu kyau.\n\nShiga jerin masu jira a nan: {{url}}',
      navRefer: 'Gayyato abokanku', referralTitle: 'Gayyato abokanku', referralBody: 'Gayyato wasu nagartattun mutane ku samu ƙarin Premium.', referralNote: 'Ana ƙirga gayyata ne bayan abokinku ya tabbatar da imel ɗinsa.', reward3: 'Mutum 3 sun shiga → wata 3 kyauta', reward5: 'Mutum 5 sun shiga → wata 6 kyauta', reward10: 'Mutum 10 sun shiga → shekara 1 kyauta', copyInvite: 'Kwafi hanyar gayyata', copiedInvite: 'An kwafa', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Saura kaɗan.', almostThereBody: 'Duba imel ɗinku don tabbatar da matsayinku a jerin jira.', verificationError: 'Wannan hanyar jerin jira ba ta da inganci ko ta ƙare.', verifiedEligible: 'An adana muku kyautar Premium kai tsaye don lokacin ƙaddamarwa.', verifiedNotEligible: 'An tabbatar da imel ɗinku kuma an adana matsayinku a jerin jira.', waitlistOffer: 'Ku kasance cikin mutum 10,000 na farko a Halal Mode kuma ku samu wata 1 na Premium kyauta kai tsaye lokacin ƙaddamarwa.', verifiedTitle: 'Kun shiga ✓', waitlistButton: 'Shiga jerin masu jira',
      bubbleHim2: 'Kin taɓa jin labarin Halal Mode?', bubbleHer2: 'Eh, a gaskiya na ji!',
      offerFine: 'Ga masu rajista 10,000 na farko kawai.',
      offerFree: 'Wata 1 ta Premium, kyauta', offerFreeFor: 'ga mutane 10,000 na farko', joinedTitle: 'Kun shiga.', joinedBody: 'Mun gode da kasancewa cikin mutane 10,000 na farko. An ajiye muku watan Premium kyauta don lokacin ƙaddamarwa, kuma saƙo yana kan hanyar zuwa akwatin imel ɗinku.', joinedBodyLate: 'Mun gode da shiga. An ajiye muku wuri, kuma saƙo yana kan hanyar zuwa akwatin imel ɗinku. Za mu rubuta muku idan Halal Mode ya buɗe.', emailSuggest: 'Kuna nufin {{email}}?', referFormTitle: 'Samu hanyar gayyatarku', referFormButton: 'Aiko min da hanyar', referFormSent: 'Idan wannan imel yana cikin jerin jira, hanyar gayyatarku tana kan hanya.',
      bubbleHim: 'Na ji daɗin haɗuwa da ke.', bubbleHer: 'Ni ma na ji daɗin haɗuwa da kai.',
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
      coverStyle: 'Salon murfi', coverDots: 'Dige-dige', coverHearts: 'Zukatan chrome', coverCouple: 'Ma’aurata',
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
      cardsTitle: 'Halal Cards. Ku koyi kuma ku yi wasa tare.',
      cardsBody: 'Tambayoyin wasa, ayyuka da abubuwan kasada {{count}} masu jagora, waɗanda ke taimaka wa ma’aurata su fahimci juna, su ƙara kusanci, su kuma gina aure mai ƙarfi. Akwai su cikin harsuna {{languages}}.'
    },
    am: {
      confirmTitle: 'አንድ እርምጃ ቀርቷል', confirmBody: 'የግብዣ ሊንክዎን ለማየት ኢሜይልዎን ያረጋግጡ። ጓደኛ ጋብዞዎት ከሆነ ግብዣው የሚቆጠረውም በዚሁ ነው።', confirmButton: 'ኢሜይሌን አረጋግጥ', tierCount: 'ከ{{goal}} {{joined}}',
      referralLinkTitle: 'ሊያጋሩት የሚችሉት የግብዣ ሊንክዎ ይኸውና!', referralLinkLabel: 'የግብዣ ሊንክዎ', rewardMonth1: 'የ1 ወር ፕሪሚየምዎ ለመክፈቻው በራስ-ሰር ተይዞልዎታል።', rewardMonths: 'የ{{months}} ወር ፕሪሚየምዎ ለመክፈቻው በራስ-ሰር ተይዞልዎታል።', shareMessage: 'በሃላል ሞድ መጠበቂያ ዝርዝር ላይ ነኝ። ጥቂት ግን በጥንቃቄ የተመረጡ ትውውቆችን የሚያቀርብ የሙስሊሞች የጋብቻ መተግበሪያ ነው።\n\nእዚህ ይመዝገቡ፦ {{url}}',
      navRefer: 'ጓደኞችዎን ይጋብዙ', referralTitle: 'ጓደኞችዎን ይጋብዙ', referralBody: 'ጥቂት ጥሩ ሰዎችን ይጋብዙና ተጨማሪ ፕሪሚየም ያግኙ።', referralNote: 'ግብዣ የሚቆጠረው ጓደኛዎ ኢሜይሉን ካረጋገጠ በኋላ ነው።', reward3: '3 ሰዎች ሲቀላቀሉ → 3 ወር በነጻ', reward5: '5 ሰዎች ሲቀላቀሉ → 6 ወር በነጻ', reward10: '10 ሰዎች ሲቀላቀሉ → 1 ዓመት በነጻ', copyInvite: 'የግብዣ ሊንኩን ይቅዱ', copiedInvite: 'ተቀድቷል', shareWhatsApp: 'ዋትስአፕ', almostThereTitle: 'ትንሽ ቀርቷል።', almostThereBody: 'በመጠበቂያ ዝርዝሩ ላይ ቦታዎን ለማረጋገጥ ኢሜይልዎን ይመልከቱ።', verificationError: 'ይህ የመጠበቂያ ዝርዝር ሊንክ ልክ ያልሆነ ወይም ጊዜው ያለፈበት ነው።', verifiedEligible: 'የፕሪሚየም ሽልማትዎ ለመክፈቻው በራስ-ሰር ተይዞልዎታል።', verifiedNotEligible: 'ኢሜይልዎ ተረጋግጧል፤ በመጠበቂያ ዝርዝሩ ላይ ቦታዎም ተይዟል።', waitlistOffer: 'በሃላል ሞድ ላይ ከመጀመሪያዎቹ 10,000 ሰዎች አንዱ ይሁኑ፤ ሲከፈት 1 ወር ፕሪሚየም በነጻ በራስ-ሰር ያገኛሉ።', verifiedTitle: 'ተመዝግበዋል ✓', waitlistButton: 'በመጠበቂያ ዝርዝሩ ይመዝገቡ',
      bubbleHim2: 'ስለ ሀላል ሞድ ሰምተሻል?', bubbleHer2: 'አዎ፣ እንዲያውም ሰምቻለሁ!',
      offerFine: 'ለመጀመሪያዎቹ 10,000 ተመዝጋቢዎች ብቻ።',
      offerFree: '1 ወር ፕሪሚየም፣ በነጻ', offerFreeFor: 'ለመጀመሪያዎቹ 10,000 ሰዎች', joinedTitle: 'ተመዝግበዋል።', joinedBody: 'ከመጀመሪያዎቹ 10,000 ሰዎች አንዱ ስለሆኑ እናመሰግናለን። ነጻ የፕሪሚየም ወርዎ ለማስጀመሪያው ተይዟል፣ እና መልእክት ወደ ኢሜይልዎ እየመጣ ነው።', joinedBodyLate: 'ስለተቀላቀሉ እናመሰግናለን። ቦታዎ ተይዟል፣ እና መልእክት ወደ ኢሜይልዎ እየመጣ ነው። ሀላል ሞድ ሲከፈት እንጽፍልዎታለን።', emailSuggest: '{{email}} ማለትዎ ነበር?', referFormTitle: 'የግብዣ ሊንክዎን ያግኙ', referFormButton: 'ሊንኩን በኢሜይል ላኩልኝ', referFormSent: 'ይህ ኢሜይል በመጠባበቂያ ዝርዝሩ ላይ ካለ፣ የግብዣ ሊንክዎ እየመጣ ነው።',
      bubbleHim: 'ስለተዋወቅን ደስ ብሎኛል።', bubbleHer: 'እኔም ስለተዋወቅን ደስ ብሎኛል።',
      language: 'ቋንቋ ይምረጡ', navHow: 'እንዴት ይሰራል', heroTitle: 'ጋብቻ ቁም ነገር ነው።',
      heroIntro: 'ሃላል ሞድ ሙስሊሞች ለጋብቻ እንዲተዋወቁ የሚረዳ የተሻለ መተግበሪያ ነው። በየቀኑ በጥንቃቄ የተመረጡ ጥቂት ሰዎችን ያስተዋውቅዎታል። ይህም ማለት',
      heroBold: 'ጫጫታ ያንሳል። ጥሩ ግንኙነት ይጨምራል።', comingSoon: 'በቅርቡ',
      downloadOn: 'ከዚህ ያውርዱ', getItOn: 'ከዚህ ያግኙ', join: 'በመጠበቂያ ዝርዝሩ ይመዝገቡ',
      early: 'ቀድመው የተመዘገቡ ቀድመው ግብዣ ያገኛሉ።',
      email: 'ኢሜይል', city: 'ከተማ', cityPlaceholder: 'ለምሳሌ፣ አዲስ አበባ', age: 'የዕድሜ ክልል',
      choose: 'ይምረጡ…', notify: 'አሳውቁኝ',
      privacy: 'መረጃዎን ሃላል ሞድ ሲጀምር ለማሳወቅ ብቻ እንጠቀማለን። አላስፈላጊ መልዕክት አንልክም፣ ለሌላም አናጋራም።',
      questions: 'ጥያቄ አለዎት?', soundOn: 'ድምፅ በርቷል', soundOff: 'ድምፅ ጠፍቷል',
      soundToggle: 'የልብ ድምፅ', availability: 'የመተግበሪያው ሁኔታ', photos: 'ፎቶዎች',
      coverStyle: 'የሽፋን ቅጥ', coverDots: 'ነጥቦች', coverHearts: 'ክሮም ልቦች', coverCouple: 'ጥንዶች',
      validationEmail: 'የኢሜይል አድራሻዎ ትክክል አይመስልም።',
      validationCity: 'የትኛው ከተማ እንደሆኑ ይንገሩን።',
      validationAge: 'የዕድሜ ክልልዎን ይምረጡ።',
      thanks: 'እናመሰግናለን! በዝርዝሩ ውስጥ ነዎት። ሃላል ሞድ ሲጀምር ኢሜይል እንልክልዎታለን።',
      error: 'ትንሽ ችግር ተፈጥሯል። እባክዎ ከጥቂት ጊዜ በኋላ እንደገና ይሞክሩ።',
      howTitle: 'ሃላል ሞድ፣ ለሙስሊሞች የተሻለ የጋብቻ መተግበሪያ።',
      feature1Title: 'በጥንቃቄ የተመረጡ አምስት መተዋወቆች። በየፈጅር ሰዓት።',
      feature1Body: 'ጫጫታ ያንሳል፣ ተስማሚ ሰዎች ይበዛሉ፣ ዓላማም ግልጽ ይሆናል።',
      feature2Title: 'መልክ አስፈላጊ ነው፣ ግን መረጃዎ የግል ነው።',
      feature2Body: 'ቁመትና የሰውነት አቋም ተስማሚ ሰው ለማግኘት ይረዱናል፤ ለሁሉም የሚታይ ማጣሪያ ግን የለም።',
      feature3Title: 'ውይይቱ በትርጉም ይጀምር።',
      feature3Body: 'በነፃ መወያየት ከመጀመራችሁ በፊት ሁለታችሁም የሚያስተዋውቁ ጥያቄዎችን ትመልሳላችሁ። የሌላውን መልስ የምታዩት የራሳችሁን ከመለሳችሁ በኋላ ብቻ ነው።',
      cardsTitle: 'Halal Cards። አብራችሁ ተማሩ እና ተጫወቱ።',
      cardsBody: 'ጥንዶች እርስ በርሳቸውን እንዲረዱ፣ እንዲቀራረቡ እና ጠንካራ ትዳር እንዲገነቡ የሚረዱ {{count}} የተመሩ ጥያቄዎች፣ እንቅስቃሴዎች እና ጀብዱዎች። በ{{languages}} ቋንቋዎች ይገኛሉ።'
    },
    so: {
      confirmTitle: 'Hal tallaabo ayaa dhiman', confirmBody: 'Xaqiiji email-kaaga si aad u aragto link-gaaga casuumaadda. Haddii saaxiib ku casuumay, tani ayaa casuumaaddiisa tirisa.', confirmButton: 'Xaqiiji email-kayga', tierCount: '{{joined}} ka mid ah {{goal}}',
      referralLinkTitle: 'Waa kan link-gaaga casuumaadda ee la wadaagi karo!', referralLinkLabel: 'Link-gaaga casuumaadda', rewardMonth1: '1 bil oo Premium ah ayaa si toos ah laguugu kaydiyay furitaanka.', rewardMonths: '{{months}} bilood oo Premium ah ayaa si toos ah laguugu kaydiyay furitaanka.', shareMessage: 'Waxaan ku jiraa liiska sugitaanka Halal Mode. Waa app guur oo Muslimiin ah oo bixiya isbarasho yar balse si fiican loo doortay.\n\nKa biir liiska sugitaanka halkan: {{url}}',
      navRefer: 'Casuum asxaabtaada', referralTitle: 'Casuum asxaabtaada', referralBody: 'Casuum dhowr qof oo wanaagsan oo hel Premium dheeraad ah.', referralNote: 'Casuumaadda waxaa la tiriyaa marka saaxiibkaa xaqiijiyo email-kiisa.', reward3: '3 ku biiray → 3 bilood oo bilaash ah', reward5: '5 ku biiray → 6 bilood oo bilaash ah', reward10: '10 ku biiray → 1 sano oo bilaash ah', copyInvite: 'Koobi link-ga casuumaadda', copiedInvite: 'Waa la koobiyay', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Waad ku dhowdahay.', almostThereBody: 'Fiiri email-kaaga si aad u xaqiijiso booskaaga liiska sugitaanka.', verificationError: 'Link-gan liiska sugitaanka sax ma aha ama wuu dhacay.', verifiedEligible: 'Abaalmarintaada Premium si toos ah ayaa laguugu kaydiyay furitaanka.', verifiedNotEligible: 'Email-kaaga waa la xaqiijiyay, booskaaga liiska sugitaankana waa laguu kaydiyay.', waitlistOffer: 'Ka mid noqo 10,000-ka qof ee ugu horreeya Halal Mode oo si toos ah u hel 1 bil oo Premium ah oo bilaash ah marka la furo.', verifiedTitle: 'Waad ku biirtay ✓', waitlistButton: 'Ku biir liiska sugitaanka',
      bubbleHim2: 'Ma maqashay Halal Mode?', bubbleHer2: 'Haa, runtii waan maqlay!',
      offerFine: 'Kaliya 10,000-ka isdiiwaangeliyay ee ugu horreeya.',
      offerFree: '1 bil oo Premium ah, bilaash', offerFreeFor: '10,000-ka qof ee ugu horreeya', joinedTitle: 'Waad ku biirtay.', joinedBody: 'Waad ku mahadsan tahay inaad ka mid tahay 10,000-ka ugu horreeya. Bishaada Premium ee bilaashka ah waa laguu kaydiyay marka la furo, fariinna waxay ku socotaa sanduuqaaga.', joinedBodyLate: 'Waad ku mahadsan tahay inaad ku biirtay. Booskaaga waa la kaydiyay, fariinna waxay ku socotaa sanduuqaaga. Waan kuu qori doonnaa marka Halal Mode la furo.', emailSuggest: 'Ma waxaad ula jeeday {{email}}?', referFormTitle: 'Hel xiriirkaaga casuumaadda', referFormButton: 'Iigu soo dir xiriirka', referFormSent: 'Haddii iimaylkaas uu ku jiro liiska sugitaanka, xiriirkaaga casuumaadda wuu soo socdaa.',
      bubbleHim: 'Waan ku faraxsanahay inaan kula kulmo.', bubbleHer: 'Aniguna waan ku faraxsanahay inaan kula kulmo.',
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
      coverStyle: 'Qaabka daboolka', coverDots: 'Dhibco', coverHearts: 'Quluub chrome ah', coverCouple: 'Lammaane',
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
      cardsTitle: 'Halal Cards. Wada barta oo wada ciyaara.',
      cardsBody: '{{count}} su’aalo, hawlo iyo tacaburro la hagayo oo ka caawiya lammaanaha inay is fahmaan, isu soo dhowaadaan oo dhisaan guur ka xoog badan. Waxaa lagu heli karaa {{languages}} luqadood.'
    },
    es: {
      confirmTitle: 'Solo queda un paso', confirmBody: 'Confirma tu correo para ver tu enlace de invitación. Si un amigo te invitó, esto también hace que su invitación cuente.', confirmButton: 'Confirmar mi correo', tierCount: '{{joined}} de {{goal}}',
      referralLinkTitle: '¡Aquí tienes tu enlace de invitación para compartir!', referralLinkLabel: 'Tu enlace de invitación', rewardMonth1: 'Tu mes de Premium queda reservado automáticamente para el lanzamiento.', rewardMonths: 'Tus {{months}} meses de Premium quedan reservados automáticamente para el lanzamiento.', shareMessage: 'Estoy en la lista de espera de Halal Mode, una app de matrimonio musulmana con menos presentaciones, pero mejor pensadas.\n\nApúntate aquí: {{url}}',
      navRefer: 'Invita a tus amigos', referralTitle: 'Invita a tus amigos', referralBody: 'Invita a algunas buenas personas y desbloquea más Premium.', referralNote: 'Las invitaciones cuentan cuando tu amigo verifica su correo.', reward3: '3 registros → 3 meses gratis', reward5: '5 registros → 6 meses gratis', reward10: '10 registros → 1 año gratis', copyInvite: 'Copiar enlace de invitación', copiedInvite: 'Copiado', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Ya casi está.', almostThereBody: 'Revisa tu correo para confirmar tu lugar en la lista de espera.', verificationError: 'Este enlace de la lista de espera no es válido o ha caducado.', verifiedEligible: 'Tu recompensa Premium queda reservada automáticamente para el lanzamiento.', verifiedNotEligible: 'Tu correo está verificado y tu lugar en la lista de espera está reservado.', waitlistOffer: 'Sé de las primeras 10.000 personas en Halal Mode y recibe automáticamente 1 mes de Premium gratis en el lanzamiento.', verifiedTitle: 'Ya estás dentro ✓', waitlistButton: 'Apúntate a la lista de espera',
      bubbleHim2: '¿Has oído hablar de Halal Mode?', bubbleHer2: '¡Sí, la verdad es que sí!',
      offerFine: 'Solo para los primeros 10.000 registros.',
      offerFree: '1 mes de Premium gratis', offerFreeFor: 'para las primeras 10.000 personas', joinedTitle: 'Ya estás dentro.', joinedBody: 'Gracias por ser una de las primeras 10.000 personas. Tu mes gratis de Premium está reservado para el lanzamiento, y una nota va de camino a tu bandeja de entrada.', joinedBodyLate: 'Gracias por unirte. Tu lugar está guardado, y una nota va de camino a tu bandeja de entrada. Te escribiremos cuando abra Halal Mode.', emailSuggest: '¿Quisiste decir {{email}}?', referFormTitle: 'Consigue tu enlace de invitación', referFormButton: 'Envíame mi enlace', referFormSent: 'Si ese correo está en la lista de espera, tu enlace de invitación va de camino.',
      bubbleHim: 'Encantado de conocerte.', bubbleHer: 'Encantada de conocerte también.',
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
      coverStyle: 'Estilo de portada', coverDots: 'Puntos', coverHearts: 'Corazones cromados', coverCouple: 'Pareja',
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
      cardsTitle: 'Halal Cards. Aprendan y jueguen juntos.',
      cardsBody: '{{count}} cuestionarios, actividades y aventuras guiadas que ayudan a las parejas a entenderse, acercarse y construir un matrimonio más sólido. Disponible en {{languages}} idiomas.'
    },
    ru: {
      confirmTitle: 'Остался один шаг', confirmBody: 'Подтвердите email, чтобы увидеть свою ссылку-приглашение. Если вас пригласил друг, так засчитается и его приглашение.', confirmButton: 'Подтвердить email', tierCount: '{{joined}} из {{goal}}',
      referralLinkTitle: 'Вот ваша ссылка-приглашение, которой можно поделиться!', referralLinkLabel: 'Ваша ссылка-приглашение', rewardMonth1: 'Ваш месяц Premium автоматически зарезервирован к запуску.', rewardMonths: 'Месяцев Premium, зарезервированных к запуску: {{months}}.', shareMessage: 'Я в листе ожидания Халал Мод — это приложение для знакомств мусульман с целью брака: знакомств меньше, но они продуманнее.\n\nЗаписаться можно здесь: {{url}}',
      navRefer: 'Пригласите друзей', referralTitle: 'Пригласите друзей', referralBody: 'Пригласите несколько хороших людей и получите больше Premium.', referralNote: 'Приглашение засчитывается, когда друг подтвердит свой email.', reward3: '3 друга → 3 месяца бесплатно', reward5: '5 друзей → 6 месяцев бесплатно', reward10: '10 друзей → 1 год бесплатно', copyInvite: 'Скопировать ссылку-приглашение', copiedInvite: 'Скопировано', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Почти готово.', almostThereBody: 'Проверьте почту, чтобы подтвердить место в листе ожидания.', verificationError: 'Эта ссылка на лист ожидания недействительна или устарела.', verifiedEligible: 'Ваша награда Premium автоматически зарезервирована к запуску.', verifiedNotEligible: 'Ваш email подтверждён, а место в листе ожидания закреплено.', waitlistOffer: 'Станьте одним из первых 10 000 человек в Халал Мод и автоматически получите 1 месяц Premium бесплатно при запуске.', verifiedTitle: 'Вы в списке ✓', waitlistButton: 'Записаться в лист ожидания',
      bubbleHim2: 'Ты слышала о Halal Mode?', bubbleHer2: 'Да, вообще-то слышала!',
      offerFine: 'Только для первых 10 000 регистраций.',
      offerFree: '1 месяц Premium бесплатно', offerFreeFor: 'первым 10 000 участникам', joinedTitle: 'Вы в списке.', joinedBody: 'Спасибо, что вы среди первых 10 000. Бесплатный месяц Premium закреплён за вами к запуску, а письмо уже в пути.', joinedBodyLate: 'Спасибо, что присоединились. Ваше место сохранено, а письмо уже в пути. Мы напишем, когда Halal Mode откроется.', emailSuggest: 'Вы имели в виду {{email}}?', referFormTitle: 'Получите свою реферальную ссылку', referFormButton: 'Прислать ссылку на почту', referFormSent: 'Если этот адрес есть в списке ожидания, реферальная ссылка уже в пути.',
      bubbleHim: 'Приятно познакомиться.', bubbleHer: 'Мне тоже очень приятно.',
      language: 'Выбрать язык', navHow: 'Как это работает', heroTitle: 'К браку, серьёзно.',
      heroIntro: 'Халал Мод помогает мусульманам знакомиться для брака по-новому. Каждый день несколько тщательно подобранных знакомств, чтобы было',
      heroBold: 'меньше шума. Больше настоящего общения.', comingSoon: 'Скоро',
      downloadOn: 'Скачать в', getItOn: 'Доступно в', join: 'Записаться в лист ожидания',
      early: 'Кто запишется раньше, получит приглашение раньше.',
      email: 'Эл. почта', city: 'Город', cityPlaceholder: 'например, Москва', age: 'Возраст',
      choose: 'Выберите…', notify: 'Сообщите мне',
      privacy: 'Мы используем ваши данные только для сообщения о запуске Халал Мод. Без спама и передачи третьим лицам.',
      questions: 'Есть вопросы?', soundOn: 'Звук включён', soundOff: 'Звук выключен',
      soundToggle: 'Звук сердца', availability: 'Доступность приложения', photos: 'Фото',
      coverStyle: 'Стиль обложки', coverDots: 'Точки', coverHearts: 'Хромовые сердца', coverCouple: 'Пара',
      validationEmail: 'Похоже, адрес электронной почты указан неверно.',
      validationCity: 'Укажите свой город.',
      validationAge: 'Выберите возрастную группу.',
      thanks: 'Спасибо! Вы в списке. Мы напишем вам, когда запустится Халал Мод.',
      error: 'Что-то пошло не так. Попробуйте ещё раз чуть позже.',
      howTitle: 'Халал Мод, лучшее приложение для знакомства мусульман с целью брака.',
      feature1Title: 'Пять тщательно подобранных знакомств. Каждое утро после фаджра.',
      feature1Body: 'Меньше шума, больше совместимости и серьёзных намерений.',
      feature2Title: 'Внешность важна, но эти данные остаются личными.',
      feature2Body: 'Рост и телосложение помогают нам подобрать подходящего человека без открытых фильтров.',
      feature3Title: 'Сначала узнайте друг друга.',
      feature3Body: 'Прежде чем свободно общаться, вы оба ответите на важные вопросы для знакомства. Ответы другого человека откроются только после ваших.',
      cardsTitle: 'Halal Cards. Учитесь и играйте вместе.',
      cardsBody: '{{count}} направленных викторин, занятий и приключений, которые помогают парам лучше понять друг друга, стать ближе и построить более крепкий брак. Доступно на {{languages}} языках.'
    },
    'zh-Hans': {
      confirmTitle: '还差一步', confirmBody: '确认你的邮箱即可查看邀请链接。如果是好友邀请了你，这一步也会为好友计入邀请。', confirmButton: '确认我的邮箱', tierCount: '{{joined}}/{{goal}}',
      referralLinkTitle: '这是你可以分享的邀请链接！', referralLinkLabel: '你的邀请链接', rewardMonth1: '你的 1 个月 Premium 已自动为上线保留。', rewardMonths: '你的 {{months}} 个月 Premium 已自动为上线保留。', shareMessage: '我在哈拉尔·莫德的等候名单上。这是一款穆斯林婚恋应用，介绍更少，但更用心。\n\n在这里加入等候名单：{{url}}',
      navRefer: '邀请好友', referralTitle: '邀请好友', referralBody: '邀请几位好朋友，解锁更多 Premium。', referralNote: '好友验证邮箱后，邀请才会计入。', reward3: '3 人加入 → 免费 3 个月', reward5: '5 人加入 → 免费 6 个月', reward10: '10 人加入 → 免费 1 年', copyInvite: '复制邀请链接', copiedInvite: '已复制', shareWhatsApp: 'WhatsApp', almostThereTitle: '就差一步。', almostThereBody: '请查收邮件，确认你在等候名单中的位置。', verificationError: '此等候名单链接无效或已过期。', verifiedEligible: '你的 Premium 奖励已自动为上线保留。', verifiedNotEligible: '你的邮箱已验证，等候名单中的位置已为你保留。', waitlistOffer: '成为哈拉尔·莫德的前 10,000 名用户，上线时自动获得 1 个月免费 Premium。', verifiedTitle: '你已加入 ✓', waitlistButton: '加入等候名单',
      bubbleHim2: '你听说过 Halal Mode 吗？', bubbleHer2: '听说过，其实我知道！',
      offerFine: '仅限前 10,000 名注册者。',
      offerFree: '免费赠送 1 个月 Premium', offerFreeFor: '前 10,000 人专享', joinedTitle: '你已加入。', joinedBody: '感谢你成为前 10,000 人之一。上线时为你保留 1 个月免费 Premium，一封邮件正在发往你的收件箱。', joinedBodyLate: '感谢你的加入。你的名额已保存，一封邮件正在发往你的收件箱。Halal Mode 上线时我们会通知你。', emailSuggest: '你是不是想输入 {{email}}？', referFormTitle: '获取你的邀请链接', referFormButton: '把链接发到我的邮箱', referFormSent: '如果该邮箱在候补名单中，你的邀请链接正在发送。',
      bubbleHim: '很高兴认识你。', bubbleHer: '我也很高兴认识你。',
      language: '选择语言', navHow: '使用方式', heroTitle: '认真对待婚姻。',
      heroIntro: '哈拉尔·莫德是一款更适合穆斯林寻找婚姻伴侣的应用。每天只为你精选少量介绍，让你',
      heroBold: '少些干扰，多些真诚的连接。', comingSoon: '即将上线',
      downloadOn: '下载于', getItOn: '获取于', join: '加入等候名单',
      early: '越早加入，越早收到邀请。',
      email: '邮箱', city: '城市', cityPlaceholder: '例如：北京', age: '年龄范围',
      choose: '请选择…', notify: '上线时通知我',
      privacy: '我们只会用你的信息通知你哈拉尔·莫德上线。不会发垃圾消息，也不会分享给别人。',
      questions: '有疑问？', soundOn: '声音已开启', soundOff: '声音已关闭',
      soundToggle: '爱心音效', availability: '应用上线情况', photos: '照片',
      coverStyle: '封面样式', coverDots: '圆点', coverHearts: '镀铬爱心', coverCouple: '情侣',
      validationEmail: '这个邮箱地址似乎不对。',
      validationCity: '请填写你的城市。',
      validationAge: '请选择年龄范围。',
      thanks: '谢谢！你已加入名单。哈拉尔·莫德上线时我们会发邮件通知你。',
      error: '出了点问题，请稍后再试。',
      howTitle: '哈拉尔·莫德，让穆斯林更好地寻找婚姻伴侣。',
      feature1Title: '每天晨礼时，五位精心挑选的介绍对象。',
      feature1Body: '少些干扰，更合适的匹配，更明确的心意。',
      feature2Title: '外貌重要，但你的信息保持私密。',
      feature2Body: '身高和体型能帮我们找到更合适的人，但不会成为公开筛选条件。',
      feature3Title: '先用心认识，再自由聊天。',
      feature3Body: '你们都要先回答几个有意义的破冰问题，之后才能自由聊天。只有回答后，你才能看到对方的答案。',
      cardsTitle: 'Halal Cards，一起学习，一起玩。',
      cardsBody: '{{count}} 个引导式问答、活动与冒险，帮助伴侣更好地理解彼此、更加亲近，共同建立更稳固的婚姻。支持 {{languages}} 种语言。'
    }
  };

  const storageKey = 'halalmode-language';
  const declaredActivityCount = Number(document.documentElement.dataset.activityCount);
  const staticBody = document.querySelector('[data-i18n="cardsBody"]')?.textContent || '';
  const staticBodyCount = Number(staticBody.match(/^\s*(\d+)\b/)?.[1]);
  const activityCount = Number.isSafeInteger(declaredActivityCount) && declaredActivityCount > 0
    ? declaredActivityCount
    : Number.isSafeInteger(staticBodyCount) && staticBodyCount > 0
      ? staticBodyCount
      : '';
  const languageCount = Object.keys(copy).length;
  let language = 'en';
  try {
    const saved = localStorage.getItem(storageKey);
    if (Object.prototype.hasOwnProperty.call(copy, saved)) language = saved;
  } catch (_) {}

  // Explicit app language takes precedence over an old browser preference.
  const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
  if (Object.prototype.hasOwnProperty.call(copy, requestedLanguage)) language = requestedLanguage;

  function t(key) {
    return (copy[language][key] || copy.en[key] || '')
      .replaceAll('{{count}}', String(activityCount))
      .replaceAll('{{languages}}', String(languageCount));
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
    document.querySelectorAll('[data-brand-name]').forEach(el => { el.textContent = brandNames[language] || brandNames.en; });
    document.querySelectorAll('[data-brand-name-aria]').forEach(el => {
      const name = brandNames[language] || brandNames.en;
      el.setAttribute('aria-label', name);
      const image = el.querySelector('img[alt]');
      if (image) image.setAttribute('alt', name);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    const stores = document.querySelectorAll('.store[role=img]');
    stores.forEach((el, index) => el.setAttribute('aria-label', (index ? 'Google Play' : 'App Store') + ', ' + t('comingSoon')));
    const message = document.getElementById('msg');
    if (message && message.dataset.messageKey) message.textContent = t(message.dataset.messageKey);
    updateSound();
    const how = /^\/how-it-works(?:\.html)?\/?$/.test(location.pathname);
    const refer = /^\/refer(?:\.html)?\/?$/.test(location.pathname);
    const brand = brandNames[language] || brandNames.en;
    const pageTitle = how ? t('howTitle') : refer ? brand + ', ' + t('referralTitle') : brand + ', ' + t('heroTitle');
    document.title = pageTitle;
    const socialTitle = document.querySelector('meta[property="og:title"]');
    if (socialTitle) socialTitle.content = pageTitle;
    const pageDescription = how
      ? t('feature1Title') + ' ' + t('feature1Body') + ' ' + t('cardsBody')
      : refer ? t('referralBody') + ' ' + t('referralNote')
      : t('heroIntro') + ' ' + t('heroBold');
    const description = document.querySelector('meta[name=description]');
    if (description) description.content = pageDescription;
    const socialDescription = document.querySelector('meta[property="og:description"]');
    if (socialDescription) socialDescription.content = pageDescription;
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
    // Lets pages re-render the text they build themselves.
    if (typeof document.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('halal:language', { detail: language }));
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
    const nav = header && header.querySelector('.pill-link');
    if (!nav) return;
    const actions = header.querySelector('.header-actions') || document.createElement('div');
    if (!actions.className) actions.className = 'header-actions';
    if (!header.querySelector('.header-actions')) {
      nav.before(actions);
      actions.append(nav);
    } else if (!actions.contains(nav)) {
      actions.append(nav);
    }
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
      // Two to a row and all aligned left; each name keeps its own direction.
      button.dir = 'ltr';
      const label = document.createElement('span');
      label.lang = code;
      label.dir = 'auto';
      label.textContent = name;
      button.append(label);
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
