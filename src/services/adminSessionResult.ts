export type AdminSession = { name: string; email: string; role: 'viewer' | 'editor' | 'super_admin' };

type InvocationResult = { data: unknown; error: unknown; response?: Response };

/** Classify transport failures without presenting deployment problems as account rejection. */
export function readAdminSession({ data, error, response }: InvocationResult): AdminSession {
  const context = error && typeof error === 'object' && 'context' in error ? error.context : undefined;
  const status = response?.status ?? (context instanceof Response ? context.status : undefined);
  if (error || (status !== undefined && status >= 400)) {
    if (status === 404) throw new Error('Administrator verification service is not deployed (admin-session, HTTP 404). Ask the project maintainer to deploy it to this Supabase project.');
    if (status === 401) throw new Error('Your authentication session could not be verified. Please sign in again.');
    if (status === 403) throw new Error('Administrator access was denied. Your account must be confirmed, active and approved.');
    if (status !== undefined && status >= 500) throw new Error('Administrator verification service is temporarily unavailable. Please try again later.');
    throw new Error('Unable to reach the administrator verification service. Check your connection and try again.');
  }
  if (!data || typeof data !== 'object' || !('role' in data) ||
      !['viewer', 'editor', 'super_admin'].includes(String(data.role)) ||
      !('name' in data) || typeof data.name !== 'string' ||
      !('email' in data) || typeof data.email !== 'string') {
    throw new Error('Administrator verification returned an invalid response. Contact the project maintainer.');
  }
  return { name: data.name, email: data.email, role: data.role as AdminSession['role'] };
}
