/**
 * Drains the notification queue and delivers to Expo.
 *
 * Registering a device has worked for months and nothing has ever sent
 * anything. This is the missing half.
 *
 * It claims a bounded batch, posts it, and reports back what landed and what
 * did not — so a failure is retried rather than lost, and a token Apple or
 * Google has rejected is cleared instead of retried forever.
 *
 * Verifies itself against the vault the same way round generation and the
 * deletion worker do, so there is nothing to configure at deploy time.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface Claimed {
  id: number;
  user_id: string;
  kind: 'round_ready' | 'mutual_match' | 'new_message';
  payload: Record<string, unknown>;
  push_token: string;
  platform: string;
  locale: string;
}

type Wording = Record<Claimed['kind'], { title: string; body: string }>;

const WORDING: Record<string, Wording> = {
  en: {
    round_ready: { title: 'Your set is ready', body: 'Today’s introductions are waiting.' },
    mutual_match: { title: 'You matched', body: 'Someone you chose chose you back.' },
    new_message: { title: 'New message', body: 'You have a message waiting.' },
  },
  ar: {
    round_ready: { title: 'مجموعتك جاهزة', body: 'تعارفات اليوم بانتظارك.' },
    mutual_match: { title: 'تعارف متبادل', body: 'شخص اخترته اختارك أيضًا.' },
    new_message: { title: 'رسالة جديدة', body: 'لديك رسالة في إحدى محادثاتك.' },
  },
  ur: {
    round_ready: { title: 'آپ کا سیٹ تیار ہے', body: 'آج کے تعارف آپ کے منتظر ہیں۔' },
    mutual_match: { title: 'باہمی میچ', body: 'جسے آپ نے چنا، اس نے بھی آپ کو چنا۔' },
    new_message: { title: 'نیا پیغام', body: 'آپ کا ایک پیغام منتظر ہے۔' },
  },
  fa: {
    round_ready: { title: 'مجموعهٔ شما آماده است', body: 'معرفی‌های امروز منتظر شماست.' },
    mutual_match: { title: 'انتخاب دوطرفه', body: 'کسی که انتخاب کردید، شما را هم انتخاب کرد.' },
    new_message: { title: 'پیام تازه', body: 'یک پیام منتظر شماست.' },
  },
  hi: {
    round_ready: { title: 'आपका सेट तैयार है', body: 'आज के परिचय आपका इंतज़ार कर रहे हैं।' },
    mutual_match: { title: 'आपसी मैच', body: 'जिसे आपने चुना, उसने भी आपको चुना।' },
    new_message: { title: 'नया संदेश', body: 'आपका एक संदेश इंतज़ार कर रहा है।' },
  },
  id: {
    round_ready: { title: 'Set Anda siap', body: 'Perkenalan hari ini sudah menunggu.' },
    mutual_match: { title: 'Saling memilih', body: 'Seseorang yang Anda pilih juga memilih Anda.' },
    new_message: { title: 'Pesan baru', body: 'Ada pesan yang menunggu Anda.' },
  },
  ms: {
    round_ready: { title: 'Set anda sedia', body: 'Perkenalan hari ini sedang menunggu.' },
    mutual_match: { title: 'Saling memilih', body: 'Seseorang yang anda pilih turut memilih anda.' },
    new_message: { title: 'Mesej baharu', body: 'Ada mesej yang menunggu anda.' },
  },
  bn: {
    round_ready: { title: 'আপনার সেট প্রস্তুত', body: 'আজকের পরিচয় আপনার অপেক্ষায়।' },
    mutual_match: { title: 'পারস্পরিক ম্যাচ', body: 'যাঁকে বেছেছেন তিনিও আপনাকে বেছেছেন।' },
    new_message: { title: 'নতুন বার্তা', body: 'আপনার একটি বার্তা অপেক্ষা করছে।' },
  },
  fr: {
    round_ready: { title: 'Votre sélection est prête', body: 'Les présentations du jour vous attendent.' },
    mutual_match: { title: 'Choix réciproque', body: 'Une personne que vous avez choisie vous a choisi aussi.' },
    new_message: { title: 'Nouveau message', body: 'Un message vous attend.' },
  },
  tr: {
    round_ready: { title: 'Setiniz hazır', body: 'Bugünün tanıştırmaları sizi bekliyor.' },
    mutual_match: { title: 'Karşılıklı eşleşme', body: 'Seçtiğiniz biri de sizi seçti.' },
    new_message: { title: 'Yeni mesaj', body: 'Sizi bekleyen bir mesaj var.' },
  },
  ha: {
    round_ready: { title: 'Saitinku ya shirya', body: 'Gabatarwar yau tana jiran ku.' },
    mutual_match: { title: 'Haɗi daga ɓangarorin biyu', body: 'Wanda kuka zaɓa ya zaɓe ku ma.' },
    new_message: { title: 'Sabon saƙo', body: 'Akwai saƙo da ke jiran ku.' },
  },
  am: {
    round_ready: { title: 'ስብስብዎ ዝግጁ ነው', body: 'የዛሬው መተዋወቂያዎች እየጠበቁዎት ነው።' },
    mutual_match: { title: 'የጋራ ተዛማጅ', body: 'የመረጡት ሰው እርስዎንም መርጧል።' },
    new_message: { title: 'አዲስ መልእክት', body: 'የሚጠብቅዎት መልእክት አለ።' },
  },
  so: {
    round_ready: { title: 'Kooxdaadu waa diyaar', body: 'Isbarashada maanta ayaa ku sugaysa.' },
    mutual_match: { title: 'Isku-aad labada dhinac ah', body: 'Qof aad doorattay ayaa adigana ku doortay.' },
    new_message: { title: 'Fariin cusub', body: 'Fariin ayaa ku sugaysa.' },
  },
  es: {
    round_ready: { title: 'Tu selección está lista', body: 'Las presentaciones de hoy te esperan.' },
    mutual_match: { title: 'Elección mutua', body: 'Alguien a quien elegiste también te eligió.' },
    new_message: { title: 'Nuevo mensaje', body: 'Tienes un mensaje esperando.' },
  },
  ru: {
    round_ready: { title: 'Ваша подборка готова', body: 'Сегодняшние знакомства ждут вас.' },
    mutual_match: { title: 'Взаимный выбор', body: 'Человек, которого вы выбрали, тоже выбрал вас.' },
    new_message: { title: 'Новое сообщение', body: 'Вас ждёт сообщение.' },
  },
  zh: {
    round_ready: { title: '你的推荐已就绪', body: '今天的介绍正在等你。' },
    mutual_match: { title: '双向选择', body: '你选择的人也选择了你。' },
    new_message: { title: '新消息', body: '你有一条消息等待查看。' },
  },
};

/**
 * What a member reads on their lock screen.
 *
 * Never a name, never message text. A notification says something happened;
 * the app says what, once they are inside it and the other person's privacy
 * is governed by the same rules as every other screen.
 */
function wording(kind: Claimed['kind'], locale: string): { title: string; body: string } {
  const language = locale.toLowerCase().split('-')[0];
  return (WORDING[language] ?? WORDING.en)[kind];
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

  const messages = rows.map((row) => {
    const { title, body } = wording(row.kind, row.locale ?? 'en');
    return {
      to: row.push_token,
      title,
      body,
      sound: 'default',
      // Lets the app open the right screen without putting anything private
      // in the payload.
      data: { kind: row.kind },
    };
  });

  const sent: number[] = [];
  const failed: { id: number; error: string }[] = [];

  // Expo takes up to 100 per request and answers with one ticket per message,
  // in order.
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const text = await response.text();
      for (const row of rows) failed.push({ id: row.id, error: `push ${response.status}: ${text.slice(0, 120)}` });
    } else {
      const payload = await response.json() as { data?: { status: string; message?: string; details?: { error?: string } }[] };
      const tickets = payload.data ?? [];
      rows.forEach((row, index) => {
        const ticket = tickets[index];
        if (!ticket) {
          failed.push({ id: row.id, error: 'no ticket returned' });
        } else if (ticket.status === 'ok') {
          sent.push(row.id);
        } else {
          // `DeviceNotRegistered` is read on the database side and clears the
          // token, so an uninstalled app stops being retried.
          failed.push({ id: row.id, error: ticket.details?.error ?? ticket.message ?? 'unknown' });
        }
      });
    }
  } catch (error) {
    for (const row of rows) {
      failed.push({ id: row.id, error: error instanceof Error ? error.message : 'transport failed' });
    }
  }

  const settled = await client.rpc('settle_notifications_service', {
    p_sent: sent,
    p_failed: failed,
  });
  if (settled.error) {
    return Response.json({ error: settled.error.message, sent: sent.length }, { status: 500 });
  }

  return Response.json({ claimed: rows.length, sent: sent.length, failed: failed.length });
});
