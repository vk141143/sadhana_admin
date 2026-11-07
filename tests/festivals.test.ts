import test from 'node:test';
import assert from 'node:assert/strict';
import { supabase } from '../src/services/supabaseClient';
import { saveFestivalWizard, fetchFestivalFull, insertFestivalMedia, upsertContent } from '../src/services/festivalService';
import { validateFestival, festivalTime, type FestivalDraft } from '../src/services/festivalValidation';
import { validateFestivalMedia, festivalMediaRules, festivalUploadIdentity } from '../src/services/festivalMediaValidation';
import { uploadFestivalMediaToR2, uploadFestivalJsonToR2 } from '../src/services/r2Client';

const draft = (): FestivalDraft => ({ festival: { name: 'Test Festival', slug: 'test-festival', short_description: 'Description', festival_type: 'Major Festival' }, occurrence: { year: 2026 }, content: {}, settings: {} });
type Call = { table: string; ops: [string, ...any[]][] };
function database(t: any, respond: (call: Call) => any, rpc: any = { data: null, error: { code: 'PGRST202' } }) {
  const calls: Call[] = [];
  t.mock.method(supabase, 'rpc', async () => rpc);
  t.mock.method(supabase, 'from', (table: string) => {
    const call: Call = { table, ops: [] };
    const builder: any = new Proxy({}, { get: (_, prop: string) => prop === 'then'
      ? (resolve: any, reject: any) => { calls.push(call); return Promise.resolve(respond(call)).then(resolve, reject); }
      : (...args: any[]) => { call.ops.push([prop, ...args]); return builder; } });
    return builder;
  });
  return calls;
}
const op = (c: Call, name: string) => c.ops.find(o => o[0] === name);

test('draft can omit date, publish cannot; validates dates, years, ranges and settings', () => {
  const d = draft();
  assert.deepEqual(validateFestival(d), []);
  assert.ok(validateFestival(d, true).some(e => e.field === 'festival_date'));
  d.occurrence = { year: 2026.5, festival_date: '2026-02-30', custom_timings: [{ name: 'Puja', start: '14:00', end: '13:00', description: '' }] };
  d.settings.show_from = '2026-02-30';
  assert.deepEqual(new Set(validateFestival(d).map(e => e.field)), new Set(['year','festival_date','custom_timings.0','show_from']));
  assert.equal(festivalTime('2026-11-07T04:00:00Z'), '09:30');
});

test('RPC validation, authorization and transport errors never fall back to writes', async t => {
  for (const code of ['42501','23505','PGRST301','57014']) {
    const calls = database(t, () => { throw Error('Unexpected write'); }, { error: { code, message: 'Rejected' } });
    await assert.rejects(saveFestivalWizard(null, draft(), 'Draft', 1));
    assert.equal(calls.length, 0);
    t.mock.restoreAll();
  }
});

test('RPC successful save returns actual ID and retains it for caller', async t => {
  let id = '';
  const calls = database(t, () => null, { data: 'database-id', error: null });
  assert.equal(await saveFestivalWizard(null, draft(), 'Draft', 2, value => { id = value; }), 'database-id');
  assert.equal(id, 'database-id');
  assert.equal(calls.length, 0);
});

test('missing RPC fallback updates parent, saves partial draft without inventing date and uses settings conflict key', async t => {
  const calls = database(t, c => ({ data: c.table === 'festival_content' && !op(c,'insert') ? [] : { id: 'parent-id' }, error: null }));
  await saveFestivalWizard('parent-id', draft(), 'Draft', 4);
  assert.equal(calls.some(c => c.table === 'festival_occurrences'), false);
  const parent = calls.filter(c => c.table === 'festivals');
  assert.equal(op(parent[0], 'update')?.[1].name, 'Test Festival');
  assert.equal(op(parent.at(-1)!, 'update')?.[1].wizard_state.step, 4);
  assert.equal(op(parent.at(-1)!, 'update')?.[1].wizard_state.occurrence_draft.year, 2026);
  assert.equal(op(calls.find(c => c.table === 'festival_settings')!, 'upsert')?.[2].onConflict, 'festival_id');
});

test('partial child failure retains newly created ID for safe retry', async t => {
  let retained = '';
  database(t, c => c.table === 'festival_content' ? { error: { message: 'offline' } } : { data: { id: 'new-parent' }, error: null });
  await assert.rejects(saveFestivalWizard(null, draft(), 'Draft', 1, id => { retained = id; }));
  assert.equal(retained, 'new-parent');
});

test('content lookup failure aborts; another occurrence content is never overwritten', async t => {
  let calls = database(t, () => ({ error: { message: 'offline' } }));
  await assert.rejects(upsertContent('parent', {}, 'new-occurrence'));
  assert.equal(calls.length, 1);
  t.mock.restoreAll();
  calls = database(t, c => ({ data: op(c,'insert') ? { id: 'new-content' } : [{ id: 'old-content', occurrence_id: 'old-occurrence' }], error: null }));
  await upsertContent('parent', { festival_description: 'New' }, 'new-occurrence');
  assert.ok(op(calls[1], 'insert'));
});

test('resume loads all occurrences and restores saved occurrence and its content', async t => {
  database(t, c => ({ error: null, data: ({
    festivals: { id: 'parent', wizard_state: { occurrence_id: 'older' }, cover_media_id: 'cover' },
    festival_occurrences: [{ id: 'newer', year: 2027 }, { id: 'older', year: 2026 }],
    festival_content: [{ id: 'c1', occurrence_id: 'newer' }, { id: 'c2', occurrence_id: 'older' }],
    festival_media: [{ id: 'cover', public_url: 'https://media.example/cover' }], festival_settings: { priority: 3 },
  } as any)[c.table] }));
  const full = await fetchFestivalFull('parent');
  assert.equal(full.occurrences?.length, 2);
  assert.equal(full.occurrence?.id, 'older');
  assert.equal(full.content?.id, 'c2');
  assert.equal(full.banner_url, 'https://media.example/cover');
});

test('media metadata retry reuses existing reference', async t => {
  const calls = database(t, () => ({ data: { id: 'existing-media' }, error: null }));
  const item = await insertFestivalMedia('parent', { r2_key: 'retained-key' } as any);
  assert.equal(item.id, 'existing-media');
  assert.equal(calls.length, 1);
  assert.equal(op(calls[0], 'insert'), undefined);
});

test('all supported media limits and folder restrictions are checked before upload', () => {
  for (const [mime, rule] of Object.entries(festivalMediaRules)) {
    assert.doesNotThrow(() => validateFestivalMedia(mime, rule.limit, rule.folder));
    assert.throws(() => validateFestivalMedia(mime, rule.limit + 1, rule.folder));
    assert.throws(() => validateFestivalMedia(mime, 0, rule.folder));
    assert.throws(() => validateFestivalMedia(mime, 1, 'invalid'));
  }
  assert.throws(() => validateFestivalMedia('image/svg+xml', 100));
  assert.throws(() => festivalUploadIdentity('festivals/test/2026/images/../x.jpg'));
});

test('successful binary and JSON uploads are reused on metadata retry', async t => {
  let requests = 0;
  t.mock.method(supabase.auth, 'getSession', async () => ({ data: { session: { access_token: 'test' } }, error: null }) as any);
  const previous = globalThis.XMLHttpRequest;
  class Request {
    upload = {}; status = 200; responseText = JSON.stringify({ url: 'https://media.example/test' }); onload!: () => void;
    open() {} setRequestHeader() {} send() { requests++; this.onload(); }
  }
  globalThis.XMLHttpRequest = Request as any;
  t.after(() => { globalThis.XMLHttpRequest = previous; });
  const file = new File(['image-bytes'], 'cover.png', { type: 'image/png' });
  const first = await uploadFestivalMediaToR2(file, 'festival', 'image', 2026);
  const retry = await uploadFestivalMediaToR2(new File(['image-bytes'], 'cover.png', { type: 'image/png' }), 'festival', 'image', 2026);
  assert.deepEqual(first, retry);
  await uploadFestivalJsonToR2({ sections: [] }, 'festival', 'story', 2026);
  await uploadFestivalJsonToR2({ sections: [] }, 'festival', 'story', 2026);
  assert.equal(requests, 2);
});

test('all nine steps send dedicated payloads, preserve nested fields and exclude client-only data', async t => {
  const d = draft();
  d.occurrence = { year: 2026, festival_date: '2026-11-07', nakshatra_name: 'Rohini', yoga_name: 'Harshana', fasting_enabled: true, fasting_rules: 'Water permitted', custom_timings: [{ name: 'Puja', start: '06:00', end: '07:00', description: 'Morning' }] };
  d.content = { festival_story: [{ title: 'Story', content: 'Text' }], puja_samagri: [{ item: 'Flowers', quantity: '5', required: true }], related_mantras: [{ id: 'reference', title: 'Mantra' }], story_r2_url: 'https://media.example/story.json' };
  (d.festival as any).banner_url = 'client-only';
  const payloads: any[] = [];
  t.mock.method(supabase, 'rpc', async (_name: string, payload: any) => { payloads.push(payload); return { data: 'parent', error: null }; });
  for (let step = 1; step <= 9; step++) await saveFestivalWizard('parent', d, 'Draft', step);
  assert.deepEqual(payloads.map(p => p.p_step), [1,2,3,4,5,6,7,8,9]);
  for (const p of payloads) {
    assert.deepEqual(p.p_content, d.content);
    assert.deepEqual(p.p_occurrence, d.occurrence);
    assert.equal(p.p_festival.banner_url, undefined);
  }
});

test('repeated fallback edits update existing occurrence/content and publish children before parent', async t => {
  const d = draft();
  d.occurrence = { id: 'occ', year: 2026, festival_date: '2026-11-07' };
  d.content = { id: 'content', festival_description: 'Edited' };
  const calls = database(t, c => ({ error: null, data: c.table === 'festival_content' && !op(c,'update')
    ? [{ id: 'content', occurrence_id: 'occ' }]
    : { id: c.table === 'festival_occurrences' ? 'occ' : 'parent' } }));
  await saveFestivalWizard('parent', d, 'Published', 9);
  await saveFestivalWizard('parent', d, 'Published', 9);
  assert.equal(calls.some(c => op(c,'insert')), false);
  const occWrites = calls.filter(c => c.table === 'festival_occurrences' && op(c,'update'));
  assert.equal(occWrites.length, 2);
  assert.equal(op(occWrites[0], 'update')?.[1].status, 'published');
  const final = calls.at(-1)!;
  assert.equal(final.table, 'festivals');
  assert.equal(op(final, 'update')?.[1].status, 'Published');
});

test('archive fallback preserves relationships and assigns archived occurrence status', async t => {
  const d = draft();
  d.occurrence = { id: 'occ', year: 2026, festival_date: '2026-11-07' };
  const calls = database(t, c => ({ error: null, data: c.table === 'festival_content' && !op(c,'insert') ? [] : { id: 'occ' } }));
  await saveFestivalWizard('parent', d, 'Archived', 9);
  assert.equal(calls.some(c => op(c,'delete')), false);
  assert.equal(op(calls.find(c => c.table === 'festival_occurrences' && op(c,'update'))!, 'update')?.[1].status, 'archived');
  assert.equal(op(calls.at(-1)!, 'update')?.[1].status, 'Archived');
});
