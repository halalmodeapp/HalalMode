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
import { restrictionDuration } from '../_shared/restrictionDuration.ts';

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

  const runAction = async (userId: string, action: string, actor: string, reason: string, reportId: string | null) => {
    const claimed = await client.rpc('claim_admin_action_service', {
      p_user_id: userId, p_action: action, p_actor: actor, p_reason: reason,
      p_report_id: reportId, p_claim_token: crypto.randomUUID(),
    });
    if (claimed.error || !claimed.data) return Response.json({ error: claimed.error?.message ?? 'claim failed' }, { status: 409, headers: CORS });
    const job = claimed.data as { claim_token: string; subject_id: string; ban_until: string | null };
    if (action !== 'dismiss') {
      const changed = await client.auth.admin.updateUserById(job.subject_id, {
        ban_duration: restrictionDuration(job.ban_until, Date.now()),
      });
      if (changed.error) return Response.json({ error: changed.error.message }, { status: 500, headers: CORS });
    }
    // On failure the intent remains visible and retryable, with the same deadline.
    const applied = await client.rpc('complete_admin_action_service', { p_user_id: userId, p_claim_token: job.claim_token });
    if (applied.error) return Response.json({ error: applied.error.message }, { status: 500, headers: CORS });
    return Response.json({ done: action }, { headers: CORS });
  };

  if (body.member) {
    if (!a || !['suspend', 'ban', 'unban'].includes(a) || !bearer.startsWith('Bearer ')) {
      return Response.json({ error: 'invalid' }, { status: 400, headers: CORS });
    }
    const allowed = await asAdmin().rpc('admin_authorize_member_action', { p_user_id: body.member, p_action: a, p_reason: body.why ?? '' });
    if (allowed.error || !allowed.data) {
      return Response.json({ error: allowed.error?.message ?? 'forbidden', hint: allowed.error?.hint ?? null }, { status: 403, headers: CORS });
    }
    const ok = allowed.data as { actor: string; reason: string };
    return runAction(body.member, a, ok.actor, ok.reason, null);
  }

  if (!r || !a || !(a in BAN_FOR) || !bearer.startsWith('Bearer ')) {
    return Response.json({ error: 'invalid' }, { status: 400, headers: CORS });
  }
  const allowed = await asAdmin().rpc('admin_authorize_report_action', { p_report_id: r, p_action: a, p_reason: body.why ?? '' });
  if (allowed.error || !allowed.data) {
    return Response.json({ error: allowed.error?.message ?? 'forbidden', hint: allowed.error?.hint ?? null }, { status: 403, headers: CORS });
  }
  const admin = allowed.data as { actor: string; reason: string };
  const report = await client.from('reports').select('subject_id').eq('id', r).single();
  if (report.error || !report.data) return Response.json({ error: 'Report not found' }, { status: 404, headers: CORS });
  return runAction(report.data.subject_id, a, admin.actor, admin.reason, r);
});
