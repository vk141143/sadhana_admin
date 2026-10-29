import { AccessError } from './adminPolicy.ts';
import {
  isPracticeId,
  parsePracticeCreate,
  parsePracticeUpdate,
  SadhanaPracticeValidationError,
  validatePracticeBehavior,
} from '../../../src/services/sadhanaPracticeValidation.ts';
import type {
  SadhanaPractice,
  SadhanaPracticeInput,
  SadhanaPracticeUpdate,
} from '../../../src/types/sadhanaPractice.ts';

export type { SadhanaPractice } from '../../../src/types/sadhanaPractice.ts';

export interface DatabaseResult<T> {
  data: T | null;
  error: { code?: string } | null;
}

export interface SadhanaPracticeRepository {
  list(): Promise<DatabaseResult<SadhanaPractice[]>>;
  find(id: string): Promise<DatabaseResult<SadhanaPractice>>;
  create(input: SadhanaPracticeInput): Promise<DatabaseResult<SadhanaPractice>>;
  update(id: string, input: SadhanaPracticeUpdate): Promise<DatabaseResult<SadhanaPractice>>;
  archive(id: string): Promise<DatabaseResult<SadhanaPractice>>;
  validateScriptureReference(input: {
    scriptureId: string;
    chapterId?: string;
    chapterNumber?: number;
    startVerse?: number;
    endVerse?: number;
  }): Promise<DatabaseResult<boolean>>;
}

export interface PracticeHandlerDependencies {
  authorize(request: Request, write: boolean): Promise<SadhanaPracticeRepository>;
}

const responseHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

async function parseRequestBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 20000) {
    throw new SadhanaPracticeValidationError('Request body is too large.');
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SadhanaPracticeValidationError('A valid JSON request body is required.');
  }
}

function databaseFailure(error: { code?: string } | null): Response | null {
  if (!error) return null;
  if (error.code === '23505') return reply({ error: 'That practice slug is already in use.' }, 409);
  return reply({ error: 'Practice storage is temporarily unavailable.' }, 503);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function validateScriptureReference(
  repository: SadhanaPracticeRepository,
  category: SadhanaPracticeInput['category'] | undefined,
  categoryConfig: SadhanaPracticeInput['category_config'] | SadhanaPracticeUpdate['category_config'],
): Promise<Response | null> {
  if (category !== 'scripture_reading' || !isRecord(categoryConfig) ||
      typeof categoryConfig.scripture_id !== 'string') return null;
  const reference = {
    scriptureId: categoryConfig.scripture_id,
    ...(typeof categoryConfig.chapter_id === 'string' ? { chapterId: categoryConfig.chapter_id } : {}),
    ...(typeof categoryConfig.chapter_number === 'number' ? { chapterNumber: categoryConfig.chapter_number } : {}),
    ...(typeof categoryConfig.start_verse === 'number' ? { startVerse: categoryConfig.start_verse } : {}),
    ...(typeof categoryConfig.end_verse === 'number' ? { endVerse: categoryConfig.end_verse } : {}),
  };
  const result = await repository.validateScriptureReference(reference);
  const failure = databaseFailure(result.error);
  if (failure) return failure;
  if (result.data !== true) {
    return reply({ error: 'Choose a published scripture and chapter reference from the catalogue.' }, 400);
  }
  return null;
}

export function createSadhanaPracticesHandler(
  dependencies: PracticeHandlerDependencies,
): (request: Request) => Promise<Response> {
  return async request => {
    if (request.method === 'OPTIONS') return new Response(null, { headers: responseHeaders });
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) {
      return reply({ error: 'Method not allowed.' }, 405);
    }

    const write = request.method !== 'GET';
    let repository: SadhanaPracticeRepository;
    try {
      repository = await dependencies.authorize(request, write);
    } catch (error) {
      if (error instanceof AccessError) return reply({ error: error.message }, error.status);
      return reply({ error: 'Administrator verification is unavailable.' }, 503);
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (id !== null && !isPracticeId(id)) return reply({ error: 'Practice ID must be a valid UUID.' }, 400);

    try {
      if (request.method === 'GET') {
        if (id) {
          const result = await repository.find(id);
          const failure = databaseFailure(result.error);
          if (failure) return failure;
          return result.data ? reply({ practice: result.data }) : reply({ error: 'Practice was not found.' }, 404);
        }
        const result = await repository.list();
        const failure = databaseFailure(result.error);
        if (failure) return failure;
        if (!result.data) return reply({ error: 'Practice storage is temporarily unavailable.' }, 503);
        return reply({ practices: result.data });
      }

      if (request.method !== 'POST' && !id) {
        return reply({ error: 'A practice ID is required.' }, 400);
      }
      if (request.method === 'DELETE') {
        const result = await repository.archive(id!);
        const failure = databaseFailure(result.error);
        if (failure) return failure;
        return result.data ? reply({ practice: result.data }) : reply({ error: 'Practice was not found.' }, 404);
      }

      const body = await parseRequestBody(request);
      if (request.method === 'POST') {
        const input = parsePracticeCreate(body);
        const referenceFailure = await validateScriptureReference(
          repository, input.category, input.category_config,
        );
        if (referenceFailure) return referenceFailure;
        const result = await repository.create(input);
        const failure = databaseFailure(result.error);
        if (failure) return failure;
        return result.data ? reply({ practice: result.data }, 201) : reply({ error: 'Practice could not be created.' }, 503);
      }

      if (request.method === 'PATCH') {
        const input = parsePracticeUpdate(body);
        const current = await repository.find(id!);
        const findFailure = databaseFailure(current.error);
        if (findFailure) return findFailure;
        if (!current.data) return reply({ error: 'Practice was not found.' }, 404);
        const validatesBehavior = [
          'category', 'practice_mode', 'target_type', 'target_count', 'completion_rule',
          'category_config', 'guided_audio_url', 'media_type', 'media_url',
        ].some(field => Object.hasOwn(input, field)) || input.is_active === true;
        const merged = { ...current.data, ...input };
        validatePracticeBehavior(merged, validatesBehavior);
        if (validatesBehavior) {
          const referenceFailure = await validateScriptureReference(
            repository, merged.category, merged.category_config,
          );
          if (referenceFailure) return referenceFailure;
        }
        const result = await repository.update(id!, input);
        const failure = databaseFailure(result.error);
        if (failure) return failure;
        return result.data ? reply({ practice: result.data }) : reply({ error: 'Practice was not found.' }, 404);
      }
      return reply({ error: 'Method not allowed.' }, 405);
    } catch (error) {
      if (error instanceof SadhanaPracticeValidationError) return reply({ error: error.message }, 400);
      return reply({ error: 'Practice storage is temporarily unavailable.' }, 503);
    }
  };
}
