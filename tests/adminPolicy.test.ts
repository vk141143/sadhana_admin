import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAdmin, AccessError } from '../supabase/functions/_shared/adminPolicy.ts';

const verified = { email: 'Admin@Example.org', email_confirmed_at: '2026-01-01', id: 'auth-id' };
function clients({ user = verified as any, authError = null as any, role = 'editor', active = true, missing = false, dbError = null as any } = {}) {
  let filter: unknown[] = [];
  const userClient = { auth: { getUser: async () => ({ data: { user }, error: authError }) } };
  const db = { from: (table: string) => {
    assert.equal(table, 'admin_users');
    return { select: (columns: string) => {
      assert.ok(!columns.includes('password'));
      return { eq: (...values: unknown[]) => { filter = values; return { maybeSingle: async () => ({ data: missing ? null : { id: 'admin-id', role, is_active: active }, error: dbError }) }; } };
    } };
  } };
  return { userClient, db, filter: () => filter };
}
for (const [label, options, write, status] of [
  ['missing user', { user: null }, false, 401],
  ['invalid token', { authError: {} }, false, 401],
  ['unconfirmed email', { user: { ...verified, email_confirmed_at: null } }, false, 403],
  ['no email', { user: { ...verified, email: null } }, false, 403],
  ['customer', { missing: true }, false, 403],
  ['inactive editor', { active: false }, true, 403],
  ['unknown role', { role: 'owner' }, false, 403],
  ['viewer write', { role: 'viewer' }, true, 403],
  ['database failure', { dbError: {} }, false, 503],
] as const) {
  test(`rejects ${label}`, async () => {
    const c = clients(options);
    await assert.rejects(resolveAdmin(c.userClient, c.db, 'Bearer verified-token', write), (error: any) => error instanceof AccessError && error.status === status);
  });
}
for (const role of ['viewer', 'editor', 'super_admin']) {
  test(`allows active ${role} read with verified identity`, async () => {
    const c = clients({ role });
    assert.equal((await resolveAdmin(c.userClient, c.db, 'Bearer token')).role, role);
    assert.deepEqual(c.filter(), ['email', 'admin@example.org']);
  });
}
for (const role of ['editor', 'super_admin']) {
  test(`allows active ${role} write`, async () => {
    const c = clients({ role });
    assert.equal((await resolveAdmin(c.userClient, c.db, 'Bearer token', true)).id, 'admin-id');
  });
}
test('missing bearer credentials fail before database access', async () => {
  await assert.rejects(resolveAdmin({}, {}, ''), (error: any) => error.status === 401);
});
