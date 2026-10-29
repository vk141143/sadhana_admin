import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AccessError } from '../supabase/functions/_shared/adminPolicy.ts';
import {
  createSadhanaPracticesHandler,
  type SadhanaPractice,
  type SadhanaPracticeRepository,
} from '../supabase/functions/_shared/sadhanaPractices.ts';
import type { SadhanaPracticeInput, SadhanaPracticeUpdate } from '../src/types/sadhanaPractice.ts';
import {
  parsePracticeCreate,
  parsePracticeUpdate,
  SadhanaPracticeValidationError,
} from '../src/services/sadhanaPracticeValidation.ts';

const practiceId = 'd2a876b3-7810-4b26-81ad-b895584cb001';
const practiceRow: SadhanaPractice = {
  id: practiceId,
  name: 'Breath Meditation',
  slug: 'breath-meditation',
  description: 'Steady breathing practice',
  category: 'meditation',
  instructions: 'Sit comfortably and observe your breath.',
  target_count: null,
  duration_minutes: 10,
  media_type: null,
  media_url: null,
  display_order: 0,
  is_active: false,
  archived_at: null,
  created_at: '2026-10-18T10:00:00.000Z',
  updated_at: '2026-10-18T10:00:00.000Z',
};

function responseBody(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
}

function makeHarness(options: {
  user?: 'admin' | 'viewer' | 'customer' | 'anonymous';
  listError?: boolean;
  createError?: { code: string };
  validScripture?: boolean;
} = {}) {
  const rows = new Map<string, SadhanaPractice>();
  let nextId = 1;
  const repository: SadhanaPracticeRepository = {
    async list() {
      if (options.listError) return { data: null, error: { code: 'DB_ERROR' } };
      return { data: [...rows.values()], error: null };
    },
    async find(id) {
      return { data: rows.get(id) ?? null, error: null };
    },
    async create(input: SadhanaPracticeInput) {
      if (options.createError) return { data: null, error: options.createError };
      if ([...rows.values()].some(row => row.slug === input.slug)) {
        return { data: null, error: { code: '23505' } };
      }
      const created: SadhanaPractice = {
        ...practiceRow,
        ...input,
        id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
      };
      rows.set(created.id, created);
      return { data: created, error: null };
    },
    async update(id, input: SadhanaPracticeUpdate) {
      const previous = rows.get(id);
      if (!previous) return { data: null, error: null };
      const updated = { ...previous, ...input, updated_at: new Date().toISOString() };
      rows.set(id, updated);
      return { data: updated, error: null };
    },
    async archive(id) {
      const previous = rows.get(id);
      if (!previous || previous.archived_at) return { data: null, error: null };
      const archived = { ...previous, is_active: false, archived_at: new Date().toISOString() };
      rows.set(id, archived);
      return { data: archived, error: null };
    },
    async validateScriptureReference() {
      return { data: options.validScripture !== false, error: null };
    },
  };

  const handler = createSadhanaPracticesHandler({
    async authorize(request, write) {
      const user = options.user ?? 'admin';
      if (user === 'anonymous' || !request.headers.get('Authorization')) {
        throw new AccessError(401, 'Authentication required.');
      }
      if (user === 'customer') throw new AccessError(403, 'Administrator access has not been approved.');
      if (user === 'viewer' && write) {
        throw new AccessError(403, 'This operation requires an editor or super administrator.');
      }
      return repository;
    },
  });
  return { handler, rows };
}

const validInput = {
  name: 'Morning Japa',
  category: 'japa',
  instructions: 'Repeat the mantra with attention.',
  target_count: 108,
  duration_minutes: 15,
  display_order: 2,
};

test('lists persistent practice definitions from the repository', async () => {
  const { handler, rows } = makeHarness();
  rows.set(practiceId, practiceRow);
  const response = await handler(new Request('https://example.test/sadhana-practices', {
    headers: { Authorization: 'Bearer verified-token' },
  }));
  assert.equal(response.status, 200);
  assert.deepEqual((await responseBody(response)).practices, [practiceRow]);
});

test('creates a valid practice with a stable slug and inactive default', async () => {
  const { handler, rows } = makeHarness();
  const response = await handler(new Request('https://example.test/sadhana-practices', {
    method: 'POST',
    headers: { Authorization: 'Bearer verified-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(validInput),
  }));
  const body = await responseBody(response);
  assert.equal(response.status, 201);
  assert.equal(rows.size, 1);
  assert.equal((body.practice as SadhanaPractice).slug, 'morning-japa');
  assert.equal((body.practice as SadhanaPractice).is_active, false);
});

test('edits practice instructions and category without changing the definition ID', async () => {
  const { handler, rows } = makeHarness();
  rows.set(practiceId, practiceRow);
  const response = await handler(new Request(`https://example.test/sadhana-practices?id=${practiceId}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer verified-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'scripture_reading',
      instructions: 'Read one chapter.',
      category_config: { scripture_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    }),
  }));
  const result = (await responseBody(response)).practice as SadhanaPractice;
  assert.equal(response.status, 200);
  assert.equal(result.id, practiceId);
  assert.equal(result.category, 'scripture_reading');
  assert.equal(result.instructions, 'Read one chapter.');
});

test('persists uploaded media URL and kind on create, edit, and removal', async () => {
  const { handler, rows } = makeHarness();
  const uploadedUrl = 'https://media.example.test/sadhana-practices/practice-audio.mp3';
  const create = await handler(new Request('https://example.test/sadhana-practices', {
    method: 'POST',
    headers: { Authorization: '******', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...validInput,
      media_type: 'audio',
      media_url: uploadedUrl,
    }),
  }));
  const created = (await responseBody(create)).practice as SadhanaPractice;
  assert.equal(create.status, 201);
  assert.equal(created.media_type, 'audio');
  assert.equal(created.media_url, uploadedUrl);

  const replacementUrl = 'https://media.example.test/sadhana-practices/practice-image.webp';
  const update = await handler(new Request(`https://example.test/sadhana-practices?id=${created.id}`, {
    method: 'PATCH',
    headers: { Authorization: '******', 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: 'image', media_url: replacementUrl }),
  }));
  const replaced = (await responseBody(update)).practice as SadhanaPractice;
  assert.equal(update.status, 200);
  assert.equal(replaced.media_type, 'image');
  assert.equal(replaced.media_url, replacementUrl);

  const remove = await handler(new Request(`https://example.test/sadhana-practices?id=${created.id}`, {
    method: 'PATCH',
    headers: { Authorization: '******', 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: null, media_url: null }),
  }));
  const removed = (await responseBody(remove)).practice as SadhanaPractice;
  assert.equal(remove.status, 200);
  assert.equal(removed.media_type, null);
  assert.equal(removed.media_url, null);
  assert.equal(rows.size, 1);
});

test('activates and deactivates practices with server-validated status changes', async () => {
  const { handler, rows } = makeHarness();
  rows.set(practiceId, practiceRow);
  const endpoint = `https://example.test/sadhana-practices?id=${practiceId}`;
  const request = (is_active: boolean) => handler(new Request(endpoint, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer verified-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active }),
  }));
  assert.equal(((await responseBody(await request(true))).practice as SadhanaPractice).is_active, true);
  assert.equal(((await responseBody(await request(false))).practice as SadhanaPractice).is_active, false);
});

test('rejects invalid categories, numeric limits, unknown fields and malformed requests', async () => {
  const { handler, rows } = makeHarness();
  for (const value of [
    { ...validInput, category: 'pranayama' },
    { ...validInput, target_count: 0 },
    { ...validInput, media_url: 'javascript:alert(1)' },
    { ...validInput, is_admin: true },
  ]) {
    const response = await handler(new Request('https://example.test/sadhana-practices', {
      method: 'POST',
      headers: { Authorization: 'Bearer verified-token', 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    }));
    assert.equal(response.status, 400);
  }
  const invalidJson = await handler(new Request('https://example.test/sadhana-practices', {
    method: 'POST',
    headers: { Authorization: 'Bearer verified-token', 'Content-Type': 'application/json' },
    body: '{',
  }));
  assert.equal(invalidJson.status, 400);
  assert.equal(rows.size, 0);
});

test('reports unique slug conflicts as HTTP 409', async () => {
  const { handler } = makeHarness({ createError: { code: '23505' } });
  const response = await handler(new Request('https://example.test/sadhana-practices', {
    method: 'POST',
    headers: { Authorization: 'Bearer verified-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(validInput),
  }));
  assert.equal(response.status, 409);
  assert.match(String((await responseBody(response)).error), /slug is already in use/);
});

test('reports missing IDs for retrieve, update and archive', async () => {
  const { handler } = makeHarness();
  const missingId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const get = await handler(new Request(`https://example.test/sadhana-practices?id=${missingId}`, {
    headers: { Authorization: 'Bearer verified-token' },
  }));
  const update = await handler(new Request(`https://example.test/sadhana-practices?id=${missingId}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer verified-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Missing practice' }),
  }));
  const archive = await handler(new Request(`https://example.test/sadhana-practices?id=${missingId}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer verified-token' },
  }));
  assert.equal(get.status, 404);
  assert.equal(update.status, 404);
  assert.equal(archive.status, 404);
});

test('validates ID query parameters and archive requires no request body', async () => {
  const { handler, rows } = makeHarness();
  const invalidId = await handler(new Request('https://example.test/sadhana-practices?id=not-a-uuid', {
    headers: { Authorization: 'Bearer verified-token' },
  }));
  const missingId = await handler(new Request('https://example.test/sadhana-practices', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer verified-token' },
  }));
  rows.set(practiceId, practiceRow);
  const archive = await handler(new Request(`https://example.test/sadhana-practices?id=${practiceId}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer verified-token' },
  }));
  const archived = (await responseBody(archive)).practice as SadhanaPractice;
  assert.equal(invalidId.status, 400);
  assert.equal(missingId.status, 400);
  assert.equal(archive.status, 200);
  assert.equal(archived.is_active, false);
  assert.equal(archived.category, practiceRow.category);
  assert.equal(archived.instructions, practiceRow.instructions);
});

test('database failures return a safe unavailable response', async () => {
  const { handler } = makeHarness({ listError: true });
  const response = await handler(new Request('https://example.test/sadhana-practices', {
    headers: { Authorization: 'Bearer verified-token' },
  }));
  assert.equal(response.status, 503);
  assert.match(String((await responseBody(response)).error), /temporarily unavailable/);
});

test('rejects unauthenticated callers and authenticated non-admins before any write', async () => {
  for (const [user, expectedStatus] of [['anonymous', 401], ['customer', 403], ['viewer', 403]] as const) {
    const { handler, rows } = makeHarness({ user });
    const response = await handler(new Request('https://example.test/sadhana-practices', {
      method: 'POST',
      headers: { Authorization: 'Bearer untrusted-role', 'Content-Type': 'application/json' },
      body: JSON.stringify(validInput),
    }));
    assert.equal(response.status, expectedStatus);
    assert.equal(rows.size, 0);
  }
});

test('authorized editors can mutate and read; viewer is allowed read-only access', async () => {
  const { handler } = makeHarness({ user: 'admin' });
  const created = await handler(new Request('https://example.test/sadhana-practices', {
    method: 'POST',
    headers: { Authorization: 'Bearer verified-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(validInput),
  }));
  assert.equal(created.status, 201);

  const { handler: viewerHandler } = makeHarness({ user: 'viewer' });
  const read = await viewerHandler(new Request('https://example.test/sadhana-practices', {
    headers: { Authorization: 'Bearer verified-token' },
  }));
  assert.equal(read.status, 200);
});

test('definitions persist when a new request handler instance reads the same database', async () => {
  const { handler, rows } = makeHarness();
  const created = await handler(new Request('https://example.test/sadhana-practices', {
    method: 'POST',
    headers: { Authorization: 'Bearer verified-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(validInput),
  }));
  const id = ((await responseBody(created)).practice as SadhanaPractice).id;
  const nextHandler = createSadhanaPracticesHandler({
    async authorize() {
      return {
        async list() { return { data: [...rows.values()], error: null }; },
        async find(practiceId) { return { data: rows.get(practiceId) ?? null, error: null }; },
        async create() { return { data: null, error: null }; },
        async update() { return { data: null, error: null }; },
        async archive() { return { data: null, error: null }; },
        async validateScriptureReference() { return { data: true, error: null }; },
      };
    },
  });
  const reloaded = await nextHandler(new Request(`https://example.test/sadhana-practices?id=${id}`));
  assert.equal(reloaded.status, 200);
  assert.equal(((await responseBody(reloaded)).practice as SadhanaPractice).slug, 'morning-japa');
});

test('validation helper normalizes create data and rejects unsupported update values', () => {
  assert.equal(parsePracticeCreate(validInput).slug, 'morning-japa');
  assert.throws(() => parsePracticeCreate({ ...validInput, name: '!!!' }), SadhanaPracticeValidationError);
  assert.throws(() => parsePracticeUpdate({ target_count: 100001 }), SadhanaPracticeValidationError);
  assert.throws(() => parsePracticeUpdate({ slug: 'changed-slug' }), SadhanaPracticeValidationError);
  assert.throws(() => parsePracticeUpdate({}), SadhanaPracticeValidationError);
});

test('validates Japa configuration, optional target presets and one-recitation counting text', () => {
  const input = parsePracticeCreate({
    ...validInput,
    practice_mode: 'repetition',
    target_type: 'repetitions',
    target_count: 108,
    completion_rule: 'repetitions_reached',
    category_config: {
      mantra_name: 'Hare Krishna Maha Mantra',
      mantra_text: 'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे\nहरे राम हरे राम राम राम हरे हरे',
      transliteration: 'Hare Krishna Hare Krishna, Krishna Krishna Hare Hare, Hare Rama Hare Rama, Rama Rama Hare Hare',
      meaning: 'Mantra explanation',
      count_preset: 108,
      counter_enabled: true,
      mala_counter: true,
      counter_instructions: 'One complete recitation counts as one repetition.',
    },
  });
  assert.equal(input.target_count, 108);
  assert.equal(input.category_config?.['mantra_text'], 'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे\nहरे राम हरे राम राम राम हरे हरे');
  assert.equal(input.category_config?.['counter_enabled'], true);
  assert.throws(() => parsePracticeCreate({
    ...validInput,
    category_config: { count_preset: 0, mala_counter: false },
  }), SadhanaPracticeValidationError);
  assert.throws(() => parsePracticeCreate({
    ...validInput,
    practice_mode: 'repetition',
    target_type: 'repetitions',
    target_count: null,
    completion_rule: 'repetitions_reached',
  }), /positive integer target/);
});

test('validates mantra text, translation languages and optional localized instructions', () => {
  const mantra = parsePracticeCreate({
    name: 'Morning mantra',
    category: 'mantra',
    category_config: {
      mantra_name: 'Om Namah Shivaya',
      mantra_text: 'ॐ नमः शिवाय',
      transliteration: 'Om Namah Shivaya',
      meaning: 'A mantra of reverence.',
      localized_content: {
        te: { meaning: 'reviewed Telugu meaning', instructions: 'reviewed Telugu instructions' },
        hi: { meaning: 'reviewed Hindi meaning' },
      },
    },
  });
  assert.equal(mantra.category_config?.['mantra_text'], 'ॐ नमः शिवाय');
  assert.deepEqual(mantra.category_config?.['localized_content'], {
    te: { meaning: 'reviewed Telugu meaning', instructions: 'reviewed Telugu instructions' },
    hi: { meaning: 'reviewed Hindi meaning' },
  });
  assert.throws(() => parsePracticeCreate({
    name: 'Invalid localized mantra',
    category: 'mantra',
    category_config: { localized_content: { xx: { meaning: 'not an app language' } } },
  }), /unsupported language/);
});

test('validates meditation mode, audio completion and reasonable duration targets', () => {
  const meditation = parsePracticeCreate({
    name: 'Silent breath',
    category: 'meditation',
    practice_mode: 'timer',
    target_type: 'duration',
    target_count: 20,
    completion_rule: 'timer_elapsed',
    duration_minutes: 20,
    category_config: {
      is_guided: false,
      breathing_guidance: 'Breathe gently.',
      begin_instructions: 'Settle into a comfortable seat.',
      end_instructions: 'Open your eyes slowly.',
    },
  });
  assert.equal(meditation.category_config?.['breathing_guidance'], 'Breathe gently.');
  assert.throws(() => parsePracticeCreate({
    name: 'Invalid timer',
    category: 'meditation',
    practice_mode: 'timer',
    target_type: 'duration',
    target_count: 1441,
    completion_rule: 'timer_elapsed',
  }), /1440 minutes/);
  assert.throws(() => parsePracticeCreate({
    name: 'Audio without asset',
    category: 'meditation',
    practice_mode: 'guided_audio',
    completion_rule: 'audio_completed',
    category_config: { is_guided: true },
  }), /playable guided audio URL/);
  assert.doesNotThrow(() => parsePracticeCreate({
    name: 'Guided meditation',
    category: 'meditation',
    practice_mode: 'guided_audio',
    completion_rule: 'audio_completed',
    guided_audio_url: 'https://media.example.test/guided.mp3',
    category_config: { is_guided: true },
  }));
});

test('validates gratitude entry goals and scripture catalogue references and targets', async () => {
  assert.doesNotThrow(() => parsePracticeCreate({
    name: 'Gratitude reflections',
    category: 'gratitude',
    practice_mode: 'reflection',
    target_type: 'entries',
    target_count: 3,
    completion_rule: 'entries_submitted',
    category_config: {
      prompts: ['What brought you joy today?'],
      allow_personal_reflection: true,
    },
  }));
  assert.throws(() => parsePracticeCreate({
    name: 'Invalid gratitude target',
    category: 'gratitude',
    practice_mode: 'reflection',
    target_type: 'entries',
    completion_rule: 'entries_submitted',
    category_config: { allow_personal_reflection: true },
  }), /positive integer target/);

  const scriptureInput = {
    name: 'Gita reading',
    category: 'scripture_reading',
    practice_mode: 'scripture_reading',
    target_type: 'verses',
    target_count: 5,
    completion_rule: 'manual',
    category_config: {
      scripture_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      chapter_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      chapter_number: 2,
      start_verse: 1,
      end_verse: 5,
    },
  };
  assert.doesNotThrow(() => parsePracticeCreate(scriptureInput));
  assert.throws(() => parsePracticeCreate({
    ...scriptureInput,
    category_config: { ...scriptureInput.category_config, end_verse: 0 },
  }), /positive integer/);
  assert.throws(() => parsePracticeCreate({
    ...scriptureInput,
    category_config: { ...scriptureInput.category_config, scripture_id: 'fake-scripture-id' },
  }), /selected from the catalogue/);

  const { handler } = makeHarness({ validScripture: false });
  const response = await handler(new Request('https://example.test/sadhana-practices', {
    method: 'POST',
    headers: { Authorization: '******', 'Content-Type': 'application/json' },
    body: JSON.stringify(scriptureInput),
  }));
  assert.equal(response.status, 400);
  assert.match(String((await responseBody(response)).error), /published scripture and chapter/);
});

test('Edge handler rejects incompatible creates and validates the merged definition on partial edits', async () => {
  const { handler, rows } = makeHarness();
  const invalidCreate = await handler(new Request('https://example.test/sadhana-practices', {
    method: 'POST',
    headers: { Authorization: '******', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Invalid repetitions',
      category: 'japa',
      practice_mode: 'repetition',
      target_type: 'repetitions',
      target_count: 5,
      completion_rule: 'timer_elapsed',
    }),
  }));
  assert.equal(invalidCreate.status, 400);
  assert.equal(rows.size, 0);

  const create = await handler(new Request('https://example.test/sadhana-practices', {
    method: 'POST',
    headers: { Authorization: '******', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Japa with counter',
      category: 'japa',
      practice_mode: 'repetition',
      target_type: 'repetitions',
      target_count: 54,
      completion_rule: 'repetitions_reached',
      category_config: { counter_enabled: true, mala_counter: false },
    }),
  }));
  const created = (await responseBody(create)).practice as SadhanaPractice;
  assert.equal(create.status, 201);

  const incompatibleEdit = await handler(new Request(`https://example.test/sadhana-practices?id=${created.id}`, {
    method: 'PATCH',
    headers: { Authorization: '******', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      practice_mode: 'timer',
      target_type: 'duration',
      target_count: 15,
    }),
  }));
  assert.equal(incompatibleEdit.status, 400);
  assert.equal(rows.get(created.id)?.completion_rule, 'repetitions_reached');
  assert.equal(rows.get(created.id)?.target_type, 'repetitions');
});

test('user catalogue RLS only grants selection of active, non-archived definitions', () => {
  const migration = readFileSync(fileURLToPath(new URL(
    '../supabase/migrations/017_sadhana_practice_definitions.sql',
    import.meta.url,
  )), 'utf8');
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /for select\s+to anon, authenticated\s+using \(is_active = true and archived_at is null\)/i);
  assert.match(migration, /revoke all privileges.*anon, authenticated/i);
  assert.match(migration, /grant select.*to anon, authenticated/i);
});

test('media metadata migration is additive and preserves legacy URLs', () => {
  const migration = readFileSync(fileURLToPath(new URL(
    '../supabase/migrations/018_sadhana_practice_media_type.sql',
    import.meta.url,
  )), 'utf8');
  assert.match(migration, /add column media_type text\s+check \(media_type in \('image', 'audio'\)\)/i);
  assert.doesNotMatch(migration, /update public\.sadhana_practices|delete from|drop /i);
});
