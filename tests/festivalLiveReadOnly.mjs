// Optional deployed-schema smoke check. GET only: no festival writes or uploads.
import { readFileSync } from 'node:fs';
const client = readFileSync(new URL('../src/services/supabaseClient.ts', import.meta.url), 'utf8');
const url = /supabaseUrl = '([^']+)'/.exec(client)[1];
const key = /supabaseAnonKey = '([^']+)'/.exec(client)[1];
const validation = readFileSync(new URL('../src/services/festivalValidation.ts', import.meta.url), 'utf8');
const fields = name => [...new RegExp(`export const ${name} = \\[([^\\]]+)`).exec(validation)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const tables = {
  festivals: ['id', 'status', ...fields('festivalFields')],
  festival_occurrences: ['id', 'festival_id', 'status', ...fields('occurrenceFields')],
  festival_content: ['id', 'festival_id', 'occurrence_id', ...fields('contentFields')],
  festival_settings: ['id', 'festival_id', ...fields('settingsFields')],
  festival_media: ['id','festival_id','occurrence_id','media_type','r2_key','storage_key','public_url','file_name','mime_type','file_size','sort_order','display_order','is_cover','title','description','language_code','alt_text','caption','duration_seconds','created_by'],
};
for (const [table, columns] of Object.entries(tables)) {
  const response = await fetch(`${url}/rest/v1/${table}?select=${columns.join(',')}&limit=0`, { headers, signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  console.log(JSON.stringify({ table, http: response.status, ...(response.ok ? { columns: 'available' } : { code: data.code, message: data.message }) }));
}
const stateResponse = await fetch(`${url}/rest/v1/festivals?select=wizard_state&limit=0`, { headers, signal: AbortSignal.timeout(15000) });
const stateData = await stateResponse.json();
console.log(JSON.stringify({ check: 'draft resume column', http: stateResponse.status, ...(stateResponse.ok ? { available: true } : { message: stateData.message }) }));
const response = await fetch(`${url}/rest/v1/festivals?select=id&or=(status.neq.Published,is_active.eq.false)&limit=1`, { headers, signal: AbortSignal.timeout(15000) });
const rows = await response.json();
console.log(JSON.stringify({ check: 'anonymous hidden parent rows', http: response.status, exposed: Array.isArray(rows) ? rows.length : 'unknown' }));
