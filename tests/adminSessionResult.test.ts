import test from 'node:test';
import assert from 'node:assert/strict';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { readAdminSession } from '../src/services/adminSessionResult.ts';
import { resolveAdmin } from '../supabase/functions/_shared/adminPolicy.ts';

test('missing deployed function is a deployment error, not an account approval error', () => {
  const response = new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Requested function was not found' }), { status: 404 });
  assert.throws(() => readAdminSession({ data: null, error: new FunctionsHttpError(response) }), /not deployed.*HTTP 404/);
});

for (const [status, message] of [[401, /sign in again/], [403, /access was denied/], [503, /temporarily unavailable/]] as const) {
  test(`classifies HTTP ${status} without leaking raw response text`, () => {
    assert.throws(() => readAdminSession({ data: null, error: new Error('internal secret'), response: new Response('internal secret', { status }) }), message);
  });
}
test('network/provider failures never become success', () => {
  assert.throws(() => readAdminSession({ data: null, error: new TypeError('fetch failed') }), /Check your connection/);
});
test('malformed or unknown-role success payloads fail closed', () => {
  for (const data of [null, {}, { role: 'owner', name: 'Admin', email: 'admin@example.org' }, { role: 'super_admin' }]) {
    assert.throws(() => readAdminSession({ data, error: null }), /invalid response/);
  }
});

test('confirmed active admin resolves despite different auth/admin IDs and password marker', async () => {
  const admin = { id: 'admin-record-id', full_name: 'Admin', email: 'admin@example.org', role: 'super_admin', is_active: true, password_hash: 'managed_by_supabase_auth' };
  const userClient = { auth: { getUser: async () => ({ data: { user: { id: 'different-auth-id', email: admin.email, email_confirmed_at: '2026-01-01' } }, error: null }) } };
  const db = { from: () => ({ select: (columns: string) => {
    assert.equal(columns.includes('password_hash'), false);
    return { eq: (column: string, value: string) => {
      assert.equal(column, 'email');
      assert.equal(value, admin.email);
      return { maybeSingle: async () => ({ data: admin, error: null }) };
    } };
  } }) };
  const resolved = await resolveAdmin(userClient, db, 'Bearer verified-token');
  assert.deepEqual(readAdminSession({ data: { name: resolved.full_name, email: resolved.email, role: resolved.role }, error: null }), {
    name: 'Admin', email: 'admin@example.org', role: 'super_admin',
  });
});

test('authentication-provider exception prevents any admin lookup', async () => {
  const userClient = { auth: { getUser: async () => { throw new Error('provider unavailable'); } } };
  await assert.rejects(resolveAdmin(userClient, { from: () => assert.fail('must not query admin before verifying user') }, 'Bearer token'), /provider unavailable/);
});
