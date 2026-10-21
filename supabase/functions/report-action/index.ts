/**
 * The quick actions in a report email: suspend for 7 days, ban, or dismiss.
 *
 * The email links to halalmo.de/moderate, a page that shows what will happen
 * and asks for a click; that page POSTs here. Acting on a plain link would let
 * a mail scanner, which opens links to check them, ban somebody by itself.
 *
 * Each link carries an HMAC over (report, action, expiry) made with the vault
 * secret, so only links this service sent are honoured, and only for 14 days.
 *
 * The admin panel (halalmo.de/admin) uses the same actions with the admin's
 * own session instead of a signed link. admin_authorize_report_action checks,
 * as that admin, the admin list, owner role and a recent authenticator code.
 * The activity-log row is written by apply_admin_report_action_service in the
 * same transaction that applies the action, so the log never shows an action
 * that failed.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': 'https://halalmo.de',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};

const BAN_FOR: Record<string, string | null> = {
  suspend: '168h',
  ban: '876000h',
  dismiss: null,
};

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405, headers: CORS });

  const body = await request.json().catch(() => ({})) as { r?: string; a?: string; e?: string; t?: string; why?: string; admin?: boolean };
  const { r, a, e, t } = body;
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  let admin: { actor: string; reason: string } | null = null;

  if (body.admin === true) {
    const bearer = request.headers.get('authorization') ?? '';
    if (!r || !a || !(a in BAN_FOR) || !bearer.startsWith('Bearer ')) {
      return Response.json({ error: 'invalid' }, { status: 400, headers: CORS });
    }
    // Runs as the admin, so the database decides with their own session.
    const asAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false },
    });
    const allowed = await asAdmin.rpc('admin_authorize_report_action', { p_report_id: r, p_action: a, p_reason: body.why ?? '' });
    if (allowed.error || !allowed.data) {
      return Response.json({ error: allowed.error?.message ?? 'forbidden', hint: allowed.error?.hint ?? null }, { status: 403, headers: CORS });
    }
    admin = allowed.data as { actor: string; reason: string };
  } else {
    if (!r || !a || !e || !t || !(a in BAN_FOR)) return Response.json({ error: 'invalid' }, { status: 400, headers: CORS });
    if (Number(e) < Date.now() / 1000) return Response.json({ error: 'expired' }, { status: 410, headers: CORS });
    const secret = await client.rpc('mail_link_secret_service');
    if (secret.error || !equal(await sign(secret.data as string, `${r}.${a}.${e}`), t)) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: CORS });
    }
  }

  const duration = BAN_FOR[a];
  const claimed = await client.rpc('claim_report_action_service', { p_report_id: r, p_action: a });
  if (claimed.error) return Response.json({ error: claimed.error.message }, { status: 400, headers: CORS });

  if (duration) {
    const subject = claimed.data as string;
    const banned = await client.auth.admin.updateUserById(subject, { ban_duration: duration });
    if (banned.error) {
      await client.rpc('release_report_action_service', { p_report_id: r, p_action: a });
      return Response.json({ error: banned.error.message }, { status: 500, headers: CORS });
    }
  }
  // The database action is applied only after the external Auth side effect
  // succeeds. If the worker dies here, the claim makes the same signed action
  // retryable without allowing a different action or a second notice.
  const applied = admin
    ? await client.rpc('apply_admin_report_action_service', { p_report_id: r, p_action: a, p_actor: admin.actor, p_reason: admin.reason })
    : await client.rpc('apply_report_action_service', { p_report_id: r, p_action: a });
  if (applied.error) return Response.json({ error: applied.error.message }, { status: 500, headers: CORS });
  return Response.json({ done: a }, { headers: CORS });
});
