/**
 * Drains the mail outbox through Resend: every email the service sends goes
 * through here (report alerts to the operator, waitlist welcomes, and later
 * support), so there is one sender, one set of DNS records, one log.
 *
 * Secrets (supabase secrets set …): RESEND_API_KEY, OPERATOR_EMAIL, and
 * optionally MAIL_FROM (default "Halal Mode <hello@halalmo.de>").
 * Called every two minutes by cron with the vault's worker secret.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

interface Claimed {
  id: number;
  kind: 'report' | 'waitlist_welcome';
  to: string | null;
  locale: string;
  report: Report | null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const FROM = Deno.env.get('MAIL_FROM') ?? 'Halal Mode <hello@halalmo.de>';

const escape = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** A link to a confirmation page, valid for 14 days. */
async function actionLink(secret: string, reportId: string, action: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + 14 * 24 * 3600;
  const token = await sign(secret, `${reportId}.${action}.${expires}`);
  return `https://halalmo.de/moderate?r=${reportId}&a=${action}&e=${expires}&t=${token}`;
}

async function reportEmail(report: Report, secret: string) {
  const [suspend, ban, dismiss] = await Promise.all(
    ['suspend', 'ban', 'dismiss'].map((action) => actionLink(secret, report.id, action)),
  );
  const button = (href: string, label: string, colour: string) =>
    `<a href="${href}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 16px;border-radius:999px;background:${colour};color:#fff;text-decoration:none;font-weight:600">${label}</a>`;
  const subject = `Report: ${report.subject_name ?? 'member'} — ${report.reason}${report.subject_report_count > 1 ? ` (${report.subject_report_count} reports)` : ''}`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#0a0a0a">
<p><b>Reason:</b> ${escape(report.reason)}</p>
<p><b>What they wrote:</b><br>${escape(report.detail || '—').replace(/\n/g, '<br>')}</p>
<p><b>Reported member:</b> ${escape(report.subject_name)} (${escape([report.subject_city, report.subject_country].filter(Boolean).join(', '))})<br>
<code>${escape(report.subject_id)}</code><br>
Reports against them in total: <b>${report.subject_report_count}</b>${report.subject_paused ? ' · already hidden' : ''}</p>
<p><b>Reported by:</b> ${escape(report.reporter_name)} <code>${escape(report.reporter_id)}</code><br>
<b>When:</b> ${escape(new Date(report.created_at).toUTCString())}</p>
<p>${button(suspend, 'Suspend 7 days', '#8A6A34')}${button(ban, 'Ban', '#B3261E')}${button(dismiss, 'Dismiss', '#3B3934')}</p>
<p style="color:#6C6A65;font-size:13px">Each button opens a page to confirm, so nothing happens by accident. Links work for 14 days.</p>
</div>`;
  return { subject, html };
}

const WELCOME: Record<string, { subject: string; body: string }> = {
  en: {
    subject: 'You’re on the Halal Mode waitlist',
    body: 'Thank you for joining. We are opening Halal Mode city by city, and we will write to you as soon as introductions begin where you are.',
  },
  ar: {
    subject: 'أنت على قائمة انتظار حلال مود',
    body: 'شكرًا لانضمامك. نفتح حلال مود مدينةً تلو الأخرى، وسنكتب إليك فور بدء التعارفات في مدينتك.',
  },
};

function welcomeEmail(locale: string) {
  const words = WELCOME[locale] ?? WELCOME.en;
  const rtl = locale === 'ar';
  return {
    subject: words.subject,
    html: `<div dir="${rtl ? 'rtl' : 'ltr'}" style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#0a0a0a"><p>${escape(words.body)}</p><p>Halal Mode</p></div>`,
  };
}

async function send(apiKey: string, to: string, subject: string, html: string): Promise<string | null> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  return response.ok ? null : `${response.status} ${(await response.text()).slice(0, 300)}`;
}

Deno.serve(async (request) => {
  const client = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const verified = await client.rpc('verify_mail_worker_secret', {
    p_secret: request.headers.get('x-mail-worker-secret') ?? '',
  });
  if (verified.error || verified.data !== true) return new Response('forbidden', { status: 403 });

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const operator = Deno.env.get('OPERATOR_EMAIL');
  if (!apiKey || !operator) return new Response('RESEND_API_KEY and OPERATOR_EMAIL are not set', { status: 503 });

  const secret = await client.rpc('mail_link_secret_service');
  const claimed = await client.rpc('claim_mail_service', { p_limit: 20 });
  if (claimed.error || secret.error) return new Response('claim failed', { status: 500 });

  let sent = 0;
  for (const item of (claimed.data ?? []) as Claimed[]) {
    let error: string | null = null;
    try {
      if (item.kind === 'report' && item.report) {
        const mail = await reportEmail(item.report, secret.data as string);
        error = await send(apiKey, operator, mail.subject, mail.html);
      } else if (item.kind === 'waitlist_welcome' && item.to) {
        const mail = welcomeEmail(item.locale);
        error = await send(apiKey, item.to, mail.subject, mail.html);
      } else {
        error = 'nothing to send';
      }
    } catch (caught) {
      error = String(caught);
    }
    await client.rpc('settle_mail_service', { p_id: item.id, p_ok: error === null, p_error: error });
    if (error === null) sent += 1;
  }
  return Response.json({ sent });
});
