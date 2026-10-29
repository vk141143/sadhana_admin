import { supabase } from './supabaseClient';
import { readAdminSession, type AdminSession } from './adminSessionResult';
export type { AdminSession } from './adminSessionResult';
export async function verifyAdminSession(): Promise<AdminSession> {
  return readAdminSession(await supabase.functions.invoke('admin-session'));
}
