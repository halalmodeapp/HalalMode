/**
 * Drains the notification queue and delivers to Expo.
 *
 * Registering a device has worked for months and nothing has ever sent
 * anything. This is the missing half.
 *
 * It claims a bounded batch, posts it, and reports back what landed and what
 * did not, so a failure is retried rather than lost, and a token Apple or
 * Google has rejected is cleared instead of retried forever.
 *
 * Verifies itself against the vault the same way round generation and the
 * deletion worker do, so there is nothing to configure at deploy time.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface Claimed {
  id: number;
  user_id: string;
  kind: 'round_ready' | 'mutual_match' | 'new_message' | 'notice' | 'halal_cards' | 'liked_you' | 'waiting_on_you' | 'quiet_match' | 'photo_decision' | 'recap_ready' | 'round_expiring';
  payload: Record<string, unknown>;
  push_token: string;
  platform: string;
  locale: string;
}

type WordingKey = Exclude<Claimed['kind'], 'photo_decision'> | 'photo_approved' | 'photo_redo';
type Wording = Record<WordingKey, { title: string; body: string }>;

const WORDING: Record<string, Wording> = {
  en: {
    round_ready: { title: "Your {{count}} are ready", body: "Fajr is in. Today’s introductions are waiting for you." },
    mutual_match: { title: 'You matched', body: 'Someone you chose chose you back.' },
    new_message: { title: 'New message', body: 'You have a message waiting.' },
    notice: { title: 'An update from Halal Mode', body: 'Open the app to see it.' },
    halal_cards: { title: 'Halal Cards', body: 'Something in Halal Cards is waiting for you.' },
    liked_you: { title: "Someone liked you", body: "Open Connections to read their bio." },
    waiting_on_you: { title: "Someone is waiting on you", body: "A match has answered. It’s your turn." },
    quiet_match: { title: "It’s been quiet", body: "Say salaam. We have a friendly opener for you." },
    photo_approved: { title: "You’re verified", body: "Your selfie matches your photos. Thank you." },
    photo_redo: { title: "A photo needs redoing", body: "Open the app to see what to change." },
    recap_ready: { title: "Your recap is ready", body: "You’ve both answered. Read it and say salaam." },
    round_expiring: { title: "Your set closes soon", body: "A few hours left to choose from today’s introductions." },
  },
  ar: {
    round_ready: { title: "مجموعتك المكوّنة من {{count}} جاهزة", body: "دخل وقت الفجر. تعارفات اليوم بانتظارك." },
    mutual_match: { title: 'تعارف متبادل', body: 'شخص اخترته اختارك أيضًا.' },
    new_message: { title: 'رسالة جديدة', body: 'لديك رسالة في إحدى محادثاتك.' },
    notice: { title: 'تحديث من حلال مود', body: 'افتح التطبيق لتراه.' },
    halal_cards: { title: 'بطاقات حلال', body: 'هناك شيء في بطاقات حلال ينتظرك.' },
    liked_you: { title: "أُعجب بك أحدهم", body: "افتح «التعارفات» لقراءة نبذته." },
    waiting_on_you: { title: "أحدهم ينتظرك", body: "أجاب تعارفك. جاء دورك." },
    quiet_match: { title: "الهدوء يسود المحادثة", body: "ابدأ بالسلام. لدينا افتتاحية لطيفة لك." },
    photo_approved: { title: "تم التحقق منك", body: "صورتك الشخصية تطابق صورك. شكرًا لك." },
    photo_redo: { title: "صورة تحتاج إلى إعادة", body: "افتح التطبيق لترى ما يجب تغييره." },
    recap_ready: { title: "ملخصكما جاهز", body: "أجبتما كلاكما. اقرأه وابدأ بالسلام." },
    round_expiring: { title: "مجموعتك توشك على الانتهاء", body: "بقيت ساعات قليلة للاختيار من تعارفات اليوم." },
  },
  ur: {
    round_ready: { title: "آپ کے {{count}} تیار ہیں", body: "فجر ہو گئی۔ آج کے تعارف آپ کے منتظر ہیں۔" },
    mutual_match: { title: 'باہمی میچ', body: 'جسے آپ نے چنا، اس نے بھی آپ کو چنا۔' },
    new_message: { title: 'نیا پیغام', body: 'آپ کا ایک پیغام منتظر ہے۔' },
    notice: { title: 'حلال موڈ کی طرف سے ایک اطلاع', body: 'دیکھنے کے لیے ایپ کھولیں۔' },
    halal_cards: { title: 'حلال کارڈز', body: 'حلال کارڈز میں کچھ آپ کا منتظر ہے۔' },
    liked_you: { title: "کسی نے آپ کو پسند کیا", body: "ان کا تعارف پڑھنے کے لیے کنیکشنز کھولیں۔" },
    waiting_on_you: { title: "کوئی آپ کا منتظر ہے", body: "آپ کے میچ نے جواب دے دیا ہے۔ اب آپ کی باری ہے۔" },
    quiet_match: { title: "گفتگو خاموش ہے", body: "سلام کہیں۔ ہمارے پاس آپ کے لیے ایک خوشگوار آغاز ہے۔" },
    photo_approved: { title: "آپ کی تصدیق ہو گئی", body: "آپ کی سیلفی آپ کی تصاویر سے ملتی ہے۔ شکریہ۔" },
    photo_redo: { title: "ایک تصویر دوبارہ چاہیے", body: "کیا بدلنا ہے، دیکھنے کے لیے ایپ کھولیں۔" },
    recap_ready: { title: "آپ کا خلاصہ تیار ہے", body: "آپ دونوں جواب دے چکے ہیں۔ پڑھیں اور سلام کہیں۔" },
    round_expiring: { title: "آپ کا سیٹ جلد بند ہو رہا ہے", body: "آج کے تعارف میں سے چننے کے لیے چند گھنٹے باقی ہیں۔" },
  },
  fa: {
    round_ready: { title: "{{count}} معرفی شما آماده است", body: "اذان صبح شد. معرفی‌های امروز منتظر شماست." },
    mutual_match: { title: 'انتخاب دوطرفه', body: 'کسی که انتخاب کردید، شما را هم انتخاب کرد.' },
    new_message: { title: 'پیام تازه', body: 'یک پیام منتظر شماست.' },
    notice: { title: 'خبری از حلال مود', body: 'برای دیدنش برنامه را باز کنید.' },
    halal_cards: { title: 'کارت‌های حلال', body: 'چیزی در کارت‌های حلال منتظر شماست.' },
    liked_you: { title: "کسی شما را پسندید", body: "برای خواندن معرفی‌نامه‌اش «ارتباط‌ها» را باز کنید." },
    waiting_on_you: { title: "کسی منتظر شماست", body: "تطابق شما پاسخ داده است. نوبت شماست." },
    quiet_match: { title: "گفتگو ساکت است", body: "سلام کنید. یک شروع دوستانه برایتان داریم." },
    photo_approved: { title: "هویت شما تأیید شد", body: "سلفی شما با عکس‌هایتان مطابقت دارد. سپاسگزاریم." },
    photo_redo: { title: "یک عکس باید دوباره گرفته شود", body: "برای دیدن آنچه باید تغییر کند، برنامه را باز کنید." },
    recap_ready: { title: "خلاصه شما آماده است", body: "هر دوی شما پاسخ داده‌اید. بخوانید و سلام کنید." },
    round_expiring: { title: "مجموعه شما به‌زودی بسته می‌شود", body: "چند ساعت برای انتخاب از معرفی‌های امروز باقی مانده است." },
  },
  hi: {
    round_ready: { title: "आपके {{count}} तैयार हैं", body: "फ़ज्र हो गई। आज के परिचय आपका इंतज़ार कर रहे हैं।" },
    mutual_match: { title: 'आपसी मैच', body: 'जिसे आपने चुना, उसने भी आपको चुना।' },
    new_message: { title: 'नया संदेश', body: 'आपका एक संदेश इंतज़ार कर रहा है।' },
    notice: { title: 'हलाल मोड से एक सूचना', body: 'देखने के लिए ऐप खोलें।' },
    halal_cards: { title: 'हलाल कार्ड्स', body: 'हलाल कार्ड्स में कुछ आपका इंतज़ार कर रहा है।' },
    liked_you: { title: "किसी ने आपको पसंद किया", body: "उनका परिचय पढ़ने के लिए कनेक्शन खोलें।" },
    waiting_on_you: { title: "कोई आपका इंतज़ार कर रहा है", body: "आपके मैच ने जवाब दे दिया है। अब आपकी बारी है।" },
    quiet_match: { title: "बातचीत शांत है", body: "सलाम कहें। हमारे पास आपके लिए एक दोस्ताना शुरुआत है।" },
    photo_approved: { title: "आप सत्यापित हो गए", body: "आपकी सेल्फ़ी आपकी तस्वीरों से मेल खाती है। धन्यवाद।" },
    photo_redo: { title: "एक तस्वीर दोबारा चाहिए", body: "क्या बदलना है, यह देखने के लिए ऐप खोलें।" },
    recap_ready: { title: "आपका सार तैयार है", body: "आप दोनों जवाब दे चुके हैं। पढ़ें और सलाम कहें।" },
    round_expiring: { title: "आपका सेट जल्द बंद होगा", body: "आज के परिचयों में से चुनने के लिए कुछ ही घंटे बचे हैं।" },
  },
  id: {
    round_ready: { title: "{{count}} perkenalanmu siap", body: "Subuh telah tiba. Perkenalan hari ini menunggumu." },
    mutual_match: { title: 'Saling memilih', body: 'Seseorang yang Anda pilih juga memilih Anda.' },
    new_message: { title: 'Pesan baru', body: 'Ada pesan yang menunggu Anda.' },
    notice: { title: 'Kabar dari Halal Mode', body: 'Buka aplikasi untuk melihatnya.' },
    halal_cards: { title: 'Halal Cards', body: 'Ada sesuatu di Halal Cards yang menunggu Anda.' },
    liked_you: { title: "Seseorang menyukaimu", body: "Buka Koneksi untuk membaca bionya." },
    waiting_on_you: { title: "Seseorang menunggumu", body: "Kecocokanmu sudah menjawab. Giliranmu." },
    quiet_match: { title: "Percakapan sepi", body: "Ucapkan salam. Kami punya pembuka yang ramah untukmu." },
    photo_approved: { title: "Kamu terverifikasi", body: "Selfie-mu cocok dengan fotomu. Terima kasih." },
    photo_redo: { title: "Satu foto perlu diulang", body: "Buka aplikasi untuk melihat apa yang perlu diubah." },
    recap_ready: { title: "Rangkumanmu siap", body: "Kalian berdua sudah menjawab. Bacalah dan ucapkan salam." },
    round_expiring: { title: "Set-mu segera ditutup", body: "Tinggal beberapa jam untuk memilih dari perkenalan hari ini." },
  },
  ms: {
    round_ready: { title: "{{count}} perkenalan anda sedia", body: "Subuh telah masuk. Perkenalan hari ini menanti anda." },
    mutual_match: { title: 'Saling memilih', body: 'Seseorang yang anda pilih turut memilih anda.' },
    new_message: { title: 'Mesej baharu', body: 'Ada mesej yang menunggu anda.' },
    notice: { title: 'Makluman daripada Halal Mode', body: 'Buka aplikasi untuk melihatnya.' },
    halal_cards: { title: 'Halal Cards', body: 'Ada sesuatu dalam Halal Cards yang menunggu anda.' },
    liked_you: { title: "Seseorang menyukai anda", body: "Buka Sambungan untuk membaca biodatanya." },
    waiting_on_you: { title: "Seseorang menunggu anda", body: "Padanan anda telah menjawab. Giliran anda." },
    quiet_match: { title: "Perbualan sunyi", body: "Ucapkan salam. Kami ada pembuka yang mesra untuk anda." },
    photo_approved: { title: "Anda telah disahkan", body: "Swafoto anda sepadan dengan foto anda. Terima kasih." },
    photo_redo: { title: "Satu foto perlu diambil semula", body: "Buka aplikasi untuk melihat apa yang perlu diubah." },
    recap_ready: { title: "Rumusan anda sedia", body: "Kamu berdua telah menjawab. Bacalah dan ucapkan salam." },
    round_expiring: { title: "Set anda akan ditutup tidak lama lagi", body: "Tinggal beberapa jam untuk memilih daripada perkenalan hari ini." },
  },
  bn: {
    round_ready: { title: "আপনার {{count}}টি পরিচয় প্রস্তুত", body: "ফজর হয়েছে। আজকের পরিচয়গুলো আপনার অপেক্ষায়।" },
    mutual_match: { title: 'পারস্পরিক ম্যাচ', body: 'যাঁকে বেছেছেন তিনিও আপনাকে বেছেছেন।' },
    new_message: { title: 'নতুন বার্তা', body: 'আপনার একটি বার্তা অপেক্ষা করছে।' },
    notice: { title: 'হালাল মোড থেকে একটি আপডেট', body: 'দেখতে অ্যাপটি খুলুন।' },
    halal_cards: { title: 'হালাল কার্ডস', body: 'হালাল কার্ডসে কিছু আপনার অপেক্ষায় আছে।' },
    liked_you: { title: "কেউ আপনাকে পছন্দ করেছেন", body: "তাঁর পরিচিতি পড়তে সংযোগ খুলুন।" },
    waiting_on_you: { title: "কেউ আপনার অপেক্ষায়", body: "আপনার ম্যাচ উত্তর দিয়েছেন। এবার আপনার পালা।" },
    quiet_match: { title: "কথোপকথন নীরব", body: "সালাম দিন। আপনার জন্য আমাদের কাছে একটি বন্ধুত্বপূর্ণ শুরু আছে।" },
    photo_approved: { title: "আপনি যাচাইকৃত", body: "আপনার সেলফি আপনার ছবির সাথে মিলেছে। ধন্যবাদ।" },
    photo_redo: { title: "একটি ছবি আবার তুলতে হবে", body: "কী বদলাতে হবে দেখতে অ্যাপ খুলুন।" },
    recap_ready: { title: "আপনাদের সারসংক্ষেপ প্রস্তুত", body: "আপনারা দুজনেই উত্তর দিয়েছেন। পড়ুন এবং সালাম দিন।" },
    round_expiring: { title: "আপনার সেট শীঘ্রই বন্ধ হবে", body: "আজকের পরিচয় থেকে বেছে নিতে আর কয়েক ঘণ্টা বাকি।" },
  },
  fr: {
    round_ready: { title: "Vos {{count}} sont prêtes", body: "Fajr est entré. Les présentations du jour vous attendent." },
    mutual_match: { title: 'Choix réciproque', body: 'Une personne que vous avez choisie vous a choisi aussi.' },
    new_message: { title: 'Nouveau message', body: 'Un message vous attend.' },
    notice: { title: 'Une nouvelle de Halal Mode', body: 'Ouvrez l’app pour la voir.' },
    halal_cards: { title: 'Halal Cards', body: 'Quelque chose vous attend dans Halal Cards.' },
    liked_you: { title: "Quelqu’un vous a aimé", body: "Ouvrez Connexions pour lire sa présentation." },
    waiting_on_you: { title: "Quelqu’un vous attend", body: "Votre match a répondu. C’est à vous." },
    quiet_match: { title: "C’est calme", body: "Dites salaam. Nous avons une amorce sympathique pour vous." },
    photo_approved: { title: "Vous êtes vérifié", body: "Votre selfie correspond à vos photos. Merci." },
    photo_redo: { title: "Une photo est à refaire", body: "Ouvrez l’app pour voir ce qu’il faut changer." },
    recap_ready: { title: "Votre récapitulatif est prêt", body: "Vous avez tous deux répondu. Lisez-le et dites salaam." },
    round_expiring: { title: "Votre sélection se termine bientôt", body: "Il reste quelques heures pour choisir parmi les présentations du jour." },
  },
  tr: {
    round_ready: { title: "{{count}} tanışmanız hazır", body: "Sabah namazı girdi. Bugünkü tanışmalar sizi bekliyor." },
    mutual_match: { title: 'Karşılıklı eşleşme', body: 'Seçtiğiniz biri de sizi seçti.' },
    new_message: { title: 'Yeni mesaj', body: 'Sizi bekleyen bir mesaj var.' },
    notice: { title: 'Halal Mode’dan bir bilgi', body: 'Görmek için uygulamayı açın.' },
    halal_cards: { title: 'Halal Cards', body: 'Halal Cards’ta sizi bekleyen bir şey var.' },
    liked_you: { title: "Biri seni beğendi", body: "Biyografisini okumak için Bağlantılar’ı aç." },
    waiting_on_you: { title: "Biri seni bekliyor", body: "Eşleşmen yanıtladı. Sıra sende." },
    quiet_match: { title: "Sohbet sessiz", body: "Selam ver. Senin için nazik bir giriş cümlemiz var." },
    photo_approved: { title: "Doğrulandınız", body: "Selfie’niz fotoğraflarınızla eşleşiyor. Teşekkürler." },
    photo_redo: { title: "Bir fotoğrafın yenilenmesi gerekiyor", body: "Neyin değişeceğini görmek için uygulamayı açın." },
    recap_ready: { title: "Özetiniz hazır", body: "İkiniz de yanıtladınız. Okuyun ve selam verin." },
    round_expiring: { title: "Setiniz yakında kapanıyor", body: "Bugünkü tanışmalar arasından seçmek için birkaç saat kaldı." },
  },
  ha: {
    round_ready: { title: "Gabatarwarku {{count}} a shirye take", body: "Asuba ta yi. Gabatarwar yau tana jiran ku." },
    mutual_match: { title: 'Haɗi daga ɓangarorin biyu', body: 'Wanda kuka zaɓa ya zaɓe ku ma.' },
    new_message: { title: 'Sabon saƙo', body: 'Akwai saƙo da ke jiran ku.' },
    notice: { title: 'Sanarwa daga Halal Mode', body: 'Buɗe manhajar don gani.' },
    halal_cards: { title: 'Halal Cards', body: 'Akwai wani abu a Halal Cards da ke jiran ku.' },
    liked_you: { title: "Wani ya so ku", body: "Buɗe Haɗin kai don karanta bayaninsa." },
    waiting_on_you: { title: "Wani yana jiran ku", body: "Wanda kuka dace da shi ya amsa. Lokacinku ne." },
    quiet_match: { title: "Tattaunawa ta yi shiru", body: "Yi sallama. Muna da farawa mai kyau a gare ku." },
    photo_approved: { title: "An tabbatar da ku", body: "Hoton selfie ɗinku ya dace da hotunanku. Na gode." },
    photo_redo: { title: "Ana buƙatar sake ɗaukar hoto", body: "Buɗe manhajar don ganin abin da za a canza." },
    recap_ready: { title: "Takaitaccen bayaninku ya shirya", body: "Ku biyu kun amsa. Karanta ku yi sallama." },
    round_expiring: { title: "Rukunin ku zai rufe nan ba da daɗewa ba", body: "Saura awanni kaɗan don zaɓa daga gabatarwar yau." },
  },
  am: {
    round_ready: { title: "{{count}} መግቢያዎችዎ ዝግጁ ናቸው", body: "ፈጅር ገብቷል። የዛሬ መግቢያዎች ይጠብቆታል።" },
    mutual_match: { title: 'የጋራ ተዛማጅ', body: 'የመረጡት ሰው እርስዎንም መርጧል።' },
    new_message: { title: 'አዲስ መልእክት', body: 'የሚጠብቅዎት መልእክት አለ።' },
    notice: { title: 'ከሃላል ሞድ የመጣ መልእክት', body: 'ለማየት መተግበሪያውን ይክፈቱ።' },
    halal_cards: { title: 'ሃላል ካርድስ', body: 'በሃላል ካርድስ ውስጥ የሚጠብቅዎት ነገር አለ።' },
    liked_you: { title: "አንድ ሰው ወደዳችሁ", body: "ባዮውን ለማንበብ ግንኙነቶችን ይክፈቱ።" },
    waiting_on_you: { title: "አንድ ሰው ይጠብቆታል", body: "ተዛማጅዎ መልሷል። አሁን የእርስዎ ተራ ነው።" },
    quiet_match: { title: "ውይይቱ ጸጥ ብሏል", body: "ሰላም ይበሉ። ለእርስዎ ወዳጃዊ መግቢያ አለን።" },
    photo_approved: { title: "ተረጋግጠዋል", body: "ሰልፊዎ ከፎቶዎችዎ ጋር ይመሳሰላል። እናመሰግናለን።" },
    photo_redo: { title: "አንድ ፎቶ እንደገና መነሳት አለበት", body: "ምን መቀየር እንዳለበት ለማየት መተግበሪያውን ይክፈቱ።" },
    recap_ready: { title: "ማጠቃለያዎ ዝግጁ ነው", body: "ሁለታችሁም መልሳችኋል። አንብበው ሰላም ይበሉ።" },
    round_expiring: { title: "ስብስብዎ በቅርቡ ይዘጋል", body: "ከዛሬ መግቢያዎች ለመምረጥ ጥቂት ሰዓታት ብቻ ቀርተዋል።" },
  },
  so: {
    round_ready: { title: "{{count}} isbarasho oo kuu diyaar ah", body: "Fajarku wuu soo galay. Isbarashooyinka maanta way ku sugayaan." },
    mutual_match: { title: 'Isku-aad labada dhinac ah', body: 'Qof aad doorattay ayaa adigana ku doortay.' },
    new_message: { title: 'Fariin cusub', body: 'Fariin ayaa ku sugaysa.' },
    notice: { title: 'War ka yimid Halal Mode', body: 'Fur app-ka si aad u aragto.' },
    halal_cards: { title: 'Halal Cards', body: 'Wax baa kugu sugaya Halal Cards.' },
    liked_you: { title: "Qof ayaa ku jeclaaday", body: "Fur Xiriirada si aad u akhrido faahfaahintiisa." },
    waiting_on_you: { title: "Qof ayaa ku sugaya", body: "Ciddii kuu habboonayd way jawaabtay. Waa idinka." },
    quiet_match: { title: "Wada-hadalku waa aamusan yahay", body: "Salaan. Waxaan kuu haynaa bilow wanaagsan." },
    photo_approved: { title: "Waa laguu xaqiijiyey", body: "Sawirkaaga is-qaadka ah wuxuu la mid yahay sawiradaada. Mahadsanid." },
    photo_redo: { title: "Sawir ayaa dib loo qaadayaa", body: "Fur app-ka si aad u aragto wixii la beddelayo." },
    recap_ready: { title: "Soo koobiddaadu waa diyaar", body: "Labadiinuba waad jawaabteen. Akhri oo salaan." },
    round_expiring: { title: "Xirmadaadu dhawaan way xirmaysaa", body: "Waxaa harsan dhawr saacadood oo aad ka dooran karto isbarashooyinka maanta." },
  },
  es: {
    round_ready: { title: "Tus {{count}} están listas", body: "Ha entrado el Fajr. Las presentaciones de hoy te esperan." },
    mutual_match: { title: 'Elección mutua', body: 'Alguien a quien elegiste también te eligió.' },
    new_message: { title: 'Nuevo mensaje', body: 'Tienes un mensaje esperando.' },
    notice: { title: 'Novedades de Halal Mode', body: 'Abre la app para verlo.' },
    halal_cards: { title: 'Halal Cards', body: 'Algo te espera en Halal Cards.' },
    liked_you: { title: "Alguien te ha dado me gusta", body: "Abre Conexiones para leer su biografía." },
    waiting_on_you: { title: "Alguien te está esperando", body: "Tu match ha respondido. Es tu turno." },
    quiet_match: { title: "Está todo muy tranquilo", body: "Saluda. Tenemos un comienzo amable para ti." },
    photo_approved: { title: "Estás verificado", body: "Tu selfi coincide con tus fotos. Gracias." },
    photo_redo: { title: "Hay que rehacer una foto", body: "Abre la app para ver qué cambiar." },
    recap_ready: { title: "Tu resumen está listo", body: "Los dos habéis respondido. Léelo y saluda." },
    round_expiring: { title: "Tu selección se cierra pronto", body: "Quedan unas horas para elegir entre las presentaciones de hoy." },
  },
  ru: {
    round_ready: { title: "Ваши {{count}} готовы", body: "Наступил фаджр. Сегодняшние знакомства ждут вас." },
    mutual_match: { title: 'Взаимный выбор', body: 'Человек, которого вы выбрали, тоже выбрал вас.' },
    new_message: { title: 'Новое сообщение', body: 'Вас ждёт сообщение.' },
    notice: { title: 'Новости от Halal Mode', body: 'Откройте приложение, чтобы посмотреть.' },
    halal_cards: { title: 'Halal Cards', body: 'В Halal Cards вас кое-что ждёт.' },
    liked_you: { title: "Вы кому-то понравились", body: "Откройте «Связи», чтобы прочитать о нём или о ней." },
    waiting_on_you: { title: "Кто-то ждёт вас", body: "Ваше совпадение ответило. Теперь ваша очередь." },
    quiet_match: { title: "Стало тихо", body: "Скажите салам. У нас есть дружелюбное начало для вас." },
    photo_approved: { title: "Вы подтверждены", body: "Ваше селфи совпадает с фотографиями. Спасибо." },
    photo_redo: { title: "Фото нужно переделать", body: "Откройте приложение, чтобы увидеть, что изменить." },
    recap_ready: { title: "Ваш итог готов", body: "Вы оба ответили. Прочитайте и скажите салам." },
    round_expiring: { title: "Ваш набор скоро закроется", body: "Осталось несколько часов, чтобы выбрать из сегодняшних знакомств." },
  },
  zh: {
    round_ready: { title: "你的 {{count}} 位介绍已就绪", body: "晨礼时间到了。今天的介绍在等你。" },
    mutual_match: { title: '双向选择', body: '你选择的人也选择了你。' },
    new_message: { title: '新消息', body: '你有一条消息等待查看。' },
    notice: { title: '来自 Halal Mode 的通知', body: '打开应用查看。' },
    halal_cards: { title: 'Halal Cards', body: 'Halal Cards 中有内容在等你。' },
    liked_you: { title: "有人喜欢了你", body: "打开“联系”阅读对方的简介。" },
    waiting_on_you: { title: "有人在等你", body: "你的匹配对象已回答，轮到你了。" },
    quiet_match: { title: "聊天安静了", body: "先说声 salaam 吧。我们为你准备了友好的开场白。" },
    photo_approved: { title: "你已通过验证", body: "你的自拍与照片相符，谢谢。" },
    photo_redo: { title: "有照片需要重拍", body: "打开应用查看需要修改的地方。" },
    recap_ready: { title: "你们的总结已就绪", body: "你们都已回答。读一读，然后说声 salaam 吧。" },
    round_expiring: { title: "你的名单即将截止", body: "还有几个小时可以从今天的介绍中选择。" },
  },
};

/**
 * What a member reads on their lock screen.
 *
 * Never a name, never message text. A notification says something happened;
 * the app says what, once they are inside it and the other person's privacy
 * is governed by the same rules as every other screen.
 */
function wording(kind: Claimed['kind'], locale: string, payload: Record<string, unknown> = {}): { title: string; body: string } {
  const language = locale.toLowerCase().split('-')[0];
  const key: WordingKey = kind === 'photo_decision'
    ? (payload.outcome === 'approved' ? 'photo_approved' : 'photo_redo')
    : kind;
  const text = (WORDING[language] ?? WORDING.en)[key];
  // "Your five are ready": the number is the member's set size. English says it
  // in words, every other language in digits.
  const count = typeof payload.count === 'number' ? payload.count : 5;
  const shown = language === 'en' ? (count === 10 ? 'ten' : count === 5 ? 'five' : String(count)) : String(count);
  return { title: text.title.replace('{{count}}', shown), body: text.body.replace('{{count}}', shown) };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const verified = await client.rpc('verify_notification_worker_secret', {
    p_secret: request.headers.get('x-notification-worker-secret') ?? '',
  });
  if (verified.error || verified.data !== true) {
    return new Response('Forbidden', { status: 403 });
  }

  const claimed = await client.rpc('claim_notifications_service', { p_limit: 100 });
  if (claimed.error) {
    return Response.json({ error: claimed.error.message }, { status: 500 });
  }

  const rows = (claimed.data ?? []) as Claimed[];
  if (rows.length === 0) return Response.json({ claimed: 0, sent: 0, failed: 0 });

  // One message per device. A notification counts as delivered if it reached
  // any of the member's phones; it is retried only if it reached none.
  const messages = rows.map((row) => {
    const { title, body } = wording(row.kind, row.locale ?? 'en', row.payload);
    return {
      to: row.push_token,
      title,
      body,
      sound: 'default',
      channelId: row.platform === 'android' ? 'default' : undefined,
      // Stable for every retry of this outbox row. Expo can collapse pending
      // copies for the same device, and the app can identify the event if the
      // provider returns an ambiguous response.
      collapseId: `halal-mode-${row.id}`,
      // Lets the app open the right screen without putting anything private
      // in the payload.
      data: { kind: row.kind, notificationId: String(row.id) },
    };
  });

  const delivered = new Set<number>();
  const lastError = new Map<number, string>();
  const deadTokens: string[] = [];

  // Expo accepts at most 100 messages per request and answers with one ticket
  // per message, in order.
  for (let start = 0; start < messages.length; start += 100) {
    const batch = messages.slice(start, start + 100);
    const batchRows = rows.slice(start, start + 100);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      if (!response.ok) {
        const text = await response.text();
        if (response.status >= 500 || response.status === 408) {
          // A transport/provider 5xx can mean Expo accepted the batch and the
          // response was lost. Retrying here is the duplicate path; settle the
          // row once rather than sending the same notification again.
          for (const row of batchRows) {
            delivered.add(row.id);
            lastError.set(row.id, `ambiguous push response ${response.status}`);
          }
        } else {
          for (const row of batchRows) lastError.set(row.id, `push ${response.status}: ${text.slice(0, 120)}`);
        }
        continue;
      }
      const payload = await response.json() as { data?: { status: string; message?: string; details?: { error?: string } }[] };
      const tickets = payload.data ?? [];
      batchRows.forEach((row, index) => {
        const ticket = tickets[index];
        if (ticket?.status === 'ok') {
          delivered.add(row.id);
          return;
        }
        if (!ticket) {
          // A successful HTTP response with a missing ticket is also
          // ambiguous: do not retry an event that may already be accepted.
          delivered.add(row.id);
          lastError.set(row.id, 'ambiguous push response without ticket');
          return;
        }
        const error = ticket.details?.error ?? ticket.message ?? 'unknown';
        lastError.set(row.id, error);
        // Only this phone is retired; the member's others keep receiving.
        if (error === 'DeviceNotRegistered') deadTokens.push(row.push_token);
      });
    } catch (error) {
      for (const row of batchRows) {
        delivered.add(row.id);
        lastError.set(row.id, error instanceof Error ? error.message : 'transport failed');
      }
    }
  }

  const sent = [...new Set(rows.map((row) => row.id))].filter((id) => delivered.has(id));
  const failed = [...new Set(rows.map((row) => row.id))]
    .filter((id) => !delivered.has(id))
    .map((id) => ({ id, error: lastError.get(id) ?? 'unknown' }));

  const settled = await client.rpc('settle_notifications_service', {
    p_sent: sent,
    p_failed: failed,
    p_dead_tokens: deadTokens,
  });
  if (settled.error) {
    return Response.json({ error: settled.error.message, sent: sent.length }, { status: 500 });
  }

  return Response.json({ claimed: rows.length, sent: sent.length, failed: failed.length });
});
