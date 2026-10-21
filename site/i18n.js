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
      referralCodeLabel: 'Your code:',
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
      busyJoin: 'Lots of people are joining right now. Please try again in a few minutes.',
      navTerms: 'Terms of Service', navPrivacy: 'Privacy Notice',
      shareCode: 'My invite code: {{code}}',
      thanks: 'Thank you, you are on the list. We will email you when Halal Mode opens.',
      almostThereTitle: 'Almost there.', almostThereBody: 'Check your email to confirm your place on the waitlist.',
      referralTitle: 'Refer your friends', referralBody: 'Invite a few good people and unlock more Premium.',
      reward3: '3 joins → 3 months free', reward5: '5 joins → 6 months free', reward10: '10 joins → 1 year free',
      referralNote: 'A friend counts as joined once they’ve confirmed their email.',
      shareWhatsApp: 'WhatsApp', copyInvite: 'Copy invite link', copiedInvite: 'Copied',
      verifiedTitle: 'You’re in ✓', verifiedEligible: 'Your Premium reward is automatically reserved for launch.',
      verifiedNotEligible: 'Your email is verified and your place on the waitlist is reserved.',
      verificationError: 'This waitlist link is invalid or expired.',
      error: 'Something went wrong. Please try again in a moment.',
      howTitle: 'Halal Mode, a better Muslim marriage app.',
      feature1Title: 'Quality over quantity.',
      feature1Body: 'Five thoughtfully selected introductions every Fajr, curated around you and your preferences to encourage meaningful connections rather than endless browsing.',
      feature2Title: 'Attraction matters. So does privacy.',
      feature2Body: 'Physical preferences are a natural part of finding a spouse. Height and build help us match you well, but your preferences stay private and are never shown as public filters.',
      feature3Title: 'Earn the conversation.',
      feature3Body: 'A match only becomes a conversation once you’ve both answered a few icebreakers you chose together. You see their answers after sharing yours, so there’s less ghosting and more intention.',
      cardsTitle: 'Building relationships that last.',
      cardsBody: 'Halal Cards give you practical tools for a healthy, lasting marriage: {{count}} interactive quizzes, exercises and adventures to explore communication, expectations and compatibility together. Available in {{languages}} languages.',
      cardsPremium: '{{free}} are free to try on your own. Halal Mode Premium opens all {{total}}: {{lab}} Lab workshops with {{scenarios}} scenarios, {{quizzes}} quizzes for every stage and {{stories}} stories. Play them with any match, and they play free.',
    },
    ar: {
      referralCodeLabel: 'رمزك:',
      confirmTitle: 'خطوة أخيرة', confirmBody: 'أكّد بريدك الإلكتروني لترى رابط الدعوة الخاص بك. وإذا دعاك صديق، فبهذا تُحتسب دعوته.', confirmButton: 'تأكيد بريدي', tierCount: '{{joined}} من {{goal}}',
      referralLinkTitle: 'إليك رابط الدعوة الخاص بك للمشاركة!', referralLinkLabel: 'رابط الدعوة الخاص بك', rewardMonth1: 'شهر بريميوم الخاص بك محجوز تلقائيًا للإطلاق.', rewardMonths: '{{months}} أشهر من بريميوم محجوزة لك تلقائيًا للإطلاق.', shareMessage: 'أنا في قائمة انتظار حلال مود، تطبيق زواج للمسلمين يقدّم تعارفًا أقل وأكثر عناية.\n\nسجّل في قائمة الانتظار من هنا: {{url}}',
      navRefer: 'ادعُ أصدقاءك', referralTitle: 'ادعُ أصدقاءك', referralBody: 'ادعُ بعض الأشخاص الطيبين واحصل على المزيد من بريميوم.', referralNote: 'يُحتسب الصديق منضمًا بعد أن يؤكد بريده الإلكتروني.', reward3: '3 انضمامات ← 3 أشهر مجانًا', reward5: '5 انضمامات ← 6 أشهر مجانًا', reward10: '10 انضمامات ← سنة مجانًا', copyInvite: 'انسخ رابط الدعوة', copiedInvite: 'تم النسخ', shareWhatsApp: 'واتساب', almostThereTitle: 'خطوة أخيرة.', almostThereBody: 'تفقّد بريدك الإلكتروني لتأكيد مكانك في قائمة الانتظار.', verificationError: 'رابط قائمة الانتظار هذا غير صالح أو منتهي الصلاحية.', verifiedEligible: 'مكافأة بريميوم الخاصة بك محجوزة تلقائيًا للإطلاق.', verifiedNotEligible: 'تم تأكيد بريدك الإلكتروني وحجز مكانك في قائمة الانتظار.', waitlistOffer: 'كن من أول 10,000 شخص في حلال مود واحصل تلقائيًا على شهر بريميوم مجانًا عند الإطلاق.', verifiedTitle: 'أنت معنا ✓', waitlistButton: 'سجّل في قائمة الانتظار',
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
      busyJoin: 'ينضم الكثيرون الآن. يُرجى المحاولة مرة أخرى بعد دقائق.',
      navTerms: 'شروط الخدمة', navPrivacy: 'إشعار الخصوصية',
      shareCode: 'رمز الدعوة الخاص بي: {{code}}',
      thanks: 'شكرًا! اسمك صار في القائمة. بنراسلك وقت إطلاق حلال مود.',
      error: 'صار خطأ بسيط. حاول مرة ثانية بعد شوي.',
      howTitle: 'حلال مود، طريقة أهدى وأوضح للزواج.',
      feature1Title: 'الجودة قبل الكثرة.',
      feature1Body: 'خمسة تعارفات مختارة بعناية مع كل فجر، منسّقة حسبك وحسب تفضيلاتك، لتشجّع تواصلًا حقيقيًا بدل التصفّح بلا نهاية.',
      feature2Title: 'الانجذاب مهم. والخصوصية كذلك.',
      feature2Body: 'التفضيلات الجسدية جزء طبيعي من البحث عن شريك الحياة. الطول والبنية يساعداننا على مطابقتك جيدًا، لكن تفضيلاتك تبقى خاصة ولا تظهر أبدًا كفلاتر عامة.',
      feature3Title: 'استحقّ المحادثة.',
      feature3Body: 'لا يتحول التطابق إلى محادثة إلا بعد أن يجيب كلاكما على بعض أسئلة التعارف التي اخترتماها معًا. ترى إجاباته بعد أن تشارك إجاباتك، فيقلّ التجاهل ويزيد الجدّ.',
      cardsTitle: 'علاقات تدوم.',
      cardsBody: 'بطاقات حلال تمنحكما أدوات عملية لزواج صحي ودائم: {{count}} من الاختبارات والتمارين والمغامرات التفاعلية لاكتشاف التواصل والتوقعات والتوافق معًا. متاحة بـ{{languages}} لغة.',
      cardsPremium: 'تقدر تجرّب بعضها مجانًا لوحدك ({{free}}). وحلال مود Premium يفتحها كلها ({{total}}): ورش المختبر ({{lab}}) بمواقفها ({{scenarios}})، واختبارات لكل مرحلة ({{quizzes}})، وقصص ({{stories}}). العبوها مع أي تعارف، والطرف الثاني يلعب مجانًا.'
    },
    ur: {
      referralCodeLabel: 'آپ کا کوڈ:',
      confirmTitle: 'بس ایک قدم باقی', confirmBody: 'اپنا ریفرل لنک دیکھنے کے لیے اپنی ای میل کی تصدیق کریں۔ اگر کسی دوست نے آپ کو مدعو کیا ہے تو اسی سے ان کا ریفرل شمار ہوگا۔', confirmButton: 'میری ای میل کی تصدیق کریں', tierCount: '{{goal}} میں سے {{joined}}',
      referralLinkTitle: 'یہ رہا آپ کا شیئر کرنے والا ریفرل لنک!', referralLinkLabel: 'آپ کا ریفرل لنک', rewardMonth1: 'آپ کا ایک مہینہ پریمیم لانچ کے لیے خود بخود محفوظ ہے۔', rewardMonths: 'آپ کے {{months}} مہینے پریمیم لانچ کے لیے خود بخود محفوظ ہیں۔', shareMessage: 'میں حلال موڈ کی انتظار کی فہرست میں ہوں۔ یہ مسلمانوں کے لیے شادی کی ایپ ہے جو کم مگر سوچ سمجھ کر کیے گئے تعارف پیش کرتی ہے۔\n\nیہاں انتظار کی فہرست میں شامل ہوں: {{url}}',
      navRefer: 'دوستوں کو مدعو کریں', referralTitle: 'دوستوں کو مدعو کریں', referralBody: 'چند اچھے لوگوں کو مدعو کریں اور مزید پریمیم حاصل کریں۔', referralNote: 'دوست تب شامل شمار ہوتا ہے جب وہ اپنی ای میل کی تصدیق کر لے۔', reward3: '3 شمولیتیں ← 3 مہینے مفت', reward5: '5 شمولیتیں ← 6 مہینے مفت', reward10: '10 شمولیتیں ← 1 سال مفت', copyInvite: 'دعوتی لنک کاپی کریں', copiedInvite: 'کاپی ہو گیا', shareWhatsApp: 'واٹس ایپ', almostThereTitle: 'بس ایک قدم باقی۔', almostThereBody: 'انتظار کی فہرست میں اپنی جگہ کی تصدیق کے لیے اپنی ای میل دیکھیں۔', verificationError: 'یہ لنک درست نہیں یا اس کی میعاد ختم ہو چکی ہے۔', verifiedEligible: 'آپ کا پریمیم انعام لانچ کے لیے خود بخود محفوظ ہو گیا ہے۔', verifiedNotEligible: 'آپ کی ای میل کی تصدیق ہو گئی ہے اور انتظار کی فہرست میں آپ کی جگہ محفوظ ہے۔', waitlistOffer: 'حلال موڈ کے پہلے 10,000 لوگوں میں شامل ہوں اور لانچ پر خود بخود ایک مہینہ پریمیم مفت پائیں۔', verifiedTitle: 'آپ شامل ہو گئے ✓', waitlistButton: 'انتظار کی فہرست میں شامل ہوں',
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
      busyJoin: 'اس وقت بہت سے لوگ شامل ہو رہے ہیں۔ براہِ کرم چند منٹ بعد دوبارہ کوشش کریں۔',
      navTerms: 'شرائط استعمال', navPrivacy: 'رازداری کا نوٹس',
      shareCode: 'میرا دعوتی کوڈ: {{code}}',
      thanks: 'شکریہ! آپ فہرست میں شامل ہو گئے ہیں۔ حلال موڈ شروع ہوتے ہی ہم آپ کو ای میل کریں گے۔',
      error: 'کچھ مسئلہ ہو گیا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
      howTitle: 'حلال موڈ، مسلم شادی کے لیے ایک بہتر ایپ۔',
      feature1Title: 'تعداد سے زیادہ معیار۔',
      feature1Body: 'ہر فجر کو پانچ سوچ سمجھ کر چنے گئے تعارف، آپ اور آپ کی ترجیحات کے مطابق، تاکہ بے مقصد براؤزنگ کے بجائے بامعنی رشتے بنیں۔',
      feature2Title: 'کشش اہم ہے۔ رازداری بھی۔',
      feature2Body: 'جسمانی ترجیحات شریکِ حیات کی تلاش کا فطری حصہ ہیں۔ قد اور جسامت ہمیں بہتر میچ کرنے میں مدد دیتے ہیں، مگر آپ کی ترجیحات نجی رہتی ہیں اور کبھی عوامی فلٹر کے طور پر نہیں دکھائی جاتیں۔',
      feature3Title: 'گفتگو کمائیں۔',
      feature3Body: 'میچ تبھی گفتگو بنتا ہے جب آپ دونوں مل کر چنے گئے چند آئس بریکر سوالوں کے جواب دے دیں۔ اپنے جواب شیئر کرنے کے بعد ہی آپ ان کے جواب دیکھتے ہیں، اس لیے غائب ہونا کم اور سنجیدگی زیادہ۔',
      cardsTitle: 'دیرپا رشتے بنانا۔',
      cardsBody: 'حلال کارڈز آپ کو صحت مند اور دیرپا شادی کے لیے عملی اوزار دیتے ہیں: {{count}} انٹرایکٹو کوئزز، مشقیں اور مہمات، تاکہ آپ مل کر بات چیت، توقعات اور ہم آہنگی کو سمجھ سکیں۔ {{languages}} زبانوں میں دستیاب۔',
      cardsPremium: '{{free}} چیزیں اکیلے مفت آزما سکتے ہیں۔ حلال موڈ Premium تمام {{total}} کھول دیتا ہے: {{scenarios}} منظرناموں والی {{lab}} ورکشاپس، ہر مرحلے کے لیے {{quizzes}} کوئز اور {{stories}} کہانیاں۔ کسی بھی میچ کے ساتھ کھیلیں، ان کے لیے مفت۔'
    },
    hi: {
      referralCodeLabel: 'आपका कोड:',
      confirmTitle: 'बस एक कदम और', confirmBody: 'अपना रेफ़रल लिंक देखने के लिए अपना ईमेल कन्फ़र्म करें। अगर किसी दोस्त ने आपको बुलाया है, तो इसी से उनका रेफ़रल गिना जाएगा।', confirmButton: 'मेरा ईमेल कन्फ़र्म करें', tierCount: '{{goal}} में से {{joined}}',
      referralLinkTitle: 'यह रहा आपका शेयर करने लायक रेफ़रल लिंक!', referralLinkLabel: 'आपका रेफ़रल लिंक', rewardMonth1: 'आपका 1 महीना प्रीमियम लॉन्च के लिए अपने आप रिज़र्व है।', rewardMonths: 'आपके {{months}} महीने प्रीमियम लॉन्च के लिए अपने आप रिज़र्व हैं।', shareMessage: 'मैं हलाल मोड की वेटलिस्ट में हूँ। यह मुसलमानों के लिए शादी का ऐप है, जिसमें कम लेकिन सोच-समझकर चुने गए परिचय मिलते हैं।\n\nयहाँ वेटलिस्ट में जुड़ें: {{url}}',
      navRefer: 'दोस्तों को बुलाएँ', referralTitle: 'दोस्तों को बुलाएँ', referralBody: 'कुछ अच्छे लोगों को बुलाएँ और ज़्यादा प्रीमियम पाएँ।', referralNote: 'दोस्त तब जुड़ा माना जाता है जब वह अपना ईमेल कन्फ़र्म कर ले।', reward3: '3 लोग जुड़ें → 3 महीने मुफ़्त', reward5: '5 लोग जुड़ें → 6 महीने मुफ़्त', reward10: '10 लोग जुड़ें → 1 साल मुफ़्त', copyInvite: 'इनवाइट लिंक कॉपी करें', copiedInvite: 'कॉपी हो गया', shareWhatsApp: 'WhatsApp', almostThereTitle: 'बस एक कदम और।', almostThereBody: 'वेटलिस्ट में अपनी जगह कन्फ़र्म करने के लिए अपना ईमेल देखें।', verificationError: 'यह वेटलिस्ट लिंक अमान्य है या इसकी समय-सीमा खत्म हो गई है।', verifiedEligible: 'आपका प्रीमियम इनाम लॉन्च के लिए अपने आप रिज़र्व हो गया है।', verifiedNotEligible: 'आपका ईमेल कन्फ़र्म हो गया है और वेटलिस्ट में आपकी जगह रिज़र्व है।', waitlistOffer: 'हलाल मोड के पहले 10,000 लोगों में शामिल हों और लॉन्च पर अपने आप 1 महीना प्रीमियम मुफ़्त पाएँ।', verifiedTitle: 'आप शामिल हो गए ✓', waitlistButton: 'वेटलिस्ट में जुड़ें',
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
      busyJoin: 'अभी बहुत से लोग जुड़ रहे हैं। कृपया कुछ मिनट बाद फिर कोशिश करें।',
      navTerms: 'सेवा की शर्तें', navPrivacy: 'गोपनीयता सूचना',
      shareCode: 'मेरा इनवाइट कोड: {{code}}',
      thanks: 'शुक्रिया! आप वेटलिस्ट में जुड़ गए हैं। हलाल मोड शुरू होते ही हम आपको ईमेल करेंगे।',
      error: 'कुछ गड़बड़ हो गई। थोड़ी देर बाद फिर कोशिश करें।',
      howTitle: 'हलाल मोड, मुस्लिम शादी के लिए एक बेहतर ऐप।',
      feature1Title: 'संख्या से ज़्यादा गुणवत्ता।',
      feature1Body: 'हर फ़ज्र पाँच सोच-समझकर चुने गए परिचय, आपके और आपकी पसंद के हिसाब से तैयार, ताकि बेमतलब ब्राउज़िंग की जगह सार्थक रिश्ते बनें।',
      feature2Title: 'आकर्षण मायने रखता है। निजता भी।',
      feature2Body: 'शारीरिक पसंद जीवनसाथी ढूँढने का स्वाभाविक हिस्सा है। लंबाई और कद-काठी हमें आपका बेहतर मिलान करने में मदद करते हैं, लेकिन आपकी पसंद निजी रहती है और कभी सार्वजनिक फ़िल्टर के रूप में नहीं दिखती।',
      feature3Title: 'बातचीत कमाइए।',
      feature3Body: 'मैच तभी बातचीत बनता है जब आप दोनों मिलकर चुने गए कुछ आइसब्रेकर सवालों के जवाब दे दें। अपने जवाब साझा करने के बाद ही आप उनके जवाब देखते हैं, इसलिए घोस्टिंग कम और इरादा ज़्यादा।',
      cardsTitle: 'लंबे चलने वाले रिश्ते बनाना।',
      cardsBody: 'हलाल कार्ड्स आपको एक स्वस्थ, लंबी शादी के लिए व्यावहारिक साधन देते हैं: {{count}} इंटरैक्टिव क्विज़, अभ्यास और रोमांच, ताकि आप साथ मिलकर बातचीत, उम्मीदें और तालमेल समझ सकें। {{languages}} भाषाओं में उपलब्ध।',
      cardsPremium: '{{free}} चीज़ें आप अकेले मुफ़्त आज़मा सकते हैं। हलाल मोड Premium सभी {{total}} खोल देता है: {{scenarios}} परिस्थितियों वाली {{lab}} वर्कशॉप, हर पड़ाव के लिए {{quizzes}} क्विज़ और {{stories}} कहानियाँ। किसी भी मैच के साथ खेलें, उनके लिए मुफ़्त।'
    },
    id: {
      referralCodeLabel: 'Kodemu:',
      confirmTitle: 'Tinggal satu langkah', confirmBody: 'Konfirmasi email-mu untuk melihat tautan referral kamu. Jika teman mengajakmu, ini juga yang membuat ajakannya terhitung.', confirmButton: 'Konfirmasi email saya', tierCount: '{{joined}} dari {{goal}}',
      referralLinkTitle: 'Ini tautan referral kamu yang bisa dibagikan!', referralLinkLabel: 'Tautan referral kamu', rewardMonth1: '1 bulan Premium kamu otomatis disimpan untuk peluncuran.', rewardMonths: '{{months}} bulan Premium kamu otomatis disimpan untuk peluncuran.', shareMessage: 'Aku ada di daftar tunggu Halal Mode. Ini aplikasi pernikahan Muslim dengan perkenalan yang lebih sedikit tapi lebih bermakna.\n\nGabung daftar tunggu di sini: {{url}}',
      navRefer: 'Ajak temanmu', referralTitle: 'Ajak temanmu', referralBody: 'Ajak beberapa orang baik dan dapatkan lebih banyak Premium.', referralNote: 'Teman dihitung bergabung setelah mengonfirmasi email-nya.', reward3: '3 bergabung → 3 bulan gratis', reward5: '5 bergabung → 6 bulan gratis', reward10: '10 bergabung → 1 tahun gratis', copyInvite: 'Salin tautan undangan', copiedInvite: 'Tersalin', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Sedikit lagi.', almostThereBody: 'Cek email-mu untuk mengonfirmasi tempatmu di daftar tunggu.', verificationError: 'Tautan daftar tunggu ini tidak valid atau sudah kedaluwarsa.', verifiedEligible: 'Hadiah Premium-mu otomatis disimpan untuk peluncuran.', verifiedNotEligible: 'Email-mu sudah terverifikasi dan tempatmu di daftar tunggu sudah aman.', waitlistOffer: 'Jadilah salah satu dari 10.000 orang pertama di Halal Mode dan otomatis dapatkan 1 bulan Premium gratis saat peluncuran.', verifiedTitle: 'Kamu sudah terdaftar ✓', waitlistButton: 'Gabung daftar tunggu',
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
      busyJoin: 'Banyak orang sedang bergabung saat ini. Silakan coba lagi dalam beberapa menit.',
      navTerms: 'Ketentuan Layanan', navPrivacy: 'Pemberitahuan Privasi',
      shareCode: 'Kode undanganku: {{code}}',
      thanks: 'Terima kasih! Kamu sudah masuk daftar. Kami akan mengirim email saat Halal Mode hadir.',
      error: 'Ada yang bermasalah. Coba lagi sebentar ya.',
      howTitle: 'Halal Mode, cara yang lebih baik untuk mencari pasangan Muslim.',
      feature1Title: 'Kualitas di atas kuantitas.',
      feature1Body: 'Lima perkenalan pilihan setiap Subuh, disesuaikan dengan kamu dan preferensimu, untuk mendorong hubungan yang bermakna, bukan sekadar menggulir tanpa akhir.',
      feature2Title: 'Ketertarikan itu penting. Privasi juga.',
      feature2Body: 'Preferensi fisik adalah bagian wajar dalam mencari pasangan hidup. Tinggi dan postur membantu kami mencocokkanmu dengan baik, tapi preferensimu tetap pribadi dan tidak pernah ditampilkan sebagai filter publik.',
      feature3Title: 'Raih percakapannya.',
      feature3Body: 'Kecocokan baru menjadi percakapan setelah kalian berdua menjawab beberapa pertanyaan pembuka yang kalian pilih bersama. Kamu melihat jawabannya setelah membagikan jawabanmu, jadi lebih sedikit ghosting dan lebih banyak kesungguhan.',
      cardsTitle: 'Membangun hubungan yang langgeng.',
      cardsBody: 'Halal Cards memberi kalian alat praktis untuk pernikahan yang sehat dan langgeng: {{count}} kuis, latihan, dan petualangan interaktif untuk menjelajahi komunikasi, harapan, dan kecocokan bersama. Tersedia dalam {{languages}} bahasa.',
      cardsPremium: '{{free}} bisa dicoba gratis sendiri. Halal Mode Premium membuka semua {{total}}: {{lab}} lokakarya Lab dengan {{scenarios}} skenario, {{quizzes}} kuis untuk setiap tahap, dan {{stories}} cerita. Mainkan dengan siapa pun yang cocok, gratis untuknya.'
    },
    ms: {
      referralCodeLabel: 'Kod anda:',
      confirmTitle: 'Tinggal satu langkah', confirmBody: 'Sahkan e-mel anda untuk melihat pautan rujukan anda. Jika rakan menjemput anda, inilah yang mengira jemputannya.', confirmButton: 'Sahkan e-mel saya', tierCount: '{{joined}} daripada {{goal}}',
      referralLinkTitle: 'Ini pautan rujukan anda untuk dikongsi!', referralLinkLabel: 'Pautan rujukan anda', rewardMonth1: '1 bulan Premium anda ditempah secara automatik untuk pelancaran.', rewardMonths: '{{months}} bulan Premium anda ditempah secara automatik untuk pelancaran.', shareMessage: 'Saya dalam senarai menunggu Halal Mode. Ia aplikasi perkahwinan Muslim dengan perkenalan yang lebih sedikit tetapi lebih bermakna.\n\nSertai senarai menunggu di sini: {{url}}',
      navRefer: 'Jemput rakan anda', referralTitle: 'Jemput rakan anda', referralBody: 'Jemput beberapa orang yang baik dan dapatkan lebih banyak Premium.', referralNote: 'Rakan dikira menyertai selepas mengesahkan e-mel mereka.', reward3: '3 sertai → 3 bulan percuma', reward5: '5 sertai → 6 bulan percuma', reward10: '10 sertai → 1 tahun percuma', copyInvite: 'Salin pautan jemputan', copiedInvite: 'Disalin', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Hampir siap.', almostThereBody: 'Semak e-mel anda untuk mengesahkan tempat anda dalam senarai menunggu.', verificationError: 'Pautan senarai menunggu ini tidak sah atau telah tamat tempoh.', verifiedEligible: 'Ganjaran Premium anda telah ditempah secara automatik untuk pelancaran.', verifiedNotEligible: 'E-mel anda telah disahkan dan tempat anda dalam senarai menunggu telah ditempah.', waitlistOffer: 'Sertai 10,000 orang pertama di Halal Mode dan dapatkan 1 bulan Premium percuma secara automatik semasa pelancaran.', verifiedTitle: 'Anda sudah berdaftar ✓', waitlistButton: 'Sertai senarai menunggu',
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
      busyJoin: 'Ramai orang sedang menyertai sekarang. Sila cuba lagi dalam beberapa minit.',
      navTerms: 'Terma Perkhidmatan', navPrivacy: 'Notis Privasi',
      shareCode: 'Kod jemputan saya: {{code}}',
      thanks: 'Terima kasih! Anda sudah dalam senarai. Kami akan e-mel anda apabila Halal Mode dilancarkan.',
      error: 'Ada masalah. Cuba lagi sebentar nanti.',
      howTitle: 'Halal Mode, cara yang lebih baik untuk mencari pasangan Muslim.',
      feature1Title: 'Kualiti mengatasi kuantiti.',
      feature1Body: 'Lima perkenalan terpilih setiap Subuh, disesuaikan dengan anda dan pilihan anda, untuk menggalakkan hubungan yang bermakna dan bukan sekadar melayari tanpa henti.',
      feature2Title: 'Tarikan itu penting. Privasi juga.',
      feature2Body: 'Pilihan fizikal ialah bahagian yang wajar dalam mencari pasangan hidup. Ketinggian dan bentuk badan membantu kami memadankan anda dengan baik, tetapi pilihan anda kekal peribadi dan tidak pernah dipaparkan sebagai penapis awam.',
      feature3Title: 'Raih perbualannya.',
      feature3Body: 'Padanan hanya menjadi perbualan selepas anda berdua menjawab beberapa soalan pemecah ais yang dipilih bersama. Anda melihat jawapannya selepas berkongsi jawapan anda, jadi kurang ghosting dan lebih kesungguhan.',
      cardsTitle: 'Membina hubungan yang kekal.',
      cardsBody: 'Halal Cards memberi anda alat praktikal untuk perkahwinan yang sihat dan berkekalan: {{count}} kuiz, latihan dan pengembaraan interaktif untuk meneroka komunikasi, harapan dan keserasian bersama. Tersedia dalam {{languages}} bahasa.',
      cardsPremium: '{{free}} boleh dicuba percuma sendiri. Halal Mode Premium membuka kesemua {{total}}: {{lab}} bengkel Lab dengan {{scenarios}} senario, {{quizzes}} kuiz untuk setiap peringkat dan {{stories}} cerita. Mainkan dengan sesiapa padanan anda, percuma untuknya.'
    },
    bn: {
      referralCodeLabel: 'আপনার কোড:',
      confirmTitle: 'আর একটি ধাপ', confirmBody: 'আপনার রেফারেল লিংক দেখতে ইমেইল নিশ্চিত করুন। কোনো বন্ধু আপনাকে আমন্ত্রণ জানালে, এতেই তার রেফারেল গোনা হবে।', confirmButton: 'আমার ইমেইল নিশ্চিত করুন', tierCount: '{{goal}} জনের মধ্যে {{joined}}',
      referralLinkTitle: 'এই নিন আপনার শেয়ার করার রেফারেল লিংক!', referralLinkLabel: 'আপনার রেফারেল লিংক', rewardMonth1: 'আপনার ১ মাস প্রিমিয়াম লঞ্চের জন্য নিজে থেকেই সংরক্ষিত।', rewardMonths: 'আপনার {{months}} মাস প্রিমিয়াম লঞ্চের জন্য নিজে থেকেই সংরক্ষিত।', shareMessage: 'আমি হালাল মোডের অপেক্ষার তালিকায় আছি। এটি মুসলিমদের বিয়ের অ্যাপ, যেখানে কম কিন্তু ভেবেচিন্তে বাছাই করা পরিচয় মেলে।\n\nএখানে অপেক্ষার তালিকায় যোগ দিন: {{url}}',
      navRefer: 'বন্ধুদের আমন্ত্রণ জানান', referralTitle: 'বন্ধুদের আমন্ত্রণ জানান', referralBody: 'কয়েকজন ভালো মানুষকে আমন্ত্রণ জানান আর আরও প্রিমিয়াম পান।', referralNote: 'বন্ধু ইমেইল নিশ্চিত করলে তবেই যোগ দিয়েছেন বলে গোনা হয়।', reward3: '৩ জন যোগ দিলে → ৩ মাস ফ্রি', reward5: '৫ জন যোগ দিলে → ৬ মাস ফ্রি', reward10: '১০ জন যোগ দিলে → ১ বছর ফ্রি', copyInvite: 'আমন্ত্রণ লিংক কপি করুন', copiedInvite: 'কপি হয়েছে', shareWhatsApp: 'হোয়াটসঅ্যাপ', almostThereTitle: 'আর একটু বাকি।', almostThereBody: 'অপেক্ষার তালিকায় আপনার জায়গা নিশ্চিত করতে ইমেইল দেখুন।', verificationError: 'অপেক্ষার তালিকার এই লিংকটি সঠিক নয় বা এর মেয়াদ শেষ হয়ে গেছে।', verifiedEligible: 'আপনার প্রিমিয়াম পুরস্কার লঞ্চের জন্য নিজে থেকেই সংরক্ষিত হয়েছে।', verifiedNotEligible: 'আপনার ইমেইল যাচাই হয়েছে এবং অপেক্ষার তালিকায় আপনার জায়গা সংরক্ষিত।', waitlistOffer: 'হালাল মোডের প্রথম ১০,০০০ জনের একজন হোন, আর লঞ্চের সময় নিজে থেকেই ১ মাস প্রিমিয়াম ফ্রি পান।', verifiedTitle: 'আপনি যুক্ত হয়েছেন ✓', waitlistButton: 'অপেক্ষার তালিকায় যোগ দিন',
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
      busyJoin: 'এই মুহূর্তে অনেকে যোগ দিচ্ছেন। কয়েক মিনিট পর আবার চেষ্টা করুন।',
      navTerms: 'সেবার শর্তাবলি', navPrivacy: 'গোপনীয়তা বিজ্ঞপ্তি',
      shareCode: 'আমার আমন্ত্রণ কোড: {{code}}',
      thanks: 'ধন্যবাদ! আপনি তালিকায় আছেন। হালাল মোড চালু হলে আমরা ইমেইল করব।',
      error: 'কিছু একটা সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।',
      howTitle: 'হালাল মোড, মুসলিমদের বিয়ের জন্য আরও ভালো অ্যাপ।',
      feature1Title: 'সংখ্যার চেয়ে মান বড়।',
      feature1Body: 'প্রতি ফজরে পাঁচটি ভেবেচিন্তে বাছাই করা পরিচয়, আপনার ও আপনার পছন্দ অনুযায়ী সাজানো, যাতে অবিরাম স্ক্রল নয়, অর্থপূর্ণ সম্পর্ক গড়ে ওঠে।',
      feature2Title: 'আকর্ষণ গুরুত্বপূর্ণ। গোপনীয়তাও।',
      feature2Body: 'শারীরিক পছন্দ জীবনসঙ্গী খোঁজার স্বাভাবিক অংশ। উচ্চতা ও গড়ন আমাদের ভালো মিল খুঁজতে সাহায্য করে, তবে আপনার পছন্দ ব্যক্তিগতই থাকে এবং কখনো প্রকাশ্য ফিল্টার হিসেবে দেখানো হয় না।',
      feature3Title: 'কথোপকথন অর্জন করুন।',
      feature3Body: 'আপনারা দুজনে মিলে বেছে নেওয়া কয়েকটি আইসব্রেকার প্রশ্নের উত্তর দিলে তবেই ম্যাচ কথোপকথনে পরিণত হয়। নিজের উত্তর শেয়ার করার পরই আপনি তাঁর উত্তর দেখেন, তাই ঘোস্টিং কমে আর আন্তরিকতা বাড়ে।',
      cardsTitle: 'দীর্ঘস্থায়ী সম্পর্ক গড়া।',
      cardsBody: 'হালাল কার্ডস আপনাদের সুস্থ ও দীর্ঘস্থায়ী বিয়ের জন্য ব্যবহারিক উপকরণ দেয়: {{count}}টি ইন্টারঅ্যাকটিভ কুইজ, অনুশীলন ও অভিযান, যাতে একসঙ্গে যোগাযোগ, প্রত্যাশা ও মিল বুঝতে পারেন। {{languages}}টি ভাষায় পাওয়া যায়।',
      cardsPremium: '{{free}}টি একা বিনামূল্যে চেষ্টা করতে পারেন। হালাল মোড Premium খুলে দেয় সব {{total}}টি: {{scenarios}}টি পরিস্থিতিসহ {{lab}}টি কর্মশালা, প্রতিটি পর্যায়ের জন্য {{quizzes}}টি কুইজ আর {{stories}}টি গল্প। যেকোনো ম্যাচের সাথে খেলুন, তাঁর জন্য বিনামূল্যে।'
    },
    fr: {
      referralCodeLabel: 'Votre code :',
      confirmTitle: 'Plus qu’une étape', confirmBody: 'Confirmez votre e-mail pour voir votre lien de parrainage. Si un ami vous a invité, c’est aussi ce qui compte son parrainage.', confirmButton: 'Confirmer mon e-mail', tierCount: '{{joined}} sur {{goal}}',
      referralLinkTitle: 'Voici votre lien de parrainage à partager !', referralLinkLabel: 'Votre lien de parrainage', rewardMonth1: 'Votre mois de Premium est automatiquement réservé pour le lancement.', rewardMonths: 'Vos {{months}} mois de Premium sont automatiquement réservés pour le lancement.', shareMessage: 'Je suis sur la liste d’attente de Halal Mode, une application de mariage musulmane fondée sur moins de présentations, mieux choisies.\n\nInscris-toi ici : {{url}}',
      navRefer: 'Parrainez vos amis', referralTitle: 'Parrainez vos amis', referralBody: 'Invitez quelques belles personnes et débloquez plus de Premium.', referralNote: 'Un ami compte comme inscrit une fois son e-mail confirmé.', reward3: '3 inscriptions → 3 mois offerts', reward5: '5 inscriptions → 6 mois offerts', reward10: '10 inscriptions → 1 an offert', copyInvite: 'Copier le lien d’invitation', copiedInvite: 'Copié', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Presque fini.', almostThereBody: 'Consultez vos e-mails pour confirmer votre place sur la liste d’attente.', verificationError: 'Ce lien de liste d’attente est invalide ou a expiré.', verifiedEligible: 'Votre récompense Premium est automatiquement réservée pour le lancement.', verifiedNotEligible: 'Votre e-mail est vérifié et votre place sur la liste d’attente est réservée.', waitlistOffer: 'Faites partie des 10 000 premières personnes sur Halal Mode et recevez automatiquement 1 mois de Premium offert au lancement.', verifiedTitle: 'C’est fait ✓', waitlistButton: 'Rejoindre la liste d’attente',
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
      busyJoin: 'Beaucoup de personnes s’inscrivent en ce moment. Veuillez réessayer dans quelques minutes.',
      navTerms: 'Conditions d’utilisation', navPrivacy: 'Politique de confidentialité',
      shareCode: 'Mon code d’invitation : {{code}}',
      thanks: 'Merci ! Vous êtes sur la liste. Nous vous écrirons au lancement de Halal Mode.',
      error: 'Un problème est survenu. Réessayez dans un instant.',
      howTitle: 'Halal Mode, une meilleure façon de faire des rencontres pour le mariage.',
      feature1Title: 'La qualité avant la quantité.',
      feature1Body: 'Cinq présentations soigneusement choisies à chaque Fajr, pensées pour vous et vos préférences, pour favoriser de vraies rencontres plutôt qu’un défilement sans fin.',
      feature2Title: 'L’attirance compte. La discrétion aussi.',
      feature2Body: 'Les préférences physiques font naturellement partie de la recherche d’un conjoint. La taille et la silhouette nous aident à bien vous présenter, mais vos préférences restent privées et ne sont jamais affichées comme des filtres publics.',
      feature3Title: 'Méritez la conversation.',
      feature3Body: 'Une rencontre ne devient une conversation qu’une fois que vous avez tous deux répondu à quelques questions brise-glace choisies ensemble. Vous voyez ses réponses après avoir partagé les vôtres : moins de ghosting, plus d’intention.',
      cardsTitle: 'Construire une relation qui dure.',
      cardsBody: 'Halal Cards vous donne des outils concrets pour un mariage sain et durable : {{count}} quiz, exercices et aventures interactifs pour explorer ensemble la communication, les attentes et la compatibilité. Disponible en {{languages}} langues.',
      cardsPremium: '{{free}} sont à essayer gratuitement, seul. Halal Mode Premium ouvre les {{total}} : {{lab}} ateliers avec {{scenarios}} situations, {{quizzes}} quiz pour chaque étape et {{stories}} histoires. Jouez-y avec n’importe quel contact, gratuitement pour l’autre.'
    },
    tr: {
      referralCodeLabel: 'Kodun:',
      confirmTitle: 'Bir adım kaldı', confirmBody: 'Davet bağlantını görmek için e-postanı onayla. Bir arkadaşın seni davet ettiyse, daveti de bununla sayılır.', confirmButton: 'E-postamı onayla', tierCount: '{{goal}} kişiden {{joined}}',
      referralLinkTitle: 'İşte paylaşabileceğin davet bağlantın!', referralLinkLabel: 'Davet bağlantın', rewardMonth1: '1 aylık Premium’un lansman için otomatik olarak ayrıldı.', rewardMonths: '{{months}} aylık Premium’un lansman için otomatik olarak ayrıldı.', shareMessage: 'Halal Mode bekleme listesindeyim. Daha az ama daha özenli tanışmalar sunan bir Müslüman evlilik uygulaması.\n\nBekleme listesine buradan katıl: {{url}}',
      navRefer: 'Arkadaşlarını davet et', referralTitle: 'Arkadaşlarını davet et', referralBody: 'Birkaç iyi insanı davet et, daha fazla Premium kazan.', referralNote: 'Bir arkadaşın, e-postasını onayladığında katılmış sayılır.', reward3: '3 katılım → 3 ay ücretsiz', reward5: '5 katılım → 6 ay ücretsiz', reward10: '10 katılım → 1 yıl ücretsiz', copyInvite: 'Davet bağlantısını kopyala', copiedInvite: 'Kopyalandı', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Az kaldı.', almostThereBody: 'Bekleme listesindeki yerini onaylamak için e-postanı kontrol et.', verificationError: 'Bu bekleme listesi bağlantısı geçersiz veya süresi dolmuş.', verifiedEligible: 'Premium ödülün lansman için otomatik olarak ayrıldı.', verifiedNotEligible: 'E-postan doğrulandı ve bekleme listesindeki yerin ayrıldı.', waitlistOffer: 'Halal Mode’daki ilk 10.000 kişiden biri ol, lansmanda otomatik olarak 1 ay ücretsiz Premium kazan.', verifiedTitle: 'Listedesin ✓', waitlistButton: 'Bekleme listesine katıl',
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
      busyJoin: 'Şu anda çok sayıda kişi katılıyor. Lütfen birkaç dakika sonra tekrar deneyin.',
      navTerms: 'Kullanım Koşulları', navPrivacy: 'Gizlilik Bildirimi',
      shareCode: 'Davet kodum: {{code}}',
      thanks: 'Teşekkürler! Listedesin. Halal Mode açıldığında sana e-posta göndereceğiz.',
      error: 'Bir sorun oldu. Biraz sonra tekrar dene.',
      howTitle: 'Halal Mode, Müslümanlar için daha iyi bir evlilik uygulaması.',
      feature1Title: 'Nicelik değil nitelik.',
      feature1Body: 'Her sabah namazı vaktinde, sana ve tercihlerine göre özenle seçilmiş beş tanışma; sonsuz gezinme yerine anlamlı bağlar için.',
      feature2Title: 'Çekim önemli. Mahremiyet de.',
      feature2Body: 'Fiziksel tercihler eş aramanın doğal bir parçasıdır. Boy ve vücut yapısı seni iyi eşleştirmemize yardımcı olur, ama tercihlerin gizli kalır ve asla herkese açık filtre olarak gösterilmez.',
      feature3Title: 'Sohbeti hak et.',
      feature3Body: 'Bir eşleşme, ancak ikiniz de birlikte seçtiğiniz birkaç tanışma sorusunu yanıtladığınızda sohbete dönüşür. Kendi cevaplarını paylaştıktan sonra onunkileri görürsün; böylece ortadan kaybolma azalır, niyet artar.',
      cardsTitle: 'Kalıcı ilişkiler kurmak.',
      cardsBody: 'Halal Cards size sağlıklı ve kalıcı bir evlilik için pratik araçlar sunar: iletişimi, beklentileri ve uyumu birlikte keşfetmeniz için {{count}} etkileşimli test, alıştırma ve macera. {{languages}} dilde mevcut.',
      cardsPremium: '{{free}} tanesini tek başınıza ücretsiz deneyebilirsiniz. Halal Mode Premium {{total}} etkinliğin hepsini açar: {{scenarios}} senaryolu {{lab}} atölye, her aşama için {{quizzes}} test ve {{stories}} hikâye. Her eşleşmeyle oynayın, karşı taraf için ücretsiz.'
    },
    fa: {
      referralCodeLabel: 'کد شما:',
      confirmTitle: 'یک قدم مانده', confirmBody: 'برای دیدن لینک دعوت خود، ایمیلتان را تأیید کنید. اگر دوستی شما را دعوت کرده، دعوت او هم با همین حساب می‌شود.', confirmButton: 'تأیید ایمیل من', tierCount: '{{joined}} از {{goal}}',
      referralLinkTitle: 'این هم لینک دعوت شما برای اشتراک‌گذاری!', referralLinkLabel: 'لینک دعوت شما', rewardMonth1: '۱ ماه پریمیوم شما به‌طور خودکار برای زمان راه‌اندازی رزرو شده است.', rewardMonths: '{{months}} ماه پریمیوم شما به‌طور خودکار برای زمان راه‌اندازی رزرو شده است.', shareMessage: 'من در فهرست انتظار حلال مود هستم؛ اپ ازدواج مسلمانان با آشنایی‌های کمتر اما سنجیده‌تر.\n\nاز اینجا به فهرست انتظار بپیوندید: {{url}}',
      navRefer: 'دوستانتان را دعوت کنید', referralTitle: 'دوستانتان را دعوت کنید', referralBody: 'چند آدم خوب را دعوت کنید و پریمیوم بیشتری بگیرید.', referralNote: 'دوست شما وقتی عضو حساب می‌شود که ایمیلش را تأیید کند.', reward3: '۳ عضویت ← ۳ ماه رایگان', reward5: '۵ عضویت ← ۶ ماه رایگان', reward10: '۱۰ عضویت ← ۱ سال رایگان', copyInvite: 'کپی لینک دعوت', copiedInvite: 'کپی شد', shareWhatsApp: 'واتس‌اپ', almostThereTitle: 'یک قدم مانده.', almostThereBody: 'برای تأیید جایتان در فهرست انتظار، ایمیلتان را ببینید.', verificationError: 'این لینک فهرست انتظار نامعتبر است یا منقضی شده.', verifiedEligible: 'پاداش پریمیوم شما به‌طور خودکار برای زمان راه‌اندازی رزرو شده است.', verifiedNotEligible: 'ایمیل شما تأیید شد و جایتان در فهرست انتظار رزرو شده است.', waitlistOffer: 'جزو ۱۰٬۰۰۰ نفر اول حلال مود باشید و هنگام راه‌اندازی به‌طور خودکار ۱ ماه پریمیوم رایگان بگیرید.', verifiedTitle: 'ثبت شدید ✓', waitlistButton: 'عضویت در فهرست انتظار',
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
      busyJoin: 'هم‌اکنون افراد زیادی در حال پیوستن هستند. لطفاً چند دقیقه دیگر دوباره تلاش کنید.',
      navTerms: 'شرایط استفاده', navPrivacy: 'اطلاعیه حریم خصوصی',
      shareCode: 'کد دعوت من: {{code}}',
      thanks: 'ممنون! اسم‌تان در فهرست ثبت شد. وقتی حلال مود شروع شود به شما ایمیل می‌زنیم.',
      error: 'مشکلی پیش آمد. کمی بعد دوباره امتحان کنید.',
      howTitle: 'حلال مود، راهی بهتر برای ازدواج مسلمان‌ها.',
      feature1Title: 'کیفیت مهم‌تر از کمیت.',
      feature1Body: 'هر فجر پنج معرفیِ با دقت انتخاب‌شده، متناسب با شما و ترجیحاتتان، برای ارتباط‌های معنادار به‌جای گشت‌وگذار بی‌پایان.',
      feature2Title: 'جذابیت مهم است. حریم خصوصی هم.',
      feature2Body: 'ترجیحات ظاهری بخشی طبیعی از یافتن همسر است. قد و اندام به ما کمک می‌کند شما را بهتر معرفی کنیم، اما ترجیحاتتان خصوصی می‌ماند و هرگز به‌صورت فیلتر عمومی نمایش داده نمی‌شود.',
      feature3Title: 'گفتگو را به دست آورید.',
      feature3Body: 'یک تطابق فقط وقتی به گفتگو تبدیل می‌شود که هر دو به چند سؤال یخ‌شکنِ انتخاب‌شده با هم پاسخ دهید. پاسخ‌های او را بعد از به اشتراک گذاشتن پاسخ‌های خودتان می‌بینید؛ پس غیب‌شدن کمتر و قصد جدی بیشتر.',
      cardsTitle: 'ساختن رابطه‌ای ماندگار.',
      cardsBody: 'کارت‌های حلال ابزارهای کاربردی برای ازدواجی سالم و ماندگار به شما می‌دهد: {{count}} آزمون، تمرین و ماجرای تعاملی برای کشف ارتباط، انتظارات و سازگاری با هم. در {{languages}} زبان در دسترس است.',
      cardsPremium: '{{free}} مورد را می‌توانید رایگان و به‌تنهایی امتحان کنید. حلال مود Premium همهٔ {{total}} مورد را باز می‌کند: {{lab}} کارگاه با {{scenarios}} موقعیت، {{quizzes}} آزمونک برای هر مرحله و {{stories}} داستان. با هر آشنایی بازی کنید، برای طرف مقابل رایگان.'
    },
    ha: {
      referralCodeLabel: 'Lambarku:',
      confirmTitle: 'Saura mataki ɗaya', confirmBody: 'Tabbatar da imel ɗinku don ganin hanyar gayyatarku. Idan aboki ne ya gayyace ku, da wannan ne ake ƙirga gayyatarsa.', confirmButton: 'Tabbatar da imel ɗina', tierCount: '{{joined}} cikin {{goal}}',
      referralLinkTitle: 'Ga hanyar gayyatarku da za ku iya rabawa!', referralLinkLabel: 'Hanyar gayyatarku', rewardMonth1: 'An adana muku wata 1 na Premium kai tsaye don ƙaddamarwa.', rewardMonths: 'An adana muku wata {{months}} na Premium kai tsaye don ƙaddamarwa.', shareMessage: 'Ina cikin jerin masu jira na Halal Mode. Manhajar aure ce ta Musulmi mai gabatarwa kaɗan amma masu kyau.\n\nShiga jerin masu jira a nan: {{url}}',
      navRefer: 'Gayyato abokanku', referralTitle: 'Gayyato abokanku', referralBody: 'Gayyato wasu nagartattun mutane ku samu ƙarin Premium.', referralNote: 'Ana ƙirga aboki a matsayin wanda ya shiga bayan ya tabbatar da imel ɗinsa.', reward3: 'Mutum 3 sun shiga → wata 3 kyauta', reward5: 'Mutum 5 sun shiga → wata 6 kyauta', reward10: 'Mutum 10 sun shiga → shekara 1 kyauta', copyInvite: 'Kwafi hanyar gayyata', copiedInvite: 'An kwafa', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Saura kaɗan.', almostThereBody: 'Duba imel ɗinku don tabbatar da matsayinku a jerin jira.', verificationError: 'Wannan hanyar jerin jira ba ta da inganci ko ta ƙare.', verifiedEligible: 'An adana muku kyautar Premium kai tsaye don lokacin ƙaddamarwa.', verifiedNotEligible: 'An tabbatar da imel ɗinku kuma an adana matsayinku a jerin jira.', waitlistOffer: 'Ku kasance cikin mutum 10,000 na farko a Halal Mode kuma ku samu wata 1 na Premium kyauta kai tsaye lokacin ƙaddamarwa.', verifiedTitle: 'Kun shiga ✓', waitlistButton: 'Shiga jerin masu jira',
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
      busyJoin: 'Mutane da yawa suna shiga yanzu. Da fatan za a sake gwadawa nan da ’yan mintuna.',
      navTerms: 'Sharuɗɗan Sabis', navPrivacy: 'Sanarwar Sirri',
      shareCode: 'Lambar gayyata ta: {{code}}',
      thanks: 'Na gode! An saka ku a jerin. Za mu turo muku imel idan Halal Mode ta fara.',
      error: 'An samu matsala. Ku sake gwadawa nan gaba kaɗan.',
      howTitle: 'Halal Mode, hanya mafi kyau ga Musulmai masu neman aure.',
      feature1Title: 'Inganci fiye da yawa.',
      feature1Body: 'Gabatarwa biyar da aka zaɓa da kulawa kowace Asuba, an tsara su bisa ku da abubuwan da kuke so, don ƙarfafa alaƙa mai ma’ana maimakon bincike mara iyaka.',
      feature2Title: 'Sha’awa na da muhimmanci. Sirri ma haka.',
      feature2Body: 'Abubuwan da ake so a jiki wani ɓangare ne na neman abokin aure. Tsawo da kamannin jiki suna taimaka mana mu haɗa ku da kyau, amma abubuwan da kuke so suna zama sirri kuma ba a taɓa nuna su a matsayin tacewar jama’a ba.',
      feature3Title: 'Ku cancanci tattaunawa.',
      feature3Body: 'Haɗi yana zama tattaunawa ne kawai bayan ku duka kun amsa wasu tambayoyin buɗe magana da kuka zaɓa tare. Kuna ganin amsoshinsa bayan kun raba naku, don haka ɓacewa ta ragu kuma niyya ta ƙaru.',
      cardsTitle: 'Gina dangantaka mai ɗorewa.',
      cardsBody: 'Halal Cards na ba ku kayan aiki masu amfani don aure mai lafiya da ɗorewa: tambayoyi, atisaye da kasada guda {{count}} masu mu’amala don bincika sadarwa, tsammani da dacewa tare. Akwai su cikin harsuna {{languages}}.',
      cardsPremium: 'Za ku iya gwada guda {{free}} kyauta da kanku. Halal Mode Premium yana buɗe duka {{total}}: bita {{lab}} masu yanayi {{scenarios}}, tambayoyi {{quizzes}} na kowane mataki da labarai {{stories}}. Ku yi wasa da kowane wanda kuka dace, kyauta gare shi/ita.'
    },
    am: {
      referralCodeLabel: 'የእርስዎ ኮድ፦',
      confirmTitle: 'አንድ እርምጃ ቀርቷል', confirmBody: 'የግብዣ ሊንክዎን ለማየት ኢሜይልዎን ያረጋግጡ። ጓደኛ ጋብዞዎት ከሆነ ግብዣው የሚቆጠረውም በዚሁ ነው።', confirmButton: 'ኢሜይሌን አረጋግጥ', tierCount: 'ከ{{goal}} {{joined}}',
      referralLinkTitle: 'ሊያጋሩት የሚችሉት የግብዣ ሊንክዎ ይኸውና!', referralLinkLabel: 'የግብዣ ሊንክዎ', rewardMonth1: 'የ1 ወር ፕሪሚየምዎ ለመክፈቻው በራስ-ሰር ተይዞልዎታል።', rewardMonths: 'የ{{months}} ወር ፕሪሚየምዎ ለመክፈቻው በራስ-ሰር ተይዞልዎታል።', shareMessage: 'በሃላል ሞድ መጠበቂያ ዝርዝር ላይ ነኝ። ጥቂት ግን በጥንቃቄ የተመረጡ ትውውቆችን የሚያቀርብ የሙስሊሞች የጋብቻ መተግበሪያ ነው።\n\nእዚህ ይመዝገቡ፦ {{url}}',
      navRefer: 'ጓደኞችዎን ይጋብዙ', referralTitle: 'ጓደኞችዎን ይጋብዙ', referralBody: 'ጥቂት ጥሩ ሰዎችን ይጋብዙና ተጨማሪ ፕሪሚየም ያግኙ።', referralNote: 'ጓደኛ እንደተቀላቀለ የሚቆጠረው ኢሜይሉን ሲያረጋግጥ ነው።', reward3: '3 ሰዎች ሲቀላቀሉ → 3 ወር በነጻ', reward5: '5 ሰዎች ሲቀላቀሉ → 6 ወር በነጻ', reward10: '10 ሰዎች ሲቀላቀሉ → 1 ዓመት በነጻ', copyInvite: 'የግብዣ ሊንኩን ይቅዱ', copiedInvite: 'ተቀድቷል', shareWhatsApp: 'ዋትስአፕ', almostThereTitle: 'ትንሽ ቀርቷል።', almostThereBody: 'በመጠበቂያ ዝርዝሩ ላይ ቦታዎን ለማረጋገጥ ኢሜይልዎን ይመልከቱ።', verificationError: 'ይህ የመጠበቂያ ዝርዝር ሊንክ ልክ ያልሆነ ወይም ጊዜው ያለፈበት ነው።', verifiedEligible: 'የፕሪሚየም ሽልማትዎ ለመክፈቻው በራስ-ሰር ተይዞልዎታል።', verifiedNotEligible: 'ኢሜይልዎ ተረጋግጧል፤ በመጠበቂያ ዝርዝሩ ላይ ቦታዎም ተይዟል።', waitlistOffer: 'በሃላል ሞድ ላይ ከመጀመሪያዎቹ 10,000 ሰዎች አንዱ ይሁኑ፤ ሲከፈት 1 ወር ፕሪሚየም በነጻ በራስ-ሰር ያገኛሉ።', verifiedTitle: 'ተመዝግበዋል ✓', waitlistButton: 'በመጠበቂያ ዝርዝሩ ይመዝገቡ',
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
      busyJoin: 'አሁን ብዙ ሰዎች እየተቀላቀሉ ነው። እባክዎ ከጥቂት ደቂቃዎች በኋላ እንደገና ይሞክሩ።',
      navTerms: 'የአገልግሎት ውል', navPrivacy: 'የግላዊነት ማስታወቂያ',
      shareCode: 'የግብዣ ኮዴ: {{code}}',
      thanks: 'እናመሰግናለን! በዝርዝሩ ውስጥ ነዎት። ሃላል ሞድ ሲጀምር ኢሜይል እንልክልዎታለን።',
      error: 'ትንሽ ችግር ተፈጥሯል። እባክዎ ከጥቂት ጊዜ በኋላ እንደገና ይሞክሩ።',
      howTitle: 'ሃላል ሞድ፣ ለሙስሊሞች የተሻለ የጋብቻ መተግበሪያ።',
      feature1Title: 'ከብዛት ጥራት።',
      feature1Body: 'በየፈጅሩ በጥንቃቄ የተመረጡ አምስት መግቢያዎች፣ እርስዎንና ምርጫዎችዎን መሠረት አድርገው፣ ማለቂያ ከሌለው ማሰስ ይልቅ ትርጉም ያለው ግንኙነት ለማበረታታት።',
      feature2Title: 'መሳብ አስፈላጊ ነው። ግላዊነትም እንዲሁ።',
      feature2Body: 'የአካል ምርጫዎች የትዳር አጋር ፍለጋ ተፈጥሯዊ አካል ናቸው። ቁመትና የሰውነት ቅርጽ በደንብ እንድናዛምድዎ ይረዱናል፣ ነገር ግን ምርጫዎችዎ ግላዊ ሆነው ይቆያሉ፤ መቼም እንደ ሕዝባዊ ማጣሪያ አይታዩም።',
      feature3Title: 'ውይይቱን ያትርፉ።',
      feature3Body: 'ተዛማጅ ወደ ውይይት የሚቀየረው ሁለታችሁም አብራችሁ የመረጣችኋቸውን ጥቂት የመተዋወቂያ ጥያቄዎች ከመለሳችሁ በኋላ ብቻ ነው። የራስዎን መልሶች ካጋሩ በኋላ የእነሱን ያያሉ፤ ስለዚህ መጥፋት ይቀንሳል፣ ቁርጠኝነት ይጨምራል።',
      cardsTitle: 'ዘላቂ ግንኙነት መገንባት።',
      cardsBody: 'Halal Cards ለጤናማና ዘላቂ ትዳር ተግባራዊ መሣሪያዎችን ይሰጣችኋል፦ ግንኙነትን፣ የሚጠበቁ ነገሮችንና ተስማሚነትን አብራችሁ ለመመርመር {{count}} በይነተገናኝ ጥያቄዎች፣ ልምምዶችና ጀብዱዎች። በ{{languages}} ቋንቋዎች ይገኛል።',
      cardsPremium: '{{free}}ቱን ብቻችሁን በነጻ መሞከር ትችላላችሁ። ሃላል ሞድ Premium ሁሉንም {{total}} ይከፍታል፦ {{scenarios}} ሁኔታዎች ያሏቸው {{lab}} ወርክሾፖች፣ ለእያንዳንዱ ደረጃ {{quizzes}} ጥያቄዎችና {{stories}} ታሪኮች። ከማንኛውም ተዛማጅ ጋር ተጫወቱ፣ ለእነሱ በነጻ።'
    },
    so: {
      referralCodeLabel: 'Koodkaaga:',
      confirmTitle: 'Hal tallaabo ayaa dhiman', confirmBody: 'Xaqiiji email-kaaga si aad u aragto link-gaaga casuumaadda. Haddii saaxiib ku casuumay, tani ayaa casuumaaddiisa tirisa.', confirmButton: 'Xaqiiji email-kayga', tierCount: '{{joined}} ka mid ah {{goal}}',
      referralLinkTitle: 'Waa kan link-gaaga casuumaadda ee la wadaagi karo!', referralLinkLabel: 'Link-gaaga casuumaadda', rewardMonth1: '1 bil oo Premium ah ayaa si toos ah laguugu kaydiyay furitaanka.', rewardMonths: '{{months}} bilood oo Premium ah ayaa si toos ah laguugu kaydiyay furitaanka.', shareMessage: 'Waxaan ku jiraa liiska sugitaanka Halal Mode. Waa app guur oo Muslimiin ah oo bixiya isbarasho yar balse si fiican loo doortay.\n\nKa biir liiska sugitaanka halkan: {{url}}',
      navRefer: 'Casuum asxaabtaada', referralTitle: 'Casuum asxaabtaada', referralBody: 'Casuum dhowr qof oo wanaagsan oo hel Premium dheeraad ah.', referralNote: 'Saaxiib waxaa loo tiriyaa inuu ku biiray marka uu xaqiijiyo email-kiisa.', reward3: '3 ku biiray → 3 bilood oo bilaash ah', reward5: '5 ku biiray → 6 bilood oo bilaash ah', reward10: '10 ku biiray → 1 sano oo bilaash ah', copyInvite: 'Koobi link-ga casuumaadda', copiedInvite: 'Waa la koobiyay', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Waad ku dhowdahay.', almostThereBody: 'Fiiri email-kaaga si aad u xaqiijiso booskaaga liiska sugitaanka.', verificationError: 'Link-gan liiska sugitaanka sax ma aha ama wuu dhacay.', verifiedEligible: 'Abaalmarintaada Premium si toos ah ayaa laguugu kaydiyay furitaanka.', verifiedNotEligible: 'Email-kaaga waa la xaqiijiyay, booskaaga liiska sugitaankana waa laguu kaydiyay.', waitlistOffer: 'Ka mid noqo 10,000-ka qof ee ugu horreeya Halal Mode oo si toos ah u hel 1 bil oo Premium ah oo bilaash ah marka la furo.', verifiedTitle: 'Waad ku biirtay ✓', waitlistButton: 'Ku biir liiska sugitaanka',
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
      busyJoin: 'Dad badan ayaa hadda ku biiraya. Fadlan isku day mar kale dhowr daqiiqo kadib.',
      navTerms: 'Shuruudaha Adeegga', navPrivacy: 'Ogeysiiska Asturnaanta',
      shareCode: 'Koodhka casuumaaddayda: {{code}}',
      thanks: 'Mahadsanid! Liiska ayaad ku jirtaa. Iimayl ayaan kuu soo diri doonnaa marka Halal Mode bilaabato.',
      error: 'Waxbaa khaldamay. Fadlan mar kale isku day wax yar ka dib.',
      howTitle: 'Halal Mode, hab ka wanaagsan oo Muslimiintu guur ku raadsadaan.',
      feature1Title: 'Tayo ka badan tiro.',
      feature1Body: 'Shan isbarasho oo si taxaddar leh loo xushay Fajar kasta, loogu habeeyay adiga iyo doorbidyadaada, si loo dhiirigeliyo xiriir macno leh halkii laga daalaali lahaa dhammaad la’aan.',
      feature2Title: 'Soo jiidashadu waa muhiim. Qarsoodinimaduna sidoo kale.',
      feature2Body: 'Doorbidyada jireed waa qayb dabiici ah oo ka mid ah raadinta lammaane. Dhererka iyo qaabka jirku waxay naga caawiyaan inaan si fiican kuu waafajinno, laakiin doorbidyadaadu way qarsoon yihiin mana loo muujiyo shaandhayn guud.',
      feature3Title: 'Kasbo wada-hadalka.',
      feature3Body: 'Isu-dhigmid waxay noqotaa wada-hadal oo keliya marka aad labadiinuba ka jawaabtaan dhowr su’aalood oo isbarasho ah oo aad wada doorateen. Jawaabahiisa waxaad aragtaa kadib markaad wadaagto kuwaaga, sidaas darteed baaba’a ayaa yaraada, niyaddana way korodhaa.',
      cardsTitle: 'Dhisidda xiriir waara.',
      cardsBody: 'Halal Cards waxay idin siinayaan qalab wax ku ool ah oo loogu talagalay guur caafimaad qaba oo waara: {{count}} imtixaan, layli iyo tacaburro is-dhexgal ah si aad wada sahamisaan xiriirka, filashooyinka iyo is-waafaqsanaanta. Waxaa lagu heli karaa {{languages}} luqadood.',
      cardsPremium: '{{free}} ayaad keligaa bilaash ku tijaabin kartaa. Halal Mode Premium wuxuu furaa dhammaan {{total}}: {{lab}} aqoon-is-weydaarsi oo leh {{scenarios}} xaaladood, {{quizzes}} kediska oo heer kasta ah iyo {{stories}} sheeko. La ciyaar qof kasta oo aad isku aaddan tihiin, bilaash isaga/iyada.'
    },
    es: {
      referralCodeLabel: 'Tu código:',
      confirmTitle: 'Solo queda un paso', confirmBody: 'Confirma tu correo para ver tu enlace de invitación. Si un amigo te invitó, esto también hace que su invitación cuente.', confirmButton: 'Confirmar mi correo', tierCount: '{{joined}} de {{goal}}',
      referralLinkTitle: '¡Aquí tienes tu enlace de invitación para compartir!', referralLinkLabel: 'Tu enlace de invitación', rewardMonth1: 'Tu mes de Premium queda reservado automáticamente para el lanzamiento.', rewardMonths: 'Tus {{months}} meses de Premium quedan reservados automáticamente para el lanzamiento.', shareMessage: 'Estoy en la lista de espera de Halal Mode, una app de matrimonio musulmana con menos presentaciones, pero mejor pensadas.\n\nApúntate aquí: {{url}}',
      navRefer: 'Invita a tus amigos', referralTitle: 'Invita a tus amigos', referralBody: 'Invita a algunas buenas personas y desbloquea más Premium.', referralNote: 'Un amigo cuenta como unido cuando confirma su correo.', reward3: '3 registros → 3 meses gratis', reward5: '5 registros → 6 meses gratis', reward10: '10 registros → 1 año gratis', copyInvite: 'Copiar enlace de invitación', copiedInvite: 'Copiado', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Ya casi está.', almostThereBody: 'Revisa tu correo para confirmar tu lugar en la lista de espera.', verificationError: 'Este enlace de la lista de espera no es válido o ha caducado.', verifiedEligible: 'Tu recompensa Premium queda reservada automáticamente para el lanzamiento.', verifiedNotEligible: 'Tu correo está verificado y tu lugar en la lista de espera está reservado.', waitlistOffer: 'Sé de las primeras 10.000 personas en Halal Mode y recibe automáticamente 1 mes de Premium gratis en el lanzamiento.', verifiedTitle: 'Ya estás dentro ✓', waitlistButton: 'Apúntate a la lista de espera',
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
      busyJoin: 'Mucha gente se está uniendo ahora mismo. Inténtalo de nuevo en unos minutos.',
      navTerms: 'Términos del servicio', navPrivacy: 'Aviso de privacidad',
      shareCode: 'Mi código de invitación: {{code}}',
      thanks: '¡Gracias! Ya estás en la lista. Te escribiremos cuando abra Halal Mode.',
      error: 'Algo ha fallado. Prueba otra vez en un momento.',
      howTitle: 'Halal Mode, una forma mejor de buscar matrimonio musulmán.',
      feature1Title: 'Calidad antes que cantidad.',
      feature1Body: 'Cinco presentaciones elegidas con cuidado cada Fajr, pensadas para ti y tus preferencias, para fomentar conexiones con sentido en lugar de un scroll sin fin.',
      feature2Title: 'La atracción importa. La privacidad también.',
      feature2Body: 'Las preferencias físicas son una parte natural de buscar pareja para casarse. La altura y la complexión nos ayudan a encontrarte buenas coincidencias, pero tus preferencias siguen siendo privadas y nunca se muestran como filtros públicos.',
      feature3Title: 'Gánate la conversación.',
      feature3Body: 'Un match solo se convierte en conversación cuando ambos responden algunas preguntas para romper el hielo que eligieron juntos. Ves sus respuestas después de compartir las tuyas, así que hay menos ghosting y más intención.',
      cardsTitle: 'Construir relaciones que duran.',
      cardsBody: 'Halal Cards les da herramientas prácticas para un matrimonio sano y duradero: {{count}} cuestionarios, ejercicios y aventuras interactivos para explorar juntos la comunicación, las expectativas y la compatibilidad. Disponible en {{languages}} idiomas.',
      cardsPremium: '{{free}} se pueden probar gratis a solas. Halal Mode Premium abre las {{total}}: {{lab}} talleres con {{scenarios}} situaciones, {{quizzes}} cuestionarios para cada etapa y {{stories}} historias. Jugad con cualquier conexión, gratis para la otra persona.'
    },
    ru: {
      referralCodeLabel: 'Ваш код:',
      confirmTitle: 'Остался один шаг', confirmBody: 'Подтвердите email, чтобы увидеть свою ссылку-приглашение. Если вас пригласил друг, так засчитается и его приглашение.', confirmButton: 'Подтвердить email', tierCount: '{{joined}} из {{goal}}',
      referralLinkTitle: 'Вот ваша ссылка-приглашение, которой можно поделиться!', referralLinkLabel: 'Ваша ссылка-приглашение', rewardMonth1: 'Ваш месяц Premium автоматически зарезервирован к запуску.', rewardMonths: 'Месяцев Premium, зарезервированных к запуску: {{months}}.', shareMessage: 'Я в листе ожидания Халал Мод — это приложение для знакомств мусульман с целью брака: знакомств меньше, но они продуманнее.\n\nЗаписаться можно здесь: {{url}}',
      navRefer: 'Пригласите друзей', referralTitle: 'Пригласите друзей', referralBody: 'Пригласите несколько хороших людей и получите больше Premium.', referralNote: 'Друг засчитывается, когда подтвердит свой email.', reward3: '3 друга → 3 месяца бесплатно', reward5: '5 друзей → 6 месяцев бесплатно', reward10: '10 друзей → 1 год бесплатно', copyInvite: 'Скопировать ссылку-приглашение', copiedInvite: 'Скопировано', shareWhatsApp: 'WhatsApp', almostThereTitle: 'Почти готово.', almostThereBody: 'Проверьте почту, чтобы подтвердить место в листе ожидания.', verificationError: 'Эта ссылка на лист ожидания недействительна или устарела.', verifiedEligible: 'Ваша награда Premium автоматически зарезервирована к запуску.', verifiedNotEligible: 'Ваш email подтверждён, а место в листе ожидания закреплено.', waitlistOffer: 'Станьте одним из первых 10 000 человек в Халал Мод и автоматически получите 1 месяц Premium бесплатно при запуске.', verifiedTitle: 'Вы в списке ✓', waitlistButton: 'Записаться в лист ожидания',
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
      busyJoin: 'Сейчас присоединяется очень много людей. Пожалуйста, попробуйте снова через несколько минут.',
      navTerms: 'Условия использования', navPrivacy: 'Уведомление о конфиденциальности',
      shareCode: 'Мой код приглашения: {{code}}',
      thanks: 'Спасибо! Вы в списке. Мы напишем вам, когда запустится Халал Мод.',
      error: 'Что-то пошло не так. Попробуйте ещё раз чуть позже.',
      howTitle: 'Халал Мод, лучшее приложение для знакомства мусульман с целью брака.',
      feature1Title: 'Качество важнее количества.',
      feature1Body: 'Пять тщательно подобранных знакомств каждый фаджр, с учётом вас и ваших предпочтений, — ради настоящих связей, а не бесконечного пролистывания.',
      feature2Title: 'Привлекательность важна. Приватность тоже.',
      feature2Body: 'Внешние предпочтения — естественная часть поиска супруга. Рост и телосложение помогают нам точнее подбирать пары, но ваши предпочтения остаются личными и никогда не показываются как публичные фильтры.',
      feature3Title: 'Заслужите разговор.',
      feature3Body: 'Совпадение становится разговором только после того, как вы оба ответите на несколько вопросов для знакомства, выбранных вместе. Вы видите ответы собеседника после того, как поделитесь своими, — меньше игнора и больше серьёзных намерений.',
      cardsTitle: 'Отношения, которые длятся.',
      cardsBody: 'Halal Cards дают практичные инструменты для здорового и крепкого брака: {{count}} интерактивных тестов, упражнений и приключений, чтобы вместе исследовать общение, ожидания и совместимость. Доступно на {{languages}} языках.',
      cardsPremium: '{{free}} можно бесплатно попробовать в одиночку. Halal Mode Premium открывает все {{total}}: мастерские ({{lab}}) с ситуациями ({{scenarios}}), викторины для каждого этапа ({{quizzes}}) и истории ({{stories}}). Играйте с любым знакомством, для второго бесплатно.'
    },
    'zh-Hans': {
      referralCodeLabel: '你的邀请码：',
      confirmTitle: '还差一步', confirmBody: '确认你的邮箱即可查看邀请链接。如果是好友邀请了你，这一步也会为好友计入邀请。', confirmButton: '确认我的邮箱', tierCount: '{{joined}}/{{goal}}',
      referralLinkTitle: '这是你可以分享的邀请链接！', referralLinkLabel: '你的邀请链接', rewardMonth1: '你的 1 个月 Premium 已自动为上线保留。', rewardMonths: '你的 {{months}} 个月 Premium 已自动为上线保留。', shareMessage: '我在哈拉尔·莫德的等候名单上。这是一款穆斯林婚恋应用，介绍更少，但更用心。\n\n在这里加入等候名单：{{url}}',
      navRefer: '邀请好友', referralTitle: '邀请好友', referralBody: '邀请几位好朋友，解锁更多 Premium。', referralNote: '好友确认邮箱后，才算加入。', reward3: '3 人加入 → 免费 3 个月', reward5: '5 人加入 → 免费 6 个月', reward10: '10 人加入 → 免费 1 年', copyInvite: '复制邀请链接', copiedInvite: '已复制', shareWhatsApp: 'WhatsApp', almostThereTitle: '就差一步。', almostThereBody: '请查收邮件，确认你在等候名单中的位置。', verificationError: '此等候名单链接无效或已过期。', verifiedEligible: '你的 Premium 奖励已自动为上线保留。', verifiedNotEligible: '你的邮箱已验证，等候名单中的位置已为你保留。', waitlistOffer: '成为哈拉尔·莫德的前 10,000 名用户，上线时自动获得 1 个月免费 Premium。', verifiedTitle: '你已加入 ✓', waitlistButton: '加入等候名单',
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
      busyJoin: '现在加入的人很多，请几分钟后再试。',
      navTerms: '服务条款', navPrivacy: '隐私声明',
      shareCode: '我的邀请码：{{code}}',
      thanks: '谢谢！你已加入名单。哈拉尔·莫德上线时我们会发邮件通知你。',
      error: '出了点问题，请稍后再试。',
      howTitle: '哈拉尔·莫德，让穆斯林更好地寻找婚姻伴侣。',
      feature1Title: '质量胜于数量。',
      feature1Body: '每个晨礼时分，为你精心挑选五位介绍对象，依照你和你的偏好安排，鼓励有意义的连接，而不是无休止地浏览。',
      feature2Title: '吸引力重要，隐私也重要。',
      feature2Body: '外貌偏好是寻找配偶时很自然的一部分。身高和体型帮助我们更好地为你匹配，但你的偏好始终保密，绝不会作为公开筛选条件显示。',
      feature3Title: '用心赢得对话。',
      feature3Body: '只有当你们都回答了一起选定的几个破冰问题后，匹配才会变成对话。分享你的答案后才能看到对方的答案，从而减少“消失”，增加诚意。',
      cardsTitle: '建立长久的关系。',
      cardsBody: 'Halal Cards 为你们提供实用工具，帮助建立健康、长久的婚姻：{{count}} 个互动测验、练习和冒险，一起探索沟通、期望与契合度。支持 {{languages}} 种语言。',
      cardsPremium: '有 {{free}} 项可以免费独自体验。Halal Mode Premium 解锁全部 {{total}} 项：{{lab}} 个工作坊共 {{scenarios}} 个情景、{{quizzes}} 个覆盖各个阶段的测验和 {{stories}} 个故事。可与任何配对一起玩，对方免费。'
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
  const catalogueCounts = {
    total: activityCount,
    lab: document.documentElement.dataset.labCount || '',
    scenarios: document.documentElement.dataset.scenarioCount || '',
    quizzes: document.documentElement.dataset.quizCount || '',
    stories: document.documentElement.dataset.storyCount || '',
    free: document.documentElement.dataset.freeCount || '',
  };
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
      .replaceAll('{{languages}}', String(languageCount))
      .replaceAll('{{total}}', String(catalogueCounts.total))
      .replaceAll('{{lab}}', String(catalogueCounts.lab))
      .replaceAll('{{scenarios}}', String(catalogueCounts.scenarios))
      .replaceAll('{{quizzes}}', String(catalogueCounts.quizzes))
      .replaceAll('{{stories}}', String(catalogueCounts.stories))
      .replaceAll('{{free}}', String(catalogueCounts.free));
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
