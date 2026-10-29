export type AdminProfile = { id: string; full_name: string; email: string; role: string; is_active: boolean };
export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Preserve the repository's Supabase Auth mapping. This is NOT a Firebase UID mapping.
export async function resolveAdmin(userClient: any, db: any, authorization: string, write = false): Promise<AdminProfile> {
  if (!/^Bearer\s+\S+$/i.test(authorization)) throw new AccessError(401, 'Authentication required.');
  const { data, error } = await userClient.auth.getUser();
  const user = data?.user;
  if (error || !user) throw new AccessError(401, 'Authentication required.');
  if (!user.email || !user.email_confirmed_at) throw new AccessError(403, 'A verified administrator account is required.');
  const result = await db.from('admin_users').select('id,full_name,email,role,is_active').eq('email', user.email.toLowerCase()).maybeSingle();
  if (result.error) throw new AccessError(503, 'Administrator verification is unavailable.');
  const admin = result.data;
  if (!admin || admin.is_active !== true || !['viewer', 'editor', 'super_admin'].includes(admin.role)) {
    throw new AccessError(403, 'Administrator access has not been approved.');
  }
  if (write && !['editor', 'super_admin'].includes(admin.role)) throw new AccessError(403, 'This operation requires an editor or super administrator.');
  return admin;
}
