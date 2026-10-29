import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAdmin } from './adminPolicy.ts';
export async function requireAdmin(request: Request, write = false) {
  const authorization = request.headers.get('Authorization') || '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const admin = await resolveAdmin(userClient, db, authorization, write);
  const { data: { user } } = await userClient.auth.getUser();
  return { admin, db, user };
}
