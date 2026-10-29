import { requireAdmin } from '../_shared/requireAdmin.ts';
import { AccessError } from '../_shared/adminPolicy.ts';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405, headers });
  try {
    const { admin } = await requireAdmin(request);
    return new Response(JSON.stringify({ name: admin.full_name, email: admin.email, role: admin.role }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof AccessError ? error.message : 'Administrator verification is unavailable.' }), { status: error instanceof AccessError ? error.status : 503, headers });
  }
});
