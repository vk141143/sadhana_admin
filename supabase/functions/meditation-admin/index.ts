import { requireAdmin } from '../_shared/requireAdmin.ts';
import { AccessError } from '../_shared/adminPolicy.ts';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const resources = {
  practices: {
    table: 'meditation_practices',
    fields: ['id', 'category_id', 'stage_id', 'name', 'slug', 'subtitle', 'description',
      'instructions', 'meditation_type', 'difficulty', 'default_duration_seconds',
      'available_durations_seconds', 'requires_audio', 'has_ambient_audio', 'has_bell',
      'allow_silent_mode', 'cover_image_url', 'benefits', 'tags', 'is_featured',
      'is_active', 'display_order'],
    order: ['display_order', 'name'],
  },
  categories: {
    table: 'meditation_categories',
    fields: ['id', 'name', 'slug', 'description', 'icon_url', 'cover_image_url', 'display_order', 'is_active'],
    order: ['display_order', 'name'],
  },
  stages: {
    table: 'meditation_stages',
    fields: ['id', 'category_id', 'name', 'slug', 'description', 'stage_number', 'difficulty',
      'estimated_duration_minutes', 'cover_image_url', 'is_active', 'display_order'],
    order: ['display_order', 'stage_number'],
  },
  translations: {
    table: 'meditation_practice_translations',
    fields: ['id', 'practice_id', 'language_code', 'display_name', 'subtitle', 'description',
      'instructions', 'benefits'],
    order: ['language_code'],
    conflict: 'practice_id,language_code',
  },
  phases: {
    table: 'meditation_session_phases',
    fields: ['id', 'practice_id', 'phase_name', 'phase_type', 'duration_seconds',
      'instructions', 'audio_asset_id', 'display_order'],
    order: ['display_order', 'created_at'],
  },
  audio: {
    table: 'meditation_audio_assets',
    fields: ['id', 'practice_id', 'audio_type', 'language_code', 'title', 'storage_provider',
      'storage_key', 'public_url', 'duration_seconds', 'file_size_bytes', 'mime_type',
      'is_default', 'display_order', 'is_active'],
    order: ['display_order', 'created_at'],
  },
  assignments: {
    table: 'meditation_stage_practices',
    fields: ['id', 'stage_id', 'practice_id', 'sequence_number', 'is_required'],
    order: ['sequence_number', 'created_at'],
    conflict: 'stage_id,practice_id',
  },
  recommendations: {
    table: 'meditation_daily_recommendations',
    fields: ['id', 'practice_id', 'recommendation_date', 'title', 'description',
      'display_order', 'is_active'],
    order: ['recommendation_date', 'display_order'],
    conflict: 'practice_id,recommendation_date',
  },
} as const;

type Resource = keyof typeof resources;

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isResource(value: unknown): value is Resource {
  return typeof value === 'string' && Object.hasOwn(resources, value);
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 30000) return null;
  try {
    const body: unknown = JSON.parse(text);
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}

function filteredItem(resource: Resource, value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const config = resources[resource];
  const allowedFields: readonly string[] = config.fields;
  if (Object.keys(value).some(key => !allowedFields.includes(key))) return null;
  const item: Record<string, unknown> = {};
  for (const field of config.fields) {
    if (Object.hasOwn(value, field)) item[field] = value[field];
  }
  return item;
}

function validDays(value: unknown): value is 7 | 30 | 90 {
  return value === 7 || value === 30 || value === 90;
}

interface MeditationSessionRow {
  id?: string;
  firebase_uid: string;
  practice_id?: string | null;
  stage_id?: string | null;
  status: string;
  planned_duration_seconds?: number;
  elapsed_duration_seconds: number;
  completion_percentage?: number;
  xp_awarded: number;
  sadhana_synced: boolean;
  started_at: string;
  completed_at?: string | null;
}

async function listResource(db: any, resource: Resource, body: Record<string, unknown>) {
  const config = resources[resource];
  let query = db.from(config.table).select('*');
  if (body.practice_id !== undefined) {
    if (!isUuid(body.practice_id)) return { error: 'Practice ID must be a valid UUID.', status: 400 };
    query = query.eq('practice_id', body.practice_id);
  }
  for (const field of config.order) {
    query = query.order(field, { ascending: resource !== 'recommendations' || field !== 'recommendation_date' });
  }
  const result = await query;
  if (result.error) throw result.error;
  return { items: result.data ?? [] };
}

async function saveResource(db: any, resource: Resource, value: unknown) {
  const config = resources[resource];
  const item = filteredItem(resource, value);
  if (!item || Object.keys(item).length === 0) {
    return { error: 'The submitted Meditation content fields are invalid.', status: 400 };
  }
  if (item.id !== undefined && !isUuid(item.id)) {
    return { error: 'Record ID must be a valid UUID.', status: 400 };
  }

  let query;
  if (item.id) {
    const id = item.id;
    delete item.id;
    query = db.from(config.table).update(item).eq('id', id).select('*').maybeSingle();
  } else if ('conflict' in config) {
    query = db.from(config.table).upsert(item, { onConflict: config.conflict }).select('*').single();
  } else {
    query = db.from(config.table).insert(item).select('*').single();
  }
  const result = await query;
  if (result.error) {
    if (result.error.code === '23505') {
      return { error: 'A record with the same slug or relationship already exists.', status: 409 };
    }
    if (result.error.code === '23503' || result.error.code === '23514' || result.error.code === '22P02') {
      return { error: 'The submitted content references an invalid record or value.', status: 400 };
    }
    throw result.error;
  }
  if (!result.data) return { error: 'The requested record was not found.', status: 404 };
  return { item: result.data };
}

async function deleteResource(db: any, resource: unknown, id: unknown) {
  if (!['translations', 'phases', 'assignments', 'recommendations'].includes(String(resource))) {
    return { error: 'This Meditation record cannot be deleted.', status: 400 };
  }
  if (!isResource(resource) || !isUuid(id)) return { error: 'A valid record ID is required.', status: 400 };
  const result = await db.from(resources[resource].table).delete().eq('id', id).select('id').maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return { error: 'The requested record was not found.', status: 404 };
  return { item: true };
}

async function getSessions(db: any, days: 7 | 30 | 90, includeUsers: boolean): Promise<MeditationSessionRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const fields = 'id,firebase_uid,practice_id,stage_id,status,planned_duration_seconds,' +
    'elapsed_duration_seconds,completion_percentage,xp_awarded,sadhana_synced,started_at,completed_at';
  if (includeUsers) {
    const sessions = await db.from('user_meditation_sessions').select(fields)
      .gte('started_at', since).order('started_at', { ascending: false }).limit(100);
    if (sessions.error) throw sessions.error;
    return sessions.data ?? [];
  }

  const all: MeditationSessionRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await db.from('user_meditation_sessions')
      .select('firebase_uid,status,elapsed_duration_seconds,xp_awarded,sadhana_synced,started_at')
      .gte('started_at', since).order('started_at', { ascending: true })
      .range(offset, offset + 999);
    if (result.error) throw result.error;
    const rows = result.data ?? [];
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  return all;
}

async function analytics(db: any, days: 7 | 30 | 90) {
  const sessions = await getSessions(db, days, false);
  const completed = sessions.filter(session => session.status === 'completed');
  const elapsed = sessions.reduce((total, session) =>
    total + (typeof session.elapsed_duration_seconds === 'number' ? session.elapsed_duration_seconds : 0), 0);
  const completedElapsed = completed.reduce((total, session) =>
    total + (typeof session.elapsed_duration_seconds === 'number' ? session.elapsed_duration_seconds : 0), 0);
  return {
    days,
    active_users: new Set(sessions.map(session => session.firebase_uid)).size,
    started_sessions: sessions.length,
    completed_sessions: completed.length,
    completion_rate: sessions.length ? Math.round((completed.length / sessions.length) * 100) : 0,
    active_minutes: Math.round(elapsed / 60),
    average_completed_minutes: completed.length
      ? Math.round((completedElapsed / completed.length / 60) * 10) / 10
      : 0,
    xp_awarded: sessions.reduce((total, session) =>
      total + (typeof session.xp_awarded === 'number' ? session.xp_awarded : 0), 0),
    sadhana_synced_sessions: sessions.filter(session => session.sadhana_synced === true).length,
  };
}

async function tracking(db: any, days: 7 | 30 | 90) {
  const sessions = await getSessions(db, days, true);
  const userIds = [...new Set(sessions.map(session => session.firebase_uid))];
  const practiceIds = [...new Set(sessions.map(session => session.practice_id)
    .filter((id): id is string => typeof id === 'string'))];
  const stageIds = [...new Set(sessions.map(session => session.stage_id)
    .filter((id): id is string => typeof id === 'string'))];
  const [users, practices, stages] = await Promise.all([
    userIds.length ? db.from('users').select('firebase_uid,full_name,email').in('firebase_uid', userIds) : { data: [], error: null },
    practiceIds.length ? db.from('meditation_practices').select('id,name').in('id', practiceIds) : { data: [], error: null },
    stageIds.length ? db.from('meditation_stages').select('id,name').in('id', stageIds) : { data: [], error: null },
  ]);
  if (users.error) throw users.error;
  if (practices.error) throw practices.error;
  if (stages.error) throw stages.error;
  const userByUid = new Map<string, { full_name: string | null; email: string | null }>(
    (users.data ?? []).map((user: any) => [
      user.firebase_uid,
      { full_name: user.full_name, email: user.email },
    ]),
  );
  const practiceById = new Map<string, string>(
    (practices.data ?? []).map((practice: any) => [practice.id, practice.name]),
  );
  const stageById = new Map<string, string>(
    (stages.data ?? []).map((stage: any) => [stage.id, stage.name]),
  );
  return sessions.map(session => {
    const user = userByUid.get(session.firebase_uid);
    return {
      ...session,
      user_name: user?.full_name ?? 'Unknown user',
      user_email: user?.email ?? '',
      practice_name: session.practice_id
        ? practiceById.get(session.practice_id) ?? 'Unavailable practice'
        : 'Unavailable practice',
      stage_name: session.stage_id ? stageById.get(session.stage_id) ?? '' : '',
    };
  });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);

  const body = await readBody(request);
  if (!body || typeof body.action !== 'string') return reply({ error: 'A valid JSON action is required.' }, 400);
  const readActions = ['list', 'analytics', 'tracking'];
  const writeActions = ['save', 'delete'];
  if (!readActions.includes(body.action) && !writeActions.includes(body.action)) {
    return reply({ error: 'Unsupported Meditation administration action.' }, 400);
  }

  let adminContext;
  try {
    adminContext = await requireAdmin(request, writeActions.includes(body.action));
  } catch (error) {
    if (error instanceof AccessError) return reply({ error: error.message }, error.status);
    console.error('Meditation administrator verification failed.');
    return reply({ error: 'Administrator verification is unavailable.' }, 503);
  }

  try {
    if (body.action === 'list') {
      if (!isResource(body.resource)) return reply({ error: 'Unsupported Meditation content resource.' }, 400);
      const result = await listResource(adminContext.db, body.resource, body);
      return 'error' in result ? reply({ error: result.error }, result.status) : reply(result);
    }
    if (body.action === 'save') {
      if (!isResource(body.resource)) return reply({ error: 'Unsupported Meditation content resource.' }, 400);
      const result = await saveResource(adminContext.db, body.resource, body.item);
      return 'error' in result ? reply({ error: result.error }, result.status) : reply(result);
    }
    if (body.action === 'delete') {
      const result = await deleteResource(adminContext.db, body.resource, body.id);
      return 'error' in result ? reply({ error: result.error }, result.status) : reply(result);
    }
    if (!validDays(body.days)) return reply({ error: 'Period must be 7, 30, or 90 days.' }, 400);
    if (body.action === 'analytics') return reply({ item: await analytics(adminContext.db, body.days) });
    return reply({ items: await tracking(adminContext.db, body.days) });
  } catch (error) {
    console.error('Meditation administration database operation failed.', error);
    return reply({ error: 'Meditation administration data is temporarily unavailable.' }, 503);
  }
});
