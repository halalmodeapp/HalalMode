import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ALLOWED_ORIGINS = new Set([
  'https://halalmo.de',
  'https://www.halalmo.de',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
]);

function headers(request: Request): Headers {
  const origin = request.headers.get('origin') ?? '';
  const response = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  });
  if (ALLOWED_ORIGINS.has(origin)) response.set('Access-Control-Allow-Origin', origin);
  return response;
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(request) });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    const response = headers(request);
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'content-type');
    return new Response(null, { status: 204, headers: response });
  }
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json(request, { error: 'Method not allowed' }, 405);
  }

  let token = new URL(request.url).searchParams.get('token') ?? '';
  if (request.method === 'POST') {
    try {
      const body = await request.json() as { token?: unknown };
      if (typeof body.token === 'string') token = body.token;
    } catch {
      return json(request, { error: 'This waitlist link is invalid or expired.' }, 400);
    }
  }
  if (!/^[0-9a-f]{64}$/i.test(token.trim())) {
    return json(request, { error: 'This waitlist link is invalid or expired.' }, 400);
  }

  // Opening a link (GET) only reads, because email scanners open links on
  // arrival. Confirming takes the page's Confirm button (POST).
  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const result = request.method === 'POST'
    ? await client.rpc('verify_waitlist_token', { p_token: token.trim() })
    : await client.rpc('waitlist_token_status', { p_token: token.trim() });
  if (result.error) {
    const clientError = result.error.code === '22023' || result.error.code === 'P0002';
    return json(
      request,
      { error: clientError ? 'This waitlist link is invalid or expired.' : 'Verification is temporarily unavailable.' },
      clientError ? 400 : 503,
    );
  }
  return json(request, result.data);
});
