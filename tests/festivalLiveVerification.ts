/** Explicit live verification only; never included in npm test.
 * Bootstrap/disable a dedicated account using CLI-held credentials in memory.
 * All festival operations use a real password-authenticated editor session.
 * Retain archived fixtures and R2 objects; never delete production records.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from '../src/services/supabaseClient';
import { saveFestivalWizard, fetchFestivalFull, insertFestivalMedia, setCoverMedia } from '../src/services/festivalService';
import { uploadFestivalMediaToR2 } from '../src/services/r2Client';
import type { FestivalDraft } from '../src/services/festivalValidation';

const report: any = { started_at: new Date().toISOString(), mode: 'live authenticated API verification; not browser automation', checks: [], fixtures: {} };
const secrets: string[] = [];
const safe = (value: unknown) => secrets.reduce((s, key) => key ? s.replaceAll(key, '[REDACTED]') : s, String(value));
const checkpoint = (name: string, result: string, details: any = {}) => {
  const row = { name, result, ...details };
  report.checks.push(row);
  console.log(JSON.stringify(row));
  writeFileSync('tests/festivalLiveResults.json', JSON.stringify(report, null, 2));
};
function requireResult<T extends { error: any; data: any }>(result: T): T['data'] {
  if (result.error) throw new Error(safe(`${result.error.code || ''} ${result.error.message}`));
  return result.data;
}
const project = readFileSync('supabase/.temp/project-ref', 'utf8').trim();
assert.equal(new URL(supabaseUrl).hostname, `${project}.supabase.co`);
const cli = join(process.env.APPDATA!, 'npm/node_modules/supabase/dist/supabase.js');
let raw: string;
try {
  raw = execFileSync(process.execPath, [cli, 'projects', 'api-keys', '--project-ref', project, '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
} catch { throw new Error('CLI credential lookup failed; credential output suppressed.'); }
function objects(value: any): any[] {
  if (!value || typeof value !== 'object') return [];
  return [value, ...Object.values(value).flatMap(objects)];
}
const serviceEntry = objects(JSON.parse(raw)).find(entry => entry.name === 'service_role' && typeof entry.api_key === 'string');
if (!serviceEntry) throw new Error('No service credential available through the authenticated CLI.');
const serviceKey = serviceEntry.api_key;
secrets.push(serviceKey);
raw = '';
const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const customer = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
let authId: string | undefined;
let festivalId: string | undefined;
let email = '';
let session: any;
const run = `${Date.now()}-${randomBytes(3).toString('hex')}`;
let stage = 'account bootstrap';
let requests = 0;
let invalidUploadOnce = false;
const uploadStatuses: number[] = [];

// Native fetch adapter for the browser XHR transport; requests reach the live Edge Function.
class LiveXHR {
  headers: Record<string, string> = {}; upload: any = {}; status = 0; responseText = ''; timeout = 180000;
  onload: any; onerror: any; ontimeout: any; method = ''; url = '';
  open(method: string, url: string) { this.method = method; this.url = url; }
  setRequestHeader(name: string, value: string) { this.headers[name] = value; }
  async send(file: File) {
    requests++;
    if (invalidUploadOnce) { this.headers.Authorization = 'Bearer invalid-verification-token'; invalidUploadOnce = false; }
    try {
      const response = await fetch(this.url, { method: this.method, headers: this.headers, body: file, signal: AbortSignal.timeout(this.timeout) });
      this.status = response.status; uploadStatuses.push(response.status);
      this.responseText = await response.text();
      this.upload.onprogress?.({ lengthComputable: true, loaded: file.size, total: file.size });
      this.onload?.();
    } catch { this.onerror?.(); }
  }
}
globalThis.XMLHttpRequest = LiveXHR as any;
const draft: FestivalDraft = {
  festival: { name: `Festival deployment verification ${run}`, alternate_name: 'Verification fixture', slug: `festival-verification-${run}`, festival_type: 'Other', primary_deity: 'Verification', associated_deities: [{ name: 'Verification', role: 'test' }], tradition: 'general', short_description: 'Temporary deployment verification fixture. Not editorial content.', is_active: false },
  occurrence: { year: 2026 }, content: {},
  settings: { show_on_home: false, is_featured: false, show_in_calendar: false, priority: 0, show_from: null, show_until: null },
};
const equalField = (actual: any, expected: any, key: string) => {
  if (expected === undefined) return;
  if (typeof expected === 'string' && /T\d\d:\d\d/.test(expected)) assert.equal(Date.parse(actual), Date.parse(expected), key);
  else assert.deepEqual(actual, expected, key);
};
async function verifyRestored(step: number) {
  const full = await fetchFestivalFull(festivalId!);
  for (const [part, expected] of Object.entries(draft)) {
    const actual = part === 'festival' ? full : (full as any)[part];
    for (const [key, value] of Object.entries(expected)) {
      if (part === 'content' && key === 'occurrence_id') continue;
      equalField(actual?.[key], value, `${part}.${key}`);
    }
  }
  assert.equal(full.content?.occurrence_id, full.occurrence?.id ?? null, 'content links to the saved occurrence');
  assert.equal((full as any).wizard_state.step, step);
  if (full.occurrence?.id) draft.occurrence.id = full.occurrence.id;
  if (full.content?.id) { draft.content.id = full.content.id; draft.content.occurrence_id = full.content.occurrence_id; }
  return full;
}
async function anonymousRows(table: string) {
  return requireResult(await customer.from(table).select('*').eq(table === 'festivals' ? 'id' : 'festival_id', festivalId!));
}
try {
  email = `festival-verification-${run}@example.com`;
  const password = randomBytes(32).toString('base64url') + 'aA1!'; secrets.push(password);
  const account = requireResult(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Festival deployment verification' } }));
  authId = account.user.id;
  report.fixtures.auth_user_id = authId;
  requireResult(await service.from('admin_users').update({ role: 'editor', is_active: true }).eq('email', email).select('id').single());
  session = requireResult(await supabase.auth.signInWithPassword({ email, password })).session;
  secrets.push(session.access_token, session.refresh_token);
  assert.ok(session?.access_token);
  checkpoint('Authenticated editor login', 'PASS', { auth_user_id: authId });

  stage = 'nine step draft saves and restores';
  for (let step = 1; step <= 9; step++) {
    if (step === 2) Object.assign(draft.occurrence, { festival_date: '2026-11-08', tithi_name: 'Ashtami', paksha: 'Shukla Paksha', nakshatra_name: 'Rohini', yoga_name: 'Harshana' });
    if (step === 3) {
      for (const prefix of ['shubha_muhurta','puja_time','rahu_kalam','yamagandam','gulika_kalam']) Object.assign(draft.occurrence, { [`${prefix}_start`]: '2026-11-08T06:00:00+05:30', [`${prefix}_end`]: '2026-11-08T07:00:00+05:30' });
      draft.occurrence.custom_timings = [{ name: 'Verification timing', start: '08:00', end: '09:00', description: 'Test description' }];
    }
    if (step === 4) Object.assign(draft.occurrence, { fasting_enabled: true, fasting_type: 'Partial', parana_required: true, parana_time: '2026-11-08T09:00:00+05:30', fasting_rules: 'Verification rules' });
    if (step === 5) Object.assign(draft.content, { festival_description: 'Full verification description', spiritual_significance: 'Verification significance', festival_story: [{ title: 'Story', content: 'Verification narrative' }], scriptural_references: [{ reference: 'Verification reference', text: 'Verification text' }] });
    if (step === 6) Object.assign(draft.content, { puja_name: 'Verification puja', puja_duration_minutes: 30, puja_description: 'Verification description', puja_samagri: [{ item: 'Flowers', quantity: '5', required: true }], puja_vidhi: [{ title: 'Preparation', content: 'Verification instructions' }] });
    if (step === 7) for (const key of ['related_scriptures','related_slokas','related_mantras','related_stotrams','related_music','related_stories']) (draft.content as any)[key] = [{ id: '', title: `Verification ${key}` }];
    if (step === 8) Object.assign(draft.settings, { priority: 7, show_from: '2026-11-07', show_until: '2026-11-09' });
    festivalId = await saveFestivalWizard(festivalId ?? null, draft, 'Draft', step);
    report.fixtures.festival_id = festivalId;
    await verifyRestored(step);
    checkpoint(`Step ${step} save and restore`, 'PASS', { festival_id: festivalId });
  }
  assert.equal((await anonymousRows('festivals')).length, 0);
  checkpoint('Draft hidden from anonymous customer', 'PASS');

  stage = 'authenticated repeated edits';
  draft.festival.alternate_name = 'Edited verification fixture';
  for (let i = 0; i < 3; i++) await saveFestivalWizard(festivalId!, draft, 'Draft', 9);
  await verifyRestored(9);
  const counts: Record<string, number> = {};
  for (const table of ['festival_occurrences', 'festival_content', 'festival_settings']) {
    const result = await supabase.from(table).select('id', { count: 'exact' }).eq('festival_id', festivalId!);
    requireResult(result); assert.equal(result.count, 1, table); counts[table] = result.count!;
  }
  checkpoint('Repeated authenticated edits without duplicate children', 'PASS', { counts });

  stage = 'database validation failure and retry';
  const before = await fetchFestivalFull(festivalId!);
  const rejected = await supabase.rpc('save_festival_wizard', { p_id: festivalId, p_festival: { ...draft.festival, name: 'Must roll back' }, p_occurrence: draft.occurrence, p_content: draft.content, p_settings: { ...draft.settings, priority: -1 }, p_status: 'Draft', p_step: 9 });
  assert.ok(rejected.error, 'invalid settings must fail on server');
  assert.equal((await fetchFestivalFull(festivalId!)).name, before.name);
  await saveFestivalWizard(festivalId!, draft, 'Draft', 9);
  checkpoint('Server persistence failure rollback and successful retry', 'PASS', { rejected_code: rejected.error?.code });

  stage = 'R2 authenticated upload and retry';
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
  const file = new File([bytes], 'festival-verification.png', { type: 'image/png' });
  invalidUploadOnce = true;
  await assert.rejects(uploadFestivalMediaToR2(file, festivalId!, 'image', 2026));
  checkpoint('Invalid-token upload rejected', 'PASS', { http: uploadStatuses.at(-1) });
  const uploaded = await uploadFestivalMediaToR2(file, festivalId!, 'image', 2026);
  report.fixtures.r2_key = uploaded.key; report.fixtures.public_url = uploaded.url;
  checkpoint('Actual authenticated R2 upload', 'PASS', { key: uploaded.key, url: uploaded.url, http: uploadStatuses.at(-1) });
  const publicResponse = await fetch(uploaded.url, { signal: AbortSignal.timeout(30000) });
  assert.equal(publicResponse.status, 200);
  const downloaded = Buffer.from(await publicResponse.arrayBuffer());
  assert.equal(createHash('sha256').update(downloaded).digest('hex'), createHash('sha256').update(bytes).digest('hex'));
  checkpoint('R2 public URL and stored object bytes', 'PASS', { http: publicResponse.status, bytes: downloaded.length, content_type: publicResponse.headers.get('content-type') });

  stage = 'media metadata persistence failure and retry';
  const metadata: any = { media_type: 'image', r2_key: uploaded.key, storage_key: uploaded.key, public_url: uploaded.url, file_name: file.name, mime_type: file.type, file_size: file.size, is_cover: false, sort_order: 0, display_order: 0, title: 'Verification cover', description: 'Retained deployment fixture', language_code: '', alt_text: 'Verification image', caption: 'Verification', duration_seconds: null, occurrence_id: null, created_by: null };
  stage = 'sign out for metadata authorization failure';
  await supabase.auth.signOut({ scope: 'local' });
  stage = 'anonymous metadata write rejection';
  await assert.rejects(insertFestivalMedia(festivalId!, metadata));
  checkpoint('Unauthenticated media metadata write rejected', 'PASS');
  stage = 'fresh login after metadata failure';
  session = requireResult(await supabase.auth.signInWithPassword({ email, password })).session;
  secrets.push(session.access_token, session.refresh_token);
  stage = 'media metadata persistence retry';
  const requestCount = requests;
  assert.deepEqual(await uploadFestivalMediaToR2(file, festivalId!, 'image', 2026), uploaded);
  assert.equal(requests, requestCount, 'metadata retry must not upload another object');
  const media = await insertFestivalMedia(festivalId!, metadata);
  assert.equal((await insertFestivalMedia(festivalId!, metadata)).id, media.id);
  await setCoverMedia(festivalId!, media.id);
  draft.festival.cover_media_id = media.id;
  await saveFestivalWizard(festivalId!, draft, 'Draft', 9);
  const restored = await fetchFestivalFull(festivalId!);
  const stored = restored.media.find(item => item.id === media.id)!;
  for (const key of ['r2_key','storage_key','public_url','file_name','mime_type','file_size','title','description','alt_text','caption']) assert.deepEqual(stored[key as keyof typeof stored], metadata[key]);
  assert.equal(restored.media.length, 1);
  assert.equal(restored.banner_url, uploaded.url);
  report.fixtures.media_id = media.id;
  checkpoint('Media metadata persistence failure and retry', 'PASS', { media_id: media.id, media_rows: restored.media.length, additional_upload_requests_on_retry: requests - requestCount });

  stage = 'publication and customer visibility';
  draft.festival.is_active = true;
  await saveFestivalWizard(festivalId!, draft, 'Published', 9);
  assert.equal((await anonymousRows('festivals')).length, 1);
  for (const table of ['festival_occurrences','festival_content','festival_media']) assert.equal((await anonymousRows(table)).length, 1, table);
  const visible = await anonymousRows('festivals');
  assert.equal(visible[0].cover_media_id, media.id);
  checkpoint('Published active festival and related customer data visible', 'PASS');
  draft.festival.is_active = false;
  await saveFestivalWizard(festivalId!, draft, 'Published', 9);
  assert.equal((await anonymousRows('festivals')).length, 0);
  assert.equal((await anonymousRows('festival_occurrences')).length, 0);
  checkpoint('Published inactive festival and occurrences hidden', 'PASS');
  await saveFestivalWizard(festivalId!, draft, 'Archived', 9);
  for (const table of ['festivals','festival_occurrences','festival_content','festival_media']) assert.equal((await anonymousRows(table)).length, 0, table);
  checkpoint('Archived festival and customer relationships hidden', 'PASS');
} catch (error) {
  checkpoint(stage, 'FAIL', { error: safe(error instanceof Error ? error.message : error) });
  process.exitCode = 1;
} finally {
  if (festivalId) {
    try {
      requireResult(await service.from('festivals').update({ status: 'Archived', is_active: false }).eq('id', festivalId));
      requireResult(await service.from('festival_occurrences').update({ status: 'archived' }).eq('festival_id', festivalId));
      checkpoint('Fixture retained archived and inactive', 'PASS', { festival_id: festivalId });
    } catch (error) { checkpoint('Fixture cleanup', 'FAIL', { error: safe(String(error)) }); process.exitCode = 1; }
  }
  if (authId) {
    try {
      requireResult(await service.from('admin_users').update({ is_active: false }).eq('email', email));
      requireResult(await service.auth.admin.updateUserById(authId, { ban_duration: '876000h', password: randomBytes(48).toString('base64url') }));
      await supabase.auth.signOut({ scope: 'local' });
      checkpoint('Verification account disabled and credentials invalidated', 'PASS', { auth_user_id: authId });
    } catch (error) { checkpoint('Account cleanup', 'FAIL', { error: safe(String(error)) }); process.exitCode = 1; }
  }
  report.finished_at = new Date().toISOString();
  report.unverified = ['Browser wizard interaction', 'Customer application UI rendering', 'Actual network outages and lost successful HTTP responses'];
  writeFileSync('tests/festivalLiveResults.json', JSON.stringify(report, null, 2));
}
