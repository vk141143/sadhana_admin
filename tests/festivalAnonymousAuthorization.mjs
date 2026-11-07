import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../src/services/supabaseClient.ts', import.meta.url), 'utf8');
const url = /supabaseUrl = '([^']+)'/.exec(source)[1];
const key = /supabaseAnonKey = '([^']+)'/.exec(source)[1];
for (const [name, body] of Object.entries({
  save_festival_wizard: { p_id: null, p_festival: { name: 'Must never be created', slug: 'unauthorized-verification' } },
  set_festival_cover: { p_festival_id: '00000000-0000-0000-0000-000000000000', p_media_id: '00000000-0000-0000-0000-000000000000' },
})) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  assert.equal(result.code, '42501');
  assert.ok([401,403].includes(response.status));
  console.log(JSON.stringify({ function: name, http: response.status, code: result.code, result: 'anonymous mutation rejected' }));
}
