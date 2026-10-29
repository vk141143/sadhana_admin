import { AccessError } from './adminPolicy.ts';

export type PracticeMediaKind = 'image' | 'audio';

const IMAGE_LIMIT = 10 * 1024 * 1024;
const AUDIO_LIMIT = 25 * 1024 * 1024;
const contentTypes: Record<PracticeMediaKind, Record<string, string>> = {
  image: {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  },
  audio: {
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
  },
};

class MediaValidationError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface PracticeMediaObject {
  contentType: string;
  contentLength: number;
  signature: Uint8Array;
}

export interface SadhanaMediaDependencies {
  authorize(request: Request): Promise<void>;
  createSignedUpload(input: {
    objectKey: string;
    contentType: string;
    contentLength: number;
  }): Promise<string>;
  inspectObject(objectKey: string): Promise<PracticeMediaObject | null>;
  publicUrl(objectKey: string): string;
  createObjectId?(): string;
}

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function objectKeyPattern(): RegExp {
  return /^sadhana-practices\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|mp3|m4a|wav|ogg|webm)$/i;
}

function parseUploadRequest(value: unknown): {
  mediaType: PracticeMediaKind;
  contentType: string;
  contentLength: number;
} {
  if (!isRecord(value) ||
      Object.keys(value).some(key => !['action', 'media_type', 'content_type', 'size'].includes(key)) ||
      value.action !== 'sign' ||
      (value.media_type !== 'image' && value.media_type !== 'audio') ||
      typeof value.content_type !== 'string' ||
      typeof value.size !== 'number' ||
      !Number.isSafeInteger(value.size) ||
      value.size <= 0) {
    throw new MediaValidationError('Choose a supported media type and valid file.', 400);
  }

  const mediaType = value.media_type;
  const contentType = value.content_type.trim().toLowerCase().split(';', 1)[0];
  const maxSize = mediaType === 'image' ? IMAGE_LIMIT : AUDIO_LIMIT;
  if (!Object.hasOwn(contentTypes[mediaType], contentType)) {
    throw new MediaValidationError('This file type is not supported for the selected media type.', 415);
  }
  if (value.size > maxSize) {
    throw new MediaValidationError(`File exceeds the ${mediaType === 'image' ? '10 MB' : '25 MB'} limit.`, 413);
  }
  return { mediaType, contentType, contentLength: value.size };
}

function expectedObjectType(objectKey: string): string | null {
  const extension = objectKey.split('.').pop()?.toLowerCase();
  for (const supported of Object.values(contentTypes)) {
    for (const [contentType, supportedExtension] of Object.entries(supported)) {
      if (supportedExtension === extension) return contentType;
    }
  }
  return null;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function signatureMatches(contentType: string, bytes: Uint8Array): boolean {
  switch (contentType) {
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/webp':
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    case 'audio/mpeg':
      return startsWith(bytes, [0x49, 0x44, 0x33]) ||
        (bytes.length > 1 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    case 'audio/mp4':
      return bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 &&
        bytes[6] === 0x79 && bytes[7] === 0x70;
    case 'audio/wav':
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
    case 'audio/ogg':
      return startsWith(bytes, [0x4f, 0x67, 0x67, 0x53]);
    case 'audio/webm':
      return startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
    default:
      return false;
  }
}

export function createSadhanaMediaHandler(
  dependencies: SadhanaMediaDependencies,
): (request: Request) => Promise<Response> {
  return async request => {
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);

    try {
      await dependencies.authorize(request);
    } catch (error) {
      if (error instanceof AccessError) return reply({ error: error.message }, error.status);
      return reply({ error: 'Administrator verification is unavailable.' }, 503);
    }

    let body: unknown;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > 4096) return reply({ error: 'Request body is too large.' }, 413);
      body = JSON.parse(text) as unknown;
    } catch {
      return reply({ error: 'A valid JSON request body is required.' }, 400);
    }
    if (!isRecord(body) || typeof body.action !== 'string') {
      return reply({ error: 'A supported media operation is required.' }, 400);
    }

    if (body.action === 'sign') {
      try {
        const upload = parseUploadRequest(body);
        const objectId = (dependencies.createObjectId ?? (() => crypto.randomUUID()))().toLowerCase();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(objectId)) {
          return reply({ error: 'Media storage is temporarily unavailable.' }, 503);
        }
        const extension = contentTypes[upload.mediaType][upload.contentType];
        const objectKey = `sadhana-practices/${objectId}.${extension}`;
        const uploadUrl = await dependencies.createSignedUpload({
          objectKey,
          contentType: upload.contentType,
          contentLength: upload.contentLength,
        });
        return reply({
          upload_url: uploadUrl,
          object_key: objectKey,
          media_url: dependencies.publicUrl(objectKey),
          media_type: upload.mediaType,
          content_type: upload.contentType,
        });
      } catch (error) {
        if (error instanceof MediaValidationError) return reply({ error: error.message }, error.status);
        return reply({ error: 'Secure media upload could not be prepared.' }, 503);
      }
    }

    if (body.action === 'complete') {
      if (Object.keys(body).some(key => !['action', 'object_key'].includes(key)) ||
          typeof body.object_key !== 'string' ||
          !objectKeyPattern().test(body.object_key)) {
        return reply({ error: 'A valid server-generated media key is required.' }, 400);
      }
      const expectedType = expectedObjectType(body.object_key);
      try {
        const stored = await dependencies.inspectObject(body.object_key);
        if (!stored) return reply({ error: 'The uploaded media was not found in storage.' }, 404);
        const maxSize = expectedType?.startsWith('image/') ? IMAGE_LIMIT : AUDIO_LIMIT;
        if (!expectedType || stored.contentType.toLowerCase() !== expectedType ||
            !Number.isSafeInteger(stored.contentLength) ||
            stored.contentLength <= 0 ||
            stored.contentLength > maxSize ||
            !signatureMatches(expectedType, stored.signature)) {
          return reply({ error: 'Uploaded media did not pass server-side file validation.' }, 422);
        }
        return reply({
          object_key: body.object_key,
          media_url: dependencies.publicUrl(body.object_key),
          media_type: expectedType.startsWith('image/') ? 'image' : 'audio',
        });
      } catch {
        return reply({ error: 'Uploaded media could not be verified in storage.' }, 503);
      }
    }

    return reply({ error: 'Unsupported media operation.' }, 400);
  };
}
