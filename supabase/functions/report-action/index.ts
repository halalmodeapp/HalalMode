/**
 * Report and account actions from the admin panel (halalmo.de/admin):
 * suspend for 7 days, ban, unban, or dismiss a report.
 *
 * Every call carries the admin's own session. admin_authorize_report_action
 * and admin_authorize_member_action check, as that admin, the admin list,
 * owner role and a recent authenticator code. The activity-log row is written
 * by the apply_admin_*_service function in the same transaction that applies
 * the action, so the log never shows an action that failed.
 *
 * Report emails used to carry signed links that acted without a session.
 * Anyone who could see the inbox could then suspend or ban with no second
 * factor and no log entry, so those links are no longer honoured: the email
 * points to the admin panel instead, and old links get a 410.
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405, headers: CORS });

  const body = await request.json().catch(() => ({})) as { r?: string; a?: string; why?: string; admin?: boolean; member?: string };
  const { r, a } = body;
  // Only the admin panel may act. Old signed email links land here without
  // `admin` and are refused.
  if (body.admin !== true) {
    return Response.json({ error: 'Email links no longer act. Open Reports in the admin panel.' }, { status: 410, headers: CORS });
  }
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const bearer = request.headers.get('authorization') ?? '';
  // Runs as the admin, so the database decides with their own session.
  const asAdmin = () => createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: bearer } },
    auth: { persistSession: false },
  });

  // Account actions from the admin panel's Trust & safety pages: suspend,
  // ban or unban a member directly, without a report.
  if (body.member) {
    const ACCOUNT: Record<string, string> = { suspend: '168h', ban: '876000h', unban: 'none' };
    if (!a || !(a in ACCOUNT) || !bearer.startsWith('Bearer ')) {
      return Response.json({ error: 'invalid' }, { status: 400, headers: CORS });
    }
    const allowed = await asAdmin().rpc('admin_authorize_member_action', { p_user_id: body.member, p_action: a, p_reason: body.why ?? '' });
    if (allowed.error || !allowed.data) {
      return Response.json({ error: allowed.error?.message ?? 'forbidden', hint: allowed.error?.hint ?? null }, { status: 403, headers: CORS });
    }
    const ok = allowed.data as { actor: string; reason: string };
    const changed = await client.auth.admin.updateUserById(body.member, { ban_duration: ACCOUNT[a] });
    if (changed.error) return Response.json({ error: changed.error.message }, { status: 500, headers: CORS });
    const applied = await client.rpc('apply_admin_member_action_service', { p_user_id: body.member, p_action: a, p_actor: ok.actor, p_reason: ok.reason });
    if (applied.error) return Response.json({ error: applied.error.message }, { status: 500, headers: CORS });
    return Response.json({ done: a }, { headers: CORS });
  }

  if (!r || !a || !(a in BAN_FOR) || !bearer.startsWith('Bearer ')) {
    return Response.json({ error: 'invalid' }, { status: 400, headers: CORS });
  }
  const allowed = await asAdmin().rpc('admin_authorize_report_action', { p_report_id: r, p_action: a, p_reason: body.why ?? '' });
  if (allowed.error || !allowed.data) {
    return Response.json({ error: allowed.error?.message ?? 'forbidden', hint: allowed.error?.hint ?? null }, { status: 403, headers: CORS });
  }
  const admin = allowed.data as { actor: string; reason: string };

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
  // succeeds. If the worker dies here, the claim makes the same action
  // retryable without allowing a different action or a second notice.
  const applied = await client.rpc('apply_admin_report_action_service', { p_report_id: r, p_action: a, p_actor: admin.actor, p_reason: admin.reason });
  if (applied.error) return Response.json({ error: applied.error.message }, { status: 500, headers: CORS });
  return Response.json({ done: a }, { headers: CORS });
});
