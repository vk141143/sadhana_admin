import { supabase } from './supabaseClient';
import type {
  SadhanaPractice,
  SadhanaPracticeInput,
  SadhanaPracticeUpdate,
} from '../types/sadhanaPractice';

const PRACTICE_CATEGORIES = new Set(['meditation', 'japa', 'mantra', 'gratitude', 'scripture_reading']);
const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);
const PRACTICE_MODES = new Set(['timer', 'repetition', 'guided_audio', 'reflection', 'scripture_reading']);
const TARGET_TYPES = new Set(['none', 'duration', 'repetitions', 'entries', 'verses', 'chapters']);
const COMPLETION_RULES = new Set(['manual', 'timer_elapsed', 'repetitions_reached', 'entries_submitted', 'audio_completed']);
const TIMES_OF_DAY = new Set(['morning', 'afternoon', 'evening', 'anytime']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalColumn(
  value: Record<string, unknown>,
  key: string,
  predicate: (candidate: unknown) => boolean,
): boolean {
  return !(key in value) || predicate(value[key]);
}

function isSadhanaPractice(value: unknown): value is SadhanaPractice {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.slug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) ||
    !optionalColumn(value, 'subtitle', candidate => candidate === null || typeof candidate === 'string') ||
    typeof value.description !== 'string' ||
    typeof value.category !== 'string' ||
    !PRACTICE_CATEGORIES.has(value.category) ||
    typeof value.instructions !== 'string' ||
    !optionalColumn(value, 'difficulty', candidate => candidate === null || (typeof candidate === 'string' && DIFFICULTIES.has(candidate))) ||
    !optionalColumn(value, 'practice_mode', candidate => candidate === null || (typeof candidate === 'string' && PRACTICE_MODES.has(candidate))) ||
    !optionalColumn(value, 'target_type', candidate => candidate === null || (typeof candidate === 'string' && TARGET_TYPES.has(candidate))) ||
    !optionalColumn(value, 'target_count', candidate => candidate === null || (typeof candidate === 'number' &&
      Number.isSafeInteger(candidate) && candidate >= 1 && candidate <= 100000)) ||
    !optionalColumn(value, 'target_unit', candidate => candidate === null || typeof candidate === 'string') ||
    !optionalColumn(value, 'duration_minutes', candidate => candidate === null || (typeof candidate === 'number' &&
      Number.isSafeInteger(candidate) && candidate >= 1 && candidate <= 1440)) ||
    !optionalColumn(value, 'completion_rule', candidate => candidate === null || (typeof candidate === 'string' && COMPLETION_RULES.has(candidate))) ||
    !optionalColumn(value, 'time_of_day', candidate => candidate === null || (typeof candidate === 'string' && TIMES_OF_DAY.has(candidate))) ||
    !optionalColumn(value, 'is_featured', candidate => typeof candidate === 'boolean') ||
    !optionalColumn(value, 'benefits', candidate => candidate === null || Array.isArray(candidate)) ||
    !optionalColumn(value, 'tags', candidate => candidate === null || Array.isArray(candidate)) ||
    !optionalColumn(value, 'category_config', candidate => candidate === null || isRecord(candidate)) ||
    !optionalColumn(value, 'cover_image_url', candidate => candidate === null || typeof candidate === 'string') ||
    !optionalColumn(value, 'guided_audio_url', candidate => candidate === null || typeof candidate === 'string') ||
    !optionalColumn(value, 'ambient_audio_url', candidate => candidate === null || typeof candidate === 'string') ||
    !optionalColumn(value, 'media_type', candidate => candidate === null || candidate === 'image' || candidate === 'audio') ||
    !optionalColumn(value, 'media_url', candidate => typeof candidate === 'string' || candidate === null) ||
    typeof value.display_order !== 'number' || !Number.isSafeInteger(value.display_order) ||
    value.display_order < 0 || value.display_order > 1000000 ||
    typeof value.is_active !== 'boolean' ||
    !optionalColumn(value, 'archived_at', candidate => typeof candidate === 'string' || candidate === null) ||
    typeof value.created_at !== 'string' ||
    typeof value.updated_at !== 'string'
  ) return false;
  return true;
}

function parsePractice(value: unknown): SadhanaPractice {
  if (!isSadhanaPractice(value)) throw new Error('Practice service returned an invalid response.');
  return value;
}

async function readFailure(error: unknown): Promise<Error> {
  if (isRecord(error) && error.context instanceof Response) {
    try {
      const payload: unknown = await error.context.clone().json();
      if (isRecord(payload) && typeof payload.error === 'string') return new Error(payload.error);
    } catch {
      return new Error('Practice service returned an unreadable error response.');
    }
  }
  return new Error('Practice service could not be reached. Check your administrator session and retry.');
}

async function invoke(functionPath: string, options: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke<unknown>(functionPath, options);
  if (error) throw await readFailure(error);
  if (data === null || data === undefined) throw new Error('Practice service returned an empty response.');
  return data;
}

function practicePayload(value: unknown): unknown {
  if (!isRecord(value) || !('practice' in value)) throw new Error('Practice service returned an invalid response.');
  return value.practice;
}

const SELECT_COLUMNS = [
  'id', 'name', 'slug', 'subtitle', 'description', 'category', 'instructions',
  'difficulty', 'practice_mode', 'target_type', 'target_count', 'target_unit',
  'duration_minutes', 'completion_rule', 'time_of_day', 'is_featured',
  'benefits', 'tags', 'category_config',
  'cover_image_url', 'guided_audio_url', 'ambient_audio_url',
  'media_type', 'media_url', 'display_order', 'is_active', 'archived_at',
  'created_at', 'updated_at',
].join(',');

export const sadhanaPracticeService = {
  async list(): Promise<SadhanaPractice[]> {
    const response = await invoke('sadhana-practices', { method: 'GET' });
    if (!isRecord(response) || !Array.isArray(response.practices)) throw new Error('Practice service returned an invalid list.');
    return response.practices.map(parsePractice);
  },

  async get(id: string): Promise<SadhanaPractice> {
    const response = await invoke(
      `sadhana-practices?id=${encodeURIComponent(id)}`,
      { method: 'GET' },
    );
    return parsePractice(practicePayload(response));
  },

  async create(input: SadhanaPracticeInput): Promise<SadhanaPractice> {
    const response = await invoke('sadhana-practices', { method: 'POST', body: input });
    return parsePractice(practicePayload(response));
  },

  async update(id: string, input: SadhanaPracticeUpdate): Promise<SadhanaPractice> {
    const response = await invoke(
      `sadhana-practices?id=${encodeURIComponent(id)}`,
      { method: 'PATCH', body: input },
    );
    return parsePractice(practicePayload(response));
  },

  async archive(id: string): Promise<SadhanaPractice> {
    const response = await invoke(
      `sadhana-practices?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    return parsePractice(practicePayload(response));
  },

  async listActiveForUsers(): Promise<SadhanaPractice[]> {
    const { data, error } = await supabase
      .from('sadhana_practices')
      .select(SELECT_COLUMNS)
      .eq('is_active', true)
      .is('archived_at', null)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw new Error('Active practices could not be loaded.');
    if (!Array.isArray(data)) throw new Error('Practice catalogue returned an invalid response.');
    return data.map(parsePractice);
  },
};
