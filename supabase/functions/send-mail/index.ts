/**
 * Drains the mail outbox: every email the service sends goes through here
 * (report alerts to the operator, waitlist mail, and later support), so there
 * is one sender, one set of DNS records, one log.
 *
 * Sends through Amazon SES when its secrets are set, otherwise Resend.
 * Secrets (supabase secrets set …): OPERATOR_EMAIL; for SES, SES_REGION,
 * SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY; for Resend, RESEND_API_KEY;
 * optionally MAIL_FROM (default "Halal Mode <hello@halalmo.de>").
 * Called every minute by cron with the vault's worker secret.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AwsClient } from 'npm:aws4fetch@1.0.20';

interface Report {
  id: string;
  reason: string;
  detail: string | null;
  created_at: string;
  reporter_id: string;
  reporter_name: string | null;
  subject_id: string;
  subject_name: string | null;
  subject_city: string | null;
  subject_country: string | null;
  subject_paused: boolean | null;
  subject_report_count: number;
}

interface Moderation {
  id: number;
  user_id: string;
  kind: 'photo' | 'bio';
  ref: string;
  decision: 'remove' | 'review';
  reason: string | null;
  first_name: string | null;
}

interface Progress {
  eligible: boolean;
  referral_count: number;
  reward_months: number;
}

interface Claimed {
  id: number;
  kind: 'report' | 'waitlist_welcome' | 'moderation' | 'waitlist_verification' | 'waitlist_not_joined' | 'referral_joined';
  to: string | null;
  locale: string;
  report: Report | null;
  moderation: Moderation | null;
  verification: { token: string; confirmed?: boolean } | null;
  welcome: { eligible: boolean } | null;
  progress: Progress | null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const FROM = Deno.env.get('MAIL_FROM') ?? 'Halal Mode <hello@halalmo.de>';
const MODERATION_MEDIA_LINK_TTL_SECONDS = 60 * 60;

const escape = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/**
 * Decisions are made in the admin panel, which asks for the admin's
 * two-factor code and writes every action to the audit log. The email only
 * points there: a link that could suspend or ban by itself would let anyone
 * who sees this inbox act with no second factor and no record.
 */
const ADMIN_REPORTS_URL = 'https://halalmo.de/admin#/reports';

function reportEmail(report: Report) {
  const subject = `Report: ${report.subject_name ?? 'member'}, ${report.reason}${report.subject_report_count > 1 ? ` (${report.subject_report_count} reports)` : ''}`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#0a0a0a">
<p><b>Reason:</b> ${escape(report.reason)}</p>
<p><b>What they wrote:</b><br>${escape(report.detail || '...').replace(/\n/g, '<br>')}</p>
<p><b>Reported member:</b> ${escape(report.subject_name)} (${escape([report.subject_city, report.subject_country].filter(Boolean).join(', '))})<br>
<code>${escape(report.subject_id)}</code><br>
Reports against them in total: <b>${report.subject_report_count}</b>${report.subject_paused ? ' · already hidden' : ''}</p>
<p><b>Reported by:</b> ${escape(report.reporter_name)} <code>${escape(report.reporter_id)}</code><br>
<b>When:</b> ${escape(new Date(report.created_at).toUTCString())}</p>
<p><a href="${ADMIN_REPORTS_URL}" style="display:inline-block;margin:4px 0;padding:10px 16px;border-radius:999px;background:#0A0A0A;color:#fff;text-decoration:none;font-weight:600">Decide in the admin panel</a></p>
<p style="color:#6C6A65;font-size:13px">Suspend, ban or dismiss from Reports in the admin panel. It asks for your two-factor code, and every decision is logged.</p>
</div>`;
  return { subject, html };
}

// deno-lint-ignore no-explicit-any
async function moderationEmail(item: Moderation, client: any) {
  let shown = `<p><b>Bio:</b><br>${escape(item.ref).replace(/\n/g, '<br>')}</p>`;
  if (item.kind === 'photo') {
    const signed = await client.storage.from('profile-photos').createSignedUrl(item.ref, MODERATION_MEDIA_LINK_TTL_SECONDS);
    shown = signed.data?.signedUrl
      ? `<p><a href="${signed.data.signedUrl}">Open the photo</a> (private link, 1 hour)</p>`
      : '<p>The photo could not be linked.</p>';
  }
  const what = item.kind === 'photo'
    ? (item.decision === 'remove' ? 'Photo removed automatically' : 'Photo needs a look')
    : 'Bio needs a look';
  return {
    subject: `${what}: ${item.first_name ?? 'member'}`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#0a0a0a">
<p><b>${escape(what)}</b>, ${escape(item.reason ?? '')}</p>
${shown}
<p><b>Member:</b> ${escape(item.first_name)} <code>${escape(item.user_id)}</code></p>
<p style="color:#6C6A65;font-size:13px">Checked by automated content moderation. A removed photo can be added back by the member; a bio is never changed automatically.</p>
</div>`,
  };
}

const WELCOME: Record<string, { subject: string; thanks: string; offer: string; next: string; referralNote: string }> = {
  en: {
    subject: 'You’re on the Halal Mode waitlist',
    thanks: 'Thanks for joining Halal Mode. Your place is saved—there’s nothing else you need to do.',
    offer: 'You’re one of the first 10,000, so 1 month of Premium is reserved for you, free, at launch.',
    next: 'We’re opening city by city. We’ll be in touch when Halal Mode is ready in your city.',
    referralNote: 'If a friend invited you, they’ll receive referral credit only after you complete your profile in the app. Joining the waitlist or receiving this email does not count by itself.',
  },
  ar: {
    subject: 'أنت على قائمة انتظار حلال مود',
    thanks: 'شكرًا لانضمامك إلى حلال مود. مكانك محفوظ، ولا تحتاج إلى فعل أي شيء آخر.',
    offer: 'أنت من أول 10,000 شخص، لذلك حجزنا لك شهرًا من بريميوم مجانًا عند الإطلاق.',
    next: 'نفتتح التطبيق مدينةً تلو الأخرى، وسنتواصل معك عندما يصبح حلال مود جاهزًا في مدينتك.',
    referralNote: 'إذا دعاك صديق، فلن تُحتسب له الإحالة إلا بعد إكمال ملفك الشخصي في التطبيق. الانضمام إلى قائمة الانتظار أو استلام هذا البريد لا يُحتسب وحده.',
  },
};

function welcomeEmail(locale: string, eligible: boolean) {
  const words = WELCOME[locale] ?? WELCOME.en;
  const rtl = locale === 'ar';
  const offer = eligible ? `<p><b>${escape(words.offer)}</b></p>` : '';
  return {
    subject: words.subject,
    html: `<div dir="${rtl ? 'rtl' : 'ltr'}" style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#0a0a0a"><p>${escape(words.thanks)}</p>${offer}<p>${escape(words.next)}</p><p>${escape(words.referralNote)}</p><p>Halal Mode</p></div>`,
  };
}

const VERIFICATION: Record<string, {
  subject: string; intro: string; button: string; expiry: string;
  introConfirmed: string; buttonConfirmed: string; expiryConfirmed: string;
}> = {
  en: {
    subject: 'Your Halal Mode referral link',
    intro: 'Confirm your email to get your referral link. Invite a few good people and unlock more Premium.',
    button: 'Get my referral link',
    expiry: 'This link expires in 7 days.',
    introConfirmed: 'Here is your referral progress, including how many friends have completed their app profiles and the Premium you have earned.',
    buttonConfirmed: 'See my referral link',
    expiryConfirmed: 'This link works for 30 days.',
  },
  ar: {
    subject: 'رابط الدعوة الخاص بك في حلال مود',
    intro: 'أكّد بريدك الإلكتروني لتحصل على رابط الدعوة. ادعُ أشخاصًا طيبين واحصل على مزيد من بريميوم.',
    button: 'احصل على رابطي',
    expiry: 'ينتهي هذا الرابط خلال 7 أيام.',
    introConfirmed: 'هذه صفحة تقدم إحالاتك، وفيها عدد الأصدقاء الذين أكملوا ملفاتهم في التطبيق ومقدار بريميوم الذي كسبته.',
    buttonConfirmed: 'اعرض رابطي',
    expiryConfirmed: 'يعمل هذا الرابط لمدة 30 يومًا.',
  },
};

const BUTTON = 'display:inline-block;padding:11px 17px;border-radius:999px;background:#0a0a0a;color:#fff;text-decoration:none;font-weight:600';
const NOTE = 'color:#6c6a65;font-size:13px';
const page = (rtl: boolean, body: string) =>
  `<div dir="${rtl ? 'rtl' : 'ltr'}" style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#0a0a0a">${body}<p>Halal Mode</p></div>`;

function verificationEmail(locale: string, token: string, confirmed: boolean) {
  const words = VERIFICATION[locale] ?? VERIFICATION.en;
  const link = `https://halalmo.de/refer?verify=${encodeURIComponent(token)}`;
  return {
    subject: words.subject,
    html: page(locale === 'ar', `<p>${escape(confirmed ? words.introConfirmed : words.intro)}</p><p><a href="${link}" style="${BUTTON}">${escape(confirmed ? words.buttonConfirmed : words.button)}</a></p><p style="${NOTE}">${escape(confirmed ? words.expiryConfirmed : words.expiry)}</p>`),
  };
}

// Someone asked for a referral link with an address that is not on the
// waitlist. Plain on purpose: it goes to whoever owns the address.
const NOT_JOINED: Record<string, { subject: string; body: string; button: string; ignore: string }> = {
  en: {
    subject: 'Join the Halal Mode waitlist first',
    body: 'Someone asked for a Halal Mode referral link for this email address, but it is not on the waitlist yet. Join the waitlist, then you can get your referral link straight away.',
    button: 'Join the waitlist',
    ignore: 'If this was not you, you can ignore this email.',
  },
  ar: {
    subject: 'سجّل في قائمة انتظار حلال مود أولًا',
    body: 'طلب أحدهم رابط دعوة من حلال مود لهذا البريد الإلكتروني، لكنه ليس في قائمة الانتظار بعد. سجّل في قائمة الانتظار، ثم يمكنك الحصول على رابط الدعوة فورًا.',
    button: 'سجّل في قائمة الانتظار',
    ignore: 'إذا لم تكن أنت، يمكنك تجاهل هذه الرسالة.',
  },
};

function notJoinedEmail(locale: string) {
  const words = NOT_JOINED[locale] ?? NOT_JOINED.en;
  return {
    subject: words.subject,
    html: page(locale === 'ar', `<p>${escape(words.body)}</p><p><a href="https://halalmo.de/" style="${BUTTON}">${escape(words.button)}</a></p><p style="${NOTE}">${escape(words.ignore)}</p>`),
  };
}

// A referred friend joined the waitlist. This message reports completed app
// profiles only; a waitlist or email confirmation alone never changes the count.
const JOINED: Record<string, {
  subject: string; counted: string; next: string; top: string; months: string; month: string; button: string; expiry: string;
  rewards: Record<number, string>;
}> = {
  en: {
    subject: 'A friend joined the Halal Mode waitlist',
    counted: '{joined} referred friends have completed their profiles and count toward your reward.',
    next: '{left} more completed profiles to reach {reward}.',
    top: 'You have reached the top reward: 1 year of Premium, free.',
    months: 'Premium reserved for you so far: {months} months.',
    month: 'Premium reserved for you so far: 1 month.',
    button: 'See my progress',
    expiry: 'This link works for 30 days.',
    rewards: { 3: '3 months free', 5: '6 months free', 10: '1 year free' },
  },
  ar: {
    subject: 'انضم صديق إلى قائمة انتظار حلال مود عبر رابطك',
    counted: 'أكمل {joined} من الأصدقاء الذين دعوتهم ملفاتهم الشخصية، ويُحتسبون ضمن مكافأتك.',
    next: 'أكمل {left} أصدقاء آخرين ملفاتهم للوصول إلى {reward}.',
    top: 'وصلت إلى أعلى مكافأة: سنة من بريميوم مجانًا.',
    months: 'بريميوم المحجوز لك حتى الآن: {months} أشهر.',
    month: 'بريميوم المحجوز لك حتى الآن: شهر واحد.',
    button: 'اعرض تقدّمي',
    expiry: 'يعمل هذا الرابط لمدة 30 يومًا.',
    rewards: { 3: '3 أشهر مجانًا', 5: '6 أشهر مجانًا', 10: 'سنة مجانًا' },
  },
};

function referralJoinedEmail(locale: string, progress: Progress, token: string) {
  const words = JOINED[locale] ?? JOINED.en;
  const joined = Math.max(0, progress.referral_count);
  const goal = joined >= 10 ? 10 : joined >= 5 ? 10 : joined >= 3 ? 5 : 3;
  const fill = (text: string, values: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
  const lines = [fill(words.counted, { joined, goal })];
  lines.push(joined >= 10 ? words.top : fill(words.next, { left: goal - joined, reward: words.rewards[goal] }));
  if (progress.reward_months > 0) {
    lines.push(progress.reward_months === 1 ? words.month : fill(words.months, { months: progress.reward_months }));
  }
  const link = `https://halalmo.de/refer?verify=${encodeURIComponent(token)}`;
  return {
    subject: words.subject,
    html: page(locale === 'ar', `${lines.map((line, i) => `<p>${i === 0 ? `<b>${escape(line)}</b>` : escape(line)}</p>`).join('')}<p><a href="${link}" style="${BUTTON}">${escape(words.button)}</a></p><p style="${NOTE}">${escape(words.expiry)}</p>`),
  };
}

type Send = (to: string, subject: string, html: string, idempotencyKey: string) => Promise<string | null>;

/**
 * Errors come back as "<status> <detail>". A provider limit is reported as
 * "429 rate …" or "429 quota …": settle_mail_service then waits (a minute or
 * an hour) without counting the try.
 */
function limitError(status: number, body: string): string | null {
  if (/quota/i.test(body)) return `429 quota ${body.slice(0, 300)}`;
  if (status === 429 || /throttl|TooManyRequests|rate exceeded/i.test(body)) return `429 rate ${body.slice(0, 300)}`;
  return null;
}

function resend(apiKey: string): Send {
  return async (to, subject, html, idempotencyKey) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (response.ok) return null;
    const body = await response.text();
    return limitError(response.status, body) ?? `${response.status} ${body.slice(0, 300)}`;
  };
}

function ses(region: string, accessKeyId: string, secretAccessKey: string): Send {
  const aws = new AwsClient({ accessKeyId, secretAccessKey, region, service: 'ses' });
  return async (to, subject, html) => {
    const response = await aws.fetch(`https://email.${region}.amazonaws.com/v2/email/outbound-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FromEmailAddress: FROM,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Html: { Data: html, Charset: 'UTF-8' } },
          },
        },
      }),
    });
    if (response.ok) return null;
    const body = await response.text();
    return limitError(response.status, body) ?? `${response.status} ${body.slice(0, 300)}`;
  };
}

interface Mailer {
  provider: 'ses' | 'resend';
  send: Send;
  pauseMs: number;
  batch: number;
  /** The provider's own 24-hour quota, or null to use mail_settings.daily_limit. */
  dailyLimit: number | null;
}

interface SesAccount {
  ProductionAccessEnabled?: boolean;
  SendingEnabled?: boolean;
  SendQuota?: { Max24HourSend?: number; MaxSendRate?: number };
}

/**
 * Amazon SES, but only once AWS has granted production access. In the sandbox
 * SES only delivers to verified addresses, so every waitlist email would
 * fail; until the account says otherwise, Resend keeps sending. That makes it
 * safe to set SES_REGION now: the switch happens on its own when AWS approves,
 * at the quota and speed AWS granted.
 */
async function sesMailer(region: string, accessKeyId: string, secretAccessKey: string): Promise<Mailer | null> {
  const aws = new AwsClient({ accessKeyId, secretAccessKey, region, service: 'ses' });
  try {
    const response = await aws.fetch(`https://email.${region}.amazonaws.com/v2/email/account`);
    if (!response.ok) return null;
    const account = (await response.json()) as SesAccount;
    if (account.ProductionAccessEnabled !== true || account.SendingEnabled !== true) return null;
    const rate = Math.max(1, account.SendQuota?.MaxSendRate ?? 1);
    const quota = Math.floor(account.SendQuota?.Max24HourSend ?? 0);
    const pauseMs = Math.ceil(1000 / rate) + 20;
    return {
      provider: 'ses',
      send: ses(region, accessKeyId, secretAccessKey),
      pauseMs,
      // About 45 seconds of sending, so a run finishes inside its minute.
      batch: Math.max(1, Math.min(200, Math.floor(45_000 / (pauseMs + 120)))),
      dailyLimit: quota > 10 ? quota : null,
    };
  } catch {
    return null;
  }
}

/** SES once it is in production, otherwise Resend, each paced for its per-second limit. */
async function mailer(): Promise<Mailer | null> {
  const region = Deno.env.get('SES_REGION');
  const keyId = Deno.env.get('SES_ACCESS_KEY_ID');
  const secret = Deno.env.get('SES_SECRET_ACCESS_KEY');
  if (region && keyId && secret) {
    const viaSes = await sesMailer(region, keyId, secret);
    if (viaSes) return viaSes;
  }
  const apiKey = Deno.env.get('RESEND_API_KEY');
  // Resend's default limit is 2 requests a second; its daily plan limit is
  // kept in mail_settings.daily_limit.
  if (apiKey) return { provider: 'resend', send: resend(apiKey), pauseMs: 600, batch: 40, dailyLimit: null };
  return null;
}

/** Stop starting new sends after this long, so one run never overlaps the next. */
const RUN_BUDGET_MS = 50_000;

Deno.serve(async (request) => {
  const client = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const verified = await client.rpc('verify_mail_worker_secret', {
    p_secret: request.headers.get('x-mail-worker-secret') ?? '',
  });
  if (verified.error || verified.data !== true) return new Response('forbidden', { status: 403 });

  const started = Date.now();
  const mail = await mailer();
  const operator = Deno.env.get('OPERATOR_EMAIL');
  if (!mail || !operator) return new Response('Mail provider secrets and OPERATOR_EMAIL are not set', { status: 503 });
  const send = mail.send;

  // Runs every minute. Resend: 40 paced sends, about 2,400 an hour. SES: as
  // many as its send rate fits in 45 seconds, up to 200 (12,000 an hour).
  const claimed = await client.rpc('claim_mail_service', { p_limit: mail.batch, p_daily_limit: mail.dailyLimit });
  if (claimed.error) return new Response('claim failed', { status: 500 });

  let sent = 0;
  let first = true;
  for (const item of (claimed.data ?? []) as Claimed[]) {
    if (Date.now() - started > RUN_BUDGET_MS) {
      // Out of time: hand it back for the next run without using an attempt.
      await client.rpc('settle_mail_service', { p_id: item.id, p_ok: false, p_error: '429 rate deferred to the next run' });
      continue;
    }
    if (!first) await new Promise((resolve) => setTimeout(resolve, mail.pauseMs));
    first = false;
    let error: string | null = null;
    try {
      if (item.kind === 'report' && item.report) {
        const mail = reportEmail(item.report);
        error = await send(operator, mail.subject, mail.html, `mail-${item.id}`);
      } else if (item.kind === 'moderation' && item.moderation) {
        const mail = await moderationEmail(item.moderation, client);
        error = await send(operator, mail.subject, mail.html, `mail-${item.id}`);
      } else if (item.kind === 'waitlist_welcome' && item.to) {
        const mail = welcomeEmail(item.locale, item.welcome?.eligible === true);
        error = await send(item.to, mail.subject, mail.html, `mail-${item.id}`);
      } else if (item.kind === 'waitlist_verification' && item.to && item.verification?.token) {
        const mail = verificationEmail(item.locale, item.verification.token, item.verification.confirmed === true);
        error = await send(item.to, mail.subject, mail.html, `mail-${item.id}`);
      } else if (item.kind === 'waitlist_not_joined' && item.to) {
        const mail = notJoinedEmail(item.locale);
        error = await send(item.to, mail.subject, mail.html, `mail-${item.id}`);
      } else if (item.kind === 'referral_joined' && item.to && item.progress && item.verification?.token) {
        const mail = referralJoinedEmail(item.locale, item.progress, item.verification.token);
        error = await send(item.to, mail.subject, mail.html, `mail-${item.id}`);
      } else {
        error = 'nothing to send';
      }
    } catch (caught) {
      error = String(caught);
    }
    await client.rpc('settle_mail_service', { p_id: item.id, p_ok: error === null, p_error: error });
    if (error === null) sent += 1;
  }
  return Response.json({ provider: mail.provider, sent });
});
