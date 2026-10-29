import { requireAdmin } from '../_shared/requireAdmin.ts';
import { AccessError } from '../_shared/adminPolicy.ts';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ error: 'A valid JSON request body is required.' }, 400);
  }

  const days = isRecord(body) ? body.days : undefined;
  if (days !== 7 && days !== 30 && days !== 90) {
    return reply({ error: 'Choose a supported dashboard period.' }, 400);
  }

  try {
    const { db } = await requireAdmin(request);
    const { data, error } = await db.rpc('admin_dashboard_metrics', { p_days: days });
    if (error || !isRecord(data)) {
      return reply({ error: 'Dashboard data is temporarily unavailable.' }, 503);
    }
    return reply(data);
  } catch (error) {
    if (error instanceof AccessError) return reply({ error: error.message }, error.status);
    return reply({ error: 'Dashboard data is temporarily unavailable.' }, 503);
  }
});
